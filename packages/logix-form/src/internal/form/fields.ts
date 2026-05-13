import * as Logix from '@logixjs/core'
import * as FieldContracts from '@logixjs/core/repo-internal/field-contracts'

type AnyFieldSpec = Record<string, unknown>

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export const normalizeValidateOn = (
  input: unknown,
  fallback: ReadonlyArray<'onSubmit' | 'onChange' | 'onBlur'>,
): ReadonlyArray<'onSubmit' | 'onChange' | 'onBlur'> => {
  if (!Array.isArray(input)) return fallback
  const out: Array<'onSubmit' | 'onChange' | 'onBlur'> = []
  for (const x of input) {
    if (x === 'onSubmit' || x === 'onChange' || x === 'onBlur') out.push(x)
  }
  return out.length > 0 ? Array.from(new Set(out)) : fallback
}

export const normalizeRuleValidateOn = (input: unknown): ReadonlyArray<'onChange' | 'onBlur'> => {
  if (!Array.isArray(input)) return []
  const out: Array<'onChange' | 'onBlur'> = []
  for (const x of input) {
    if (x === 'onChange' || x === 'onBlur') out.push(x)
  }
  return Array.from(new Set(out))
}

export type FormSourceOwnershipContract = {
  readonly fieldPath: string
  readonly resourceId: string
  readonly deps: ReadonlyArray<string>
  readonly submitImpact: 'block' | 'observe'
  readonly sourceReceiptRef: string
  readonly sourceRef: string
  readonly sourceSnapshotPath: string
  readonly keyHashRef: string
  readonly reasonSourceRef: '$form.submitAttempt'
  readonly bundlePatchPath: string
}

const collectSourceOwnershipEntry = (
  out: Array<FormSourceOwnershipContract>,
  fieldPath: string,
  entry: unknown,
): void => {
  if (!entry || typeof entry !== 'object') return
  if ((entry as any).kind !== 'source') return

  const meta = (entry as any).meta
  const resourceId = typeof meta?.resource === 'string' ? meta.resource : undefined
  if (!resourceId) return

  const deps = Array.isArray(meta?.deps)
    ? meta.deps.filter((dep: unknown): dep is string => typeof dep === 'string')
    : []
  const submitImpact = meta?.submitImpact === 'observe' ? 'observe' : 'block'

  out.push({
    fieldPath,
    resourceId,
    deps,
    submitImpact,
    sourceReceiptRef: `source:${fieldPath}`,
    sourceRef: fieldPath,
    sourceSnapshotPath: fieldPath,
    keyHashRef: `${fieldPath}.keyHash`,
    reasonSourceRef: '$form.submitAttempt',
    bundlePatchPath: fieldPath,
  })
}

export const collectSourceOwnershipFromFieldSpec = (
  spec: Record<string, unknown> | undefined,
): ReadonlyArray<FormSourceOwnershipContract> => {
  const out: Array<FormSourceOwnershipContract> = []
  if (!spec) return out

  const collectNode = (path: string, node: unknown): void => {
    if (!node || typeof node !== 'object') return
    if ((node as any)._tag !== 'FieldNode') return

    const source = (node as any).source
    if (source && typeof source === 'object' && !Array.isArray(source)) {
      if (typeof (source as any).kind === 'string') {
        collectSourceOwnershipEntry(out, path, source)
      } else {
        for (const [relativePath, entry] of Object.entries(source as Record<string, unknown>)) {
          const fieldPath = relativePath ? `${path}.${relativePath}` : path
          collectSourceOwnershipEntry(out, fieldPath, entry)
        }
      }
    }
  }

  for (const [path, value] of Object.entries(spec)) {
    if (!value || typeof value !== 'object') continue
    if ((value as any).kind === 'source') {
      collectSourceOwnershipEntry(out, path, value)
      continue
    }
    if ((value as any)._tag === 'FieldNode') {
      collectNode(path, value)
      continue
    }
    if ((value as any)._tag === 'FieldList') {
      const item = (value as any).item
      const list = (value as any).list
      if (item) collectNode(`${path}[]`, item)
      if (list) collectNode(path, list)
    }
  }

  out.sort((a, b) => (a.fieldPath < b.fieldPath ? -1 : a.fieldPath > b.fieldPath ? 1 : 0))
  return out
}

