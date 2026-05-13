import { describe, it, expect } from '@effect/vitest'
import { Cause, Effect, Exit, Layer, Schema, Scope, ServiceMap } from 'effect'
import * as Logix from '../../src/index.js'
import { closeProgramScope } from '../../src/internal/runtime/core/runner/ProgramRunner.closeScope.js'

describe('Runtime.run error taxonomy (US1)', () => {
  it.effect('BootError is distinguishable and includes stable identity fields', () =>
    Effect.gen(function* () {
      const Root = Logix.Module.make('Runtime.run.errorCategory.Boot', {
        state: Schema.Void,
        actions: {},
      })
      const program = Logix.Program.make(Root, { initial: undefined, logics: [] })

      const DummyTag = ServiceMap.Service<{}>('@test/Runtime.run.errorCategory/Boot')
      const failingLayer = Layer.effect(DummyTag, Effect.die(new Error('layer build failed'))) as any

      const bootOutcome = yield* Effect.promise(() =>
        Logix.Runtime.run(program, () => Effect.void, {
          layer: failingLayer as any,
          handleSignals: false,
        }),
      ).pipe(Effect.exit)

      expect(Exit.isFailure(bootOutcome)).toBe(true)
      if (Exit.isFailure(bootOutcome)) {
        const e: any = bootOutcome.cause.reasons.filter(Cause.isDieReason).map((reason) => reason.defect)[0]
        expect(e?._tag).toBe('BootError')
        expect(e?.entrypoint).toBe('boot')
        expect(typeof e?.moduleId).toBe('string')
        expect(typeof e?.instanceId).toBe('string')
      }
    }),
  )

  it.effect('MainError is distinguishable and includes stable identity fields', () =>
    Effect.gen(function* () {
      const Root = Logix.Module.make('Runtime.run.errorCategory.Main', {
        state: Schema.Void,
        actions: {},
      })
      const program = Logix.Program.make(Root, { initial: undefined, logics: [] })

      const mainOutcome = yield* Effect.promise(() =>
        Logix.Runtime.run(program, () => Effect.die(new Error('main fail')), {
          layer: Layer.empty as Layer.Layer<any, never, never>,
          handleSignals: false,
        }),
      ).pipe(Effect.exit)

      expect(Exit.isFailure(mainOutcome)).toBe(true)
      if (Exit.isFailure(mainOutcome)) {
        const e: any = mainOutcome.cause.reasons.filter(Cause.isDieReason).map((reason) => reason.defect)[0]
        expect(e?._tag).toBe('MainError')
        expect(e?.entrypoint).toBe('main')
        expect(typeof e?.moduleId).toBe('string')
        expect(typeof e?.instanceId).toBe('string')
      }
    }),
  )

  it.effect('DisposeTimeout is distinguishable and includes actionable suggestions', () =>
    Effect.gen(function* () {
      const scope = yield* Scope.make()
      yield* Scope.addFinalizer(
        scope,
        Effect.promise(() => new Promise<void>((resolve) => setTimeout(resolve, 50))),
      )

      const disposeOutcome = yield* closeProgramScope({
        scope,
        timeoutMs: 10,
        identity: { moduleId: 'Runtime.run.errorCategory.DisposeTimeout', instanceId: 'i1' },
      }).pipe(Effect.exit)

      expect(Exit.isFailure(disposeOutcome)).toBe(true)
      if (Exit.isFailure(disposeOutcome)) {
        const e: any = disposeOutcome.cause.reasons.filter(Cause.isDieReason).map((reason) => reason.defect)[0]
        expect(e?._tag).toBe('DisposeTimeout')
        expect(e?.entrypoint).toBe('dispose')
        expect(Array.isArray(e?.suggestions)).toBe(true)
        expect(e.suggestions.length).toBeGreaterThan(0)
      }
    }),
  )
})
