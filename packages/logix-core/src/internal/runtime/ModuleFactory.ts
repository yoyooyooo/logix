import { Context, Effect, Layer, Option, Schema } from 'effect'
import * as ModuleRuntimeImpl from './ModuleRuntime.js'
import * as BoundApiRuntime from './BoundApiRuntime.js'
import * as LogicDiagnostics from './core/LogicDiagnostics.js'
import * as LogicPlanMarker from './core/LogicPlanMarker.js'
import type { FieldPath } from '../field-path.js'
import type {
  AnyModuleShape,
  AnySchema,
  ActionsFromMap,
  ModuleTag as LogixModuleTag,
  ModuleShape,
  ReducersFromMap,
  StateOf,
  ActionOf,
  ModuleHandle,
  ModuleLogic,
  ModuleImpl,
  ModuleImplementStateTransactionOptions,
} from './core/module.js'

/**
 * v3: Link (formerly Orchestrator)
 * A glue layer for cross-module collaboration.
 *
 * - Does not own its own State.
 * - Can access multiple Modules' readonly handles.
 * - Can define Logic only; cannot define State/Action.
 */
export function Link<Modules extends Record<string, LogixModuleTag<any, AnyModuleShape>>, E = never, R = never>(
  modules: Modules,
  logic: ($: { [K in keyof Modules]: ModuleHandle<Modules[K]['shape']> }) => Effect.Effect<void, E, R>,
): Effect.Effect<void, E, R> {
  return Effect.gen(function* () {
    const handles: Record<string, ModuleHandle<AnyModuleShape>> = {}

    for (const [key, module] of Object.entries(modules)) {
      const runtime = yield* module

      handles[key] = {
        read: (selector: any) => Effect.map(runtime.getState, selector),
        changes: runtime.changes,
        dispatch: runtime.dispatch,
        actions$: runtime.actions$,
        actions: new Proxy(
          {},
          {
            get: (_target, prop) => (payload: any) => runtime.dispatch({ _tag: prop as string, payload }),
          },
        ),
      }
    }

    return yield* logic(
      handles as {
        [K in keyof Modules]: ModuleHandle<Modules[K]['shape']>
      },
    )
  })
}

/**
 * Module factory implementation: construct a ModuleTag from an id and Schema definitions.
 */
