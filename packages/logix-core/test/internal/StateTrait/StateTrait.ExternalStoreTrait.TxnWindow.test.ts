import { describe, it, expect } from '@effect/vitest'
import { Effect, Schema, Stream } from 'effect'
import * as Logix from '../../../src/index.js'
import * as ModuleRuntimeImpl from '../../../src/internal/runtime/ModuleRuntime.js'
import * as BoundApiRuntime from '../../../src/internal/runtime/BoundApiRuntime.js'
import * as TaskRunner from '../../../src/internal/runtime/core/TaskRunner.js'
import { flushAllHostScheduler, makeTestHostScheduler, testHostSchedulerLayer } from '../testkit/hostSchedulerTestKit.js'

describe('StateTrait.externalStore txn-window discipline', () => {
  it.scoped('writeback runs in a transaction; getSnapshot is never called inside txn-window', () => {
    const hostScheduler = makeTestHostScheduler()
    return Effect.gen(function* () {
      const StateSchema = Schema.Struct({ value: Schema.Number })
      type State = Schema.Schema.Type<typeof StateSchema>

      type Shape = Logix.Module.Shape<typeof StateSchema, { noop: typeof Schema.Void }>
      type Action = Logix.Module.ActionOf<Shape>

      let current = 0
      const listeners = new Set<() => void>()

      const store: Logix.ExternalStore.ExternalStore<number> = {
        getSnapshot: () => {
          if (TaskRunner.isInSyncTransaction()) {
            throw new Error('getSnapshot called inside txn-window')
          }
          return current
        },
        subscribe: (listener) => {
          listeners.add(listener)
          return () => {
            listeners.delete(listener)
          }
        },
      }

      const program = Logix.StateTrait.build(
        StateSchema,
        Logix.StateTrait.from(StateSchema)({
          value: Logix.StateTrait.externalStore({ store }),
        }),
      )

      const runtime = yield* ModuleRuntimeImpl.make<State, Action>(
        { value: 0 },
        {
          moduleId: 'StateTraitExternalStoreTxnWindowTest',
        },
      )

      const bound = BoundApiRuntime.make<Shape, never>(
        {
          stateSchema: StateSchema,
          actionSchema: Schema.Never as any,
          actionMap: { noop: Schema.Void } as any,
        } as any,
        runtime as any,
        {
          getPhase: () => 'run',
          moduleId: 'StateTraitExternalStoreTxnWindowTest',
        },
      )

      yield* Logix.StateTrait.install(bound as any, program)

      const commits: Array<{ readonly value: number; readonly originKind?: string; readonly originName?: string }> = []
      yield* Effect.forkScoped(
        Stream.runForEach(runtime.changesWithMeta((s) => s.value), ({ value, meta }) =>
          Effect.sync(() => commits.push({ value, originKind: meta.originKind, originName: meta.originName })),
        ),
      )
      yield* flushAllHostScheduler(hostScheduler)
      commits.length = 0

      current = 1
      for (const listener of listeners) listener()

      yield* flushAllHostScheduler(hostScheduler)

      const after = (yield* runtime.getState) as State
      expect(after.value).toBe(1)
      expect(commits).toHaveLength(1)
      expect(commits[0]?.originKind).toBe('trait-external-store')
      expect(commits[0]?.originName).toBe('value')
    }).pipe(Effect.provide(testHostSchedulerLayer(hostScheduler)))
  })
})
