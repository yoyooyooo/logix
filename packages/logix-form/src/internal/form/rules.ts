import * as Logix from '@logix/core'
import type { Schema } from 'effect'
import type { RulesSpec } from '../dsl/rules.js'
import { traits as traitsDsl } from '../dsl/traits.js'
import * as Rule from '../../Rule.js'

export type RulesManifest = Readonly<{
  readonly moduleId: string
  readonly lists: ReadonlyArray<
    Readonly<{
      readonly path: ReadonlyArray<string>
      readonly identity: Rule.ListIdentityPolicy
    }>
  >
  readonly rules: ReadonlyArray<RuleDescriptor>
}>

export type RuleScope = Readonly<{
  readonly kind: 'root' | 'field' | 'list' | 'item'
  readonly fieldPath: ReadonlyArray<string>
  readonly errorTarget?: Rule.ErrorTarget
}>

export type RuleDescriptor = Readonly<{
  readonly ruleId: string
  readonly scope: RuleScope
  readonly deps: ReadonlyArray<string>
  readonly validateOn?: ReadonlyArray<Rule.AutoValidateOn>
  readonly meta?: Logix.Observability.JsonValue
}>

const assertCanonicalValuePath = (label: string, path: string): void => {
  const p = String(path ?? '').trim()
  if (!p) throw new Error(`[Form.make] ${label} must be a non-empty path`)
  if (p === '$root') return
  if (p.includes('[]') || p.includes('[') || p.includes(']')) {
    throw new Error(`[Form.make] ${label} "${p}" must not use bracket syntax`)
  }
  const segments = p
    .split('.')
    .map((s) => s.trim())
    .filter(Boolean)
  if (segments.length === 0) {
    throw new Error(`[Form.make] ${label} "${p}" must be a non-empty path`)
  }
  for (const seg of segments) {
    if (/^[0-9]+$/.test(seg)) {
      throw new Error(`[Form.make] ${label} "${p}" must not contain numeric segments`)
    }
  }
}

const assertValidListIdentity = (identity: Rule.ListIdentityPolicy, listPath: string): void => {
  if (!identity || typeof identity !== 'object') {
    throw new Error(`[Form.make] Missing list identity for "${listPath}"`)
  }
  const mode = (identity as any).mode
  if (mode === 'trackBy') {
    const trackBy = (identity as any).trackBy
    if (typeof trackBy !== 'string' || trackBy.trim().length === 0) {
      throw new Error(`[Form.make] identity.trackBy for "${listPath}" must be a non-empty string`)
    }
    if (trackBy.includes('[') || trackBy.includes(']')) {
      throw new Error(`[Form.make] identity.trackBy for "${listPath}" must not contain brackets (got "${trackBy}")`)
    }
    return
  }
  if (mode === 'store' || mode === 'index') return
  throw new Error(`[Form.make] Invalid identity.mode for "${listPath}" (got "${String(mode)}")`)
}

