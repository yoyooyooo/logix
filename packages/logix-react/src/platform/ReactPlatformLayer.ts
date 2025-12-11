import { Effect, Layer, Ref } from "effect"
import { Platform } from "@logix/core"

/**
 * ReactPlatformLayer
 *
 * 为浏览器/React 环境提供 Logic.Platform 实现：
 * - lifecycle.onSuspend/onResume/onReset 仅负责注册回调 Effect（订阅）；
 * - 实际的“触发”（例如页面挂起/恢复）由宿主通过额外方法 emit* 驱动，
 *   便于在不同集成层（React、Node 等）上按需对接事件源。
 */

class ReactPlatformImpl implements Platform.Service {
  constructor(
    private readonly suspendRef: Ref.Ref<
      ReadonlyArray<Effect.Effect<void, never, any>>
    >,
    private readonly resumeRef: Ref.Ref<
      ReadonlyArray<Effect.Effect<void, never, any>>
    >,
    private readonly resetRef: Ref.Ref<
      ReadonlyArray<Effect.Effect<void, never, any>>
    >,
  ) {}

  readonly lifecycle: Platform.Service["lifecycle"] = {
    onSuspend: (eff) =>
      Ref.update(this.suspendRef, (list) => [...list, eff]).pipe(
        Effect.asVoid,
      ),
    onResume: (eff) =>
      Ref.update(this.resumeRef, (list) => [...list, eff]).pipe(
        Effect.asVoid,
      ),
    onReset: (eff) =>
      Ref.update(this.resetRef, (list) => [...list, eff]).pipe(
        Effect.asVoid,
      ),
  }

  // 以下 emit* 方法不在 Logic.Platform 正式接口中，仅供宿主/测试使用。
  // 通过 `Effect.service(Logic.Platform)` 取出实例后，以 any 形式调用。

  readonly emitSuspend = (): Effect.Effect<void, never, any> =>
    Ref.get(this.suspendRef).pipe(
      Effect.flatMap((effects) =>
        Effect.forEach(effects, (eff) => eff, { discard: true }),
      ),
    )

  readonly emitResume = (): Effect.Effect<void, never, any> =>
    Ref.get(this.resumeRef).pipe(
      Effect.flatMap((effects) =>
        Effect.forEach(effects, (eff) => eff, { discard: true }),
      ),
    )

  readonly emitReset = (): Effect.Effect<void, never, any> =>
    Ref.get(this.resetRef).pipe(
      Effect.flatMap((effects) =>
        Effect.forEach(effects, (eff) => eff, { discard: true }),
      ),
    )
}

const makeReactPlatform: Effect.Effect<Platform.Service, never, never> =
  Effect.gen(function* () {
    const suspendRef = yield* Ref.make<
      ReadonlyArray<Effect.Effect<void, never, any>>
    >([])
    const resumeRef = yield* Ref.make<
      ReadonlyArray<Effect.Effect<void, never, any>>
    >([])
    const resetRef = yield* Ref.make<
      ReadonlyArray<Effect.Effect<void, never, any>>
    >([])

    return new ReactPlatformImpl(suspendRef, resumeRef, resetRef)
  })

export const ReactPlatformLayer: Layer.Layer<Platform.Service, never, never> =
  Layer.scoped(Platform.tag, makeReactPlatform)
