import { describe, expect, it } from '@effect/vitest'
import * as FieldContracts from '@logixjs/core/repo-internal/field-contracts'
import { Effect, Schema, Stream } from 'effect'
import * as Logix from '../../../src/index.js'
import * as ModuleRuntimeImpl from '../../../src/internal/runtime/core/ModuleRuntime.js'
import * as BoundApiRuntime from '../../../src/internal/runtime/core/BoundApiRuntime.js'
import { flushAllHostScheduler, makeTestHostScheduler, testHostSchedulerLayer } from '../testkit/hostSchedulerTestKit.js'

describe('FieldKernel externalStore coalesce window', () => {
  it.effect('same-tick burst commits once and last value wins', () => {
    const hostScheduler = makeTestHostScheduler()
    return Effect.gen(function* () {
      const StateSchema = Schema.Struct({ value: Schema.Number })
      type State = Schema.Schema.Type<typeof StateSchema>

      let current = 0
      const listeners = new Set<() => void>()
      const store = {
        getSnapshot: () => current,
        subscribe: (listener: () => void) => {
          listeners.add(listener)
          return () => {
            listeners.delete(listener)
          }
        },
      }

      const program = FieldContracts.buildFieldProgram(
        StateSchema,
        FieldContracts.fieldFrom(StateSchema)({
          value: FieldContracts.fieldExternalStore({ store, coalesceWindowMs: 0 }),
        }),
      )

      const runtime = yield* ModuleRuntimeImpl.make<State, never>(
        { value: 0 },
        {
          moduleId: 'FieldKernelExternalStoreCoalesceWindowTest',
        },
      )

      const bound = BoundApiRuntime.make(
        {
          stateSchema: StateSchema,
          actionSchema: Schema.Never as any,
          actionMap: {} as any,
        } as any,
        runtime as any,
        {
          getPhase: () => 'run',
          moduleId: 'FieldKernelExternalStoreCoalesceWindowTest',
        },
      )

      yield* FieldContracts.installFieldProgram(bound as any, program)

      const commits: Array<number> = []
      yield* Effect.forkScoped(
        Stream.runForEach(runtime.changesWithMeta((s) => s.value), ({ value }) =>
          Effect.sync(() => commits.push(value)),
        ),
      )
      yield* flushAllHostScheduler(hostScheduler)
      commits.length = 0

      current = 1
      for (const listener of listeners) listener()
      current = 2
      for (const listener of listeners) listener()

      yield* flushAllHostScheduler(hostScheduler)

      const after = (yield* runtime.getState) as State
      expect(after.value).toBe(2)
      expect(commits).toEqual([2])
    }).pipe(Effect.provide(testHostSchedulerLayer(hostScheduler)))
  })

  it.effect('coalesces updates within coalesceWindowMs before flushing', () => {
    const hostScheduler = makeTestHostScheduler()
    return Effect.gen(function* () {
      const StateSchema = Schema.Struct({ value: Schema.Number })
      type State = Schema.Schema.Type<typeof StateSchema>

      let current = 0
      const listeners = new Set<() => void>()
      const store = {
        getSnapshot: () => current,
        subscribe: (listener: () => void) => {
          listeners.add(listener)
          return () => {
            listeners.delete(listener)
          }
        },
      }

      const program = FieldContracts.buildFieldProgram(
        StateSchema,
        FieldContracts.fieldFrom(StateSchema)({
          value: FieldContracts.fieldExternalStore({ store, coalesceWindowMs: 10 }),
        }),
      )

      const runtime = yield* ModuleRuntimeImpl.make<State, never>(
        { value: 0 },
        {
          moduleId: 'FieldKernelExternalStoreCoalesceWindowDelayedTest',
        },
      )

      const bound = BoundApiRuntime.make(
        {
          stateSchema: StateSchema,
          actionSchema: Schema.Never as any,
          actionMap: {} as any,
        } as any,
        runtime as any,
        {
          getPhase: () => 'run',
          moduleId: 'FieldKernelExternalStoreCoalesceWindowDelayedTest',
        },
      )

      yield* FieldContracts.installFieldProgram(bound as any, program)

      const commits: Array<number> = []
      yield* Effect.forkScoped(
        Stream.runForEach(runtime.changesWithMeta((s) => s.value), ({ value }) =>
          Effect.sync(() => commits.push(value)),
        ),
      )
      yield* flushAllHostScheduler(hostScheduler)
      commits.length = 0

      current = 1
      for (const listener of listeners) listener()

      yield* Effect.yieldNow
      yield* Effect.sync(() => {
        hostScheduler.flushMicrotasks()
      })

      expect((yield* runtime.getState).value).toBe(0)
      expect(hostScheduler.getQueueSize().macrotasks).toBeGreaterThan(0)

      current = 2
      for (const listener of listeners) listener()

      yield* flushAllHostScheduler(hostScheduler)

      const after = (yield* runtime.getState) as State
      expect(after.value).toBe(2)
      expect(commits).toEqual([2])
    }).pipe(Effect.provide(testHostSchedulerLayer(hostScheduler)))
  })

  it.effect('upgrades a delayed low-priority flush when a normal-priority write arrives', () => {
    const hostScheduler = makeTestHostScheduler()
    return Effect.gen(function* () {
      const StateSchema = Schema.Struct({ slow: Schema.Number, urgent: Schema.Number })
      type State = Schema.Schema.Type<typeof StateSchema>

      let slowCurrent = 0
      let urgentCurrent = 0
      const slowListeners = new Set<() => void>()
      const urgentListeners = new Set<() => void>()
      const slowStore = {
        getSnapshot: () => slowCurrent,
        subscribe: (listener: () => void) => {
          slowListeners.add(listener)
          return () => {
            slowListeners.delete(listener)
          }
        },
      }
      const urgentStore = {
        getSnapshot: () => urgentCurrent,
        subscribe: (listener: () => void) => {
          urgentListeners.add(listener)
          return () => {
            urgentListeners.delete(listener)
          }
        },
      }

      const program = FieldContracts.buildFieldProgram(
        StateSchema,
        FieldContracts.fieldFrom(StateSchema)({
          slow: FieldContracts.fieldExternalStore({ store: slowStore, coalesceWindowMs: 10, priority: 'nonUrgent' }),
          urgent: FieldContracts.fieldExternalStore({ store: urgentStore, coalesceWindowMs: 0 }),
        }),
      )

      const runtime = yield* ModuleRuntimeImpl.make<State, never>(
        { slow: 0, urgent: 0 },
        {
          moduleId: 'FieldKernelExternalStoreCoalesceWindowPriorityUpgradeTest',
        },
      )

      const bound = BoundApiRuntime.make(
        {
          stateSchema: StateSchema,
          actionSchema: Schema.Never as any,
          actionMap: {} as any,
        } as any,
        runtime as any,
        {
          getPhase: () => 'run',
          moduleId: 'FieldKernelExternalStoreCoalesceWindowPriorityUpgradeTest',
        },
      )

      yield* FieldContracts.installFieldProgram(bound as any, program)

      const commits: Array<string> = []
      yield* Effect.forkScoped(
        Stream.runForEach(runtime.changesWithMeta((s) => `${s.slow}:${s.urgent}`), ({ value }) =>
          Effect.sync(() => commits.push(value)),
        ),
      )
      yield* flushAllHostScheduler(hostScheduler)
      commits.length = 0

      slowCurrent = 1
      for (const listener of slowListeners) listener()

      yield* Effect.yieldNow
      yield* Effect.sync(() => {
        hostScheduler.flushMicrotasks()
      })

      expect((yield* runtime.getState).slow).toBe(0)
      expect(hostScheduler.getQueueSize().macrotasks).toBeGreaterThan(0)

      urgentCurrent = 7
      for (const listener of urgentListeners) listener()

      yield* Effect.yieldNow
      yield* Effect.sync(() => {
        hostScheduler.flushMicrotasks()
      })
      for (let i = 0; i < 16; i += 1) {
        yield* Effect.yieldNow
      }

      const beforeDelayedMacrotask = (yield* runtime.getState) as State
      expect(beforeDelayedMacrotask.urgent).toBe(7)
      expect(beforeDelayedMacrotask.slow).toBe(1)
      expect(commits).toEqual(['1:7'])

      yield* flushAllHostScheduler(hostScheduler)

      const afterInvalidatedDelayedFlush = (yield* runtime.getState) as State
      expect(afterInvalidatedDelayedFlush.urgent).toBe(7)
      expect(afterInvalidatedDelayedFlush.slow).toBe(1)
      expect(commits).toEqual(['1:7'])
    }).pipe(Effect.provide(testHostSchedulerLayer(hostScheduler)))
  })

})