export const compileRulesToTraitSpec = <TValues extends object>(
  rulesSpec: RulesSpec<TValues>,
): Logix.StateTrait.StateTraitSpec<TValues> => {
  if (!rulesSpec || (rulesSpec as any)._tag !== 'FormRulesSpec') {
    throw new Error(`[Form.make] "rules" must be a FormRulesSpec (from Form.rules(...)/rules.schema(...))`)
  }

  const joinPath = (prefix: string, suffix: string): string => {
    if (!prefix) return suffix
    if (!suffix) return prefix
    return `${prefix}.${suffix}`
  }

  const dirnamePath = (path: string): string => {
    const p = String(path ?? '').trim()
    if (!p) return ''
    const idx = p.lastIndexOf('.')
    return idx >= 0 ? p.slice(0, idx) : ''
  }

  const isRelativeDep = (dep: unknown): dep is string => {
    if (typeof dep !== 'string') return false
    const d = dep.trim()
    if (!d) return false
    if (d === '$root') return false
    if (d.includes('[') || d.includes(']')) return false
    if (d.includes('.')) return false
    return true
  }

  const prefixDeps = (deps: unknown, prefix: string): ReadonlyArray<string> | undefined => {
    if (!Array.isArray(deps)) return undefined
    const out: Array<string> = []
    for (const raw of deps) {
      if (typeof raw !== 'string') continue
      const d = raw.trim()
      if (!d) continue
      out.push(isRelativeDep(d) ? joinPath(prefix, d) : d)
    }
    return out
  }

  const prefixRuleInputDeps = (input: Rule.RuleInput<any, any>, prefix: string): Rule.RuleInput<any, any> => {
    if (!input || typeof input !== 'object') return input
    if (Array.isArray(input)) return input

    const anyInput = input as any
    const deps = prefixDeps(anyInput.deps, prefix)
    const validate = anyInput.validate

    if (typeof validate === 'function') {
      return deps !== undefined ? { ...anyInput, deps } : input
    }

    if (validate && typeof validate === 'object' && !Array.isArray(validate)) {
      const nextValidate: Record<string, unknown> = { ...(validate as any) }
      for (const [name, raw] of Object.entries(validate as any)) {
        if (!raw || typeof raw !== 'object' || Array.isArray(raw)) continue
        const entryDeps = prefixDeps((raw as any).deps, prefix)
        if (entryDeps !== undefined) {
          nextValidate[name] = { ...(raw as any), deps: entryDeps }
        }
      }
      return {
        ...anyInput,
        ...(deps !== undefined ? { deps } : {}),
        validate: nextValidate,
      }
    }

    return deps !== undefined ? { ...anyInput, deps } : input
  }

  const decls = Array.isArray((rulesSpec as any).decls) ? (rulesSpec as any).decls : []

  const spec: Record<string, unknown> = {}
  const declared = new Set<string>()

  const reserve = (kind: string, path: string): void => {
    const k = `${kind}:${path}`
    if (declared.has(k)) {
      throw new Error(`[Form.make] Duplicate rules declaration for ${kind} "${path}"`)
    }
    declared.add(k)
  }

  for (const decl of decls as ReadonlyArray<Rule.RulesDecl<TValues>>) {
    if (!decl || typeof decl !== 'object') continue

    if ((decl as any).kind === 'field') {
      const valuePath = String((decl as any).valuePath ?? '').trim()
      assertCanonicalValuePath('field path', valuePath)
      if (valuePath === '$root') {
        throw new Error(`[Form.make] field path "$root" is not allowed (use Form.Rule.root(...))`)
      }

      reserve('field', valuePath)

      const errorTarget = (decl as any).errorTarget as Rule.ErrorTarget | undefined
      const depsPrefix = errorTarget === '$self' ? valuePath : dirnamePath(valuePath)

      const ruleInput = prefixRuleInputDeps((decl as any).rule as any, depsPrefix)
      const rules = Rule.make(ruleInput as any) as Record<string, any>

      const writebackPath = errorTarget === '$self' ? `${valuePath}.$self` : valuePath

      spec[valuePath] = {
        fieldPath: valuePath,
        kind: 'check',
        meta: {
          rules,
          writeback: {
            kind: 'errors',
            ...(writebackPath ? { path: writebackPath } : {}),
          },
        },
      } satisfies Logix.StateTrait.StateTraitEntry<any, any>

      continue
    }

    if ((decl as any).kind === 'root') {
      reserve('root', '$root')
      const ruleInput = prefixRuleInputDeps((decl as any).rule as any, '')
      const rules = Rule.make(ruleInput as any) as Record<string, any>
      spec.$root = {
        fieldPath: '$root',
        kind: 'check',
        meta: {
          rules,
          writeback: { kind: 'errors' },
        },
      } satisfies Logix.StateTrait.StateTraitEntry<any, any>
      continue
    }

    if ((decl as any).kind === 'list') {
      const listPath = String((decl as any).listPath ?? '').trim()
      assertCanonicalValuePath('list path', listPath)
      if (listPath === '$root') {
        throw new Error(`[Form.make] list path "$root" is not allowed`)
      }

      reserve('list', listPath)

      const identity = (decl as any).identity as Rule.ListIdentityPolicy
      assertValidListIdentity(identity, listPath)

      const itemInput = (decl as any).item as Rule.RuleInput<any, any> | undefined
      const listInput = (decl as any).list as Rule.RuleInput<any, any> | undefined

      const itemRules = itemInput ? (Rule.make(itemInput as any) as any) : undefined
      const listRules = listInput ? (Rule.make(listInput as any) as any) : undefined

      spec[listPath] = Logix.StateTrait.list({
        identityHint: (identity as any).mode === 'trackBy' ? { trackBy: String((identity as any).trackBy) } : undefined,
        item: itemRules ? Logix.StateTrait.node({ check: itemRules }) : undefined,
        list: listRules ? Logix.StateTrait.node<ReadonlyArray<any>>({ check: listRules }) : undefined,
      })

      continue
    }

    const kind = String((decl as any).kind ?? '')
    throw new Error(`[Form.make] Unknown rules declaration kind "${kind}"`)
  }

  return spec as any
}

