import type * as Form from '@logixjs/form'
import * as FieldContracts from '@logixjs/core/repo-internal/field-contracts'
import type { FieldValueSelector, FieldValuesSelector, RawFormMeta } from '../FormProjection.js'

type SelectorEqualsKind = 'objectIs' | 'shallowStruct' | 'custom'

const FORM_FIELD_ERROR_SELECTOR_DESCRIPTOR = Symbol.for('@logixjs/form/FormFieldErrorSelectorDescriptor')
const FORM_FIELD_COMPANION_SELECTOR_DESCRIPTOR = Symbol.for('@logixjs/form/FormFieldCompanionSelectorDescriptor')
const ROW_COMPANION_SELECTOR_DESCRIPTOR = Symbol.for('@logixjs/form/FormRowCompanionSelectorDescriptor')

type SelectorInput<S, V> =
  | ((state: S) => V)
  | {
      readonly selectorId: string
      readonly debugKey?: string
      readonly reads: ReadonlyArray<string | number>
      readonly select: (state: S) => V
      readonly equalsKind: SelectorEqualsKind
      readonly equals?: (previous: V, next: V) => boolean
    }

type FormFieldErrorSelectorPayload = Readonly<{
  readonly kind: 'field'
  readonly path: string
}>

type FormFieldCompanionSelectorPayload = Readonly<{
  readonly kind: 'field'
  readonly path: string
}>

type FormRowCompanionSelectorPayload = Readonly<{
  readonly kind: 'row'
  readonly listPath: string
  readonly rowId: string
  readonly fieldPath: string
}>

type ListConfigLike = Readonly<{
  readonly path: string
  readonly trackBy?: string
}>

const isNumericSegment = (seg: string): boolean => /^[0-9]+$/.test(seg)

const splitPath = (path: string): ReadonlyArray<string> => {
  if (!path) return []
  const parts = path.split('.').filter((part) => part.length > 0)
  const segs: Array<string> = []

  for (const part of parts) {
    if (part.endsWith('[]')) {
      const base = part.slice(0, -2)
      if (base) segs.push(base)
      segs.push('[]')
      continue
    }

    const bracket = /^(.+)\[(\d+)\]$/.exec(part)
    if (bracket) {
      if (bracket[1]) segs.push(bracket[1])
      if (bracket[2]) segs.push(bracket[2])
      continue
    }

    segs.push(part)
  }

  return segs
}

const isValuePathIndex = (segment: string): boolean => /^[0-9]+$/.test(segment)

const toErrorsPath = (valuePath: string): string => {
  if (!valuePath) return 'errors'
  const segs = splitPath(valuePath)
  const out: Array<string> = []
  for (const seg of segs) {
    if (seg === '[]') continue
    if (isValuePathIndex(seg)) {
      out.push('rows', seg)
      continue
    }
    out.push(seg)
  }
  return `errors.${out.join('.')}`
}

