import { Context, Effect, Layer, Schema } from "effect"
import * as BoundApiImpl from "../api/BoundApi.js"
import * as ModuleRuntimeImpl from "./ModuleRuntime.js"
import type {
  AnyModuleShape,
  AnySchema,
  ModuleInstance,
  ModuleShape,
  StateOf,
  ActionOf,
  ModuleHandle,
  ModuleLogic,
  ModuleImpl,
} from "../api/Logix.js"

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
  def: { readonly state: SSchema; readonly actions: AMap }
): ModuleInstance<
  Id,
  ModuleShape<SSchema, Schema.Schema<{
    [K in keyof AMap]: {
      readonly _tag: K
      readonly payload: Schema.Schema.Type<AMap[K]>
    }
  }[keyof AMap]>, AMap>
> {
  const shape: ModuleShape<
    SSchema,
    Schema.Schema<{
      [K in keyof AMap]: {
        readonly _tag: K
        readonly payload: Schema.Schema.Type<AMap[K]>
      }
    }[keyof AMap]>,
    AMap
  > = {
    stateSchema: def.state,
    actionSchema: Schema.Union(
      ...Object.entries(def.actions).map(([tag, payload]) =>
        Schema.Struct({
          _tag: Schema.Literal(tag),
          payload,
        })
      )
    ) as any,
    actionMap: def.actions,
  }

  const tag = Context.GenericTag<
    any,
    import("../api/Logix.js").ModuleRuntime<StateOf<typeof shape>, ActionOf<typeof shape>>
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
        api: BoundApiImpl.BoundApi<typeof shape, R>
      ) => ModuleLogic<typeof shape, R, E>
    ): ModuleLogic<typeof shape, R, E> =>
      Effect.gen(function* () {
        const runtime = yield* tag
        const api = BoundApiImpl.make<typeof shape, R>(shape, runtime)
        return yield* build(api)
      }),

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
      import("../api/Logix.js").ModuleRuntime<
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
          },
        ),
      ) as Layer.Layer<
        import("../api/Logix.js").ModuleRuntime<
          StateOf<typeof shape>,
          ActionOf<typeof shape>
        >,
        E,
        R
      >,

    /**
     * make：基于 Module 定义 + 初始状态 + Logic 集合，生成 ModuleImpl 蓝图。
     *
     * - R 表示 Logic 所需的 Env 类型；
     * - 返回的 ModuleImpl.layer 会携带 R 作为输入环境；
     * - 通过 withLayer 可以逐步将 R 收敛为更具体的 Env（甚至 never）。
     */
    make: <R = never>(config: {
      initial: StateOf<typeof shape>
      logics?: Array<ModuleLogic<typeof shape, R, never>>
      imports?: ReadonlyArray<
        Layer.Layer<any, any, any> | ModuleImpl<any, AnyModuleShape, any>
      >
      /**
       * processes：与该 Module 实现绑定的一组长期流程（含 Link）。
       *
       * - 这些 Effect 会在运行时容器（例如 LogixRuntime.make）中被统一 fork；
       * - 类型上使用宽松的 E/R 以便组合各种跨模块编排逻辑；
       * - 业务代码通常通过 Link.make 构造这些流程。
       */
      processes?: ReadonlyArray<Effect.Effect<void, any, any>>
    }): ModuleImpl<
      Id,
      ModuleShape<
        SSchema,
        Schema.Schema<{
          [K in keyof AMap]: {
            readonly _tag: K
            readonly payload: Schema.Schema.Type<AMap[K]>
          }
        }[keyof AMap]>,
        AMap
      >,
      R
    > => {
      const baseLayer = moduleInstance.live<R, never>(
        config.initial,
        ...(config.logics || []),
      )

      const processes = config.processes ?? []

      const makeImplWithLayer = (
        layer: Layer.Layer<
          import("../api/Logix.js").ModuleRuntime<
            StateOf<typeof shape>,
            ActionOf<typeof shape>
          >,
          never,
          any
        >,
      ): ModuleImpl<
        Id,
        ModuleShape<
          SSchema,
          Schema.Schema<{
            [K in keyof AMap]: {
              readonly _tag: K
              readonly payload: Schema.Schema.Type<AMap[K]>
            }
          }[keyof AMap]>,
          AMap
        >,
        any
      > => ({
        _tag: "ModuleImpl",
        module: moduleInstance as unknown as ModuleInstance<
          Id,
          ModuleShape<
            SSchema,
            Schema.Schema<{
              [K in keyof AMap]: {
                readonly _tag: K
                readonly payload: Schema.Schema.Type<AMap[K]>
              }
            }[keyof AMap]>,
            AMap
          >
        >,
        layer,
        processes,
        withLayer: (
          extra: Layer.Layer<any, never, any>
        ): ModuleImpl<
          Id,
          ModuleShape<
            SSchema,
            Schema.Schema<{
              [K in keyof AMap]: {
                readonly _tag: K
                readonly payload: Schema.Schema.Type<AMap[K]>
              }
            }[keyof AMap]>,
            AMap
          >,
          any
        > => {
          const provided = (layer as Layer.Layer<
            import("../api/Logix.js").ModuleRuntime<
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
            import("../api/Logix.js").ModuleRuntime<
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
          ModuleShape<
            SSchema,
            Schema.Schema<{
              [K in keyof AMap]: {
                readonly _tag: K
                readonly payload: Schema.Schema.Type<AMap[K]>
              }
            }[keyof AMap]>,
            AMap
          >,
          any
        > =>
          extras.reduce<ModuleImpl<
            Id,
            ModuleShape<
              SSchema,
              Schema.Schema<{
                [K in keyof AMap]: {
                  readonly _tag: K
                  readonly payload: Schema.Schema.Type<AMap[K]>
                }
              }[keyof AMap]>,
              AMap
            >,
            any
          >>(
            (implAcc, extra) => implAcc.withLayer(extra),
            makeImplWithLayer(
              layer as Layer.Layer<
                import("../api/Logix.js").ModuleRuntime<
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
          import("../api/Logix.js").ModuleRuntime<
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
        ModuleShape<
          SSchema,
          Schema.Schema<{
            [K in keyof AMap]: {
              readonly _tag: K
              readonly payload: Schema.Schema.Type<AMap[K]>
            }
          }[keyof AMap]>,
          AMap
        >,
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
    ModuleShape<
      SSchema,
      Schema.Schema<{
        [K in keyof AMap]: {
          readonly _tag: K
          readonly payload: Schema.Schema.Type<AMap[K]>
        }
      }[keyof AMap]>,
      AMap
    >
  >
}
