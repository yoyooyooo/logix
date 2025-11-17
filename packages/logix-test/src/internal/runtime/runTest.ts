import { Effect, TestContext } from 'effect'

export const runTest = <A, E, R>(effect: Effect.Effect<A, E, R>): Promise<A> => {
  // Provide TestContext to the test effect, and ensure Scope is available/closed.
  const program = Effect.scoped(effect).pipe(Effect.provide(TestContext.TestContext))

  return Effect.runPromise(program as Effect.Effect<A, E, never>)
}
