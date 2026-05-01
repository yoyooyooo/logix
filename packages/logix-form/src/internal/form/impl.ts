import * as Logix from '@logixjs/core'
import * as FieldContracts from '@logixjs/core/repo-internal/field-contracts'
import * as CoreEvidence from '@logixjs/core/repo-internal/evidence-api'
import { Effect, Schema } from 'effect'
import * as SchemaAST from 'effect/SchemaAST'
import {
  collectSourceOwnershipFromFieldSpec,
  collectSourceSubmitImpactFromFieldSpec,
  mergeFieldSpecs,
  normalizeValidateOn,
  wrapFieldsForValidateOn,
} from './fields.js'
import { makeFormReducers } from './reducer.js'
import {
  makeFormHandle,
  type EffectfulFieldRule,
  type EffectfulListRule,
  type EffectfulListItemRule,
  type FormHandle,
  type SubmitVerdict,
} from './commands.js'
import { buildRulesManifest, compileRulesToFieldSpec, rulesManifestWarningsBase } from './rules.js'
import type { RuleDescriptor, RuleScope, RulesManifest } from './rules.js'
import { install as installLogic } from './install.js'
import {
  makeFormEvidenceContractArtifactExporter,
  makeFormRulesManifestArtifactExporter,
  type FormCompanionOwnershipContract,
} from './artifacts.js'
import * as Rule from '../../Rule.js'
import type {
  CanonicalDepValue,
  CanonicalListItem,
  CanonicalListPath,
  CanonicalPath,
  CanonicalValue,
} from './types.js'
import { rules as makeRulesDsl } from '../dsl/rules.js'
import type { RulesSpec } from '../dsl/rules.js'
import type { FormSubmitAttemptSnapshot } from './errors.js'
import { makeInitialSubmitAttemptSnapshot } from './errors.js'
import { getAtPath } from './path.js'

export type { RuleDescriptor, RuleScope, RulesManifest } from './rules.js'
export type { FormHandle, SubmitVerdict } from './commands.js'

export type FormErrors = unknown
export type FormUiState = unknown

