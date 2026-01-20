import { Context, Effect, FiberRef, Layer, Schema } from 'effect'
import * as Debug from './Debug.js'
import * as Logic from './Logic.js'
import * as ModuleTagNS from './ModuleTag.js'
import type { Workflow } from './Workflow.js'
import * as Action from './internal/action.js'
import * as WorkflowRuntime from './internal/runtime/core/WorkflowRuntime.js'
import { isDevEnv } from './internal/runtime/core/env.js'
import * as LogicUnitMetaInternal from './internal/runtime/core/LogicUnitMeta.js'
import type {
  ActionsFromMap,
  ActionOf,
  AnyModuleShape,
  AnySchema,
  BoundApi,
  LogicEffect,
  ModuleLike,
  ModuleHandle,
  ModuleImpl,
  ModuleImplementStateTransactionOptions,
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
} from './internal/module.js'

/**
 * Module (definition object) public API.
 *
 * - Domain factories (Form / CRUD / ...) should return this object.
 * - `.tag` is the identity anchor (ModuleTag/Context.Tag), used by `$.use(...)` and Env injection.
 * - `.impl` is the assembly blueprint (ModuleImpl), consumed by React/Runtime entry points.
 * - `.logic()` only produces the logic value; `.withLogic/withLayer(s)` changes the runnable shape (immutable: returns a new object).
 */

export type {
  AnySchema,
  AnyModuleShape,
  ModuleShape,
  ModuleLogic,
  ModuleImpl,
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
  BoundApiLifecycleApi,
  BoundApiUseApi,
  BoundApiTraitsApi,
  BoundApiReducerApi,
  StateCommitMode,
  StateCommitPriority,
  StateCommitMeta,
  StateChangeWithMeta,
} from './internal/module.js'

export interface DevSource {
  readonly file: string
  readonly line: number
  readonly column: number
}

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
  readonly meta?: Record<string, unknown>
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

type LogicUnitMeta = LogicUnitMetaInternal.LogicUnitMeta
const attachLogicUnitMeta = <L extends object>(logic: L, meta: LogicUnitMeta): L =>
  LogicUnitMetaInternal.attachLogicUnitMeta(logic, meta as any) as any

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

type WorkflowDef = Workflow['def']

type ModuleInternal<Id extends string, Sh extends AnyModuleShape> = {
  readonly initial: StateOf<Sh>
  readonly imports?: ReadonlyArray<Layer.Layer<any, any, any> | ModuleImpl<any, AnyModuleShape, any>>
  readonly processes?: ReadonlyArray<Effect.Effect<void, any, any>>
  readonly stateTransaction?: ModuleImplementStateTransactionOptions
  readonly mounted: ReadonlyArray<MountedLogicUnit<Sh>>
  readonly overrides: ReadonlyArray<LogicOverrideWarning>
  readonly layers: ReadonlyArray<Layer.Layer<any, never, any>>
  readonly workflowDefs: ReadonlyArray<WorkflowDef>
  readonly rebuild: () => ModuleImpl<Id, Sh, any>
}

const MODULE_INTERNAL = Symbol.for('logix.module.internal')
const MODULE_DECLARED_EFFECTS = Symbol.for('logix.module.effects.declared')

type ModuleDefBase<
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
  readonly meta?: Record<string, unknown>
  readonly services?: Record<string, Context.Tag<any, any>>
  readonly dev?: ModuleDev
  readonly logic: <R = never, E = unknown>(
    build: (
      api: ModuleLogicApi<Sh, R, Ext>,
    ) => ModuleLogic<Sh, R, E>,
    options?: LogicUnitOptions,
  ) => ModuleLogic<Sh, R, E>
}

export type AnyModule = {
  readonly _kind: 'Module'
  readonly id: string
  readonly tag: ModuleTag<string, AnyModuleShape>
  readonly impl: ModuleImpl<any, AnyModuleShape, any>
  readonly actions: Record<string, AnySchema>
  readonly reducers?: Record<string, unknown>
  readonly schemas?: Record<string, unknown>
  readonly meta?: Record<string, unknown>
  readonly services?: Record<string, Context.Tag<any, any>>
  readonly dev?: ModuleDev
}

export type Module<Id extends string, Sh extends AnyModuleShape, Ext extends object = {}, R = never> = ModuleDefBase<
  Id,
  Sh,
  Ext
