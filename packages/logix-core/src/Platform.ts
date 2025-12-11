import { Effect, Layer } from "effect"
import * as Internal from "./internal/platform/Platform.js"

/**
 * Platform.Service：平台服务接口。
 */
export type Service = Internal.Service

/**
 * Platform.tag：平台服务 Tag。
 */
export const tag = Internal.Tag

/**
 * NoopPlatform：
 * - 核心引擎默认只内置一个「什么都不做」的平台实现；
 * - React / Native 等具体平台在各自适配层中提供真正的实现。
 */
export class NoopPlatform implements Service {
  readonly lifecycle = {
    onSuspend: (_eff: Effect.Effect<void, never, any>) => Effect.void,
    onResume: (_eff: Effect.Effect<void, never, any>) => Effect.void,
    onReset: (_eff: Effect.Effect<void, never, any>) => Effect.void,
  }
}

/**
 * NoopPlatformLayer：
 * - 将 NoopPlatform 实现挂载到 Platform.tag 上；
 * - 作为 @logix/core 出厂默认 Layer，实际应用通常会在更外层用真实平台实现覆盖它。
 */
export const NoopPlatformLayer = Layer.succeed(
  tag,
  new NoopPlatform()
)

/**
 * defaultLayer：
 * - 目前等价于 NoopPlatformLayer；
 * - 预留未来如需更丰富默认行为时的升级空间（调用方统一使用 defaultLayer 即可）。
 */
export const defaultLayer = NoopPlatformLayer