export const collectSourceSubmitImpactFromFieldSpec = (
  spec: Record<string, unknown> | undefined,
): ReadonlyMap<string, 'block' | 'observe'> => {
  const out = new Map<string, 'block' | 'observe'>()
  for (const entry of collectSourceOwnershipFromFieldSpec(spec)) {
    out.set(entry.fieldPath, entry.submitImpact)
  }
  return out
}

const readSubmitCount = (state: unknown): number => {
  const form = state && typeof state === 'object' && !Array.isArray(state) ? (state as any).$form : undefined
  const v = form && typeof form === 'object' && !Array.isArray(form) ? (form as any).submitCount : undefined
  return typeof v === 'number' && Number.isFinite(v) ? v : 0
}

const RULE_SKIP = Symbol.for('logix.field-kernel.validate.skip')
const EFFECTFUL_VALIDATE = Symbol.for('@logixjs/form/effectfulRuleValidate')

const preserveEffectfulValidate = (from: unknown, to: unknown): void => {
  if (typeof from !== 'function' || typeof to !== 'function') return
  const validate = (from as any)[EFFECTFUL_VALIDATE]
  if (typeof validate !== 'function') return
  Object.defineProperty(to, EFFECTFUL_VALIDATE, {
    value: validate,
    enumerable: false,
    configurable: false,
  })
}

export const normalizeDerived = (input: unknown): AnyFieldSpec | undefined => {
  if (input === undefined) return undefined
  if (!isPlainObject(input)) {
    throw new Error(`[Form.make] "derived" must be a plain object`)
  }

  const isAllowedTargetPath = (path: string): boolean => {
    if (!path) return false
    if (path === '$root') return false
    if (path === 'errors' || path.startsWith('errors.')) return false
    if (path === '$form' || path.startsWith('$form.')) return false
    return true
  }

  const isDerivedEntry = (value: unknown): value is { readonly kind: 'computed' | 'link' | 'source' } => {
    if (!isPlainObject(value)) return false
    if ((value as any)._tag === 'FieldNode' || (value as any)._tag === 'FieldList') return false
    const kind = (value as any).kind
    return kind === 'computed' || kind === 'link' || kind === 'source'
  }

  const out: Record<string, unknown> = {}
  const keys = Object.keys(input).sort((a, b) => a.localeCompare(b))

  for (const rawKey of keys) {
    const key = rawKey.trim()
    if (!key) {
      throw new Error(`[Form.make] "derived" contains an empty key`)
    }
    if (!isAllowedTargetPath(key)) {
      throw new Error(`[Form.make] "derived" cannot write to "${key}" (only values/ui are allowed)`)
    }

    const value = (input as any)[rawKey] as unknown
    if (!isDerivedEntry(value)) {
      throw new Error(`[Form.make] "derived.${key}" must be a field-kernel entry (computed/link/source)`)
    }
    out[key] = value
  }

  return Object.keys(out).length > 0 ? out : undefined
}

