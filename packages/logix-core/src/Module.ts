import { Effect, Layer, Schema, ServiceMap } from 'effect'
import * as Debug from './internal/debug-api.js'
import * as Logic from './Logic.js'
import * as ModuleTagNS from './ModuleTag.js'
import { getLogicDeclarationCapture } from './internal/authoring/logicDeclarationCapture.js'
import { bindLogicSurface, type PublicLogicOptions, type PublicLogicSource } from './internal/authoring/logicSurface.js'
import * as Action from './internal/action.js'
import * as ModuleFieldsRegistry from './internal/debug/ModuleFieldsRegistry.js'
import { build as buildFieldProgram } from './internal/field-kernel/build.js'
import { install as installFieldProgram } from './internal/field-kernel/install.js'
import type { FieldProgram } from './internal/field-kernel/model.js'
import type { JsonValue } from './internal/protocol/jsonValue.js'
import { isDevEnv } from './internal/runtime/core/env.js'
import * as LogicUnitMetaInternal from './internal/runtime/core/LogicUnitMeta.js'
import * as ModuleFields from './internal/runtime/core/ModuleFields.js'
import { listModuleLevelFieldContributions } from './internal/runtime/core/moduleFieldsExpertPath.js'
import { getBoundInternals, setModuleFieldsProgram } from './internal/runtime/core/runtimeInternalsAccessor.js'
import {
  attachProgramRuntimeBlueprint,
  PROGRAM_BLUEPRINT_ID,
  type AnyProgram,
} from './internal/program.js'
import type {
  ActionsFromMap,
  ActionOf,
  AnyModuleShape,
  AnySchema,
  BoundApi,
  LogicEffect,
  ModuleLike,
  ModuleHandle,
  ProgramRuntimeBlueprint,
  ProgramStateTransactionOptions,
  ModuleLogic,
  ModuleRuntime,
  ModuleRuntimeOfShape,
  ModuleTag,
  ModuleShape,
  MutatorsFromMap,
  ReducersFromMap,
  StateChangeWithMeta,
  StateCommitMeta,
  StateCommitMode,
  StateCommitPriority,
  StateOf,
  ReadonlySubscriptionRef,
} from './internal/module.js'

/**
 * Module (definition object) public API.
 *
 * - Domain factories (Form / CRUD / ...) should return this object.
 * - `.tag` is the identity anchor (ModuleTag/Context.Tag), used by `$.use(...)` and Env injection.
 * - Canonical authoring assembly goes through `Program.make(module, config)`.
 * - `Module.logic(id, ($) => { declarations; return runEffect })` is the only public logic builder path.
 * - `.logic()` only produces the logic value; `.withLogic/withLayer(s)` changes the runnable shape (immutable: returns a new object).
 */

export type {
  AnySchema,
  AnyModuleShape,
  ModuleShape,
  ModuleLogic,
  ModuleRuntime,
  ModuleRuntimeOfShape,
  ModuleHandle,
  ModuleTag,
  StateOf,
  ActionOf,
  ActionsFromMap,
  MutatorsFromMap,
  ReducersFromMap,
  BoundApi,
  LogicEffect,
  DispatchEffect,
  ActionForTag,
  BoundApiRootApi,
  BoundApiStateApi,
  BoundApiDispatchersApi,
  BoundApiDispatchApi,
  BoundApiReadyAfterApi,
  BoundApiUseApi,
  BoundApiReducerApi,
  StateCommitMode,
  StateCommitPriority,
  StateCommitMeta,
  StateChangeWithMeta,
  ReadonlySubscriptionRef,
} from './internal/module.js'

export interface DevSource {
  readonly file: string
  readonly line: number
  readonly column: number
}

export interface LogicSource extends PublicLogicSource {}

export interface ModuleDev {
  readonly source?: DevSource
}

export interface LogicUnitOptions {
  readonly id?: string
  readonly kind?: string
  readonly name?: string
  readonly source?: DevSource
}

export interface MountedLogicUnitSummary {
  readonly kind: string
  readonly id: string
  readonly derived?: boolean
  readonly name?: string
}

export interface ModuleDescriptor {
  readonly id: string
  readonly moduleId: string
  readonly instanceId: string
  readonly actionKeys: ReadonlyArray<string>
  readonly logicUnits: ReadonlyArray<MountedLogicUnitSummary>
  readonly schemaKeys?: ReadonlyArray<string>
  readonly meta?: Record<string, JsonValue>
  readonly source?: DevSource
}

export type HandleExtendFn<Sh extends AnyModuleShape, Ext extends object> = (
  runtime: ModuleRuntimeOfShape<Sh>,
  base: ModuleHandle<Sh>,
) => Ext | (ModuleHandle<Sh> & Ext) | null | undefined

export type ModuleSelfHandleEffect<Sh extends AnyModuleShape, R = never, Ext extends object = {}> = LogicEffect<
  Sh,
  R,
  ModuleHandle<Sh> & Ext,
  never
>

