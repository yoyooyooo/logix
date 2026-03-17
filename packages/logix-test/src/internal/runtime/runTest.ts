import { Effect } from 'effect'
import { TestClock } from 'effect/testing'

export const runTest = <A, E, R>(effect: Effect.Effect<A, E, R>): Promise<A> => {
  // Provide TestContext to the test effect, and ensure Scope is available/closed.
  const program = Effect.scoped(effect).pipe(Effect.provide(TestClock.layer()))

  return Effect.runPromise(program as Effect.Effect<A, E, never>)
}