const toFieldPathSegments = (label: string, valuePath: string): ReadonlyArray<string> => {
  assertCanonicalValuePath(label, valuePath)
  if (valuePath === '$root') return ['$root']
  return valuePath
    .split('.')
    .map((s) => s.trim())
    .filter(Boolean)
}

const normalizeAutoValidateOn = (input: unknown): ReadonlyArray<Rule.AutoValidateOn> | undefined => {
  if (!Array.isArray(input)) return undefined
  const out: Array<Rule.AutoValidateOn> = []
  for (const x of input) {
    if (x === 'onChange' || x === 'onBlur') out.push(x)
  }
  if (out.length === 0) return undefined
  return Array.from(new Set(out)).sort((a, b) => a.localeCompare(b))
}

const normalizeRuleDeps = (deps: unknown): ReadonlyArray<string> => {
  if (!Array.isArray(deps)) return []
  const out: Array<string> = []
  for (const x of deps) {
    if (typeof x !== 'string') continue
    const v = x.trim()
    if (!v) continue
    out.push(v)
  }
  return Array.from(new Set(out)).sort((a, b) => a.localeCompare(b))
}

export const rulesManifestWarningsBase = (params: {
  readonly rules?: unknown
  readonly traits?: unknown
}): ReadonlyArray<string> => {
  const warnings: Array<string> = []
  if (params.rules && params.traits) {
    warnings.push(
      `[Form.make] 同时传入了 "rules" 与 "traits"：推荐将校验迁移到 rules；traits 仅保留 computed/source/link 或必要的高级声明（便于性能/诊断对照）。`,
    )
  }
  return warnings
}