export type ModuleLogicApi<Sh extends AnyModuleShape, R = never, Ext extends object = {}> = BoundApi<Sh, R> & {
  readonly self: ModuleSelfHandleEffect<Sh, R, Ext>
}

type NoInfer_<T> = [T][T extends any ? 0 : never]

type MountedLogicUnit<Sh extends AnyModuleShape> = {
  readonly id: string
  readonly derived: boolean
  readonly kind: string
  readonly name?: string
  readonly source?: DevSource
  readonly logic: ModuleLogic<Sh, any, any>
  readonly origin?: {
    readonly explicitId?: string
    readonly defaultId?: string
    readonly derivedBase?: string
  }
}

type LogicOverrideWarning = {
  readonly id: string
  readonly from: Pick<MountedLogicUnit<any>, 'kind' | 'name' | 'source'> & {
    readonly order: number
  }
  readonly to: Pick<MountedLogicUnit<any>, 'kind' | 'name' | 'source'> & {
    readonly order: number
  }
}

type ModuleInternal<Id extends string, Sh extends AnyModuleShape> = {
  readonly initial: StateOf<Sh>
  readonly imports?: ReadonlyArray<Layer.Layer<any, any, any> | ProgramRuntimeBlueprint<any, AnyModuleShape, any>>
  readonly processes?: ReadonlyArray<Effect.Effect<void, any, any>>
  readonly stateTransaction?: ProgramStateTransactionOptions
  readonly mounted: ReadonlyArray<MountedLogicUnit<Sh>>
  readonly overrides: ReadonlyArray<LogicOverrideWarning>
  readonly layers: ReadonlyArray<Layer.Layer<any, never, any>>
  readonly rebuild: () => ProgramRuntimeBlueprint<Id, Sh, any>
}

const MODULE_INTERNAL = Symbol.for('logix.module.internal')
const MODULE_DECLARED_EFFECTS = Symbol.for('logix.module.effects.declared')
const PROGRAM_BLUEPRINT_SEQ_BY_MODULE_ID = new Map<string, number>()

const nextProgramBlueprintId = (moduleId: string): string => {
  const nextSeq = (PROGRAM_BLUEPRINT_SEQ_BY_MODULE_ID.get(moduleId) ?? 0) + 1
  PROGRAM_BLUEPRINT_SEQ_BY_MODULE_ID.set(moduleId, nextSeq)
  return `${moduleId}::program:${nextSeq}`
}

type ModuleBase<
  Id extends string = string,
  Sh extends AnyModuleShape = AnyModuleShape,
  Ext extends object = {},
> = ModuleLike<Id, Sh, Ext> & {
  readonly shape: Sh
  readonly stateSchema: Sh['stateSchema']
  readonly actionSchema: Sh['actionSchema']
  /**
   * Raw ActionMap (tag -> payload schema).
   * - Mainly for DX/reflection; runtime contract is still based on tag.shape/actionSchema.
   */
  readonly actions: Sh['actionMap']
  /**
   * Raw reducers (if provided by the definition).
   * - Mainly for DX/reflection; runtime normalizes them into primary reducers inside ModuleTag/ModuleFactory.
   */
  readonly reducers?: ReducersFromMap<Sh['stateSchema'], Sh['actionMap']>
  readonly live: <R = never, E = never>(
    initial: StateOf<Sh>,
    ...logics: Array<ModuleLogic<Sh, R, E>>
  ) => Layer.Layer<ModuleRuntimeOfShape<Sh>, E, R>
  readonly schemas?: Record<string, unknown>
  readonly meta?: Record<string, JsonValue>
  readonly services?: Record<string, ServiceMap.Key<any, any>>
  readonly dev?: ModuleDev
  readonly logic: <R = never, E = unknown>(
    id: string,
    build: (
      api: ModuleLogicApi<Sh, R, Ext>,
    ) => ModuleLogic<Sh, R, E>,
    options?: PublicLogicOptions,
  ) => ModuleLogic<Sh, R, E>
}

export type { AnyProgram } from './internal/program.js'

export type Program<Id extends string, Sh extends AnyModuleShape, Ext extends object = {}, R = never> = ModuleBase<
  Id,
  Sh,
  Ext
> & {
  readonly _kind: 'Program'
  readonly withLogic: (logic: ModuleLogic<Sh, any, any>, options?: LogicUnitOptions) => Program<Id, Sh, Ext, R>
  readonly withLogics: (...inputs: ReadonlyArray<MountInput<Sh>>) => Program<Id, Sh, Ext, R>
  readonly withLayer: (layer: Layer.Layer<any, never, any>) => Program<Id, Sh, Ext, R>
  readonly withLayers: (...layers: ReadonlyArray<Layer.Layer<any, never, any>>) => Program<Id, Sh, Ext, R>
}

export type Module<Id extends string, Sh extends AnyModuleShape, Ext extends object = {}> = ModuleBase<
  Id,
  Sh,
  Ext
> & {
  readonly _kind: 'Module'
}

