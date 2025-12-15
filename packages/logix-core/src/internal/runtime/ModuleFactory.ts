import { Context, Effect, Layer, Schema } from "effect"
import * as ModuleRuntimeImpl from "./ModuleRuntime.js"
import * as BoundApiRuntime from "./BoundApiRuntime.js"
import * as LogicDiagnostics from "./core/LogicDiagnostics.js"
import type {
  AnyModuleShape,
  AnySchema,
  ActionsFromMap,
  ModuleInstance,
  ModuleShape,
  ReducersFromMap,
  StateOf,
  ActionOf,
  ModuleHandle,
  ModuleLogic,
  ModuleImpl,
  ModuleImplementStateTransactionOptions,
} from "./core/module.js"

/**
 * v3: Link (原 Orchestrator)
 * 用于跨模块协作的胶水层。
 *
 * - 不持有自己的 State；
 * - 可以访问多个 Module 的 ReadonlyHandle；
 * - 只能定义 Logic，不能定义 State/Action。
 */
export function Link<
  Modules extends Record<string, ModuleInstance<any, AnyModuleShape>>,
  E = never,
  R = never
>(
  modules: Modules,
  logic: (
    $: { [K in keyof Modules]: ModuleHandle<Modules[K]["shape"]> }
  ) => Effect.Effect<void, E, R>
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
        actions: new Proxy({}, {
          get: (_target, prop) =>
            (payload: any) =>
              runtime.dispatch({ _tag: prop as string, payload }),
        }),
      }
    }

    return yield* logic(
      handles as {
        [K in keyof Modules]: ModuleHandle<Modules[K]["shape"]>
      }
    )
  })
}

/**
 * Module 工厂实现：根据 id 和 Schema 定义构造 ModuleInstance。
 */
export function Module<
  Id extends string,
  SSchema extends AnySchema,
  AMap extends Record<string, AnySchema>
>(
  id: Id,
  def: {
    readonly state: SSchema
    readonly actions: AMap
    readonly reducers?: ReducersFromMap<SSchema, AMap>
  }
): ModuleInstance<
  Id,
  ModuleShape<SSchema, Schema.Schema<ActionsFromMap<AMap>>, AMap>