export const mergeFieldSpecs = (
  base: AnyFieldSpec | undefined,
  extra: AnyFieldSpec | undefined,
  baseLabel: string,
  extraLabel: string,
): AnyFieldSpec | undefined => {
  if (!base && !extra) return undefined
  if (!base) return extra
  if (!extra) return base

  const isFieldNode = (value: unknown): value is FieldContracts.FieldNode<any, any> =>
    isPlainObject(value) && (value as any)._tag === 'FieldNode'

  const isFieldList = (value: unknown): value is FieldContracts.FieldList<any> =>
    isPlainObject(value) && (value as any)._tag === 'FieldList'

  const isFieldEntry = (value: unknown): boolean =>
    isPlainObject(value) &&
    ((value as any).kind === 'computed' ||
      (value as any).kind === 'source' ||
      (value as any).kind === 'link' ||
      (value as any).kind === 'check')

  const mergeEntryOrRecord = (path: string, a: unknown, b: unknown): unknown => {
    if (a === undefined) return b
    if (b === undefined) return a

    // We currently do not support merging "entry" with "record<entry>" or merging two entries.
    // Keep a stable failure to avoid semantic drift.
    if (isFieldEntry(a) || isFieldEntry(b)) {
      throw new Error(
        `[Form.make] Cannot merge "${path}": entry/record conflict between "${baseLabel}" and "${extraLabel}"`,
      )
    }

    if (!isPlainObject(a) || !isPlainObject(b)) {
      throw new Error(
        `[Form.make] Cannot merge "${path}": incompatible values between "${baseLabel}" and "${extraLabel}"`,
      )
    }

    const out: Record<string, unknown> = { ...(a as any) }
    for (const [k, v] of Object.entries(b as any)) {
      if (k in out) {
        throw new Error(`[Form.make] Duplicate field key "${path}.${k}" between "${baseLabel}" and "${extraLabel}"`)
      }
      out[k] = v
    }
    return out
  }

  const mergeCheckRules = (path: string, a: unknown, b: unknown): unknown => {
    if (a === undefined) return b
    if (b === undefined) return a
    if (!isPlainObject(a) || !isPlainObject(b)) {
      throw new Error(
        `[Form.make] Cannot merge "${path}.check": incompatible values between "${baseLabel}" and "${extraLabel}"`,
      )
    }
    const out: Record<string, unknown> = { ...(a as any) }
    for (const [k, v] of Object.entries(b as any)) {
      if (k in out) {
        throw new Error(
          `[Form.make] Duplicate check rule "${path}.check.${k}" between "${baseLabel}" and "${extraLabel}"`,
        )
      }
      out[k] = v
    }
    return out
  }

  const mergeNodes = (
    path: string,
    a: FieldContracts.FieldNode<any, any>,
    b: FieldContracts.FieldNode<any, any>,
  ): FieldContracts.FieldNode<any, any> => {
    const out: any = { ...a }

    if (a.meta !== undefined && b.meta !== undefined) {
      throw new Error(`[Form.make] Duplicate node meta at "${path}" between "${baseLabel}" and "${extraLabel}"`)
    }
    if (out.meta === undefined && b.meta !== undefined) out.meta = b.meta

    out.computed = mergeEntryOrRecord(`${path}.computed`, a.computed, b.computed)
    out.source = mergeEntryOrRecord(`${path}.source`, a.source, b.source)
    out.link = mergeEntryOrRecord(`${path}.link`, a.link, b.link)
    out.check = mergeCheckRules(path, a.check, b.check)

    return out as FieldContracts.FieldNode<any, any>
  }

  const mergeLists = (
    path: string,
    a: FieldContracts.FieldList<any>,
    b: FieldContracts.FieldList<any>,
  ): FieldContracts.FieldList<any> => {
    const trackByA = a.identityHint && typeof a.identityHint === 'object' ? (a.identityHint as any).trackBy : undefined
    const trackByB = b.identityHint && typeof b.identityHint === 'object' ? (b.identityHint as any).trackBy : undefined

    if (trackByA !== undefined && trackByB !== undefined && trackByA !== trackByB) {
      throw new Error(
        `[Form.make] Conflicting list identityHint.trackBy for "${path}" between "${baseLabel}" and "${extraLabel}"`,
      )
    }

    const item = a.item && b.item ? mergeNodes(`${path}.item`, a.item, b.item) : a.item !== undefined ? a.item : b.item

    const list = a.list && b.list ? mergeNodes(`${path}.list`, a.list, b.list) : a.list !== undefined ? a.list : b.list

    return {
      ...a,
      ...b,
      ...(trackByA !== undefined || trackByB !== undefined
        ? { identityHint: { trackBy: String(trackByA ?? trackByB) } }
        : {}),
      ...(item !== undefined ? { item } : {}),
      ...(list !== undefined ? { list } : {}),
    } as FieldContracts.FieldList<any>
  }

  const out: Record<string, unknown> = { ...base }
  for (const [k, v] of Object.entries(extra)) {
    const existing = out[k]
    if (existing === undefined) {
      out[k] = v
      continue
    }

    if (isFieldList(existing) && isFieldList(v)) {
      out[k] = mergeLists(k, existing, v)
      continue
    }

    if (isFieldNode(existing) && isFieldNode(v)) {
      out[k] = mergeNodes(k, existing, v)
      continue
    }

    throw new Error(`[Form.make] Duplicate field path "${k}" between "${baseLabel}" and "${extraLabel}"`)
  }
  return out
}

