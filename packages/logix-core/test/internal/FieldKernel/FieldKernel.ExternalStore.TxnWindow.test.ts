import { describe, it, expect } from '@effect/vitest'
import * as FieldContracts from '@logixjs/core/repo-internal/field-contracts'
import { Effect, Schema, Stream } from 'effect'
import * as Logix from '../../../src/index.js'
import * as ModuleRuntimeImpl from '../../../src/internal/runtime/core/ModuleRuntime.js'
import * as BoundApiRuntime from '../../../src/internal/runtime/core/BoundApiRuntime.js'
import * as TaskRunner from '../../../src/internal/runtime/core/TaskRunner.js'
import * as RuntimeContracts from '../../../src/internal/runtime-contracts.js'
import { flushAllHostScheduler, makeTestHostScheduler, testHostSchedulerLayer } from '../testkit/hostSchedulerTestKit.js'

describe('FieldKernel.externalStore txn-window discipline', () => {
  it.effect('writeback runs in a transaction; getSnapshot is never called inside txn-window', () => {
    const hostScheduler = makeTestHostScheduler()
    return Effect.gen(function* () {
      const StateSchema = Schema.Struct({ value: Schema.Number })
      type State = Schema.Schema.Type<typeof StateSchema>

      type Shape = Logix.Module.Shape<typeof StateSchema, { noop: typeof Schema.Void }>
      type Action = Logix.Module.ActionOf<Shape>

      let current = 0
      const listeners = new Set<() => void>()

      const store: RuntimeContracts.ExternalInput.ExternalStore<number> = {
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

      const program = FieldContracts.buildFieldProgram(
        StateSchema,
        FieldContracts.fieldFrom(StateSchema)({
          value: FieldContracts.fieldExternalStore({ store }),
        }),
      )

      const runtime = yield* ModuleRuntimeImpl.make<State, Action>(
        { value: 0 },
        {
          moduleId: 'FieldKernelExternalStoreTxnWindowTest',
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
          moduleId: 'FieldKernelExternalStoreTxnWindowTest',
        },
      )

      yield* FieldContracts.installFieldProgram(bound as any, program)

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
      expect(commits[0]?.originKind).toBe('field-external-store')
      expect(commits[0]?.originName).toBe('value')
    }).pipe(Effect.provide(testHostSchedulerLayer(hostScheduler)))
  })
})
