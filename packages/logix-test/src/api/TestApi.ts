import { Effect } from "effect"
import type * as Logix from "@logix/core"
import type { WaitUntilOptions } from "../utils/waitUntil.js"

export interface TestApi<Sh extends Logix.AnyModuleShape> {
  readonly dispatch: (action: Logix.ActionOf<Sh>) => Effect.Effect<void>
  readonly assert: {
    readonly state: (
      predicate: (s: Logix.StateOf<Sh>) => boolean,
      options?: WaitUntilOptions
    ) => Effect.Effect<void, Error, unknown>
    readonly signal: (
      expectedType: string,
      expectedPayload?: unknown,
      options?: WaitUntilOptions
    ) => Effect.Effect<void, Error, unknown>
  }
}