const getAtPath = (state: unknown, path: string): unknown => {
  if (!path) return state
  const segs = splitPath(path)
  let current: unknown = state

  for (const seg of segs) {
    if (seg === '[]') continue
    if (current == null) return undefined

    if (Array.isArray(current) && isNumericSegment(seg)) {
      current = current[Number(seg)]
      continue
    }

    if (typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[seg]
  }

  return current
}

const readTrackBy = (item: unknown, trackBy: string): unknown => {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return undefined
  let current: unknown = item
  for (const seg of splitPath(trackBy)) {
    if (!current || typeof current !== 'object' || Array.isArray(current)) return undefined
    current = (current as Record<string, unknown>)[seg]
  }
  return current
}

const getListConfigs = (runtime: unknown): ReadonlyArray<ListConfigLike> => {
  if (!runtime || (typeof runtime !== 'object' && typeof runtime !== 'function')) return []
  const configs = FieldContracts.getFieldListConfigs(runtime as any)
  if (!Array.isArray(configs)) return []

  const out: Array<ListConfigLike> = []
  for (const cfg of configs) {
    if (!cfg || typeof cfg !== 'object' || Array.isArray(cfg)) continue
    const path = (cfg as { readonly path?: unknown }).path
    if (typeof path !== 'string' || path.length === 0) continue
    const trackBy = (cfg as { readonly trackBy?: unknown }).trackBy
    out.push({
      path,
      ...(typeof trackBy === 'string' && trackBy.length > 0 ? { trackBy } : {}),
    })
  }
  return out
}

const parentListPathOf = (
  listPath: string,
  pathSet: ReadonlySet<string>,
): string | undefined => {
  const segments = splitPath(listPath)
  let best: string | undefined
  for (let i = 1; i < segments.length; i++) {
    const prefix = segments.slice(0, i).join('.')
    if (pathSet.has(prefix)) best = prefix
  }
  return best
}

type ListInstance = Readonly<{
  readonly listPath: string
  readonly valuePath: string
  readonly items: ReadonlyArray<unknown>
}>

const resolveRowCompanionConcretePath = (
  state: unknown,
  runtime: unknown,
  payload: FormRowCompanionSelectorPayload,
): string | undefined => {
  const configs = getListConfigs(runtime)
  const pathSet = new Set(configs.map((cfg) => cfg.path))
  const cfgByPath = new Map(configs.map((cfg) => [cfg.path, cfg] as const))
  const targetCfg = cfgByPath.get(payload.listPath)

  const buildInstances = (listPath: string): ReadonlyArray<ListInstance> => {
    const parentPath = parentListPathOf(listPath, pathSet)
    if (!parentPath) {
      const value = getAtPath(state, listPath)
      return [
        {
          listPath,
          valuePath: listPath,
          items: Array.isArray(value) ? value : [],
        },
      ]
    }

    const parentInstances = buildInstances(parentPath)
    const suffix = listPath.slice(parentPath.length + 1)
    const out: Array<ListInstance> = []
    for (const parent of parentInstances) {
      for (let index = 0; index < parent.items.length; index++) {
        const rowValuePath = `${parent.valuePath}.${index}`
        const childValuePath = suffix ? `${rowValuePath}.${suffix}` : rowValuePath
        const childValue = getAtPath(state, childValuePath)
        out.push({
          listPath,
          valuePath: childValuePath,
          items: Array.isArray(childValue) ? childValue : [],
        })
      }
    }
    return out
  }

  if (targetCfg?.trackBy) {
    const matches: Array<string> = []
    for (const instance of buildInstances(payload.listPath)) {
      for (let index = 0; index < instance.items.length; index++) {
        const key = readTrackBy(instance.items[index], targetCfg.trackBy)
        if (key !== undefined && String(key) === payload.rowId) {
          matches.push(`ui.${instance.valuePath}.${index}.${payload.fieldPath}.$companion`)
        }
      }
    }
    if (matches.length === 1) return matches[0]
    if (matches.length > 1) return undefined
  }

  const rowIdStore = FieldContracts.getRowIdStore(runtime as any) as
    | {
        readonly getIndex?: (listPath: string, rowId: string) => number | undefined
      }
    | undefined
  const index = rowIdStore?.getIndex?.(payload.listPath, payload.rowId)
  if (typeof index !== 'number') return undefined
  return `ui.${payload.listPath}.${index}.${payload.fieldPath}.$companion`
}

const getRowSubjectRef = (
  state: unknown,
  errorPath: string,
): Readonly<{ kind: 'row'; id: string }> | undefined => {
  const segs = splitPath(errorPath)
  const rowIndex = segs.lastIndexOf('rows')
  if (rowIndex < 0) return undefined
  const rowPath = segs.slice(0, rowIndex + 2).join('.')
  const rowValue = getAtPath(state, rowPath) as Record<string, unknown> | undefined
  const rowId = rowValue?.$rowId
  if (typeof rowId !== 'string' || rowId.length === 0) return undefined
  return {
    kind: 'row',
    id: rowId,
  }
}

const RAW_FORM_META_READS = ['$form.submitCount', '$form.isSubmitting', '$form.isDirty', '$form.errorCount'] as const

export const fieldValue = <const P extends string>(
  valuePath: P,
): FieldValueSelector<P> => ({
    selectorId: `rq_form_field_value:${valuePath}`,
    debugKey: `fieldValue(${valuePath})`,
    reads: [valuePath],
    select: (state: unknown) => getAtPath(state, valuePath),
    equalsKind: 'objectIs',
  }) as unknown as FieldValueSelector<P>

const shallowTupleEqual = (previous: readonly unknown[], next: readonly unknown[]): boolean => {
  if (previous === next) return true
  if (!Array.isArray(previous) || !Array.isArray(next)) return Object.is(previous, next)
  if (previous.length !== next.length) return false
  for (let i = 0; i < previous.length; i++) {
    if (!Object.is(previous[i], next[i])) return false
  }
  return true
}

export function fieldValues<const P0 extends string>(
  valuePaths: readonly [P0],
): FieldValuesSelector<readonly [P0]>
export function fieldValues<const P0 extends string, const P1 extends string>(
  valuePaths: readonly [P0, P1],
): FieldValuesSelector<readonly [P0, P1]>
export function fieldValues<const P0 extends string, const P1 extends string, const P2 extends string>(
  valuePaths: readonly [P0, P1, P2],
): FieldValuesSelector<readonly [P0, P1, P2]>
export function fieldValues<
  const P0 extends string,
  const P1 extends string,
  const P2 extends string,
  const P3 extends string,
>(
  valuePaths: readonly [P0, P1, P2, P3],
): FieldValuesSelector<readonly [P0, P1, P2, P3]>
export function fieldValues<
  const P0 extends string,
  const P1 extends string,
  const P2 extends string,
  const P3 extends string,
  const P4 extends string,
>(
  valuePaths: readonly [P0, P1, P2, P3, P4],
): FieldValuesSelector<readonly [P0, P1, P2, P3, P4]>
export function fieldValues<
  const P0 extends string,
  const P1 extends string,
  const P2 extends string,
  const P3 extends string,
  const P4 extends string,
  const P5 extends string,
>(
  valuePaths: readonly [P0, P1, P2, P3, P4, P5],
): FieldValuesSelector<readonly [P0, P1, P2, P3, P4, P5]>
export function fieldValues<
  const P0 extends string,
  const P1 extends string,
  const P2 extends string,
  const P3 extends string,
  const P4 extends string,
  const P5 extends string,
  const P6 extends string,
>(
  valuePaths: readonly [P0, P1, P2, P3, P4, P5, P6],
): FieldValuesSelector<readonly [P0, P1, P2, P3, P4, P5, P6]>
export function fieldValues<
  const P0 extends string,
  const P1 extends string,
  const P2 extends string,
  const P3 extends string,
  const P4 extends string,
  const P5 extends string,
  const P6 extends string,
  const P7 extends string,
>(
  valuePaths: readonly [P0, P1, P2, P3, P4, P5, P6, P7],
): FieldValuesSelector<readonly [P0, P1, P2, P3, P4, P5, P6, P7]>
export function fieldValues<
  const P0 extends string,
  const P1 extends string,
  const P2 extends string,
  const P3 extends string,
  const P4 extends string,
  const P5 extends string,
  const P6 extends string,
  const P7 extends string,
  const P8 extends string,
>(
  valuePaths: readonly [P0, P1, P2, P3, P4, P5, P6, P7, P8],
): FieldValuesSelector<readonly [P0, P1, P2, P3, P4, P5, P6, P7, P8]>
export function fieldValues<
  const P0 extends string,
  const P1 extends string,
  const P2 extends string,
  const P3 extends string,
  const P4 extends string,
  const P5 extends string,
  const P6 extends string,
  const P7 extends string,
  const P8 extends string,
  const P9 extends string,
>(
  valuePaths: readonly [P0, P1, P2, P3, P4, P5, P6, P7, P8, P9],
): FieldValuesSelector<readonly [P0, P1, P2, P3, P4, P5, P6, P7, P8, P9]>
export function fieldValues<
  const P0 extends string,
  const P1 extends string,
  const P2 extends string,
  const P3 extends string,
  const P4 extends string,
  const P5 extends string,
  const P6 extends string,
  const P7 extends string,
  const P8 extends string,
  const P9 extends string,
  const P10 extends string,
  const Rest extends readonly string[],
>(
  valuePaths: readonly [P0, P1, P2, P3, P4, P5, P6, P7, P8, P9, P10, ...Rest],
): FieldValuesSelector<readonly [P0, P1, P2, P3, P4, P5, P6, P7, P8, P9, P10, ...Rest]>
export function fieldValues(
  valuePaths: readonly string[],
): FieldValuesSelector<readonly string[]> {
  const reads = valuePaths.slice()
  return {
    selectorId: `rq_form_field_values:${reads.join('|')}`,
    debugKey: `fieldValues(${reads.join(',')})`,
    reads,
    select: (state: unknown) => reads.map((valuePath) => getAtPath(state, valuePath)),
    equalsKind: 'custom',
    equals: shallowTupleEqual,
  } as unknown as FieldValuesSelector<readonly string[]>
}

export const rawFormMeta = <V extends RawFormMeta = RawFormMeta>(): SelectorInput<unknown, V> => ({
    selectorId: 'rq_form_raw_meta',
    debugKey: 'rawFormMeta()',
    reads: RAW_FORM_META_READS,
    select: (state: unknown) => getAtPath(state, '$form') as V,
    equalsKind: 'shallowStruct',
  })

export const isFormFieldErrorSelectorDescriptor = (value: unknown): value is Readonly<Record<PropertyKey, unknown>> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const payload = (value as Record<PropertyKey, unknown>)[FORM_FIELD_ERROR_SELECTOR_DESCRIPTOR] as
    | FormFieldErrorSelectorPayload
    | undefined
  return Boolean(payload && payload.kind === 'field' && typeof payload.path === 'string' && payload.path.length > 0)
}

