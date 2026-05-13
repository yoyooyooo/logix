import { describe, expect, it } from '@effect/vitest'
import * as FieldContracts from '@logixjs/core/repo-internal/field-contracts'
import { Effect, Exit, Schema, Scope } from 'effect'
import * as ModuleRuntimeImpl from '../../../src/internal/runtime/core/ModuleRuntime.js'
import * as BoundApiRuntime from '../../../src/internal/runtime/core/BoundApiRuntime.js'
import { flushAllHostScheduler, makeTestHostScheduler, testHostSchedulerLayer } from '../testkit/hostSchedulerTestKit.js'

describe('FieldKernel externalStore dispose cancels scheduled flush', () => {
  it.effect('does not execute a pending delayed flush after the install scope is closed', () => {
    const baseScheduler = makeTestHostScheduler()
    let cancelCalls = 0
    const hostScheduler = {
      ...baseScheduler,
      scheduleTimeout: (ms: number, cb: () => void) => {
        const cancel = baseScheduler.scheduleTimeout(ms, cb)
        return () => {
          cancelCalls += 1
          cancel()
        }
      },
    }
    return Effect.scoped(
      Effect.gen(function* () {
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

        const runtimeScope = yield* Scope.make()
        const runtime = yield* Effect.provideService(
          ModuleRuntimeImpl.make<State, never>(
            { value: 0 },
            { moduleId: 'FieldKernelExternalStoreDisposeCancelsFlush' },
          ),
          Scope.Scope,
          runtimeScope,
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
            moduleId: 'FieldKernelExternalStoreDisposeCancelsFlush',
          },
        )

        const installScope = yield* Scope.make()
        yield* Effect.provideService(
          FieldContracts.installFieldProgram(bound as any, program),
          Scope.Scope,
          installScope,
        )
        yield* flushAllHostScheduler(hostScheduler)

        current = 1
        for (const listener of listeners) listener()
        yield* Effect.yieldNow
        yield* Effect.sync(() => hostScheduler.flushMicrotasks())
        expect(hostScheduler.getQueueSize().macrotasks).toBeGreaterThan(0)

        yield* Scope.close(installScope, Exit.succeed(undefined))
        expect(listeners.size).toBe(0)
        expect(cancelCalls).toBe(1)

        current = 2
        yield* flushAllHostScheduler(hostScheduler)
        expect(hostScheduler.getQueueSize()).toEqual({ microtasks: 0, macrotasks: 0 })
        yield* Scope.close(runtimeScope, Exit.succeed(undefined))
      }).pipe(Effect.provide(testHostSchedulerLayer(hostScheduler))),
    )
  })
})
