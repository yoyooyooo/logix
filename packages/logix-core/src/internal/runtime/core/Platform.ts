import { Context, Effect } from "effect"

export interface Service {
  readonly lifecycle: {
    readonly onSuspend: (
      eff: Effect.Effect<void, never, any>
    ) => Effect.Effect<void, never, any>
    readonly onResume: (
      eff: Effect.Effect<void, never, any>
    ) => Effect.Effect<void, never, any>
    readonly onReset?: (
      eff: Effect.Effect<void, never, any>
    ) => Effect.Effect<void, never, any>
  }
}

export const Tag = Context.GenericTag<Service>("@logix/Platform")