export const isFormFieldCompanionSelectorDescriptor = (value: unknown): value is Readonly<Record<PropertyKey, unknown>> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const payload = (value as Record<PropertyKey, unknown>)[FORM_FIELD_COMPANION_SELECTOR_DESCRIPTOR] as
    | FormFieldCompanionSelectorPayload
    | undefined
  return Boolean(payload && payload.kind === 'field' && typeof payload.path === 'string' && payload.path.length > 0)
}

export const isFormRowCompanionSelectorDescriptor = (value: unknown): value is Readonly<Record<PropertyKey, unknown>> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const payload = (value as Record<PropertyKey, unknown>)[ROW_COMPANION_SELECTOR_DESCRIPTOR] as
    | FormRowCompanionSelectorPayload
    | undefined
  return Boolean(
    payload &&
      payload.kind === 'row' &&
      typeof payload.listPath === 'string' &&
      payload.listPath.length > 0 &&
      typeof payload.rowId === 'string' &&
      payload.rowId.length > 0 &&
      typeof payload.fieldPath === 'string' &&
      payload.fieldPath.length > 0,
  )
}

export const formFieldError = (
  descriptor: Readonly<Record<PropertyKey, unknown>>,
): SelectorInput<unknown, Form.Error.FormFieldExplainResult> => {
  const payload = (descriptor as Record<PropertyKey, unknown>)[FORM_FIELD_ERROR_SELECTOR_DESCRIPTOR] as FormFieldErrorSelectorPayload
  const path = payload.path
  const errorsPath = toErrorsPath(path)
  const manualPath = errorsPath === 'errors' ? 'errors.$manual' : errorsPath.replace(/^errors\./, 'errors.$manual.')
  const rulePath = errorsPath
  const schemaPath = errorsPath === 'errors' ? 'errors.$schema' : errorsPath.replace(/^errors\./, 'errors.$schema.')
  const cleanupPath = `ui.$cleanup.${path}`
  const submitAttemptReads = [
    '$form.submitAttempt.reasonSlotId',
    '$form.submitAttempt.blockingBasis',
    '$form.submitAttempt.pendingCount',
  ] as const

  return {
    selectorId: `rq_form_error_field:${path}`,
    debugKey: `Form.Error.field(${path})`,
    reads: [manualPath, rulePath, schemaPath, cleanupPath, path, ...submitAttemptReads],
    select: (state: unknown) => {
      const manual = getAtPath(state, manualPath)
      if (manual !== undefined) {
        return {
          kind: 'error',
          reasonSlotId: `field:${path}`,
          error: manual,
          sourceRef: manualPath,
          ...(getRowSubjectRef(state, manualPath) ? { subjectRef: getRowSubjectRef(state, manualPath) } : {}),
        } satisfies Form.Error.FormFieldExplainError
      }
      const rule = getAtPath(state, rulePath)
      if (rule !== undefined) {
        return {
          kind: 'error',
          reasonSlotId: `field:${path}`,
          error: rule,
          sourceRef: rulePath,
          ...(getRowSubjectRef(state, rulePath) ? { subjectRef: getRowSubjectRef(state, rulePath) } : {}),
        } satisfies Form.Error.FormFieldExplainError
      }
      const schema = getAtPath(state, schemaPath)
      if (schema !== undefined) {
        return {
          kind: 'error',
          reasonSlotId: `field:${path}`,
          error: schema,
          sourceRef: schemaPath,
          ...(getRowSubjectRef(state, schemaPath) ? { subjectRef: getRowSubjectRef(state, schemaPath) } : {}),
        } satisfies Form.Error.FormFieldExplainError
      }

      const cleanup = getAtPath(state, cleanupPath)
      if (cleanup !== undefined) return cleanup as Form.Error.FormFieldExplainCleanup

      const sourceSnapshot = getAtPath(state, path) as Record<string, unknown> | undefined
      const submitAttempt = getAtPath(state, '$form.submitAttempt') as Record<string, unknown> | undefined

      if (sourceSnapshot && typeof sourceSnapshot === 'object' && sourceSnapshot.status === 'error') {
        return {
          kind: 'error',
          reasonSlotId: `source:${path}`,
          error: sourceSnapshot.error,
          sourceRef: path,
          subjectRef: {
            kind: 'task',
            id: path,
          },
        } satisfies Form.Error.FormFieldExplainError
      }

      if (sourceSnapshot && typeof sourceSnapshot === 'object' && sourceSnapshot.status === 'loading') {
        const snapshotSubmitImpact =
          sourceSnapshot.submitImpact === 'block' || sourceSnapshot.submitImpact === 'observe'
            ? sourceSnapshot.submitImpact
            : undefined
        const submitImpact =
          snapshotSubmitImpact ??
          (submitAttempt?.blockingBasis === 'pending' && submitAttempt?.pendingCount && Number(submitAttempt.pendingCount) > 0
            ? 'block'
            : 'observe')
        return {
          kind: 'pending',
          submitImpact,
          ...(typeof submitAttempt?.reasonSlotId === 'string' ? { reasonSlotId: submitAttempt.reasonSlotId } : {}),
          sourceRef: path,
          subjectRef: {
            kind: 'task',
            id: path,
          },
        } satisfies Form.Error.FormFieldExplainPending
      }

      if (
        sourceSnapshot &&
        typeof sourceSnapshot === 'object' &&
        sourceSnapshot.status !== 'idle' &&
        sourceSnapshot.status !== 'loading' &&
        submitAttempt &&
        submitAttempt.blockingBasis === 'pending' &&
        typeof submitAttempt.pendingCount === 'number' &&
        submitAttempt.pendingCount > 0 &&
        typeof submitAttempt.reasonSlotId === 'string'
      ) {
        return {
          kind: 'stale',
          reasonSlotId: submitAttempt.reasonSlotId,
          sourceRef: path,
          subjectRef: {
            kind: 'task',
            id: path,
          },
        } satisfies Form.Error.FormFieldExplainStale
      }

      return undefined
    },
    equalsKind: 'objectIs',
  }
}

