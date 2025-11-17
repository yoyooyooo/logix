import * as Logix from '@logix/core'
import { Effect, Schema } from 'effect'
import { mergeTraitSpecs, normalizeDerived, normalizeValidateOn, wrapTraitsForValidateOn } from './traits.js'
import { makeFormReducers } from './reducer.js'
import { makeFormController } from './controller.js'
import type { RuleDescriptor, RuleScope, RulesManifest } from './rules.js'
import type { RulesSpec } from '../dsl/rules.js'
import { traits as traitsDsl } from '../dsl/traits.js'
import { install as installLogic } from './install.js'
import { makeFormRulesManifestArtifactExporter } from './artifacts.js'
import * as Rule from '../../Rule.js'
import type { DerivedSpec } from '../../Trait.js'

export type { RuleDescriptor, RuleScope, RulesManifest } from './rules.js'

export type FormErrors = unknown
export type FormUiState = unknown

export type FormMeta = {
  readonly submitCount: number
  readonly isSubmitting: boolean
  readonly isDirty: boolean
  /**
   * errorCount：
   * - Used for O(1) reads in `FormView.isValid/canSubmit`.
   * - Semantics: the number of ErrorValue leaf nodes in the errors tree (including `$manual/$schema`).
   */
  readonly errorCount: number
}

export type FormState<TValues extends object> = TValues & {
  readonly errors: FormErrors
  readonly ui: FormUiState
  readonly $form: FormMeta
}

const FormActions = {
  setValue: Schema.Struct({ path: Schema.String, value: Schema.Unknown }),
  blur: Schema.Struct({ path: Schema.String }),
  submit: Schema.Void,
  validate: Schema.Void,
  validatePaths: Schema.Array(Schema.String),
  submitAttempt: Schema.Void,
  setSubmitting: Schema.Boolean,
  reset: Schema.UndefinedOr(Schema.Unknown),
  setError: Schema.Struct({ path: Schema.String, error: Schema.Unknown }),
  clearErrors: Schema.UndefinedOr(Schema.Array(Schema.String)),
  arrayAppend: Schema.Struct({ path: Schema.String, value: Schema.Unknown }),
  arrayPrepend: Schema.Struct({ path: Schema.String, value: Schema.Unknown }),
  arrayRemove: Schema.Struct({ path: Schema.String, index: Schema.Number }),
  arraySwap: Schema.Struct({
    path: Schema.String,
    indexA: Schema.Number,
    indexB: Schema.Number,
  }),
  arrayMove: Schema.Struct({
    path: Schema.String,
    from: Schema.Number,
    to: Schema.Number,
  }),
} as const

export type FormAction = Logix.ActionsFromMap<typeof FormActions>

export type FormShape<TValues extends object> = Logix.Shape<Schema.Schema<FormState<TValues>, any>, typeof FormActions>

export interface FormMakeConfig<TValues extends object> {
  readonly values: Schema.Schema<TValues, any>
  readonly initialValues: TValues
  readonly validateOn?: ReadonlyArray<'onSubmit' | 'onChange' | 'onBlur'>
  readonly reValidateOn?: ReadonlyArray<'onSubmit' | 'onChange' | 'onBlur'>
  readonly debounceMs?: number
  /**
   * rules：
   * - Recommended: express validations using rules only (field/list/root rules).
   * - The result will be compiled into an equivalent StateTraitSpec (does not introduce a second runtime).
   */
  readonly rules?: RulesSpec<TValues>
  readonly traits?: Logix.StateTrait.StateTraitSpec<TValues>
  /**
   * derived：
   * - The entry point for domain-level linkage/derivation (by default, only writes back to values/ui are allowed).
   * - The result must be fully reducible to StateTraitSpec/IR (computed/link/source).
   */
  readonly derived?: DerivedSpec<TValues>
}

export type FormExtendDef<TValues extends object> = Omit<
  Logix.Module.MakeExtendDef<Schema.Schema<FormState<TValues>, any>, typeof FormActions, {}>,
  'actions'
> & { readonly actions?: never }

export interface FormController<TValues extends object> {
  readonly runtime: Logix.ModuleRuntime<FormState<TValues>, FormAction>
  readonly getState: Effect.Effect<FormState<TValues>>
  readonly dispatch: (action: FormAction) => Effect.Effect<void>
  readonly submit: () => Effect.Effect<void>

  readonly controller: {
    readonly validate: () => Effect.Effect<void, never, any>
    readonly validatePaths: (paths: ReadonlyArray<string> | string) => Effect.Effect<void, never, any>
    readonly reset: (values?: TValues) => Effect.Effect<void>
    readonly setError: (path: string, error: unknown) => Effect.Effect<void>
    readonly clearErrors: (paths?: ReadonlyArray<string> | string) => Effect.Effect<void>
    readonly handleSubmit: (handlers: {
      readonly onValid: (values: TValues) => Effect.Effect<void, any, any>
      readonly onInvalid?: (errors: unknown) => Effect.Effect<void, any, any>
    }) => Effect.Effect<void, any, any>
  }