export const is = (value: unknown): value is ModuleBase => {
  if (!value || typeof value !== 'object') return false
  const kind = (value as any)._kind
  if (kind !== 'Module' && kind !== 'Program') return false
  return ServiceMap.isKey((value as any).tag)
}

export const unwrapTag = <Id extends string, Sh extends AnyModuleShape>(
  module: ModuleLike<Id, Sh, any>,
): ModuleTag<Id, Sh> => module.tag

export const descriptor = (
  module: ModuleBase<string, AnyModuleShape, any>,
  runtime: ModuleRuntime<any, any>,
): ModuleDescriptor => {
  const actionKeys = Object.keys((module.tag as any).shape?.actionMap ?? {})

  const internal = (module as any)[MODULE_INTERNAL] as ModuleInternal<string, AnyModuleShape> | undefined

  const logicUnits: ReadonlyArray<MountedLogicUnitSummary> = internal
    ? internal.mounted.map((u) => ({
        kind: u.kind,
        id: u.id,
        derived: u.derived ? true : undefined,
        name: u.name,
      }))
    : []

  const schemaKeys = module.schemas && typeof module.schemas === 'object' ? Object.keys(module.schemas) : undefined

  const meta = module.meta && typeof module.meta === 'object' ? module.meta : undefined

  const source = module.dev?.source

  return {
    id: module.id,
    moduleId: String(runtime.moduleId),
    instanceId: String(runtime.instanceId),
    actionKeys,
    logicUnits,
    schemaKeys,
    meta,
    source,
  }
}

type MountInput<Sh extends AnyModuleShape> =
  | ModuleLogic<Sh, any, any>
  | readonly [ModuleLogic<Sh, any, any>, LogicUnitOptions]

type ProgramState<Sh extends AnyModuleShape> = {
  readonly mounted: ReadonlyArray<MountedLogicUnit<Sh>>
  readonly overrides: ReadonlyArray<LogicOverrideWarning>
  readonly layers: ReadonlyArray<Layer.Layer<any, never, any>>
}

export interface ProgramAssemblyConfig<Sh extends AnyModuleShape, R = never> {
  readonly initial: StateOf<Sh>
  readonly logics?: Array<ModuleLogic<Sh, R, any>>
  readonly imports?: ReadonlyArray<Layer.Layer<any, any, any> | ProgramRuntimeBlueprint<any, AnyModuleShape, any>>
  readonly processes?: ReadonlyArray<Effect.Effect<void, any, any>>
  readonly serviceLayers?: ReadonlyArray<Layer.Layer<any, never, any>>
  readonly stateTransaction?: ProgramStateTransactionOptions
}

const normalizeMountInput = <Sh extends AnyModuleShape>(
  input: MountInput<Sh>,
): { readonly logic: ModuleLogic<Sh, any, any>; readonly options?: LogicUnitOptions } => {
  if (Array.isArray(input)) {
    return { logic: input[0], options: input[1] }
  }
  return { logic: input as ModuleLogic<Sh, any, any> }
}

const resolveLogicUnit = <Sh extends AnyModuleShape>(
  existing: ReadonlyArray<MountedLogicUnit<Sh>>,
  logic: ModuleLogic<Sh, any, any>,
  options?: LogicUnitOptions,
): MountedLogicUnit<Sh> => {
  const meta = LogicUnitMetaInternal.getLogicUnitMeta(logic)
  const explicitId = options?.id
  const defaultId = meta?.id

  const kind = (options?.kind ?? meta?.kind ?? 'user').trim() || 'user'
  const name =
    options?.name ?? meta?.name ?? (typeof defaultId === 'string' && defaultId.length > 0 ? defaultId : undefined)

  const source = options?.source ?? meta?.source

  if (typeof explicitId === 'string' && explicitId.trim().length > 0) {
    return {
      id: explicitId.trim(),
      derived: false,
      kind,
      name,
      source,
      logic,
      origin: { explicitId: explicitId.trim(), defaultId },
    }
  }

  if (typeof defaultId === 'string' && defaultId.trim().length > 0) {
    return {
      id: defaultId.trim(),
      derived: false,
      kind,
      name,
      source,
      logic,
      origin: { defaultId: defaultId.trim() },
    }
  }

  // Derived id: reproducible within the same composition order.
  const used = new Set(existing.map((u) => u.id))
  const baseRaw = (name ?? kind ?? 'logic').trim() || 'logic'
  const base = baseRaw.replace(/\s+/g, '_')

  let n = 1
  while (used.has(`${base}#${n}`)) n += 1
  const derivedId = `${base}#${n}`

  return {
    id: derivedId,
    derived: true,
    kind,
    name: name ?? baseRaw,
    source,
    logic,
    origin: { derivedBase: baseRaw },
  }
}