> & {
  readonly _kind: 'Module'
  readonly impl: ModuleImpl<Id, Sh, R>
  readonly withLogic: (logic: ModuleLogic<Sh, any, any>, options?: LogicUnitOptions) => Module<Id, Sh, Ext, R>
  readonly withLogics: (...inputs: ReadonlyArray<MountInput<Sh>>) => Module<Id, Sh, Ext, R>
  readonly withWorkflow: (workflow: Workflow) => Module<Id, Sh, Ext, R>
  readonly withWorkflows: (workflows: ReadonlyArray<Workflow>) => Module<Id, Sh, Ext, R>
  readonly withLayer: (layer: Layer.Layer<any, never, any>) => Module<Id, Sh, Ext, R>
  readonly withLayers: (...layers: ReadonlyArray<Layer.Layer<any, never, any>>) => Module<Id, Sh, Ext, R>
}

export type ModuleDef<Id extends string, Sh extends AnyModuleShape, Ext extends object = {}> = ModuleDefBase<
  Id,
  Sh,
  Ext
> & {
  readonly _kind: 'ModuleDef'
  readonly withWorkflow: (workflow: Workflow) => ModuleDef<Id, Sh, Ext>
  readonly withWorkflows: (workflows: ReadonlyArray<Workflow>) => ModuleDef<Id, Sh, Ext>
  readonly implement: <R = never>(config: {
    readonly initial: StateOf<Sh>
    readonly logics?: Array<ModuleLogic<Sh, R, any>>
    readonly imports?: ReadonlyArray<Layer.Layer<any, any, any> | ModuleImpl<any, AnyModuleShape, any>>
    readonly processes?: ReadonlyArray<Effect.Effect<void, any, any>>
    readonly stateTransaction?: ModuleImplementStateTransactionOptions
  }) => Module<Id, Sh, Ext, R>
}

export const is = (value: unknown): value is ModuleDefBase => {
  if (!value || typeof value !== 'object') return false
  const kind = (value as any)._kind
  if (kind !== 'ModuleDef' && kind !== 'Module') return false
  return Context.isTag((value as any).tag)
}

export const hasImpl = (value: unknown): value is AnyModule => {
  if (!is(value)) return false
  return (
    typeof (value as any).impl === 'object' && (value as any).impl !== null && (value as any).impl._tag === 'ModuleImpl'
  )
}

export const unwrapTag = <Id extends string, Sh extends AnyModuleShape>(
  module: ModuleLike<Id, Sh, any>,
): ModuleTag<Id, Sh> => module.tag

export const unwrapImpl = <Id extends string, Sh extends AnyModuleShape>(
  module: AnyModule & { readonly id: Id; readonly tag: ModuleTag<Id, Sh> },
): ModuleImpl<Id, Sh, any> => (module as any).impl as ModuleImpl<Id, Sh, any>