export const wrapFieldsForValidateOn = <S extends object>(
  spec: FieldContracts.FieldSpec<S>,
  options: {
    readonly validateOn: ReadonlyArray<'onSubmit' | 'onChange' | 'onBlur'>
    readonly reValidateOn: ReadonlyArray<'onSubmit' | 'onChange' | 'onBlur'>
  },
): {
  readonly fields: FieldContracts.FieldSpec<S>
  readonly rulesValidateOn: ReadonlyArray<'onChange' | 'onBlur'>
} => {
  const validateOn = options.validateOn
  const reValidateOn = options.reValidateOn

  const isNode = (value: unknown): value is FieldContracts.FieldNode<any, any> =>
    typeof value === 'object' && value !== null && (value as any)._tag === 'FieldNode'

  const isList = (value: unknown): value is FieldContracts.FieldList<any> =>
    typeof value === 'object' && value !== null && (value as any)._tag === 'FieldList'

  const isCheckEntry = (value: unknown): boolean =>
    Boolean(value) &&
    typeof value === 'object' &&
    (value as any).kind === 'check' &&
    (value as any).meta &&
    typeof (value as any).meta === 'object'

  const explicitTriggers = new Set<'onChange' | 'onBlur'>()

  const wrapRule = (rule: unknown): unknown => {
    if (typeof rule === 'function') {
      const validate = rule as any
      const wrappedValidate = (input: unknown, ctx: any) => {
        const mode = ctx?.mode
        if (mode === 'submit' || mode === 'manual') return validate(input, ctx)
        const trigger = mode === 'valueChange' ? 'onChange' : mode === 'blur' ? 'onBlur' : undefined
        if (!trigger) return validate(input, ctx)
        const submitCount = readSubmitCount(ctx?.state)
        const effective = submitCount > 0 ? reValidateOn : validateOn
        return effective.includes(trigger) ? validate(input, ctx) : RULE_SKIP
      }
      preserveEffectfulValidate(validate, wrappedValidate)
      return wrappedValidate
    }

    if (!rule || typeof rule !== 'object') return rule
    const anyRule = rule as any
    const validate = anyRule.validate
    if (typeof validate !== 'function') return rule

    const hasExplicit = Array.isArray(anyRule.validateOn)
    const explicit = hasExplicit ? normalizeRuleValidateOn(anyRule.validateOn) : undefined
    if (explicit) {
      for (const t of explicit) explicitTriggers.add(t)
    }

    const wrappedValidate = (input: unknown, ctx: any) => {
      const mode = ctx?.mode
      if (mode === 'submit' || mode === 'manual') return validate(input, ctx)
      const trigger = mode === 'valueChange' ? 'onChange' : mode === 'blur' ? 'onBlur' : undefined
      if (!trigger) return validate(input, ctx)

      if (hasExplicit) {
        return explicit && explicit.includes(trigger) ? validate(input, ctx) : RULE_SKIP
      }

      const submitCount = readSubmitCount(ctx?.state)
      const effective = submitCount > 0 ? reValidateOn : validateOn
      return effective.includes(trigger) ? validate(input, ctx) : RULE_SKIP
    }
    preserveEffectfulValidate(validate, wrappedValidate)

    return {
      ...anyRule,
      ...(hasExplicit ? { validateOn: explicit } : {}),
      validate: wrappedValidate,
    }
  }

  const visit = (value: unknown): unknown => {
    if (isNode(value)) {
      const check = value.check
      if (!check) return value

      const wrapped: Record<string, unknown> = {}
      for (const name of Object.keys(check)) {
        wrapped[name] = wrapRule((check as any)[name])
      }
      return { ...value, check: wrapped }
    }

    if (isList(value)) {
      return {
        ...value,
        item: value.item ? (visit(value.item) as any) : undefined,
        list: value.list ? (visit(value.list) as any) : undefined,
      }
    }

    if (isCheckEntry(value)) {
      const meta = (value as any).meta
      const rules = meta?.rules
      if (!isPlainObject(rules)) return value

      const wrapped: Record<string, unknown> = {}
      for (const name of Object.keys(rules)) {
        wrapped[name] = wrapRule((rules as any)[name])
      }

      return {
        ...(value as any),
        meta: { ...meta, rules: wrapped },
      }
    }

    if (isPlainObject(value)) {
      const out: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(value)) {
        out[k] = visit(v)
      }
      return out
    }

    return value
  }

  return {
    fields: visit(spec) as any,
    rulesValidateOn: Array.from(explicitTriggers),
  }
}