export type FormMeta = {
  readonly submitCount: number
  readonly isSubmitting: boolean
  readonly isDirty: boolean
  readonly errorCount: number
  readonly submitAttempt: FormSubmitAttemptSnapshot
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
  setSubmitAttempt: Schema.Unknown,
  reset: Schema.UndefinedOr(Schema.Unknown),
  setError: Schema.Struct({ path: Schema.String, error: Schema.Unknown }),
  clearErrors: Schema.UndefinedOr(Schema.Array(Schema.String)),
  arrayAppend: Schema.Struct({ path: Schema.String, value: Schema.Unknown }),
  arrayPrepend: Schema.Struct({ path: Schema.String, value: Schema.Unknown }),
  arrayInsert: Schema.Struct({ path: Schema.String, index: Schema.Number, value: Schema.Unknown }),
  arrayUpdate: Schema.Struct({ path: Schema.String, index: Schema.Number, value: Schema.Unknown }),
  arrayReplace: Schema.Struct({ path: Schema.String, items: Schema.Array(Schema.Unknown) }),
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

type FormShapeForActions = FormShape<Record<string, never>>
type FormRulesDecl = any
type FormRulesInput = FormRulesDecl | ReadonlyArray<FormRulesDecl>

export type FormAction = Logix.Module.ActionOf<FormShapeForActions>
export type FormShape<TValues extends object> = Logix.Module.Shape<Schema.Schema<FormState<TValues>>, typeof FormActions>

export interface FormMakeConfig<TValues extends object> {
  readonly values: Schema.Schema<TValues>
  readonly initialValues: TValues
  readonly validateOn?: ReadonlyArray<'onSubmit' | 'onChange' | 'onBlur'>
  readonly reValidateOn?: ReadonlyArray<'onSubmit' | 'onChange' | 'onBlur'>
  readonly debounceMs?: number
}

export type SourceReceipt<Data = unknown, Err = unknown> = Readonly<{
  readonly status: 'idle' | 'loading' | 'success' | 'error'
  readonly keyHash?: string
  readonly data?: Data
  readonly error?: Err
}>

type SourceReceiptFromValue<Value> =
  Extract<Value, SourceReceipt<any, any>> extends never
    ? SourceReceipt<unknown, unknown>
    : Extract<Value, SourceReceipt<any, any>>

export type AvailabilityKind = 'interactive' | 'hidden' | 'disabled'

export type AvailabilityFact<Extra extends object = Record<string, unknown>> = Readonly<
  {
    readonly kind: AvailabilityKind
  } & Extra
>

export type CandidateProjection = Readonly<{
  readonly value: string
  readonly label: string
}>

export type CandidateSet<Item = unknown, Extra extends object = Record<string, unknown>> = Readonly<
  {
    readonly items: ReadonlyArray<Item>
    readonly keepCurrent?: boolean
    readonly project?: CandidateProjection
  } & Extra
>

export type CompanionBundle<
  Availability extends AvailabilityFact = AvailabilityFact,
  Candidates extends CandidateSet = CandidateSet,
> = Readonly<{
  readonly availability?: Availability
  readonly candidates?: Candidates
}>

export type CompanionDepsMap<
  TValues extends object,
  Deps extends ReadonlyArray<CanonicalPath<TValues>>,
> = Readonly<{
  readonly [Path in Deps[number]]: CanonicalDepValue<TValues, Path>
}>

export type CompanionLowerContext<
  TValues extends object,
  P extends CanonicalPath<TValues>,
  Deps extends ReadonlyArray<CanonicalPath<TValues>>,
  Source = SourceReceiptFromValue<CanonicalValue<TValues, P>>,
> = Readonly<{
  readonly value: CanonicalValue<TValues, P>
  readonly deps: CompanionDepsMap<TValues, Deps>
  readonly source?: Source
}>

export type FormCompanionMetadataMap = Readonly<Record<string, unknown>>

export type FormProgramCompanionMetadataCarrier<
  TCompanionMetadata extends FormCompanionMetadataMap = {},
> = Readonly<{
  readonly __logixFormCompanionMetadata?: TCompanionMetadata
}>

type UnionToIntersection<U> = (U extends unknown ? (value: U) => void : never) extends (value: infer I) => void
  ? I
  : never

type CompanionMetadataFromDefineReturn<T> = T extends FormProgramCompanionMetadataCarrier<infer Metadata>
  ? Metadata
  : T extends ReadonlyArray<infer Item>
    ? UnionToIntersection<CompanionMetadataFromDefineReturn<Item>>
    : {}

/**
 * semantic-owner boundary:
 * - define(form) remains the declaration and semantic owner.
 * - internal lowering may refine admitted enablers, but cannot mint a second authoring route.
 */
export interface FormDefineApi<TValues extends object, TDecoded = TValues> {
  readonly rules: (...decls: ReadonlyArray<unknown>) => void
  readonly dsl: unknown
  readonly field: <P extends CanonicalPath<TValues>, Ctx = unknown>(
    path: P,
  ) => {
    readonly rule: (
      rule: Rule.RuleInput<CanonicalValue<TValues, P>, Ctx>,
      options?: { readonly errorTarget?: Rule.ErrorTarget },
    ) => void
    readonly source: (config: {
      readonly resource: { readonly id: string }
      readonly deps: ReadonlyArray<CanonicalPath<TValues>>
      readonly key: (...depsValues: ReadonlyArray<unknown>) => unknown | undefined
      readonly triggers?: ReadonlyArray<'onMount' | 'onKeyChange'>
      readonly debounceMs?: number
      readonly concurrency?: 'switch' | 'exhaust-trailing'
      readonly submitImpact?: 'block' | 'observe'
    }) => void
    readonly companion: <
      const Deps extends ReadonlyArray<CanonicalPath<TValues>>,
      LowerResult extends CompanionBundle | undefined,
    >(config: {
      readonly deps: Deps
      readonly lower: (ctx: CompanionLowerContext<TValues, P, Deps>) => LowerResult
    }) => FormProgramCompanionMetadataCarrier<Readonly<Record<P, LowerResult>>>
  }
  readonly root: <Ctx = unknown>(rule: Rule.RuleInput<TValues, Ctx>) => void
  readonly list: <P extends CanonicalListPath<TValues>, Ctx = unknown>(
    path: P,
    spec: {
      readonly identity: Rule.ListIdentityPolicy
      readonly item?: Rule.RuleInput<CanonicalListItem<TValues, P>, Ctx>
      readonly list?: Rule.RuleInput<ReadonlyArray<CanonicalListItem<TValues, P>>, Ctx>
      readonly minItems?: Rule.MinItemsDecl
      readonly maxItems?: Rule.MaxItemsDecl
    },
  ) => void
  readonly submit: (config?: {
    readonly decode?: Schema.Schema<TDecoded>
  }) => void
}

export type FormProgram<
  Id extends string,
  TValues extends object,
  TDecoded = TValues,
  TCompanionMetadata extends FormCompanionMetadataMap = {},
> = Logix.Program.Program<
  Id,
  FormShape<TValues>,
  FormHandle<TValues, TDecoded> & FormProgramCompanionMetadataCarrier<TCompanionMetadata>,
  any
>

const initialMeta = (): FormMeta => ({
  submitCount: 0,
  isSubmitting: false,
  isDirty: false,
  errorCount: 0,
  submitAttempt: makeInitialSubmitAttemptSnapshot(),
})

const toRulesSpec = <TValues extends object>(
  decls: ReadonlyArray<FormRulesDecl>,
  fieldFragments?: Record<string, unknown>,
): RulesSpec<TValues> => ({
  _tag: 'FormRulesSpec',
  decls,
  ...(fieldFragments !== undefined ? { fieldFragments } : {}),
}) as RulesSpec<TValues>

const readResourceId = (resource: unknown): string => {
  const id =
    resource && typeof resource === 'object' && !Array.isArray(resource) ? (resource as { readonly id?: unknown }).id : undefined
  if (typeof id !== 'string' || id.trim().length === 0) {
    throw new Error(`[Form.make] field(...).source({ resource }) expects a Query-owned resource with a non-empty string id`)
  }
  return id.trim()
}

const collectEffectfulFieldRulesFromFieldSpec = (
  spec: Record<string, unknown> | undefined,
): ReadonlyArray<EffectfulFieldRule> => {
  const out: Array<EffectfulFieldRule> = []
  if (!spec) return out

  const collectCheckEntry = (path: string, entry: unknown): void => {
    if (!entry || typeof entry !== 'object') return
    if ((entry as any).kind !== 'check') return
    const rules = (entry as any).meta?.rules
    if (!rules || typeof rules !== 'object' || Array.isArray(rules)) return

    for (const [name, rule] of Object.entries(rules as Record<string, any>)) {
      const validate = Rule.getEffectfulValidate(rule?.validate)
      if (!validate) continue
      out.push({
        path,
        ...(path === '$root' ? { inputPath: '$root', errorPath: 'errors.$root' } : null),
        ruleId: `${path}#${name}`,
        validate,
      })
    }
  }

  const collectNode = (path: string, node: unknown): void => {
    if (!node || typeof node !== 'object') return
    if ((node as any)._tag !== 'FieldNode') return
    const check = (node as any).check
    if (!check || typeof check !== 'object' || Array.isArray(check)) return
    collectCheckEntry(path, {
      kind: 'check',
      meta: { rules: check },
    })
  }

  for (const [path, value] of Object.entries(spec)) {
    if (!value || typeof value !== 'object') continue
    if ((value as any).kind === 'check') {
      collectCheckEntry(path, value)
      continue
    }
    if ((value as any)._tag === 'FieldNode') {
      collectNode(path, value)
    }
  }

  return out
}

const collectEffectfulListItemRulesFromFieldSpec = (
  spec: Record<string, unknown> | undefined,
): ReadonlyArray<EffectfulListItemRule> => {
  const out: Array<EffectfulListItemRule> = []
  if (!spec) return out

  for (const [path, value] of Object.entries(spec)) {
    if (!value || typeof value !== 'object') continue
    if ((value as any)._tag !== 'FieldList') continue
    const item = (value as any).item
    if (!item || typeof item !== 'object' || item._tag !== 'FieldNode') continue
    const check = item.check
    if (!check || typeof check !== 'object' || Array.isArray(check)) continue
    for (const [name, rule] of Object.entries(check as Record<string, any>)) {
      const validate = Rule.getEffectfulValidate(rule?.validate)
      if (!validate) continue
      out.push({
        listPath: path,
        ruleId: `${path}#item.${name}`,
        validate,
      })
    }
  }

  return out
}

const collectEffectfulListRulesFromFieldSpec = (
  spec: Record<string, unknown> | undefined,
): ReadonlyArray<EffectfulListRule> => {
  const out: Array<EffectfulListRule> = []
  if (!spec) return out

  for (const [path, value] of Object.entries(spec)) {
    if (!value || typeof value !== 'object') continue
    if ((value as any)._tag !== 'FieldList') continue
    const list = (value as any).list
    if (!list || typeof list !== 'object' || list._tag !== 'FieldNode') continue
    const check = list.check
    if (!check || typeof check !== 'object' || Array.isArray(check)) continue
    for (const [name, rule] of Object.entries(check as Record<string, any>)) {
      const validate = Rule.getEffectfulValidate(rule?.validate)
      if (!validate) continue
      out.push({
        listPath: path,
        ruleId: `${path}#list.${name}`,
        validate,
      })
    }
  }

  return out
}

const canonicalPathSegments = (path: string): ReadonlyArray<string> =>
  String(path ?? '')
    .split('.')
    .map((segment) => segment.trim())
    .filter(Boolean)

const toCompanionBundlePath = (patternPath: string): string => `ui.${patternPath}.$companion`

const uniqueStrings = (values: ReadonlyArray<string>): ReadonlyArray<string> => {
  const out: Array<string> = []
  const seen = new Set<string>()
  for (const value of values) {
    if (!value || seen.has(value)) continue
    seen.add(value)
    out.push(value)
  }
  return out
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const deepEqual = (left: unknown, right: unknown): boolean => {
  if (Object.is(left, right)) return true
  if (Array.isArray(left) && Array.isArray(right)) {
    if (left.length !== right.length) return false
    for (let index = 0; index < left.length; index += 1) {
      if (!deepEqual(left[index], right[index])) return false
    }
    return true
  }
  if (isPlainObject(left) && isPlainObject(right)) {
    const leftKeys = Object.keys(left)
    const rightKeys = Object.keys(right)
    if (leftKeys.length !== rightKeys.length) return false
    for (const key of leftKeys) {
      if (!(key in right)) return false
      if (!deepEqual(left[key], right[key])) return false
    }
    return true
  }
  return false
}

const readCanonicalPathValue = (state: unknown, canonicalPath: string): unknown => {
  const segments = canonicalPathSegments(canonicalPath)
  const read = (current: unknown, index: number): unknown => {
    if (index >= segments.length) return current
    if (current == null) return undefined

    if (Array.isArray(current)) {
      return current.map((item) => read(item, index))
    }

    if (!isPlainObject(current)) return undefined
    return read(current[segments[index]!], index + 1)
  }

  return read(state, 0)
}

type CompanionRowScopeMeta = {
  readonly _depsAbsolute: true
  readonly _formCompanion: true
  readonly _companionValuePatternPath: string
  readonly _companionDeriveAtPath: (
    rootState: unknown,
    valuePath: string,
    sourcePath: string,
    rowIndices: ReadonlyArray<number>,
  ) => unknown
}

type ComputedMetaLike = {
  readonly deps: ReadonlyArray<string>
  readonly derive: (state: unknown) => unknown
  readonly equals?: (prev: unknown, next: unknown) => boolean
  readonly scheduling?: unknown
}

const buildCompanionEntry = <TValues extends object>(
  params: {
    readonly patternFieldPath: string
    readonly deps: ReadonlyArray<{
      readonly canonical: string
      readonly pattern: string
    }>
    readonly rowScope: ReturnType<typeof RowScopeInfo.fromPatternPath>
    readonly lower: (ctx: {
      readonly value: unknown
      readonly deps: Readonly<Record<string, unknown>>
      readonly source?: unknown
      }) => Readonly<{ readonly availability?: unknown; readonly candidates?: unknown }> | undefined
  },
): FieldContracts.FieldEntry<any, string> => {
  const companionDeps = uniqueStrings([params.patternFieldPath, ...params.deps.map((dep) => dep.pattern)])

  if (params.rowScope) {
    const rowScope = params.rowScope
    const meta: ComputedMetaLike & CompanionRowScopeMeta = {
      deps: companionDeps as ReadonlyArray<any>,
      derive: () => undefined,
      equals: deepEqual,
      _depsAbsolute: true,
      _formCompanion: true,
      _companionValuePatternPath: params.patternFieldPath,
      _companionDeriveAtPath: (
        rootState: unknown,
        valuePath: string,
        sourcePath: string,
        _rowIndices: ReadonlyArray<number>,
      ) =>
        params.lower({
          value: getAtPath(rootState, valuePath),
          deps: Object.freeze(
            Object.fromEntries(
              params.deps.map((dep) => [dep.canonical, readCanonicalPathValue(rootState, dep.canonical)]),
            ),
          ),
          source: getAtPath(rootState, sourcePath),
        }),
    }

    return {
      fieldPath: undefined as never,
      kind: 'computed',
      meta,
    } as FieldContracts.FieldEntry<any, string>
  }

  const concretePatternPath = params.patternFieldPath.split('[]').join('')
  const meta: ComputedMetaLike & { readonly _depsAbsolute: true; readonly _formCompanion: true } = {
    deps: companionDeps as ReadonlyArray<any>,
    equals: deepEqual,
    _depsAbsolute: true,
    _formCompanion: true,
    derive: (state: unknown) =>
      params.lower({
        value: getAtPath(state, concretePatternPath),
        deps: Object.freeze(
          Object.fromEntries(params.deps.map((dep) => [dep.canonical, readCanonicalPathValue(state, dep.canonical)])),
        ),
        source: getAtPath(state, concretePatternPath),
      }),
  }

  return {
    fieldPath: undefined as never,
    kind: 'computed',
    meta,
  } as FieldContracts.FieldEntry<any, string>
}

const RowScopeInfo = {
  fromPatternPath: (patternFieldPath: string) => {
    const parts = patternFieldPath.split('.')
    const scopes: Array<{
      readonly listPath: string
      readonly itemValuePath: string
    }> = []

    for (let index = 0; index < parts.length; index += 1) {
      if (!parts[index]!.endsWith('[]')) continue
      const listPath = parts
        .slice(0, index + 1)
        .map((segment) => (segment.endsWith('[]') ? segment.slice(0, -2) : segment))
        .join('.')
      const nextArrayIndex = (() => {
        for (let cursor = index + 1; cursor < parts.length; cursor += 1) {
          if (parts[cursor]!.endsWith('[]')) return cursor
        }
        return parts.length
      })()
      const itemValuePath = parts
        .slice(index + 1, nextArrayIndex)
        .map((segment) => (segment.endsWith('[]') ? segment.slice(0, -2) : segment))
        .join('.')
      scopes.push({
        listPath,
        itemValuePath,
      })
    }

    if (scopes.length === 0) return undefined
    return {
      scopes,
    }
  },
} as const

const getArrayElementAst = (ast: SchemaAST.AST): SchemaAST.AST | undefined => {
  if (!SchemaAST.isArrays(ast)) return undefined
  return ast.elements[0] ?? ast.rest[0]
}

const canonicalPathToPatternPath = <TValues extends object>(schema: Schema.Schema<TValues>, path: string): string => {
  const segments = canonicalPathSegments(path)
  if (segments.length === 0) return path

  let current: SchemaAST.AST = SchemaAST.toType(schema.ast)
  const seen = new Set<SchemaAST.AST>()
  const out: Array<string> = []

  const unwrap = (): boolean => {
    while (true) {
      current = SchemaAST.toType(current)

      while (SchemaAST.isSuspend(current)) {
        if (seen.has(current)) return false
        seen.add(current)
        current = SchemaAST.toType(current.thunk())
      }

      if (SchemaAST.isUnion(current)) {
        const next = current.types[0]
        if (!next) return false
        current = SchemaAST.toType(next)
        continue
      }

      if (SchemaAST.isArrays(current)) {
        if (out.length === 0) return false
        const last = out[out.length - 1]!
        if (!last.endsWith('[]')) out[out.length - 1] = `${last}[]`
        const item = getArrayElementAst(current)
        if (!item) return false
        current = SchemaAST.toType(item)
        continue
      }

      return true
    }
  }

  for (const segment of segments) {
    if (!unwrap()) return path
    if (!SchemaAST.isObjects(current)) return path
    const property = current.propertySignatures.find((ps) => String(ps.name) === segment)
    if (!property) return path
    out.push(segment)
    current = SchemaAST.toType(property.type)
  }

  return out.join('.')
}

const rowScopedPrefixInfo = (canonicalPath: string, patternPath: string): ReadonlyArray<string> | undefined => {
  const patternSegments = canonicalPathSegments(patternPath)
  let lastArrayIndex = -1
  for (let i = 0; i < patternSegments.length; i++) {
    if (patternSegments[i]!.endsWith('[]')) lastArrayIndex = i
  }
  if (lastArrayIndex < 0) return undefined
  const canonicalSegments = canonicalPathSegments(canonicalPath)
  return canonicalSegments.slice(0, lastArrayIndex + 1)
}

const buildDefineApi = <TValues extends object, TDecoded>(
  valuesSchema: Schema.Schema<TValues>,
  pushRules: (decls: ReadonlyArray<unknown>) => void,
  setSubmit: (config?: { readonly decode?: Schema.Schema<TDecoded> }) => void,
  registerSourceSubmitImpact: (path: string, impact: 'block' | 'observe') => void,
  registerCompanionOwnership: (contract: FormCompanionOwnershipContract) => void,
): FormDefineApi<TValues, TDecoded> => ({
  dsl: makeRulesDsl(valuesSchema),
  rules: (...decls) => {
    pushRules(decls)
  },
  field: (path) => ({
    rule: (rule, options) => {
      pushRules([Rule.field(path, rule, options)])
    },
    source: (config) => {
      const resourceId = readResourceId(config.resource)
      const patternPath = canonicalPathToPatternPath(valuesSchema, String(path))
      const rowScopedPrefix = rowScopedPrefixInfo(String(path), patternPath)
      const depsInfo = config.deps.map((dep) => {
        const depCanonical = String(dep)
        const depPattern = canonicalPathToPatternPath(valuesSchema, depCanonical)
        if (!rowScopedPrefix) {
          return {
            depPattern,
            keyPath: depCanonical,
          }
        }

        const depSegments = canonicalPathSegments(depCanonical)
        const isSameRowScope =
          depSegments.length > rowScopedPrefix.length && rowScopedPrefix.every((segment, index) => depSegments[index] === segment)

        if (!isSameRowScope) {
          throw new Error(
            `[Form.make] row-scoped field(...).source(...) currently requires deps to stay within the same list item (field="${String(path)}", dep="${depCanonical}")`,
          )
        }

        return {
          depPattern,
          keyPath: depSegments.slice(rowScopedPrefix.length).join('.'),
        }
      })
      pushRules([
        toRulesSpec([], {
          [patternPath]: FieldContracts.fieldNode({
            source: {
              fieldPath: undefined as never,
              kind: 'source',
              meta: {
                resource: resourceId,
                deps: depsInfo.map((entry) => entry.depPattern),
                _depsAbsolute: true,
                key: (state: Readonly<TValues>) => {
                  const args = depsInfo.map((entry) => getAtPath(state, entry.keyPath))
                  return config.key(...args)
                },
                ...(config.submitImpact !== undefined ? { submitImpact: config.submitImpact } : {}),
                ...(config.triggers !== undefined ? { triggers: config.triggers } : {}),
                ...(config.debounceMs !== undefined ? { debounceMs: config.debounceMs } : {}),
                ...(config.concurrency !== undefined ? { concurrency: config.concurrency } : {}),
              },
            } as any,
          } as any),
        }),
      ])
      registerSourceSubmitImpact(patternPath, config.submitImpact ?? 'block')
    },
    companion: (config) => {
      const patternPath = canonicalPathToPatternPath(valuesSchema, String(path))
      const companionDeps = config.deps.map((dep) => ({
        canonical: String(dep),
        pattern: canonicalPathToPatternPath(valuesSchema, String(dep)),
      }))
      const bundlePatchPath = toCompanionBundlePath(patternPath)
      const rowScope = RowScopeInfo.fromPatternPath(patternPath)

      pushRules([
        toRulesSpec([], {
          [bundlePatchPath]: buildCompanionEntry({
            patternFieldPath: patternPath,
            deps: companionDeps,
            rowScope,
            lower: config.lower as any,
          }),
        }),
      ])

      registerCompanionOwnership({
        fieldPath: patternPath,
        deps: uniqueStrings([String(path), ...config.deps.map((dep) => String(dep))]),
        companionRef: `companion:${patternPath}`,
        sourceRef: String(path),
      })
      return undefined as any
    },
  }),
  root: (rule) => {
    pushRules([Rule.root(rule)])
  },
  list: (path, spec) => {
    pushRules([Rule.list(path, spec)])
  },
  submit: (config) => {
    setSubmit(config)
  },
})

export const make = <
  Id extends string,
  TValues extends object,
  TDecoded = TValues,
  TDefineReturn = void,
>(
  id: Id,
  config: FormMakeConfig<TValues>,
  define?: (form: FormDefineApi<TValues, TDecoded>) => TDefineReturn,
): FormProgram<Id, TValues, TDecoded, CompanionMetadataFromDefineReturn<TDefineReturn>> => {
  const ErrorsSchema = Schema.Unknown
  const UiSchema = Schema.Unknown
  const MetaSchema = Schema.Struct({
    submitCount: Schema.Number,
    isSubmitting: Schema.Boolean,
    isDirty: Schema.Boolean,
    errorCount: Schema.Number,
    submitAttempt: Schema.Unknown,
  })

  const StateSchema = Schema.Struct({
    ...((config.values as unknown as { fields: Record<string, Schema.Schema<any>> }).fields ?? {}),
    errors: ErrorsSchema,
    ui: UiSchema,
    $form: MetaSchema,
  }) as unknown as Schema.Schema<FormState<TValues>>

  type State = Schema.Schema.Type<typeof StateSchema>
  type Reducers = Logix.ReducersFromMap<typeof StateSchema, typeof FormActions>

  const collectedDecls: Array<FormRulesDecl> = []
  let collectedFieldFragments: Record<string, unknown> | undefined
  let submitConfig: { readonly decode?: Schema.Schema<TDecoded> } | undefined
  const sourceSubmitImpactByPath = new Map<string, 'block' | 'observe'>()
  const companionOwnership: Array<FormCompanionOwnershipContract> = []

  const pushRulesInputs = (inputs: ReadonlyArray<unknown>): void => {
    for (const item of inputs) {
      if (Array.isArray(item)) {
        pushRulesInputs(item)
        continue
      }
      if (item && typeof item === 'object' && (item as any)._tag === 'FormRulesSpec') {
        const spec = item as { readonly decls?: ReadonlyArray<FormRulesDecl>; readonly fieldFragments?: Record<string, unknown> }
        if (Array.isArray(spec.decls)) {
          collectedDecls.push(...spec.decls)
        }
        if (spec.fieldFragments && typeof spec.fieldFragments === 'object') {
          collectedFieldFragments = mergeFieldSpecs(
            collectedFieldFragments,
            spec.fieldFragments,
            'define.rules',
            'define.rules',
          ) as Record<string, unknown> | undefined
        }
        continue
      }
      collectedDecls.push(item as FormRulesDecl)
    }
  }

  const setSubmit = (next?: { readonly decode?: Schema.Schema<TDecoded> }): void => {
    if (submitConfig !== undefined) {
      throw new Error(`[Form.make] submit(...) can only be declared once`)
    }
    submitConfig = next
  }

  if (typeof define === 'function') {
    define(
      buildDefineApi(
        config.values,
        (decls) => pushRulesInputs(decls),
        setSubmit,
        (path, impact) => {
          sourceSubmitImpactByPath.set(path, impact)
        },
        (contract) => {
          companionOwnership.push(contract)
        },
      ),
    )
  }

  const authoringRules =
    collectedDecls.length > 0 || collectedFieldFragments !== undefined
      ? toRulesSpec(collectedDecls, collectedFieldFragments)
      : undefined
  const rulesSpec = authoringRules ? compileRulesToFieldSpec(authoringRules) : undefined
  const validateOn = normalizeValidateOn(config.validateOn, ['onSubmit'])
  const reValidateOn = normalizeValidateOn(config.reValidateOn, ['onChange'])
  const fieldsWrapped = rulesSpec
    ? wrapFieldsForValidateOn(rulesSpec as any, { validateOn, reValidateOn })
    : undefined
  const fields = mergeFieldSpecs(
    fieldsWrapped?.fields as Record<string, unknown> | undefined,
    collectedFieldFragments,
    'Form rules',
    'Form field behaviors',
  ) as unknown as FieldContracts.FieldSpec<TValues> | undefined
  const sourceOwnership = collectSourceOwnershipFromFieldSpec(fields as Record<string, unknown> | undefined)
  const sourceSubmitImpactResolved = collectSourceSubmitImpactFromFieldSpec(fields as Record<string, unknown> | undefined)
  const effectfulFieldRules = collectEffectfulFieldRulesFromFieldSpec(fields as Record<string, unknown> | undefined)
  const effectfulListItemRules = collectEffectfulListItemRulesFromFieldSpec(fields as Record<string, unknown> | undefined)
  const effectfulListRules = collectEffectfulListRulesFromFieldSpec(fields as Record<string, unknown> | undefined)
  const rulesValidateOn = fieldsWrapped?.rulesValidateOn ?? []
  const reducers = makeFormReducers<TValues>({
    initialValues: config.initialValues,
  }) as unknown as Reducers

  const def = {
    state: StateSchema,
    actions: FormActions,
    reducers,
    schemas: { values: config.values },
  }

  const module = Logix.Module.make<Id, typeof StateSchema, typeof FormActions, FormHandle<TValues, TDecoded>>(id, def)

  const fieldsLogic =
    fields === undefined
      ? undefined
      : module.logic('__form_internal:fields', ($) => {
          $.fields(fields as any)
          return Effect.void
        })

  const logics: ReadonlyArray<Logix.ModuleLogic<any, any, any>> = [
    ...(fieldsLogic ? [fieldsLogic] : []),
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

  const submitSchema = (submitConfig?.decode ?? (config.values as unknown as Schema.Schema<TDecoded>)) as Schema.Schema<TDecoded>

  CoreEvidence.registerTrialRunArtifactExporter(
    module.tag as any,
    makeFormRulesManifestArtifactExporter({
      getManifest: () =>
        buildRulesManifest({
          moduleId: id,
          valuesSchema: config.values,
          rules: authoringRules,
        }),
      getWarnings: () => rulesManifestWarningsBase({ rules: authoringRules }),
    }),
  )
  CoreEvidence.registerTrialRunArtifactExporter(
    module.tag as any,
    makeFormEvidenceContractArtifactExporter({
      getSourceOwnership: () => sourceOwnership,
      getCompanionOwnership: () => companionOwnership,
    }),
  )

  const EXTEND_HANDLE = Symbol.for('logix.module.handle.extend')
  ;(module.tag as any)[EXTEND_HANDLE] = (
    runtime: Logix.ModuleRuntime<FormState<TValues>, FormAction>,
    base: Logix.ModuleHandle<any>,
  ) => {
    const bound = FieldContracts.makeBound(module.shape as any, runtime as any)
    const sourceWiring = FieldContracts.makeFieldSourceWiring(bound as any, module.tag)

    return {
      ...base,
      ...makeFormHandle<TValues, TDecoded>({
        runtime,
        shape: module.shape,
        valuesSchema: config.values,
        submitSchema,
        sourceSubmitImpactByPath: sourceSubmitImpactResolved.size > 0 ? sourceSubmitImpactResolved : sourceSubmitImpactByPath,
        flushSubmitSources: sourceWiring.flushForSubmit,
        effectfulFieldRules,
        effectfulListItemRules,
        effectfulListRules,
      }),
    }
  }

  return Logix.Program.make<
    Id,
    FormShape<TValues>,
    FormHandle<TValues, TDecoded> & FormProgramCompanionMetadataCarrier<CompanionMetadataFromDefineReturn<TDefineReturn>>,
    any
  >(module, {
    initial: initial(),
    logics: [...logics],
  }) as unknown as FormProgram<Id, TValues, TDecoded, CompanionMetadataFromDefineReturn<TDefineReturn>>
}