const mountLogicUnit = <Sh extends AnyModuleShape>(
  current: ReadonlyArray<MountedLogicUnit<Sh>>,
  overrides: ReadonlyArray<LogicOverrideWarning>,
  input: { readonly logic: ModuleLogic<Sh, any, any>; readonly options?: LogicUnitOptions },
): {
  readonly mounted: ReadonlyArray<MountedLogicUnit<Sh>>
  readonly overrides: ReadonlyArray<LogicOverrideWarning>
} => {
  const nextUnit = resolveLogicUnit(current, input.logic, input.options)
  // Write the resolved verdict back to logic meta for provenance/diagnostics (aligned with 022-module).
  LogicUnitMetaInternal.updateLogicUnitMeta(nextUnit.logic as any, {
    resolvedId: nextUnit.id,
    resolvedIdKind: nextUnit.derived ? 'derived' : 'explicit',
    resolvedKind: nextUnit.kind,
    resolvedName: nextUnit.name,
    resolvedSource: nextUnit.source as any,
  })

  const prevIndex = current.findIndex((u) => u.id === nextUnit.id)
  if (prevIndex < 0) {
    return { mounted: [...current, nextUnit], overrides }
  }

  const prev = current[prevIndex]
  const nextMounted = [...current.slice(0, prevIndex), ...current.slice(prevIndex + 1), nextUnit]

  const nextOverrides: ReadonlyArray<LogicOverrideWarning> = [
    ...overrides,
    {
      id: nextUnit.id,
      from: {
        kind: prev.kind,
        name: prev.name,
        source: prev.source,
        order: prevIndex,
      },
      to: {
        kind: nextUnit.kind,
        name: nextUnit.name,
        source: nextUnit.source,
        order: nextMounted.length - 1,
      },
    },
  ]

  return { mounted: nextMounted, overrides: nextOverrides }
}

const formatSource = (source?: DevSource): string => {
  if (!source) return 'unknown'
  return `${source.file}:${source.line}:${source.column}`
}

const makeOverrideDiagnosticsLogic = (
  tag: ModuleTag<any, AnyModuleShape>,
  overrides: ReadonlyArray<LogicOverrideWarning>,
): ModuleLogic<any, any, never> => {
  if (overrides.length === 0) {
    return Effect.void as ModuleLogic<any, any, never>
  }

  return tag.logic<any, never>('__logix_internal:logic_override_diagnostics', () =>
    Effect.gen(function* () {
      if (!isDevEnv()) return

      const diagnosticsLevel = yield* Effect.service(Debug.internal.currentDiagnosticsLevel).pipe(Effect.orDie)
      if (diagnosticsLevel === 'off') return

      const runtime = (yield* Effect.service(tag).pipe(Effect.orDie)) as ModuleRuntime<any, any>

      yield* Effect.forEach(
        overrides,
        (o) =>
          Debug.record({
            type: 'diagnostic',
            moduleId: runtime.moduleId,
            instanceId: runtime.instanceId,
            code: 'module_logic::override',
            severity: 'warning',
            message: `logicUnitId "${o.id}" overridden (last-write-wins).`,
            hint:
              `from(#${o.from.order}) kind=${o.from.kind} name=${o.from.name ?? 'unknown'} source=${formatSource(o.from.source)}\n` +
              `to(#${o.to.order}) kind=${o.to.kind} name=${o.to.name ?? 'unknown'} source=${formatSource(o.to.source)}`,
            kind: 'logic_unit_override',
          }),
        { discard: true },
      )
    }).pipe(Effect.catchCause(() => Effect.void)),
  )
}

const makeDeclaredEffectsLogic = (
  tag: ModuleTag<any, AnyModuleShape>,
  effects: Record<string, ReadonlyArray<unknown> | undefined> | undefined,
  moduleId: string,
): ModuleLogic<any, any, never> => {
  if (!effects || typeof effects !== 'object' || Object.keys(effects).length === 0) {
    return Effect.void as any
  }

  const logic = tag.logic('__logix_internal:effects:declared', ($) => ({
    setup: Effect.gen(function* () {
      const actions = ($ as any).actions as Record<string, Action.AnyActionToken>
      const effectApi = ($ as any).effect as
        | ((token: unknown, handler: (payload: unknown) => Effect.Effect<void, any, any>) => Effect.Effect<void, never, any>)
        | undefined
      if (typeof effectApi !== 'function') return

      const wrappedHandlers = new WeakMap<(...args: any[]) => any, (payload: unknown) => Effect.Effect<void, any, any>>()

      for (const actionTag of Object.keys(effects).sort()) {
        const token = actions[actionTag]
        if (!Action.isActionToken(token)) continue

        const handlers = effects[actionTag]
        if (!Array.isArray(handlers)) continue

        for (const handler of handlers) {
          if (typeof handler !== 'function') continue
          let wrapped = wrappedHandlers.get(handler)
          if (!wrapped) {
            wrapped = (payload: unknown) => (handler as any)($, payload)
            wrappedHandlers.set(handler, wrapped)
          }
          yield* effectApi(token, wrapped)
        }
      }
    }),
    run: Effect.void,
  })) as ModuleLogic<any, any, never>

  LogicUnitMetaInternal.attachLogicUnitMeta(logic as any, {
    id: '__logix_internal:effects:declared',
    kind: 'internal',
    name: 'effects:declared',
    moduleId,
  })

  return logic
}