export function Module<Id extends string, SSchema extends AnySchema, AMap extends Record<string, AnySchema>>(
  id: Id,
  def: {
    readonly state: SSchema
    readonly actions: AMap
    readonly reducers?: ReducersFromMap<SSchema, AMap>
  },
): LogixModuleTag<Id, ModuleShape<SSchema, Schema.Schema<ActionsFromMap<AMap>>, AMap>> {
  const shape: ModuleShape<SSchema, Schema.Schema<ActionsFromMap<AMap>>, AMap> = {
    stateSchema: def.state,
    actionSchema: Schema.Union(
      ...Object.entries(def.actions).map(([tag, payload]) =>
        Schema.Struct(
          payload === Schema.Void
            ? {
                _tag: Schema.Literal(tag),
                payload: Schema.optional(payload),
              }
            : {
                _tag: Schema.Literal(tag),
                payload,
              },
        ),
      ),
    ) as unknown as Schema.Schema<ActionsFromMap<AMap>>,
    actionMap: def.actions,
  }

  type ShapeState = StateOf<typeof shape>
  type ShapeAction = ActionOf<typeof shape>

  // Normalize tag-keyed reducers into `_tag -> (state, action, sink?) => state` for the runtime.
  const reducers =
    def.reducers &&
    (Object.fromEntries(
      Object.entries(def.reducers).map(([tag, reducer]) => [
        tag,
        (state: ShapeState, action: ShapeAction, sink?: (path: string | FieldPath) => void) =>
          // Relies on the runtime `_tag` convention: only actions matching the current tag are routed to this reducer.
          (reducer as any)(
            state,
            action as {
              readonly _tag: string
              readonly payload: unknown
            },
            sink,
          ) as ShapeState,
      ]),
    ) as Record<
      string,
      (state: ShapeState, action: ShapeAction, sink?: (path: string | FieldPath) => void) => ShapeState
    >)

  class ModuleTag extends Context.Tag(`@logix/Module/${id}`)<
    ModuleTag,
    import('./core/module.js').ModuleRuntime<StateOf<typeof shape>, ActionOf<typeof shape>>
  >() {}

  const tag = ModuleTag

  const moduleTag = Object.assign(tag, {
    _kind: 'ModuleTag' as const,
    id,
    shape,
    stateSchema: shape.stateSchema,
    actionSchema: shape.actionSchema,
    actions: shape.actionMap,
    reducers: def.reducers,
    /**
     * Build a Logic program for the current Module:
     * - Read its ModuleRuntime from Context at runtime.
     * - Build a BoundApi from the runtime.
     * - Pass the BoundApi to the caller to build business logic.
     */
    logic: <R = unknown, E = never>(
      build: (api: import('./core/module.js').BoundApi<typeof shape, R>) => ModuleLogic<typeof shape, R, E>,
    ): ModuleLogic<typeof shape, R, E> => {
      const logicEffect = Effect.gen(function* () {
        const runtime = yield* tag
        const logicUnit = yield* Effect.serviceOption(LogicDiagnostics.LogicUnitServiceTag).pipe(
          Effect.map(Option.getOrUndefined),
        )
        const phaseService = yield* Effect.serviceOption(LogicDiagnostics.LogicPhaseServiceTag).pipe(
          Effect.map(Option.getOrUndefined),
        )
        const api = BoundApiRuntime.make<typeof shape, R>(shape, runtime, {
          getPhase: () => phaseService?.current ?? 'run',
          phaseService,
          moduleId: id,
          logicUnit,
        })

        let built: unknown
        try {
          built = build(api)
        } catch (err) {
          // Convert synchronously thrown LogicPhaseError into Effect.fail so runSync won't treat it as an "async pending fiber".
          if ((err as any)?._tag === 'LogicPhaseError') {
            return yield* Effect.fail(err as any)
          }
          throw err
        }

        if (LogicPlanMarker.isLogicPlanEffect(built)) {
          return yield* built as Effect.Effect<any, any, any>
        }

        const isLogicPlan = (value: unknown): value is import('./core/module.js').LogicPlan<typeof shape, R, E> =>
          Boolean(value && typeof value === 'object' && 'setup' in (value as any) && 'run' in (value as any))

        const plan = isLogicPlan(built)
          ? built
          : ({
              setup: Effect.void,
              run: built as Effect.Effect<any, any, any>,
            } satisfies import('./core/module.js').LogicPlan<typeof shape, R, E>)

        return plan
      })

      LogicPlanMarker.markAsLogicPlanEffect(logicEffect)
      return logicEffect
    },

    /**
     * live: given an initial state and a set of logics, construct a scoped ModuleRuntime Layer.
     *
     * Env conventions:
     * - R represents extra environment required by the logics (services / platform, etc.).
     * - ModuleRuntime itself only depends on Scope.Scope and is managed by Layer.scoped.
     */
    live: <R = never, E = never>(
      initial: StateOf<typeof shape>,
      ...logics: Array<ModuleLogic<typeof shape, R, E>>
    ): Layer.Layer<import('./core/module.js').ModuleRuntime<StateOf<typeof shape>, ActionOf<typeof shape>>, E, R> =>
      Layer.scoped(
        tag,
        ModuleRuntimeImpl.make<StateOf<typeof shape>, ActionOf<typeof shape>, R>(initial, {
          tag,
          logics: logics as ReadonlyArray<Effect.Effect<any, any, any>>,
          moduleId: id,
          reducers,
        }),
      ) as unknown as Layer.Layer<
        import('./core/module.js').ModuleRuntime<StateOf<typeof shape>, ActionOf<typeof shape>>,
        E,
        R
      >,

    /**
     * implement: build a ModuleImpl blueprint from Module definition + initial state + a set of logics.
     *
     * - R represents the Env required by the logics.
     * - The returned ModuleImpl.layer carries R as its input environment.
     * - withLayer/withLayers can progressively narrow R to a more concrete Env (even never).
     */
    implement: <R = never>(config: {
      initial: StateOf<typeof shape>
      logics?: Array<ModuleLogic<typeof shape, R, never>>
      imports?: ReadonlyArray<Layer.Layer<any, any, any> | ModuleImpl<any, AnyModuleShape, any>>
      /**
       * processes: a set of long-lived flows bound to this Module implementation (including Link).
       *
       * - These Effects will be forked by the runtime container (e.g. Runtime.make).
       * - Types use relaxed E/R to enable composing cross-module orchestration logic.
       * - Business code typically builds these flows via Link.make.
       */
      processes?: ReadonlyArray<Effect.Effect<void, any, any>>
      /**
       * stateTransaction: module-level StateTransaction config.
       *
       * - If instrumentation is not provided, fall back to Runtime-level config (if any) or NODE_ENV defaults.
       * - If instrumentation is provided, it takes precedence over Runtime-level config and defaults.
       */
      stateTransaction?: ModuleImplementStateTransactionOptions
    }): ModuleImpl<Id, ModuleShape<SSchema, Schema.Schema<ActionsFromMap<AMap>>, AMap>, R> => {
      const importedModules = (config.imports ?? []).flatMap((item) => {
        if ((item as ModuleImpl<any, AnyModuleShape, any>)._tag === 'ModuleImpl') {
          return [
            (item as ModuleImpl<any, AnyModuleShape, any>).module as unknown as Context.Tag<
              any,
              import('./core/module.js').ModuleRuntime<any, any>
            >,
          ]
        }
        return []
      })

      const baseLayer = Layer.scoped(
        tag,
        ModuleRuntimeImpl.make<StateOf<typeof shape>, ActionOf<typeof shape>, R>(config.initial, {
          tag,
          logics: (config.logics || []) as ReadonlyArray<Effect.Effect<any, any, any>>,
          processes: (config.processes || []) as ReadonlyArray<Effect.Effect<void, any, any>>,
          moduleId: id,
          imports: importedModules,
          reducers,
          stateTransaction: config.stateTransaction,
        }),
      ) as unknown as Layer.Layer<
        import('./core/module.js').ModuleRuntime<StateOf<typeof shape>, ActionOf<typeof shape>>,
        never,
        any
      >

      const processes = config.processes ?? []

      const makeImplWithLayer = (
        layer: Layer.Layer<
          import('./core/module.js').ModuleRuntime<StateOf<typeof shape>, ActionOf<typeof shape>>,
          never,
          any
        >,
      ): ModuleImpl<Id, ModuleShape<SSchema, Schema.Schema<ActionsFromMap<AMap>>, AMap>, any> => ({
        _tag: 'ModuleImpl',
        module: moduleTag as unknown as LogixModuleTag<
          Id,
          ModuleShape<SSchema, Schema.Schema<ActionsFromMap<AMap>>, AMap>
        >,
        layer,
        processes,
        stateTransaction: config.stateTransaction,
        withLayer: (
          extra: Layer.Layer<any, never, any>,
        ): ModuleImpl<Id, ModuleShape<SSchema, Schema.Schema<ActionsFromMap<AMap>>, AMap>, any> => {
          const provided = (
            layer as Layer.Layer<
              import('./core/module.js').ModuleRuntime<StateOf<typeof shape>, ActionOf<typeof shape>>,
              never,
              any
            >
          ).pipe(Layer.provide(extra as Layer.Layer<any, never, any>))

          const merged = Layer.mergeAll(provided, extra as Layer.Layer<any, never, any>) as Layer.Layer<
            import('./core/module.js').ModuleRuntime<StateOf<typeof shape>, ActionOf<typeof shape>>,
            never,
            any
          >

          return makeImplWithLayer(merged)
        },
        withLayers: (
          ...extras: ReadonlyArray<Layer.Layer<any, never, any>>
        ): ModuleImpl<Id, ModuleShape<SSchema, Schema.Schema<ActionsFromMap<AMap>>, AMap>, any> =>
          extras.reduce<ModuleImpl<Id, ModuleShape<SSchema, Schema.Schema<ActionsFromMap<AMap>>, AMap>, any>>(
            (implAcc, extra) => implAcc.withLayer(extra),
            makeImplWithLayer(
              layer as Layer.Layer<
                import('./core/module.js').ModuleRuntime<StateOf<typeof shape>, ActionOf<typeof shape>>,
                never,
                any
              >,
            ),
          ),
      })

      // Start from baseLayer and layer-in imports (Layer or other ModuleImpl.layer) sequentially.
      const initialImpl = makeImplWithLayer(
        baseLayer as Layer.Layer<
          import('./core/module.js').ModuleRuntime<StateOf<typeof shape>, ActionOf<typeof shape>>,
          never,
          any
        >,
      )

      const imports = config.imports ?? []

      const finalImpl = imports.reduce<
        ModuleImpl<Id, ModuleShape<SSchema, Schema.Schema<ActionsFromMap<AMap>>, AMap>, any>
      >((implAcc, item) => {
        const layer =
          (item as ModuleImpl<any, AnyModuleShape, any>)._tag === 'ModuleImpl'
            ? (item as ModuleImpl<any, AnyModuleShape, any>).layer
            : (item as Layer.Layer<any, any, any>)

        return implAcc.withLayer(layer as Layer.Layer<any, never, any>)
      }, initialImpl)

      return finalImpl
    },
  })

  return moduleTag as LogixModuleTag<Id, ModuleShape<SSchema, Schema.Schema<ActionsFromMap<AMap>>, AMap>>
}
