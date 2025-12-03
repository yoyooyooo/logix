import { Effect, Context, Layer } from "effect"
import * as Logic from "../api/Logic.js"

export class NoopPlatform implements Logic.Platform {
  readonly lifecycle = {
    onSuspend: (_eff: Effect.Effect<void, never, any>) => Effect.void,
    onResume: (_eff: Effect.Effect<void, never, any>) => Effect.void,
    onReset: (_eff: Effect.Effect<void, never, any>) => Effect.void,
  }
}

export const NoopPlatformLayer = Layer.succeed(
  Logic.Platform,
  new NoopPlatform()
)