const makeLogicFactory = <Id extends string, Sh extends AnyModuleShape, Ext extends object>(
  selfModule: ModuleBase<Id, Sh, Ext>,
): ModuleBase<Id, Sh, Ext>['logic'] => {
  // Single public builder path: bind the module once, keep declaration work at the builder root,
  // and let the returned effect represent run-time behavior.
  return (id, build, options) => bindLogicSurface(selfModule as any, id, build as any, options as any) as any
}

type CompiledFieldProgram = {
  readonly program: FieldProgram<any>
  readonly snapshot: ModuleFields.ModuleFieldsSnapshot
  readonly usesModuleLevelLegacy: boolean
}

const compileProgramFieldDeclarations = <Id extends string, Sh extends AnyModuleShape>(
  moduleId: Id,
  tag: ModuleTag<Id, Sh>,
  mounted: ReadonlyArray<MountedLogicUnit<Sh>>,
): CompiledFieldProgram | undefined => {
  const contributions: Array<ModuleFields.FieldContribution> = []

  for (const moduleLevel of listModuleLevelFieldContributions(tag as any)) {
    contributions.push({
      fields: moduleLevel.fields,
      provenance: {
        originType: 'module',
        originId: moduleId,
        originIdKind: 'explicit',
        originLabel: `module:${moduleId}`,
      },
    })
  }

  for (const unit of mounted) {
    const capture = getLogicDeclarationCapture(unit.logic as any)
    if (!capture) continue

    for (const fields of capture.fields) {
      if (!fields || typeof fields !== 'object') continue
      contributions.push({
        fields,
        provenance: {
          originType: 'logicUnit',
          originId: unit.id,
          originIdKind: unit.derived ? 'derived' : 'explicit',
          originLabel: `logicUnit:${unit.id}`,
          ...(unit.source ? { path: formatSource(unit.source) } : {}),
        },
      })
    }
  }

  if (contributions.length === 0) {
    return undefined
  }

  const { merged, snapshot } = ModuleFields.finalizeFieldContributions({
    moduleId,
    contributions,
  })

  if (Object.keys(merged as Record<string, unknown>).length === 0) {
    return undefined
  }

  return {
    program: buildFieldProgram(tag.stateSchema as any, merged as any),
    snapshot,
    usesModuleLevelLegacy: contributions.some((x) => x.provenance.originType === 'module'),
  }
}
const makeCompiledFieldInstallLogic = <Id extends string, Sh extends AnyModuleShape>(args: {
  readonly moduleId: Id
  readonly tag: ModuleTag<Id, Sh>
  readonly compiled: CompiledFieldProgram
}): ModuleLogic<Sh, never, never> =>
  args.tag.logic('__logix_internal:fields:install', ($) => ({
    setup: Effect.gen(function* () {
      const internals = getBoundInternals($ as any)
      const diagnosticsLevel = yield* Effect.service(Debug.internal.currentDiagnosticsLevel).pipe(Effect.orDie)

      internals.fields.setModuleFieldsSnapshot(args.compiled.snapshot)

      if (args.compiled.usesModuleLevelLegacy && diagnosticsLevel !== 'off') {
        yield* Debug.record({
          type: 'diagnostic',
          moduleId: args.moduleId,
          instanceId: internals.instanceId,
          code: 'module_fields::expert_path',
          severity: 'warning',
          message: `Module "${args.moduleId}" uses module-level fields via repo-internal migration path.`,
          hint: 'Prefer declaration-phase `$.fields(...)` inside `Module.logic(...)`; keep module-level fields only on repo-internal migration paths.',
          kind: 'module_level_fields_legacy',
        } as any)
      }

      if (diagnosticsLevel !== 'off') {
        const data =
          diagnosticsLevel === 'full'
            ? {
                digest: args.compiled.snapshot.digest,
                count: args.compiled.snapshot.fields.length,
                fields: args.compiled.snapshot.fields,
                provenanceIndex: args.compiled.snapshot.provenanceIndex,
              }
            : {
                digest: args.compiled.snapshot.digest,
                count: args.compiled.snapshot.fields.length,
              }

        yield* Debug.record({
          type: 'trace:module:fields',
          moduleId: args.moduleId,
          instanceId: internals.instanceId,
          data,
        } as any)
      }

      yield* installFieldProgram($ as any, args.compiled.program)
    }),
    run: Effect.void,
  }))

type MakeDef<Id extends string, SSchema extends AnySchema, AMap extends Action.ActionDefs> = {
  readonly state: SSchema
  readonly actions: AMap
  readonly reducers?: ReducersFromMap<SSchema, NoInfer_<AMap>>
  readonly immerReducers?: MutatorsFromMap<SSchema, NoInfer_<AMap>>
  readonly effects?: EffectsFromMap<NoInfer_<AMap>>
  readonly schemas?: Record<string, unknown>
  readonly meta?: Record<string, JsonValue>
  readonly services?: Record<string, ServiceMap.Key<any, any>>
  readonly dev?: ModuleDev
}