> {
  const shape: ModuleShape<
    SSchema,
    Schema.Schema<ActionsFromMap<AMap>>,
    AMap
  > = {
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
      )
    ) as any,
    actionMap: def.actions,
  }

  type ShapeState = StateOf<typeof shape>
  type ShapeAction = ActionOf<typeof shape>

  // 将按 Tag 分组的 reducer 映射为简单的 `_tag -> (state, action) => state` 形态，供 Runtime 使用。
  const reducers =
    def.reducers &&
    (Object.fromEntries(
      Object.entries(def.reducers).map(([tag, reducer]) => [
        tag,
        (state: ShapeState, action: ShapeAction) =>
          // 这里依赖 `_tag` 的运行时约定：只有匹配当前 tag 的 Action 会交给对应 reducer。
          (reducer as any)(
            state,
            action as {
              readonly _tag: string
              readonly payload: unknown
            },
          ) as ShapeState,
      ]),
    ) as Record<string, (state: ShapeState, action: ShapeAction) => ShapeState>)

  const tag = Context.GenericTag<
    any,
    import("./core/module.js").ModuleRuntime<StateOf<typeof shape>, ActionOf<typeof shape>>
  >(`@logix/Module/${id}`)

  const moduleInstance = Object.assign(tag, {
    _kind: "Module" as const,
    id,
    shape,
    stateSchema: shape.stateSchema,
    actionSchema: shape.actionSchema,
    /**
     * 为当前 Module 构造一段 Logic 程序：
     * - 在运行时从 Context 中取出自身的 ModuleRuntime；
     * - 基于 Runtime 构造 BoundApi；
     * - 将 BoundApi 交给调用方构造业务 Logic。
     */
    logic: <R = unknown, E = never>(
      build: (
        api: import("./core/module.js").BoundApi<typeof shape, R>
      ) => ModuleLogic<typeof shape, R, E>
    ): ModuleLogic<typeof shape, R, E> => {
      const phaseRef: { current: "setup" | "run" } = { current: "setup" }
      const phaseService: LogicDiagnostics.LogicPhaseService = {
        get current() {
          return phaseRef.current
        },
      }
      const logicEffect = Effect.gen(function* () {
        const runtime = yield* tag
        const api = BoundApiRuntime.make<typeof shape, R>(shape, runtime, {
          getPhase: () => phaseRef.current,
          phaseService,
          moduleId: id,
        })

        let built: unknown
        try {
          built = build(api)
        } catch (err) {
          // 将同步抛出的 LogicPhaseError 转换为 Effect.fail，避免 runSync 视为“异步未决 Fiber”
          if ((err as any)?._tag === "LogicPhaseError") {
            return yield* Effect.fail(err as any)
          }
          throw err
        }

        if ((built as any)?.__logicPlan === true) {
          return yield* (built as Effect.Effect<any, any, any>)
        }

        const isLogicPlan = (
          value: unknown
        ): value is import("./core/module.js").LogicPlan<typeof shape, R, E> =>
          Boolean(
            value &&
            typeof value === "object" &&
            "setup" in (value as any) &&
            "run" in (value as any)
          )

        const plan = isLogicPlan(built)
          ? built
          : ({
            setup: Effect.void,
            run: built as Effect.Effect<any, any, any>,
          } satisfies import("./core/module.js").LogicPlan<typeof shape, R, E>)

        return Object.assign(plan, { __phaseRef: phaseRef })
      })

      ;(logicEffect as any).__logicPlan = true
      ;(logicEffect as any).__phaseRef = phaseRef
      return logicEffect
    },

    /**
     * live：给定初始状态与一组 Logic，构造带 Scope 的 ModuleRuntime Layer。
     *
     * Env 约定：
     * - R 表示 Logic 运行所需的额外环境（Service / 平台等）；
     * - ModuleRuntime 本身只依赖 Scope.Scope，由 Layer.scoped 管理。
     */
    live: <R = never, E = never>(
      initial: StateOf<typeof shape>,
      ...logics: Array<ModuleLogic<typeof shape, R, E>>
      ): Layer.Layer<
        import("./core/module.js").ModuleRuntime<
          StateOf<typeof shape>,
          ActionOf<typeof shape>
        >,
        E,
        R
      > =>
      Layer.scoped(
        tag,
        ModuleRuntimeImpl.make<StateOf<typeof shape>, ActionOf<typeof shape>, R>(
          initial,
          {
            tag,
            logics: logics as ReadonlyArray<Effect.Effect<any, any, any>>,
            moduleId: id,
            reducers,
          },
        ),
      ) as Layer.Layer<
        import("./core/module.js").ModuleRuntime<
          StateOf<typeof shape>,
          ActionOf<typeof shape>
        >,
        E,
        R
      >,

    /**
     * implement：基于 Module 定义 + 初始状态 + Logic 集合，生成 ModuleImpl 蓝图。
     *
     * - R 表示 Logic 所需的 Env 类型；
     * - 返回的 ModuleImpl.layer 会携带 R 作为输入环境；
     * - 通过 withLayer/withLayers 可以逐步将 R 收敛为更具体的 Env（甚至 never）。
     */
    implement: <R = never>(config: {
      initial: StateOf<typeof shape>
      logics?: Array<ModuleLogic<typeof shape, R, never>>
      imports?: ReadonlyArray<
        Layer.Layer<any, any, any> | ModuleImpl<any, AnyModuleShape, any>
      >
      /**
       * processes：与该 Module 实现绑定的一组长期流程（含 Link）。
       *
       * - 这些 Effect 会在运行时容器（例如 Runtime.make）中被统一 fork；
       * - 类型上使用宽松的 E/R 以便组合各种跨模块编排逻辑；
       * - 业务代码通常通过 Link.make 构造这些流程。
       */
      processes?: ReadonlyArray<Effect.Effect<void, any, any>>
      /**
       * stateTransaction：模块级 StateTransaction 配置。
       *
       * - instrumentation 未提供时，退回到 Runtime 级配置（如有）或 NODE_ENV 默认；
       * - instrumentation 提供时，优先于 Runtime 级配置与默认值。
       */
      stateTransaction?: ModuleImplementStateTransactionOptions
    }): ModuleImpl<
      Id,
      ModuleShape<SSchema, Schema.Schema<ActionsFromMap<AMap>>, AMap>,
      R
      > => {
      const importedModules = (config.imports ?? []).flatMap((item) => {
        if ((item as ModuleImpl<any, AnyModuleShape, any>)._tag === "ModuleImpl") {
          return [
            (item as ModuleImpl<any, AnyModuleShape, any>)
              .module as unknown as Context.Tag<any, import("./core/module.js").ModuleRuntime<any, any>>,
          ]
        }
        return []
      })

      const baseLayer = Layer.scoped(
        tag,
        ModuleRuntimeImpl.make<StateOf<typeof shape>, ActionOf<typeof shape>, R>(
          config.initial,
          {
            tag,
            logics: (config.logics || []) as ReadonlyArray<Effect.Effect<any, any, any>>,
            moduleId: id,
            imports: importedModules,
            reducers,
            stateTransaction: config.stateTransaction,
          },
        ),
      ) as Layer.Layer<
        import("./core/module.js").ModuleRuntime<
          StateOf<typeof shape>,
          ActionOf<typeof shape>
        >,
        never,
        any
      >

      const processes = config.processes ?? []

      const makeImplWithLayer = (
        layer: Layer.Layer<
          import("./core/module.js").ModuleRuntime<
            StateOf<typeof shape>,
            ActionOf<typeof shape>
          >,
          never,
          any
        >,
      ): ModuleImpl<
        Id,
        ModuleShape<SSchema, Schema.Schema<ActionsFromMap<AMap>>, AMap>,
        any
      > => ({
        _tag: "ModuleImpl",
        module: moduleInstance as unknown as ModuleInstance<
          Id,
          ModuleShape<SSchema, Schema.Schema<ActionsFromMap<AMap>>, AMap>
        >,
        layer,
        processes,
        stateTransaction: config.stateTransaction,
        withLayer: (
          extra: Layer.Layer<any, never, any>
        ): ModuleImpl<
          Id,
          ModuleShape<SSchema, Schema.Schema<ActionsFromMap<AMap>>, AMap>,
          any
        > => {
          const provided = (layer as Layer.Layer<
            import("./core/module.js").ModuleRuntime<
              StateOf<typeof shape>,
              ActionOf<typeof shape>
            >,
            never,
            any
          >).pipe(
            Layer.provide(
              extra as Layer.Layer<any, never, any>
            )
          )

          const merged = Layer.mergeAll(
            provided,
            extra as Layer.Layer<any, never, any>
          ) as Layer.Layer<
            import("./core/module.js").ModuleRuntime<
              StateOf<typeof shape>,
              ActionOf<typeof shape>
            >,
            never,
            any
          >

          return makeImplWithLayer(merged)
        },
        withLayers: (
          ...extras: ReadonlyArray<Layer.Layer<any, never, any>>
        ): ModuleImpl<
          Id,
          ModuleShape<SSchema, Schema.Schema<ActionsFromMap<AMap>>, AMap>,
          any
        > =>
          extras.reduce<ModuleImpl<
            Id,
            ModuleShape<SSchema, Schema.Schema<ActionsFromMap<AMap>>, AMap>,
            any
          >>(
            (implAcc, extra) => implAcc.withLayer(extra),
            makeImplWithLayer(
              layer as Layer.Layer<
                import("./core/module.js").ModuleRuntime<
                  StateOf<typeof shape>,
                  ActionOf<typeof shape>
                >,
                never,
                any
              >
            )
          ),
      })

      // 从 baseLayer 开始，依次叠加 imports（Layer 或其他 ModuleImpl 的 layer）
      const initialImpl = makeImplWithLayer(
        baseLayer as Layer.Layer<
          import("./core/module.js").ModuleRuntime<
            StateOf<typeof shape>,
            ActionOf<typeof shape>
          >,
          never,
          any
        >
      )

      const imports = config.imports ?? []

      const finalImpl = imports.reduce<ModuleImpl<
        Id,
        ModuleShape<SSchema, Schema.Schema<ActionsFromMap<AMap>>, AMap>,
        any
      >>((implAcc, item) => {
        const layer =
          (item as ModuleImpl<any, AnyModuleShape, any>)._tag === "ModuleImpl"
            ? (item as ModuleImpl<any, AnyModuleShape, any>).layer
            : (item as Layer.Layer<any, any, any>)

        return implAcc.withLayer(layer as Layer.Layer<any, never, any>)
      }, initialImpl)

      return finalImpl
    },
  })

  return moduleInstance as ModuleInstance<
    Id,
    ModuleShape<SSchema, Schema.Schema<ActionsFromMap<AMap>>, AMap>
  >
}
