import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Context, Effect, Exit, Layer, Scope, Schema, Stream, TestClock } from 'effect'
import * as Logix from '../../src/index.js'
import * as ProcessRuntime from '../../src/internal/runtime/core/process/ProcessRuntime.js'

const SourceState = Schema.Struct({ count: Schema.Number })
const SourceActions = { increment: Schema.Void }

const SourceModule = Logix.Module.make('ProcessModuleInstanceSource', {
  state: SourceState,
  actions: SourceActions,
})

const TargetState = Schema.Struct({ logs: Schema.Array(Schema.String) })
const TargetActions = { log: Schema.String }

const TargetModule = Logix.Module.make('ProcessModuleInstanceTarget', {
  state: TargetState,
  actions: TargetActions,
})

const SourceLogic = SourceModule.logic(($) =>
  Effect.gen(function* () {
    yield* $.onAction('increment').run(() => $.state.update((s) => ({ ...s, count: s.count + 1 })))
  }),
)

const TargetLogic = TargetModule.logic(($) =>
  Effect.gen(function* () {
    yield* $.onAction('log').run((action) =>
      $.state.update((s) => ({
        ...s,
        logs: [...s.logs, action.payload],
      })),
    )
  }),
)

type SourceAction = Logix.ActionOf<typeof SourceModule.shape>

const InstanceProcess = Logix.Process.link(
  {
    modules: [SourceModule, TargetModule] as const,
  },
  ($) =>
    Effect.gen(function* () {
      const source = $[SourceModule.id]
      const target = $[TargetModule.id]

      yield* source.actions$.pipe(
        Stream.runForEach((action: SourceAction) => {
          if (action._tag === 'increment') {
            return target.actions.log('Source incremented')
          }
          return Effect.void
        }),
      )
    }),
)

describe('process: moduleInstance isolation', () => {
  it.scoped('should not cross between instance scopes', () =>
    Effect.gen(function* () {
      const TargetImpl = TargetModule.implement({
        initial: { logs: [] },
        logics: [TargetLogic],
      })

      const SourceImpl = SourceModule.implement({
        initial: { count: 0 },
        logics: [SourceLogic],
        imports: [TargetImpl.impl],
        processes: [InstanceProcess],
      })

      const layer = Layer.provideMerge(ProcessRuntime.layer())(SourceImpl.impl.layer)

      const scopeA = yield* Scope.make()
      const scopeB = yield* Scope.make()

      try {
        const envA = yield* Layer.buildWithScope(layer, scopeA)
        const envB = yield* Layer.buildWithScope(layer, scopeB)

        const sourceA = Context.get(envA, SourceModule.tag)
        const targetA = Context.get(envA, TargetModule.tag)
        const sourceB = Context.get(envB, SourceModule.tag)
        const targetB = Context.get(envB, TargetModule.tag)

        const processRuntimeA = Context.get(
          envA as Context.Context<any>,
          ProcessRuntime.ProcessRuntimeTag as any,
        ) as ProcessRuntime.ProcessRuntime

        const events0 = yield* processRuntimeA.getEventsSnapshot()
        const error0 = events0.find((e) => e.type === 'process:error')
        if (error0) {
          throw new Error(
            [
              'unexpected process:error before dispatch',
              `processId=${error0.identity.identity.processId}`,
              `code=${error0.error?.code}`,
              `message=${error0.error?.message}`,
              `hint=${error0.error?.hint}`,
            ].join('\n'),
          )
        }

        yield* Effect.yieldNow()
        yield* TestClock.adjust('30 millis')
        yield* Effect.yieldNow()
        yield* sourceA.dispatch({ _tag: 'increment', payload: undefined } as any)
        yield* Effect.yieldNow()
        yield* TestClock.adjust('80 millis')
        yield* Effect.yieldNow()

        expect(yield* sourceA.getState).toEqual({ count: 1 })
        expect((yield* targetA.getState).logs).toEqual(['Source incremented'])
        expect(yield* sourceB.getState).toEqual({ count: 0 })
        expect((yield* targetB.getState).logs).toEqual([])

        yield* sourceB.dispatch({ _tag: 'increment', payload: undefined } as any)
        yield* Effect.yieldNow()
        yield* TestClock.adjust('80 millis')
        yield* Effect.yieldNow()

        expect(yield* sourceA.getState).toEqual({ count: 1 })
        expect((yield* targetA.getState).logs).toEqual(['Source incremented'])
        expect(yield* sourceB.getState).toEqual({ count: 1 })
        expect((yield* targetB.getState).logs).toEqual(['Source incremented'])
      } finally {
        yield* Scope.close(scopeA, Exit.succeed(undefined))
        yield* Scope.close(scopeB, Exit.succeed(undefined))
      }
    }),
  )
})