type AnyActionMap = Action.ActionDefs
type EmptyActionMap = Record<never, never>

type PayloadOfActionDef<V> = V extends Schema.Schema<any>
  ? Schema.Schema.Type<V>
  : V extends Action.ActionToken<any, infer P, any>
    ? P
    : never

type DeclaredEffectHandler<Payload> = ($: unknown, payload: Payload) => Effect.Effect<void, any, any>

type EffectsFromMap<M extends AnyActionMap> = {
  readonly [K in keyof M]?: ReadonlyArray<DeclaredEffectHandler<PayloadOfActionDef<M[K]>>>
}

type MergeActionMap<Base extends AnyActionMap, Ext extends AnyActionMap> = {
  readonly [K in keyof Base | keyof Ext]: K extends keyof Ext ? Ext[K] : K extends keyof Base ? Base[K] : never
}

/**
 * Module.make "app-side extension/override" parameters (a two-stage responsibility split: domain library author → app developer).
 *
 * - `actions`: add-only (cannot override existing action schema); used to extend actionMap.
 * - `reducers`: add and override; used to override domain reducers or provide reducers for new actions.
 * - Other reflective fields (schemas/meta/services/dev) are shallow-merged (last-write-wins).
 */
export type MakeExtendDef<
  SSchema extends AnySchema,
  BaseActions extends AnyActionMap,
  ExtActions extends AnyActionMap = EmptyActionMap,
> = {
  readonly actions?: ExtActions
  readonly reducers?: ReducersFromMap<SSchema, MergeActionMap<BaseActions, ExtActions>>
  readonly immerReducers?: MutatorsFromMap<SSchema, MergeActionMap<BaseActions, ExtActions>>
  readonly effects?: EffectsFromMap<MergeActionMap<BaseActions, ExtActions>>
  readonly schemas?: Record<string, unknown>
  readonly meta?: Record<string, JsonValue>
  readonly services?: Record<string, ServiceMap.Key<any, any>>
  readonly dev?: ModuleDev
}

const mergeMakeDef = <
  Id extends string,
  SSchema extends AnySchema,
  BaseActions extends AnyActionMap,
  ExtActions extends AnyActionMap,
>(
  base: MakeDef<Id, SSchema, BaseActions>,
  extend?: MakeExtendDef<SSchema, BaseActions, ExtActions>,
): MakeDef<Id, SSchema, MergeActionMap<BaseActions, ExtActions>> => {
  const baseActions = base.actions as Record<string, AnySchema>
  const extActions = (extend?.actions ?? {}) as Record<string, AnySchema>

  for (const key of Object.keys(extActions)) {
    if (key in baseActions && baseActions[key] !== extActions[key]) {
      throw new Error(
        `[Logix.Module.make] action key "${key}" already exists; overriding action schemas is not supported (define a new action tag instead).`,
      )
    }
  }

  const mergedActionDefs = { ...(base.actions as any), ...(extend?.actions as any) } as MergeActionMap<
    BaseActions,
    ExtActions
  >
  const actions = Action.normalizeActions(mergedActionDefs)

  const mergeEffects = (): Record<string, ReadonlyArray<unknown>> | undefined => {
    const baseEffects = (base.effects ?? {}) as Record<string, unknown>
    const extEffects = (extend?.effects ?? {}) as Record<string, unknown>

    const keys = Array.from(new Set([...Object.keys(baseEffects), ...Object.keys(extEffects)])).sort()
    if (keys.length === 0) return undefined

    const out: Record<string, ReadonlyArray<unknown>> = {}
    for (const key of keys) {
      if (!(key in actions)) {
        throw new Error(`[Logix.Module.make] effect key "${key}" does not exist in actionMap.`)
      }

      const baseValue = baseEffects[key]
      const extValue = extEffects[key]
      const baseArr = Array.isArray(baseValue) ? baseValue : baseValue === undefined ? [] : null
      const extArr = Array.isArray(extValue) ? extValue : extValue === undefined ? [] : null

      if (baseArr === null) {
        throw new Error(`[Logix.Module.make] effects["${key}"] must be an array of handlers.`)
      }
      if (extArr === null) {
        throw new Error(`[Logix.Module.make] effects["${key}"] must be an array of handlers.`)
      }

      const merged = [...baseArr, ...extArr].filter((h) => h !== undefined)
      for (const h of merged) {
        if (typeof h !== 'function') {
          throw new Error(`[Logix.Module.make] effects["${key}"] handlers must be functions.`)
        }
      }

      if (merged.length > 0) {
        out[key] = merged as ReadonlyArray<unknown>
      }
    }

    return Object.keys(out).length > 0 ? out : undefined
  }

  const effects = mergeEffects()

  const wrapImmerReducers = (mutators?: Record<string, ((draft: unknown, payload: unknown) => void) | undefined>) => {
    if (!mutators) return {}
    const out: Record<string, unknown> = {}
    for (const key of Object.keys(mutators)) {
      const mutator = mutators[key]
      if (typeof mutator !== 'function') continue
      out[key] = ModuleTagNS.Reducer.mutate(mutator as any)
    }
    return out
  }

  const reducers = {
    ...wrapImmerReducers(base.immerReducers as any),
    ...(base.reducers ?? {}),
    ...wrapImmerReducers(extend?.immerReducers as any),
    ...(extend?.reducers ?? {}),
  } as Record<string, unknown>

  for (const key of Object.keys(reducers)) {
    if (!(key in actions)) {
      throw new Error(`[Logix.Module.make] reducer key "${key}" does not exist in actionMap.`)
    }
  }

  const schemas =
    base.schemas || extend?.schemas ? { ...(base.schemas ?? {}), ...(extend?.schemas ?? {}) } : undefined

  const meta = base.meta || extend?.meta ? { ...(base.meta ?? {}), ...(extend?.meta ?? {}) } : undefined

  const services =
    base.services || extend?.services ? { ...(base.services ?? {}), ...(extend?.services ?? {}) } : undefined

  const dev = base.dev || extend?.dev ? { ...(base.dev ?? {}), ...(extend?.dev ?? {}) } : undefined

  return {
    ...base,
    actions: actions as any,
    reducers: Object.keys(reducers).length > 0 ? (reducers as any) : undefined,
    effects: effects as any,
    schemas,
    meta,
    services,
    dev,
  } as any
}

