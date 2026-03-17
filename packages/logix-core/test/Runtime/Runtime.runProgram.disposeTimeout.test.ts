import { describe, it, expect } from '@effect/vitest'
import { Cause, Effect, Exit, Scope } from 'effect'
import { closeProgramScope } from '../../src/internal/runtime/core/runner/ProgramRunner.closeScope.js'

describe('Runtime.runProgram dispose timeout (US1)', () => {
  it.effect('closeScopeTimeout produces DisposeTimeout and triggers onError warning', () =>
    Effect.gen(function* () {
      let onErrorCalls = 0

      const scope = yield* Scope.make()
      yield* Scope.addFinalizer(
        scope,
        Effect.promise(() => new Promise<void>((resolve) => setTimeout(resolve, 50))),
      )

      const outcome = yield* closeProgramScope({
        scope,
        timeoutMs: 10,
        identity: { moduleId: 'Runtime.runProgram.disposeTimeout', instanceId: 'i1' },
        onError: () =>
          Effect.sync(() => {
            onErrorCalls += 1
          }),
      }).pipe(Effect.exit)

      expect(Exit.isFailure(outcome)).toBe(true)
      if (Exit.isFailure(outcome)) {
        const e: any = outcome.cause.reasons.filter(Cause.isDieReason).map((reason) => reason.defect)[0]
        expect(e?._tag).toBe('DisposeTimeout')
      }

      expect(onErrorCalls).toBeGreaterThan(0)
    }),
  )
})
