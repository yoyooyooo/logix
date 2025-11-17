import type { Duration, Effect, TestClock } from 'effect'
import type * as Logix from '@logix/core'
import type { ProgramRunContext } from '@logix/core/Runtime'
import type { WaitUntilOptions } from '../utils/waitUntil.js'

export interface TestApi<Sh extends Logix.AnyModuleShape> {
  readonly ctx: ProgramRunContext<Sh>
  readonly dispatch: (action: Logix.ActionOf<Sh>) => Effect.Effect<void>
  /**
   * Advances the test clock (must run under TestContext).
   *
   * Notes:
   * - For logic that depends on `Effect.sleep` / `Schedule.addDelay`, you must explicitly advance TestClock
   *   for time to move forward.
   * - The runner does not implicitly keep-alive / auto-advance time, keeping time semantics controllable and explainable.
   */
  readonly advance: (duration: Duration.DurationInput) => Effect.Effect<void, never, TestClock.TestClock>
  readonly assert: {
    readonly state: (
      predicate: (s: Logix.StateOf<Sh>) => boolean,
      options?: WaitUntilOptions,
    ) => Effect.Effect<void, Error, TestClock.TestClock>
    readonly signal: (
      expectedType: string,
      expectedPayload?: unknown,
      options?: WaitUntilOptions,
    ) => Effect.Effect<void, Error, TestClock.TestClock>
  }
}