export const Reducer = ModuleTagNS.Reducer

export type ActionTokenMap<ADefs extends Action.ActionDefs> = Action.NormalizedActionTokens<ADefs>

export type ActionUnionOf<ADefs extends Action.ActionDefs> = ActionsFromMap<ActionTokenMap<ADefs>>

export type ActionSchemaOf<ADefs extends Action.ActionDefs> = Schema.Schema<ActionUnionOf<ADefs>>

export type Shape<SSchema extends AnySchema, ADefs extends Action.ActionDefs> = ModuleShape<
  SSchema,
  ActionSchemaOf<ADefs>,
  ActionTokenMap<ADefs>
>

export function make<
  Id extends string,
  SSchema extends AnySchema,
  AMap extends Action.ActionDefs,
  Ext extends object = {},
>(
  id: Id,
  def: MakeDef<Id, SSchema, AMap>,
): Module<Id, Shape<SSchema, AMap>, Ext>

export function make<
  Id extends string,
  SSchema extends AnySchema,
  AMap extends Action.ActionDefs,
  Ext extends object = {},
  ExtActions extends Action.ActionDefs = EmptyActionMap,
>(
  id: Id,
  def: MakeDef<Id, SSchema, AMap>,
  extend: MakeExtendDef<SSchema, NoInfer_<AMap>, ExtActions>,
): Module<Id, Shape<SSchema, MergeActionMap<AMap, ExtActions>>, Ext>

export function make(id: any, def: any, extend?: any): any {
  const merged = mergeMakeDef(def as any, extend as any)

  const tag = ModuleTagNS.make(id, {
    state: merged.state,
    actions: merged.actions,
    reducers: merged.reducers,
  }) as unknown as ModuleTag<any, AnyModuleShape>

  if (merged.effects && typeof merged.effects === 'object' && Object.keys(merged.effects).length > 0) {
    Object.defineProperty(tag as any, MODULE_DECLARED_EFFECTS, {
      value: merged.effects,
      enumerable: false,
      configurable: true,
      writable: false,
    })
  }

  const base = {
    _kind: 'Module' as const,
    id,
    tag,
    shape: tag.shape,
    stateSchema: tag.stateSchema,
    actionSchema: tag.actionSchema,
    actions: merged.actions,
    reducers: merged.reducers,
    effects: merged.effects,
    live: tag.live,
    schemas: merged.schemas,
    meta: merged.meta,
    services: merged.services,
    dev: merged.dev,
  }

  const module = base as unknown as ModuleBase<any, AnyModuleShape, any> & { readonly _kind: 'Module' }
  ;(module as any).logic = makeLogicFactory(module as any)

  return module as Module<any, AnyModuleShape, any>
}