  readonly field: (path: string) => {
    readonly get: Effect.Effect<unknown>
    readonly set: (value: unknown) => Effect.Effect<void>
    readonly blur: () => Effect.Effect<void>
  }

  readonly fieldArray: (path: string) => {
    readonly get: Effect.Effect<ReadonlyArray<unknown>>
    readonly append: (value: unknown) => Effect.Effect<void>
    readonly prepend: (value: unknown) => Effect.Effect<void>
    readonly remove: (index: number) => Effect.Effect<void>
    readonly swap: (indexA: number, indexB: number) => Effect.Effect<void>
    readonly move: (from: number, to: number) => Effect.Effect<void>
  }
}

export type FormHandleExt<TValues extends object> = {
  readonly controller: FormController<TValues>['controller']
  readonly rulesManifest: () => RulesManifest
  readonly rulesManifestWarnings: () => ReadonlyArray<string>
}

export type FormModule<Id extends string, TValues extends object> = Logix.Module.Module<
  Id,
  FormShape<TValues>,
  FormHandleExt<TValues>,
  any
> & {
  readonly controller: {
    readonly make: (runtime: Logix.ModuleRuntime<FormState<TValues>, FormAction>) => FormController<TValues>
  }
}

const initialMeta = (): FormMeta => ({
  submitCount: 0,
  isSubmitting: false,
  isDirty: false,
  errorCount: 0,
})

