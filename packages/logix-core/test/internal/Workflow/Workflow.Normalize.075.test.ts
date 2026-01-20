import { describe, it, expect } from '@effect/vitest'
import { Context, Effect, Layer, Schema } from 'effect'
import * as Logix from '../../../src/index.js'
import { flushAllHostScheduler, makeTestHostScheduler, testHostSchedulerLayer } from '../testkit/hostSchedulerTestKit.js'

class OuterPort extends Context.Tag('Workflow.Normalize.075.OuterPort')<
  OuterPort,
  (input: unknown) => Effect.Effect<unknown, unknown, unknown>
>() {}

class InnerPort extends Context.Tag('Workflow.Normalize.075.InnerPort')<
  InnerPort,
  (input: unknown) => Effect.Effect<unknown, unknown, unknown>
>() {}

describe('Workflow normalize (075)', () => {
  it.effect('fills nested call branches (onSuccess/onFailure default arrays) for both Static IR and runtime compilation', () =>
    Effect.gen(function* () {
      const program = Logix.Workflow.make({
        localId: 'p',
        trigger: Logix.Workflow.onAction('start'),
        steps: [
          {
            kind: 'call',
            key: 'call.outer',
            serviceId: 'Workflow.Normalize.075.OuterPort',
            onSuccess: [
              {
                kind: 'call',
                key: 'call.inner',
                serviceId: 'Workflow.Normalize.075.InnerPort',
                // Intentionally missing onSuccess/onFailure: def-like input may omit them.
              },
              { kind: 'dispatch', key: 'dispatch.done', actionTag: 'done' },
            ],
            onFailure: [{ kind: 'dispatch', key: 'dispatch.fail', actionTag: 'fail' }],
          },
        ],
      } as any)

      expect(() => program.exportStaticIr('Workflow.Normalize.075')).not.toThrow()

      const M = Logix.Module.make('Workflow.Normalize.075', {
        state: Schema.Struct({ done: Schema.Number, fail: Schema.Number }),
        actions: { start: Schema.Void, done: Schema.Void, fail: Schema.Void },
        reducers: {
          done: Logix.Module.Reducer.mutate((draft) => {
            ;(draft as { done: number }).done += 1
          }),
          fail: Logix.Module.Reducer.mutate((draft) => {
            ;(draft as { fail: number }).fail += 1
          }),
        },
      })

      const impl = M.withWorkflow(program).implement({ initial: { done: 0, fail: 0 } })
      const hostScheduler = makeTestHostScheduler()
      const runtime = Logix.Runtime.make(impl, {
        layer: Layer.mergeAll(
          testHostSchedulerLayer(hostScheduler),
          Layer.succeed(OuterPort, (_input: unknown) => Effect.void),
          Layer.succeed(InnerPort, (_input: unknown) => Effect.void),
        ),
      })

      try {
        yield* Effect.promise(() =>
          runtime.runPromise(
            Effect.gen(function* () {
              const rt = yield* M.tag
              yield* rt.dispatch({ _tag: 'start' })
              yield* flushAllHostScheduler(hostScheduler)
              expect(yield* rt.getState).toEqual({ done: 1, fail: 0 })
            }),
          ),
        )
      } finally {
        yield* Effect.promise(() => runtime.dispose())
      }
    }),
  )
})