export const assembleProgram = <Id extends string, Sh extends AnyModuleShape, Ext extends object = {}, R = never>(
  module: Module<Id, Sh, Ext>,
  config: ProgramAssemblyConfig<Sh, R>,
): Program<Id, Sh, Ext, R> => {
  const tag = module.tag as ModuleTag<Id, Sh>
  const declaredEffects = ((tag as any)[MODULE_DECLARED_EFFECTS] ?? undefined) as
    | Record<string, ReadonlyArray<unknown> | undefined>
    | undefined
  const initial = config.initial
  const imports = config.imports
  const serviceLayers = config.serviceLayers ?? []
  const stateTransaction = config.stateTransaction

  const mountedResult = (config.logics ?? []).reduce(
    (
      acc: {
        mounted: ReadonlyArray<MountedLogicUnit<Sh>>
        overrides: ReadonlyArray<LogicOverrideWarning>
      },
      logic: ModuleLogic<Sh, R, any>,
    ) => mountLogicUnit(acc.mounted, acc.overrides, { logic }),
    { mounted: [] as const, overrides: [] as const },
  )

  const buildRuntimeBlueprint = (
    state: ProgramState<Sh>,
    compiledFieldProgram?: CompiledFieldProgram,
  ): ProgramRuntimeBlueprint<Id, Sh, any> => {
    const diagnosticsLogic = makeOverrideDiagnosticsLogic(tag as any, state.overrides)
    const declaredEffectsLogic = makeDeclaredEffectsLogic(tag as any, declaredEffects, module.id)
    const compiledFieldsInstallLogic = compiledFieldProgram
      ? makeCompiledFieldInstallLogic({
          moduleId: module.id,
          tag: tag as any,
          compiled: compiledFieldProgram,
        })
      : undefined

    const allLogics = [
      ...state.mounted.map((u) => u.logic),
      ...(compiledFieldsInstallLogic ? [compiledFieldsInstallLogic] : []),
      declaredEffectsLogic,
      diagnosticsLogic,
    ]

    let blueprint = (tag as any).implement({
      initial,
      logics: allLogics,
      imports,
      processes: config.processes,
      stateTransaction,
    }) as ProgramRuntimeBlueprint<Id, Sh, any>

    for (const layer of state.layers) {
      blueprint = blueprint.withLayer(layer)
    }

    return blueprint
  }

  const createProgram = (state: ProgramState<Sh>): Program<Id, Sh, Ext, R> => {
    const blueprintId = nextProgramBlueprintId(module.id)
    const compiledFieldProgram = compileProgramFieldDeclarations(module.id, tag, state.mounted)
    const internal: ModuleInternal<Id, Sh> = {
      initial,
      imports,
      processes: config.processes,
      stateTransaction,
      mounted: state.mounted,
      overrides: state.overrides,
      layers: state.layers,
      rebuild: () => buildRuntimeBlueprint(state, compiledFieldProgram),
    }

    const blueprint = buildRuntimeBlueprint(state, compiledFieldProgram) as ProgramRuntimeBlueprint<Id, Sh, any> &
      Record<PropertyKey, unknown>

    Object.defineProperty(blueprint, PROGRAM_BLUEPRINT_ID, {
      value: blueprintId,
      enumerable: false,
      configurable: true,
    })

    const program: any = {
      ...module,
      _kind: 'Program' as const,
    }

    attachProgramRuntimeBlueprint(program as AnyProgram, blueprint)

    Object.defineProperty(program, MODULE_INTERNAL, {
      value: internal,
      enumerable: false,
      configurable: true,
    })

    Object.defineProperty(program, PROGRAM_BLUEPRINT_ID, {
      value: blueprintId,
      enumerable: false,
      configurable: true,
    })

    if (compiledFieldProgram) {
      setModuleFieldsProgram(program, compiledFieldProgram.program)
      setModuleFieldsProgram(blueprint, compiledFieldProgram.program)
      setModuleFieldsProgram(tag as any, compiledFieldProgram.program)
      ModuleFieldsRegistry.registerModuleProgram(module.id, compiledFieldProgram.program)
    } else {
      setModuleFieldsProgram(program, undefined)
      setModuleFieldsProgram(blueprint, undefined)
      setModuleFieldsProgram(tag as any, undefined)
    }

    program.logic = makeLogicFactory(program)

    program.withLogic = (logic: ModuleLogic<Sh, any, any>, options?: LogicUnitOptions) =>
      program.withLogics([logic, options] as const)

    program.withLogics = (...inputs: ReadonlyArray<MountInput<Sh>>) => {
      const current = (program as any)[MODULE_INTERNAL] as ModuleInternal<Id, Sh>
      const normalized = inputs.map(normalizeMountInput)
      const next = normalized.reduce((acc, item) => mountLogicUnit(acc.mounted, acc.overrides, item), {
        mounted: current.mounted,
        overrides: current.overrides,
      })

      return createProgram({
        mounted: next.mounted,
        overrides: next.overrides,
        layers: current.layers,
      })
    }

    program.withLayer = (layer: Layer.Layer<any, never, any>) => {
      const current = (program as any)[MODULE_INTERNAL] as ModuleInternal<Id, Sh>
      return createProgram({
        mounted: current.mounted,
        overrides: current.overrides,
        layers: [...current.layers, layer],
      })
    }

    program.withLayers = (...layers: ReadonlyArray<Layer.Layer<any, never, any>>) =>
      layers.reduce((acc, layer) => acc.withLayer(layer), program)

    return program as Program<Id, Sh, Ext, R>
  }

  return createProgram({
    mounted: mountedResult.mounted,
    overrides: mountedResult.overrides,
    layers: [...serviceLayers],
  })
}

export const Manage = {
  make: <D extends (...args: any[]) => AnyProgram>(config: {
    readonly kind?: string
    readonly define: D
  }): { readonly kind?: string; readonly make: D } => ({
    kind: config.kind,
    make: config.define,
  }),
} as const