export const make = <Id extends string, TValues extends object>(
  id: Id,
  config: FormMakeConfig<TValues>,
  extend?: FormExtendDef<TValues>,
): FormModule<Id, TValues> => {
  const ErrorsSchema = Schema.Unknown
  const UiSchema = Schema.Unknown
  const MetaSchema = Schema.Struct({
    submitCount: Schema.Number,
    isSubmitting: Schema.Boolean,
    isDirty: Schema.Boolean,
    errorCount: Schema.Number,
  })

  const StateSchema = Schema.extend(
    config.values,
    Schema.Struct({
      errors: ErrorsSchema,
      ui: UiSchema,
      $form: MetaSchema,
    }),
  )

  const Actions = FormActions

  type State = Schema.Schema.Type<typeof StateSchema>
  type Reducers = Logix.ReducersFromMap<typeof StateSchema, typeof Actions>
  const reducers = makeFormReducers<TValues>({
    initialValues: config.initialValues,
  }) as unknown as Reducers

  const validateOn = normalizeValidateOn(config.validateOn, ['onSubmit'])
  const reValidateOn = normalizeValidateOn(config.reValidateOn, ['onChange'])
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

  const compileRulesToTraitSpec = (rulesSpec: RulesSpec<TValues>): Logix.StateTrait.StateTraitSpec<TValues> => {
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

    const withDefaultDeps = (ruleSet: Record<string, any>, defaultDep: string): Record<string, any> => {
      const out: Record<string, any> = {}
      for (const name of Object.keys(ruleSet)) {
        const r = ruleSet[name]
        if (!r || typeof r !== 'object' || Array.isArray(r)) {
          out[name] = r
          continue
        }
        const deps = Array.isArray(r.deps) ? r.deps : []
        out[name] = deps.length > 0 ? r : { ...r, deps: [defaultDep] }
      }
      return out
    }

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
        if (errorTarget !== undefined && errorTarget !== '$value' && errorTarget !== '$self') {
          throw new Error(`[Form.make] Invalid errorTarget for field "${valuePath}"`)
        }

        const depsPrefix = errorTarget === '$self' ? valuePath : dirnamePath(valuePath)
        const ruleInput = prefixRuleInputDeps((decl as any).rule as any, depsPrefix)
        const rules = withDefaultDeps(Rule.make(ruleInput as any) as Record<string, any>, valuePath)
        const writebackPath = errorTarget === '$self' ? `errors.${valuePath}.$self` : undefined

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
          identityHint:
            (identity as any).mode === 'trackBy' ? { trackBy: String((identity as any).trackBy) } : undefined,
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

  const rulesManifestWarningsBase = (): ReadonlyArray<string> => {
    const warnings: Array<string> = []
    if (config.rules && config.traits) {
      warnings.push(
        `[Form.make] 同时传入了 "rules" 与 "traits"：推荐将校验迁移到 rules；traits 仅保留 computed/source/link 或必要的高级声明（便于性能/诊断对照）。`,
      )
    }
    return warnings
  }

  const buildRulesManifest = (): RulesManifest => {
    type JsonValue = null | boolean | number | string | ReadonlyArray<JsonValue> | { readonly [key: string]: JsonValue }

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

    const ruleMeta = (source: Source): JsonValue => ({ source })

    const emitRuleSet = (params: {
      readonly source: Source
      readonly scope: RuleScope
      readonly ruleId: (name: string) => string
      readonly rules: Rule.RuleSet<any, any>
    }): void => {
      const names = Object.keys(params.rules).sort((a, b) => a.localeCompare(b))
      for (const name of names) {
        const r = (params.rules as any)[name] as any
        if (!r || typeof r !== 'object') continue
        const deps = normalizeRuleDeps(r.deps)
        const validateOn = normalizeAutoValidateOn(r.validateOn)
        addRule({
          ruleId: params.ruleId(name),
          scope: params.scope,
          deps,
          ...(validateOn !== undefined ? { validateOn } : {}),
          meta: ruleMeta(params.source),
        })
      }
    }

    // 1) rulesSpec（decl list）→ lists + rules
    if (config.rules && (config.rules as any)._tag === 'FormRulesSpec') {
      const decls = Array.isArray((config.rules as any).decls) ? (config.rules as any).decls : []
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
    const traitsSpec = config.traits ? (traitsDsl(config.values)(config.traits) as any) : undefined
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
      moduleId: id,
      lists,
      rules,
    }
  }

  const traitsBase = config.traits ? (traitsDsl(config.values)(config.traits) as any) : undefined
  const derivedSpec = normalizeDerived(config.derived)
  const rulesSpec = config.rules ? compileRulesToTraitSpec(config.rules) : undefined
  const mergedSpec1 = mergeTraitSpecs(traitsBase, derivedSpec, 'traits', 'derived')
  const mergedSpec = mergeTraitSpecs(mergedSpec1 as any, rulesSpec as any, 'traits/derived', 'rules')
  const traitsWrapped = mergedSpec
    ? wrapTraitsForValidateOn(mergedSpec as any, { validateOn, reValidateOn })
    : undefined
  const traits = traitsWrapped?.traits as unknown as Logix.StateTrait.StateTraitSpec<TValues> | undefined
  const rulesValidateOn = traitsWrapped?.rulesValidateOn ?? []

  const def = {
    state: StateSchema,
    actions: Actions,
    reducers,
    traits,
    schemas: { values: config.values },
  }

  const module = extend
    ? Logix.Module.make<Id, typeof StateSchema, typeof Actions, FormHandleExt<TValues>>(id, def, extend)
    : Logix.Module.make<Id, typeof StateSchema, typeof Actions, FormHandleExt<TValues>>(id, def)

  const logics: ReadonlyArray<Logix.ModuleLogic<any, any, any>> = [
    installLogic(module.tag, {
      validateOn,
      reValidateOn,
      rulesValidateOn,
      debounceMs: config.debounceMs,
    }),
  ]

  const initial = (values?: TValues): FormState<TValues> =>
    ({
      ...(values ?? config.initialValues),
      errors: {},
      ui: {},
      $form: initialMeta(),
    }) as FormState<TValues>

  const controller = {
    make: (runtime: Logix.ModuleRuntime<FormState<TValues>, FormAction>): FormController<TValues> => {
      return makeFormController<TValues>({
        runtime,
        shape: module.shape,
        valuesSchema: config.values,
      }) as FormController<TValues>
    },
  }

  ;(module as any).controller = controller

  Logix.Observability.registerTrialRunArtifactExporter(
    module.tag as any,
    makeFormRulesManifestArtifactExporter({
      getManifest: buildRulesManifest,
      getWarnings: rulesManifestWarningsBase,
    }),
  )

  // Make `$.use(form)` / `$.self` return values carry default controller actions on top of ModuleHandle (React/Logic aligned).
  const EXTEND_HANDLE = Symbol.for('logix.module.handle.extend')
  let manifestMemo: RulesManifest | undefined
  let manifestWarningsMemo: ReadonlyArray<string> | undefined
  ;(module.tag as any)[EXTEND_HANDLE] = (
    runtime: Logix.ModuleRuntime<FormState<TValues>, FormAction>,
    base: Logix.ModuleHandle<any>,
  ) => {
    const form = controller.make(runtime)
    return {
      ...base,
      controller: form.controller,
      rulesManifest: () => {
        if (!manifestMemo) {
          manifestMemo = buildRulesManifest()
        }
        return manifestMemo
      },
      rulesManifestWarnings: () => {
        if (!manifestWarningsMemo) {
          manifestWarningsMemo = rulesManifestWarningsBase()
        }
        return manifestWarningsMemo
      },
    }
  }

  return module.implement({
    initial: initial(),
    logics: [...logics],
  }) as unknown as FormModule<Id, TValues>
}