export const descriptor = (
  module: ModuleDefBase<string, AnyModuleShape, any>,
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
    return Effect.void as any
  }

  return tag.logic(() =>
    Effect.gen(function* () {
      if (!isDevEnv()) return

      const diagnosticsLevel = yield* FiberRef.get(Debug.internal.currentDiagnosticsLevel as any)
      if (diagnosticsLevel === 'off') return

      const runtime = (yield* tag) as ModuleRuntime<any, any>

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
    }),
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

  const logic = tag.logic(($) => ({
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
  selfModule: ModuleDefBase<Id, Sh, Ext>,
): ModuleDefBase<Id, Sh, Ext>['logic'] => {
  const tag = selfModule.tag
  return (build, options) => {
    const eff = tag.logic((api) => {
      const withSelf = Object.create(api) as ModuleLogicApi<Sh, any, Ext>
      ;(withSelf as any).self = Effect.suspend(() => (api as any).use(selfModule as any))
      return build(withSelf as any)
    }) as ModuleLogic<Sh, any, any>

    const meta: LogicUnitMeta = {
      id: options?.id,
      kind: options?.kind,
      name: options?.name,
      source: options?.source,
      moduleId: selfModule.id,
    }

    return attachLogicUnitMeta(eff as any, meta) as any
  }
}

type MakeDef<Id extends string, SSchema extends AnySchema, AMap extends Action.ActionDefs> = {
  readonly state: SSchema
  readonly actions: AMap
  readonly reducers?: ReducersFromMap<SSchema, NoInfer_<AMap>>
  readonly immerReducers?: MutatorsFromMap<SSchema, NoInfer_<AMap>>
  readonly effects?: EffectsFromMap<NoInfer_<AMap>>
  readonly traits?: unknown
  readonly schemas?: Record<string, unknown>
  readonly meta?: Record<string, unknown>
  readonly services?: Record<string, Context.Tag<any, any>>
  readonly dev?: ModuleDev
}

type AnyActionMap = Action.ActionDefs
type EmptyActionMap = Record<never, never>

type PayloadOfActionDef<V> = V extends Schema.Schema<any, any, any>
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
  readonly meta?: Record<string, unknown>
  readonly services?: Record<string, Context.Tag<any, any>>
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
): ModuleDef<Id, Shape<SSchema, AMap>, Ext>

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
): ModuleDef<Id, Shape<SSchema, MergeActionMap<AMap, ExtActions>>, Ext>

export function make(id: any, def: any, extend?: any): any {
  const merged = mergeMakeDef(def as any, extend as any)

  const tag = ModuleTagNS.make(id, {
    state: merged.state,
    actions: merged.actions,
    reducers: merged.reducers,
    traits: merged.traits,
  }) as unknown as ModuleTag<any, AnyModuleShape>

  if (merged.effects && typeof merged.effects === 'object' && Object.keys(merged.effects).length > 0) {
    Object.defineProperty(tag as any, MODULE_DECLARED_EFFECTS, {
      value: merged.effects,
      enumerable: false,
      configurable: true,
      writable: false,
    })
  }

  const base: any = {
    _kind: 'ModuleDef' as const,
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

  base.logic = makeLogicFactory(base as any)

  base.implement = (config: any) => {
    type Sh = AnyModuleShape

    const initial = config.initial as any
    const imports = config.imports as any
    const processes = config.processes as any
    const stateTransaction = config.stateTransaction as any
    const workflowDefs: ReadonlyArray<WorkflowDef> = Array.isArray(config.__logix_workflowDefs)
      ? (config.__logix_workflowDefs as ReadonlyArray<WorkflowDef>)
      : []

    const mountedResult = (config.logics ?? []).reduce(
      (
        acc: {
          mounted: ReadonlyArray<MountedLogicUnit<any>>
          overrides: ReadonlyArray<LogicOverrideWarning>
        },
        logic: any,
      ) => mountLogicUnit(acc.mounted, acc.overrides, { logic }),
      { mounted: [] as const, overrides: [] as const },
    )

    type State = {
      readonly mounted: ReadonlyArray<MountedLogicUnit<any>>
      readonly overrides: ReadonlyArray<LogicOverrideWarning>
      readonly layers: ReadonlyArray<Layer.Layer<any, never, any>>
      readonly workflowDefs: ReadonlyArray<WorkflowDef>
    }

    const buildImpl = (state: State): ModuleImpl<any, AnyModuleShape, any> => {
      const diagnosticsLogic = makeOverrideDiagnosticsLogic(tag as any, state.overrides)
      const declaredEffectsLogic = makeDeclaredEffectsLogic(tag as any, merged.effects, id)
      const allLogics = [...state.mounted.map((u) => u.logic), declaredEffectsLogic, diagnosticsLogic]

      let impl = (tag as any).implement({
        initial,
        logics: allLogics,
        imports,
        processes,
        stateTransaction,
      }) as ModuleImpl<any, AnyModuleShape, any>

      for (const layer of state.layers) {
        impl = impl.withLayer(layer)
      }

      return impl
    }

    const createModule = (state: State): any => {
      const internal: ModuleInternal<any, AnyModuleShape> = {
        initial,
        imports,
        processes,
        stateTransaction,
        mounted: state.mounted,
        overrides: state.overrides,
        layers: state.layers,
        workflowDefs: state.workflowDefs,
        rebuild: () => buildImpl(state),
      }

      const mod: any = {
        ...base,
        _kind: 'Module' as const,
        impl: buildImpl(state),
      }

      Object.defineProperty(mod, MODULE_INTERNAL, {
        value: internal,
        enumerable: false,
        configurable: true,
      })

      mod.logic = makeLogicFactory(mod)

      mod.withLogic = (logic: any, options?: LogicUnitOptions) => mod.withLogics([logic, options] as any)

      mod.withLogics = (...inputs: ReadonlyArray<MountInput<any>>) => {
        const current = (mod as any)[MODULE_INTERNAL] as ModuleInternal<any, AnyModuleShape>
        const normalized = inputs.map(normalizeMountInput)
        const next = normalized.reduce((acc, item) => mountLogicUnit(acc.mounted, acc.overrides, item as any), {
          mounted: current.mounted,
          overrides: current.overrides,
        })

        return createModule({
          mounted: next.mounted,
          overrides: next.overrides,
          layers: current.layers,
          workflowDefs: current.workflowDefs,
        })
      }

      mod.withLayer = (layer: Layer.Layer<any, never, any>) => {
        const current = (mod as any)[MODULE_INTERNAL] as ModuleInternal<any, AnyModuleShape>
        return createModule({
          mounted: current.mounted,
          overrides: current.overrides,
          layers: [...current.layers, layer],
          workflowDefs: current.workflowDefs,
        })
      }

      mod.withLayers = (...layers: ReadonlyArray<Layer.Layer<any, never, any>>) =>
        layers.reduce((acc, layer) => acc.withLayer(layer), mod as any)

      mod.withWorkflow = (workflow: Workflow) => {
        const install = (workflow as any)?.install
        const logic =
          typeof install === 'function'
            ? install(mod.tag)
            : WorkflowRuntime.installOne({ moduleTag: mod.tag as any, program: workflow as any })

        const current = (mod as any)[MODULE_INTERNAL] as ModuleInternal<any, AnyModuleShape>
        const next = mountLogicUnit(current.mounted, current.overrides, { logic } as any)
        const nextWorkflowDefs = [...current.workflowDefs, (workflow as any).def as WorkflowDef]
        return createModule({
          mounted: next.mounted,
          overrides: next.overrides,
          layers: current.layers,
          workflowDefs: nextWorkflowDefs,
        })
      }

      mod.withWorkflows = (workflows: ReadonlyArray<Workflow>) => {
        if (!Array.isArray(workflows) || workflows.length === 0) return mod as any
        const logic = WorkflowRuntime.mountAll({ moduleTag: mod.tag as any, programs: workflows as any })
        const current = (mod as any)[MODULE_INTERNAL] as ModuleInternal<any, AnyModuleShape>
        const next = mountLogicUnit(current.mounted, current.overrides, { logic } as any)
        const nextWorkflowDefs = [...current.workflowDefs, ...workflows.map((w) => (w as any).def as WorkflowDef)]

        return createModule({
          mounted: next.mounted,
          overrides: next.overrides,
          layers: current.layers,
          workflowDefs: nextWorkflowDefs,
        })
      }

      return mod as any
    }

    return createModule({
      mounted: mountedResult.mounted,
      overrides: mountedResult.overrides,
      layers: [],
      workflowDefs,
    })
  }

  const baseImplement = base.implement

  const withExtraLogics = (
    extraLogics: ReadonlyArray<ModuleLogic<any, any, any>>,
    extraWorkflowDefs: ReadonlyArray<WorkflowDef>,
  ): any => {
    const next: any = { ...base }

    next.withWorkflow = (workflow: Workflow) => {
      const install = (workflow as any)?.install
      const logic =
        typeof install === 'function'
          ? install(next.tag)
          : WorkflowRuntime.installOne({ moduleTag: next.tag as any, program: workflow as any })
      return withExtraLogics([...extraLogics, logic as any], [...extraWorkflowDefs, (workflow as any).def as WorkflowDef])
    }

    next.withWorkflows = (workflows: ReadonlyArray<Workflow>) => {
      if (!Array.isArray(workflows) || workflows.length === 0) return next as any
      const logic = WorkflowRuntime.mountAll({ moduleTag: next.tag as any, programs: workflows as any })
      return withExtraLogics(
        [...extraLogics, logic as any],
        [...extraWorkflowDefs, ...workflows.map((w) => (w as any).def as WorkflowDef)],
      )
    }

    next.implement = (config: any) => {
      const mergedLogics = [...(config.logics ?? []), ...extraLogics]
      return baseImplement({ ...config, logics: mergedLogics, __logix_workflowDefs: extraWorkflowDefs })
    }

    return next as any
  }

  base.withWorkflow = (workflow: Workflow) => withExtraLogics([], []).withWorkflow(workflow)

  base.withWorkflows = (workflows: ReadonlyArray<Workflow>) => withExtraLogics([], []).withWorkflows(workflows)

  return base
}

export const Manage = {
  make: <D extends (...args: any[]) => AnyModule>(config: {
    readonly kind?: string
    readonly define: D
  }): { readonly kind?: string; readonly make: D } => ({
    kind: config.kind,
    make: config.define,
  }),
} as const
