import { Context, Effect } from 'effect'

export interface Service {
  readonly lifecycle: {
    readonly onSuspend: (eff: Effect.Effect<void, never, any>) => Effect.Effect<void, never, any>
    readonly onResume: (eff: Effect.Effect<void, never, any>) => Effect.Effect<void, never, any>
    readonly onReset?: (eff: Effect.Effect<void, never, any>) => Effect.Effect<void, never, any>
  }

  /**
   * Platform signal broadcaster (for host integration and tests): triggers registered lifecycle handlers.
   *
   * Notes:
   * - The default implementation should be a safe no-op.
   * - Failure policy is decided by the platform implementation; the runtime should ensure "do not terminate the instance by default".
   */
  readonly emitSuspend: () => Effect.Effect<void, never, any>
  readonly emitResume: () => Effect.Effect<void, never, any>
  readonly emitReset: () => Effect.Effect<void, never, any>
}

export const Tag = Context.GenericTag<Service>('@logix/Platform')
