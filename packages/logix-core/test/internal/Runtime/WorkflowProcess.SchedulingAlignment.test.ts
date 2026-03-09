import { describe, it, expect } from '@effect/vitest'
import {Deferred, Effect, Exit, Layer, Ref, Scope, Schema, ServiceMap } from 'effect'
import * as Logix from '../../../src/index.js'
import * as Debug from '../../../src/Debug.js'
import * as Middleware from '../../../src/Middleware.js'
import * as ProcessRuntime from '../../../src/internal/runtime/core/process/ProcessRuntime.js'
import { flushAllHostScheduler, makeTestHostScheduler, testHostSchedulerLayer } from '../testkit/hostSchedulerTestKit.js'

class AlignmentPort extends ServiceMap.Service<AlignmentPort, (input: unknown) => Effect.Effect<void, unknown, never>>()('WorkflowProcess.SchedulingAlignment.Port') {}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const getTraceName = (event: Debug.Event): string | undefined => {
  const record = event as unknown as Record<string, unknown>
  const data = record.data
  if (!isRecord(data)) return undefined
  const name = data.name
  return typeof name === 'string' && name.length > 0 ? name : undefined
}

const getTraceMeta = (event: Debug.Event): Record<string, unknown> | undefined => {
  const record = event as unknown as Record<string, unknown>
  const data = record.data
  if (!isRecord(data)) return undefined
  const meta = data.meta
  return isRecord(meta) ? meta : undefined
}

const runWorkflowExhaustCase = (): Effect.Effect<{
  readonly started: number
  readonly done: number
  readonly drops: number
  readonly dropReasons: ReadonlyArray<unknown>
}> =>
  Effect.gen(function* () {
    const M = Logix.Module.make('WorkflowProcess.Alignment.WorkflowHost', {
      state: Schema.Struct({ done: Schema.Number }),
      actions: { start: Schema.Number, done: Schema.Number },
      reducers: {
        done: Logix.Module.Reducer.mutate((draft, payload: number) => {
          ;(draft as { done: number }).done = payload
        }),
      },
    })

    const gate = yield* Deferred.make<void>()
    const startedRef = yield* Ref.make(0)

    const program = Logix.Workflow.make({
      localId: 'alignment-exhaust',
      trigger: Logix.Workflow.onAction('start'),
      policy: { concurrency: 'exhaust' },
      steps: [
        Logix.Workflow.call({
          key: 'call.alignment',
          service: AlignmentPort,
          input: Logix.Workflow.payload(),
          onSuccess: [Logix.Workflow.dispatch({ key: 'dispatch.done', actionTag: 'done', payload: Logix.Workflow.payload() })],
          onFailure: [],
        }),
      ],
    })

    const impl = M.withWorkflow(program).implement({ initial: { done: 0 } })
    const ring = Debug.makeRingBufferSink(256)
    const hostScheduler = makeTestHostScheduler()
    const runtime = Logix.Runtime.make(impl, {
      middleware: [Middleware.makeDebugObserver()],
      layer: Layer.mergeAll(
        testHostSchedulerLayer(hostScheduler),
        Debug.replace([ring.sink]),
        Debug.diagnosticsLevel('light'),
        Layer.succeed(
          AlignmentPort,
          (_input) =>
            Ref.update(startedRef, (n) => n + 1).pipe(Effect.flatMap(() => Deferred.await(gate)), Effect.asVoid) as Effect.Effect<
              void,
              unknown,
              never
            >,
        ),
      ),
    })

    try {
      return yield* Effect.promise(() =>
        runtime.runPromise(
          Effect.gen(function* () {
            const rt = yield* Effect.service(M.tag).pipe(Effect.orDie)
            yield* rt.dispatch({ _tag: 'start', payload: 1 })
            yield* flushAllHostScheduler(hostScheduler)
            yield* rt.dispatch({ _tag: 'start', payload: 2 })
            yield* flushAllHostScheduler(hostScheduler)
            yield* rt.dispatch({ _tag: 'start', payload: 3 })
            yield* flushAllHostScheduler(hostScheduler)

            yield* Deferred.succeed(gate, undefined)
            yield* flushAllHostScheduler(hostScheduler)

            const state = (yield* rt.getState) as { done: number }
            const trace = ring.getSnapshot().filter((e) => e.type === 'trace:effectop') as Array<Debug.Event>
            const drops = trace.filter((e) => getTraceName(e) === 'workflow.drop')

            return {
              started: yield* Ref.get(startedRef),
              done: state.done,
              drops: drops.length,
              dropReasons: drops.map((e) => getTraceMeta(e)?.reason),
            }
          }),
        ),
      )
    } finally {
      yield* Effect.promise(() => runtime.dispose())
    }
  })