export const buildRulesManifest = <TValues extends object>(params: {
  readonly moduleId: string
  readonly valuesSchema: Schema.Schema<TValues, any>
  readonly rules?: RulesSpec<TValues>
  readonly traits?: Logix.StateTrait.StateTraitSpec<TValues>
}): RulesManifest => {
  type Source = 'rules' | 'traits' | 'schema-bridge'

  const listsByPath = new Map<string, { path: ReadonlyArray<string>; identity: Rule.ListIdentityPolicy }>()
  const rulesById = new Map<string, RuleDescriptor>()

  const addList = (path: string, identity: Rule.ListIdentityPolicy): void => {
    const segments = toFieldPathSegments('list path', path)
    const key = segments.join('.')
    if (listsByPath.has(key)) return
    listsByPath.set(key, { path: segments, identity })
  }

  const addRule = (rule: RuleDescriptor): void => {
    if (rulesById.has(rule.ruleId)) return
    rulesById.set(rule.ruleId, rule)
  }

  const ruleMeta = (source: Source): Logix.Observability.JsonValue => ({ source })

  const emitRuleSet = (params2: {
    readonly source: Source
    readonly scope: RuleScope
    readonly ruleId: (name: string) => string
    readonly rules: Rule.RuleSet<any, any>
  }): void => {
    const names = Object.keys(params2.rules).sort((a, b) => a.localeCompare(b))
    for (const name of names) {
      const r = (params2.rules as any)[name] as any
      if (!r || typeof r !== 'object') continue
      const deps = normalizeRuleDeps(r.deps)
      const validateOn = normalizeAutoValidateOn(r.validateOn)
      addRule({
        ruleId: params2.ruleId(name),
        scope: params2.scope,
        deps,
        ...(validateOn !== undefined ? { validateOn } : {}),
        meta: ruleMeta(params2.source),
      })
    }
  }

  // 1) rulesSpec（decl list）→ lists + rules
  if (params.rules && (params.rules as any)._tag === 'FormRulesSpec') {
    const decls = Array.isArray((params.rules as any).decls) ? (params.rules as any).decls : []
    for (const decl of decls as ReadonlyArray<Rule.RulesDecl<TValues>>) {
      if (!decl || typeof decl !== 'object') continue

      if ((decl as any).kind === 'field') {
        const valuePath = String((decl as any).valuePath ?? '').trim()
        assertCanonicalValuePath('field path', valuePath)
        if (valuePath === '$root') continue

        const errorTarget = (decl as any).errorTarget as Rule.ErrorTarget | undefined
        const scope: RuleScope = {
          kind: 'field',
          fieldPath: toFieldPathSegments('field path', valuePath),
          ...(errorTarget !== undefined ? { errorTarget } : {}),
        }

        const depsPrefix =
          errorTarget === '$self'
            ? valuePath
            : (() => {
                const idx = valuePath.lastIndexOf('.')
                return idx >= 0 ? valuePath.slice(0, idx) : ''
              })()

        const prefixDeps = (deps: unknown, prefix: string): ReadonlyArray<string> | undefined => {
          if (!Array.isArray(deps)) return undefined
          const out: Array<string> = []
          for (const raw of deps) {
            if (typeof raw !== 'string') continue
            const d = raw.trim()
            if (!d) continue
            const isRelative =
              d !== '$root' && !d.includes('[') && !d.includes(']') && !d.includes('.') && !/^[0-9]+$/.test(d)
            out.push(isRelative && prefix ? `${prefix}.${d}` : d)
          }
          return out
        }

        const prefixRuleInputDeps = (input: Rule.RuleInput<any, any>, prefix: string): Rule.RuleInput<any, any> => {
          if (!input || typeof input !== 'object') return input
          if (Array.isArray(input)) return input

          const anyInput = input as any
          const deps = prefixDeps(anyInput.deps, prefix)
          const validate = anyInput.validate

          if (typeof validate === 'function') {
            return deps !== undefined ? { ...anyInput, deps } : input
          }

          if (validate && typeof validate === 'object' && !Array.isArray(validate)) {
            const nextValidate: Record<string, unknown> = { ...(validate as any) }
            for (const [ruleName, raw] of Object.entries(validate as any)) {
              if (!raw || typeof raw !== 'object' || Array.isArray(raw)) continue
              const entryDeps = prefixDeps((raw as any).deps, prefix)
              if (entryDeps !== undefined) {
                nextValidate[ruleName] = { ...(raw as any), deps: entryDeps }
              }
            }
            return {
              ...anyInput,
              ...(deps !== undefined ? { deps } : {}),
              validate: nextValidate,
            }
          }

          return deps !== undefined ? { ...anyInput, deps } : input
        }

        const ruleInput = prefixRuleInputDeps((decl as any).rule as any, depsPrefix)
        const rules = Rule.make(ruleInput as any)

        emitRuleSet({
          source: 'rules',
          scope,
          ruleId: (name) => `${valuePath}#${name}`,
          rules,
        })
        continue
      }

      if ((decl as any).kind === 'root') {
        const ruleInput = (decl as any).rule as Rule.RuleInput<any, any>
        const rules = Rule.make(ruleInput as any)
        emitRuleSet({
          source: 'rules',
          scope: { kind: 'root', fieldPath: ['$root'] },
          ruleId: (name) => `$root#${name}`,
          rules,
        })
        continue
      }

      if ((decl as any).kind === 'list') {
        const listPath = String((decl as any).listPath ?? '').trim()
        assertCanonicalValuePath('list path', listPath)
        if (listPath === '$root') continue

        const identity = (decl as any).identity as Rule.ListIdentityPolicy
        assertValidListIdentity(identity, listPath)
        addList(listPath, identity)

        const listFieldPath = toFieldPathSegments('list path', listPath)

        const itemInput = (decl as any).item as Rule.RuleInput<any, any> | undefined
        const listInput = (decl as any).list as Rule.RuleInput<any, any> | undefined

        if (itemInput) {
          const itemRules = Rule.make(itemInput as any)
          emitRuleSet({
            source: 'rules',
            scope: { kind: 'item', fieldPath: listFieldPath },
            ruleId: (name) => `${listPath}#item.${name}`,
            rules: itemRules,
          })
        }

        if (listInput) {
          const listRules = Rule.make(listInput as any)
          emitRuleSet({
            source: 'rules',
            scope: { kind: 'list', fieldPath: listFieldPath },
            ruleId: (name) => `${listPath}#list.${name}`,
            rules: listRules,
          })
        }

        continue
      }
    }
  }

  // 2) traitsBase（normalized）→ lists + rules（best-effort）
  const traitsSpec = params.traits ? (traitsDsl(params.valuesSchema)(params.traits) as any) : undefined
  if (traitsSpec && typeof traitsSpec === 'object') {
    for (const [rawPath, value] of Object.entries(traitsSpec as any)) {
      const path = String(rawPath ?? '').trim()
      if (!path) continue

      const addFieldRuleSet = (fieldPath: string, rules: Record<string, unknown>, errorTarget?: Rule.ErrorTarget) => {
        const scope: RuleScope = {
          kind: fieldPath === '$root' ? 'root' : 'field',
          fieldPath: fieldPath === '$root' ? ['$root'] : toFieldPathSegments('field path', fieldPath),
          ...(errorTarget !== undefined ? { errorTarget } : {}),
        }

        const names = Object.keys(rules).sort((a, b) => a.localeCompare(b))
        for (const name of names) {
          const r = (rules as any)[name] as any
          if (!r || typeof r !== 'object') continue
          const deps = normalizeRuleDeps(r.deps)
          const validateOn = normalizeAutoValidateOn(r.validateOn)
          const ruleId = `${fieldPath}#${name}`
          addRule({
            ruleId,
            scope,
            deps,
            ...(validateOn !== undefined ? { validateOn } : {}),
            meta: ruleMeta('traits'),
          })
        }
      }

      if (value && typeof value === 'object' && (value as any)._tag === 'StateTraitList') {
        const listPath = path
        assertCanonicalValuePath('list path', listPath)
        if (listPath !== '$root') {
          const trackBy =
            (value as any).identityHint && typeof (value as any).identityHint === 'object'
              ? (value as any).identityHint.trackBy
              : undefined

          addList(
            listPath,
            typeof trackBy === 'string' && trackBy.length > 0
              ? { mode: 'trackBy', trackBy: String(trackBy) }
              : { mode: 'store' },
          )
        }

        const listFieldPath = toFieldPathSegments('list path', listPath)

        const item = (value as any).item
        const list = (value as any).list

        const emitNodeRules = (node: unknown, kind: 'item' | 'list') => {
          if (!node || typeof node !== 'object') return
          if ((node as any)._tag !== 'StateTraitNode') return
          const check = (node as any).check
          if (!check || typeof check !== 'object' || Array.isArray(check)) return

          const names = Object.keys(check as any).sort((a, b) => a.localeCompare(b))
          for (const name of names) {
            const r = (check as any)[name] as any
            if (!r || typeof r !== 'object') continue
            const deps = normalizeRuleDeps(r.deps)
            const validateOn = normalizeAutoValidateOn(r.validateOn)
            addRule({
              ruleId: `${listPath}#${kind}.${name}`,
              scope: { kind, fieldPath: listFieldPath },
              deps,
              ...(validateOn !== undefined ? { validateOn } : {}),
              meta: ruleMeta('traits'),
            })
          }
        }

        emitNodeRules(item, 'item')
        emitNodeRules(list, 'list')
        continue
      }

      if (value && typeof value === 'object' && (value as any)._tag === 'StateTraitNode') {
        const check = (value as any).check
        if (check && typeof check === 'object' && !Array.isArray(check)) {
          addFieldRuleSet(path, check as any)
        }
        continue
      }

      if (value && typeof value === 'object' && (value as any).kind === 'check') {
        const meta = (value as any).meta
        const rules = meta && typeof meta === 'object' ? (meta as any).rules : undefined
        if (rules && typeof rules === 'object' && !Array.isArray(rules)) {
          const writebackPath =
            meta && typeof meta === 'object' && (meta as any).writeback && typeof (meta as any).writeback === 'object'
              ? (meta as any).writeback.path
              : undefined

          const errorTarget =
            typeof writebackPath === 'string' && writebackPath.endsWith('.$self') ? '$self' : undefined

          addFieldRuleSet(path, rules as any, errorTarget)
        }
      }
    }
  }

  const lists = Array.from(listsByPath.values()).sort((a, b) => a.path.join('.').localeCompare(b.path.join('.')))
  const rules = Array.from(rulesById.values()).sort((a, b) => a.ruleId.localeCompare(b.ruleId))

  return {
    moduleId: params.moduleId,
    lists,
    rules,
  }
}
