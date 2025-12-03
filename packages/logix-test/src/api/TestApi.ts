import type { Logix } from "@logix/core"
import { Effect } from "effect"

export interface TestApi<Sh extends Logix.AnyModuleShape> {
  readonly dispatch: (action: Logix.ActionOf<Sh>) => Effect.Effect<void>
  readonly assert: {
    readonly state: (
      predicate: (s: Logix.StateOf<Sh>) => boolean
    ) => Effect.Effect<void, Error, unknown>
    readonly signal: (
      expectedType: string,
      expectedPayload?: unknown
    ) => Effect.Effect<void, Error, unknown>
  }
}