const runProcessDropCase = (): Effect.Effect<{
  readonly started: number
  readonly completed: number
  readonly triggers: number
  readonly warnings: number
}> =>
  Effect.gen(function* () {
    const startedRef = yield* Ref.make(0)
    const completedRef = yield* Ref.make(0)
    const gatesRef = yield* Ref.make<ReadonlyArray<Deferred.Deferred<void>>>([])

    const Host = Logix.Module.make('WorkflowProcess.Alignment.ProcessHost', {
      state: Schema.Void,
      actions: {},
    })

    const Proc = Logix.Process.make(
      {
        processId: 'WorkflowProcessAlignmentDrop',
        triggers: [{ kind: 'platformEvent', platformEvent: 'test:alignment:drop' }],
        concurrency: { mode: 'drop' },
        errorPolicy: { mode: 'failStop' },
        diagnosticsLevel: 'light',
      },
      Effect.gen(function* () {
        const gate = yield* Deferred.make<void>()
        yield* Ref.update(startedRef, (n) => n + 1)
        yield* Ref.update(gatesRef, (arr) => [...arr, gate])
        yield* Deferred.await(gate)
        yield* Ref.update(completedRef, (n) => n + 1)
      }),
    )

    const HostImpl = Host.implement({
      initial: undefined,
      processes: [Proc],
    })

    const layer = Layer.provideMerge(ProcessRuntime.layer())(HostImpl.impl.layer)
    let events: ReadonlyArray<Logix.Process.ProcessEvent> = []

    const scope = yield* Scope.make()
    try {
      const env = yield* Layer.buildWithScope(layer, scope)
      const rt = ServiceMap.get(env as ServiceMap.ServiceMap<any>, ProcessRuntime.ProcessRuntimeTag as any) as ProcessRuntime.ProcessRuntime

      for (let i = 0; i < 50; i++) {
        const snapshot = yield* rt.getEventsSnapshot()
        const startedEvt = snapshot.find(
          (e) => e.type === 'process:start' && e.identity.identity.processId === 'WorkflowProcessAlignmentDrop',
        )
        if (startedEvt) break
        yield* Effect.yieldNow
      }

      yield* rt.deliverPlatformEvent({ eventName: 'test:alignment:drop' })
      yield* rt.deliverPlatformEvent({ eventName: 'test:alignment:drop' })
      yield* rt.deliverPlatformEvent({ eventName: 'test:alignment:drop' })

      for (let i = 0; i < 50; i++) {
        const gates = yield* Ref.get(gatesRef)
        if (gates.length === 1) {
          yield* Deferred.succeed(gates[0]!, undefined)
          break
        }
        yield* Effect.yieldNow
      }

      for (let i = 0; i < 50; i++) {
        const completed = yield* Ref.get(completedRef)
        if (completed === 1) break
        yield* Effect.yieldNow
      }

      events = (yield* rt.getEventsSnapshot()) as any
    } finally {
      yield* Scope.close(scope, Exit.succeed(undefined))
    }

    const triggers = events.filter((e) => e.type === 'process:trigger')
    const warnings = triggers.filter((e) => e.severity === 'warning')

    return {
      started: yield* Ref.get(startedRef),
      completed: yield* Ref.get(completedRef),
      triggers: triggers.length,
      warnings: warnings.length,
    }
  })

describe('workflow/process scheduling alignment', () => {
  it.effect('exhaust (workflow) 与 drop (process) 在忙时都只保留首个执行并丢弃后续触发', () =>
    Effect.gen(function* () {
      const workflow = yield* runWorkflowExhaustCase()
      const process = yield* runProcessDropCase()

      expect(workflow.started).toBe(1)
      expect(workflow.done).toBe(1)
      expect(workflow.drops).toBeGreaterThanOrEqual(2)
      expect(workflow.dropReasons.every((reason) => reason === 'exhaust')).toBe(true)

      expect(process.started).toBe(1)
      expect(process.completed).toBe(1)
      expect(process.triggers).toBe(3)
      expect(process.warnings).toBe(2)

      expect(workflow.started).toBe(process.started)
      expect(workflow.done).toBe(process.completed)
    }),
  )
})
