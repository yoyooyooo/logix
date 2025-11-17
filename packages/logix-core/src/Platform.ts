import { Effect, Layer } from 'effect'
import * as Internal from './internal/platform/Platform.js'

/**
 * Platform.Service: platform service interface.
 */
export type Service = Internal.Service

/**
 * Platform.tag: platform service Tag.
 */
export const tag = Internal.Tag

/**
 * NoopPlatform:
 * - The core engine ships with a single no-op platform implementation by default.
 * - Real implementations are provided by platform adapters (React / Native, etc.).
 */
export class NoopPlatform implements Service {
  readonly lifecycle = {
    onSuspend: (_eff: Effect.Effect<void, never, any>) => Effect.void,
    onResume: (_eff: Effect.Effect<void, never, any>) => Effect.void,
    onReset: (_eff: Effect.Effect<void, never, any>) => Effect.void,
  }

  readonly emitSuspend = (): Effect.Effect<void, never, any> => Effect.void
  readonly emitResume = (): Effect.Effect<void, never, any> => Effect.void
  readonly emitReset = (): Effect.Effect<void, never, any> => Effect.void
}

/**
 * NoopPlatformLayer:
 * - Mounts NoopPlatform on Platform.tag.
 * - The default `@logix/core` layer; apps typically override it with a real platform implementation.
 */
export const NoopPlatformLayer = Layer.succeed(tag, new NoopPlatform())

/**
 * defaultLayer:
 * - Currently equivalent to NoopPlatformLayer.
 * - Reserved for future upgrades; callers should depend on defaultLayer.
 */
export const defaultLayer = NoopPlatformLayer