export const formFieldCompanion = <V = unknown>(
  descriptor: Readonly<Record<PropertyKey, unknown>>,
): SelectorInput<unknown, V> => {
  const payload =
    (descriptor as Record<PropertyKey, unknown>)[FORM_FIELD_COMPANION_SELECTOR_DESCRIPTOR] as FormFieldCompanionSelectorPayload
  const path = payload.path
  const companionPath = `ui.${path}.$companion`
  return {
    selectorId: `rq_form_companion_field:${path}`,
    debugKey: `Form.Companion.field(${path})`,
    reads: [companionPath],
    select: (state: unknown) => getAtPath(state, companionPath) as V,
    equalsKind: 'objectIs',
  }
}

export const formRowCompanion = <V = unknown>(
  descriptor: Readonly<Record<PropertyKey, unknown>>,
  runtime: unknown,
): SelectorInput<unknown, V> => {
  const payload =
    (descriptor as Record<PropertyKey, unknown>)[ROW_COMPANION_SELECTOR_DESCRIPTOR] as FormRowCompanionSelectorPayload

  return {
    selectorId: `rq_form_companion_row:${payload.listPath}:${payload.rowId}:${payload.fieldPath}`,
    debugKey: `Form.Companion.byRowId(${payload.listPath},${payload.rowId},${payload.fieldPath})`,
    reads: [payload.listPath, `ui.${payload.listPath}`],
    select: (state: unknown) => {
      const companionPath = resolveRowCompanionConcretePath(state, runtime, payload)
      if (!companionPath) return undefined as V
      return getAtPath(state, companionPath) as V
    },
    equalsKind: 'objectIs',
  }
}
