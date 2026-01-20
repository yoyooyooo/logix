import { describe, it, expect } from '@effect/vitest'
import { Context, Deferred, Effect, Layer, Ref, Schema } from 'effect'
import * as Logix from '../../../src/index.js'
import * as Debug from '../../../src/Debug.js'
import * as Middleware from '../../../src/Middleware.js'
import { __unsafeGetWatcherStartCount } from '../../../src/internal/runtime/core/WorkflowRuntime.js'
import { flushAllHostScheduler, makeTestHostScheduler, testHostSchedulerLayer } from '../testkit/hostSchedulerTestKit.js'

class SubmitPort extends Context.Tag('WorkflowRuntime.075.SubmitPort')<
  SubmitPort,
  (input: unknown) => Effect.Effect<void, unknown, never>
>() {}

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

describe('WorkflowRuntime (075)', () => {
  it.effect('T200: submit → call → success/failure', () =>
    Effect.gen(function* () {
      const M = Logix.Module.make('WorkflowRuntime.075.Submit', {
        state: Schema.Struct({ ok: Schema.Number, bad: Schema.Number }),
        actions: { submit: Schema.Boolean, ok: Schema.Void, bad: Schema.Void },
        reducers: {
          ok: Logix.Module.Reducer.mutate((draft) => {
            ;(draft as { ok: number; bad: number }).ok += 1
          }),
          bad: Logix.Module.Reducer.mutate((draft) => {
            ;(draft as { ok: number; bad: number }).bad += 1
          }),
        },
      })

      const program = Logix.Workflow.make({
        localId: 'submit',
        trigger: Logix.Workflow.onAction('submit'),
        steps: [
          Logix.Workflow.call({
            key: 'call.submit',
            service: SubmitPort,
            input: Logix.Workflow.payload(),
            onSuccess: [Logix.Workflow.dispatch({ key: 'dispatch.ok', actionTag: 'ok' })],
            onFailure: [Logix.Workflow.dispatch({ key: 'dispatch.bad', actionTag: 'bad' })],
          }),
        ],
      })

      const impl = M.withWorkflow(program).implement({ initial: { ok: 0, bad: 0 } })

      const hostScheduler = makeTestHostScheduler()
      const runtime = Logix.Runtime.make(impl, {
        layer: Layer.mergeAll(
          testHostSchedulerLayer(hostScheduler),
          Layer.succeed(SubmitPort, (input) => (input === true ? Effect.fail(new Error('boom')) : Effect.void)),
        ),
      })

      try {
        yield* Effect.promise(() =>
          runtime.runPromise(
            Effect.gen(function* () {
              const rt = yield* M.tag

              yield* rt.dispatch({ _tag: 'submit', payload: false })
              yield* flushAllHostScheduler(hostScheduler)

              yield* rt.dispatch({ _tag: 'submit', payload: true })
              yield* flushAllHostScheduler(hostScheduler)

              expect(yield* rt.getState).toEqual({ ok: 1, bad: 1 })
            }),
          ),
        )
      } finally {
        yield* Effect.promise(() => runtime.dispose())
      }
    }),
  )

  it.effect('T200: latest cancels previous run (reason=latest)', () =>
    Effect.gen(function* () {
      const M = Logix.Module.make('WorkflowRuntime.075.Latest', {
        state: Schema.Struct({ done: Schema.Number }),
        actions: { start: Schema.Number, done: Schema.Number },
        reducers: {
          done: Logix.Module.Reducer.mutate((draft, payload: number) => {
            ;(draft as { done: number }).done = payload
          }),
        },
      })

      const gate1 = yield* Deferred.make<void>()
      const gate2 = yield* Deferred.make<void>()

      const port = (input: unknown) =>
        Effect.gen(function* () {
          const n = typeof input === 'number' ? input : 0
          if (n === 1) {
            yield* Deferred.await(gate1)
            return
          }
          if (n === 2) {
            yield* Deferred.await(gate2)
            return
          }
        })

      const program = Logix.Workflow.make({
        localId: 'latest',
        trigger: Logix.Workflow.onAction('start'),
        policy: { concurrency: 'latest' },
        steps: [
          Logix.Workflow.call({
            key: 'call.port',
            service: SubmitPort,
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
          Layer.succeed(SubmitPort, port),
        ),
      })

      try {
        yield* Effect.promise(() =>
          runtime.runPromise(
            Effect.gen(function* () {
              const rt = yield* M.tag

              yield* rt.dispatch({ _tag: 'start', payload: 1 })
              yield* flushAllHostScheduler(hostScheduler)

              yield* rt.dispatch({ _tag: 'start', payload: 2 })
              yield* flushAllHostScheduler(hostScheduler)

              yield* Deferred.succeed(gate2, undefined)
              yield* flushAllHostScheduler(hostScheduler)

              // ensure the first run won't block cleanup even if it wasn't interrupted for some reason
              yield* Deferred.succeed(gate1, undefined).pipe(Effect.ignore)
              yield* flushAllHostScheduler(hostScheduler)

              expect(yield* rt.getState).toEqual({ done: 2 })

              const trace = ring.getSnapshot().filter((e) => e.type === 'trace:effectop') as Array<Debug.Event>
              const cancels = trace.filter((e) => getTraceName(e) === 'workflow.cancel')
              expect(cancels.length).toBeGreaterThanOrEqual(1)
              expect(getTraceMeta(cancels[0]!)?.reason).toBe('latest')
            }),
          ),
        )
      } finally {
        yield* Effect.promise(() => runtime.dispose())
      }
    }),
  )

  it.effect('T200: exhaust drops while busy (reason=exhaust)', () =>
    Effect.gen(function* () {
      const M = Logix.Module.make('WorkflowRuntime.075.Exhaust', {
        state: Schema.Struct({ done: Schema.Number }),
        actions: { start: Schema.Number, done: Schema.Number },
        reducers: {
          done: Logix.Module.Reducer.mutate((draft, payload: number) => {
            ;(draft as { done: number }).done = payload
          }),
        },
      })

      const gate = yield* Deferred.make<void>()

      const port = (_input: unknown) => Deferred.await(gate)

      const program = Logix.Workflow.make({
        localId: 'exhaust',
        trigger: Logix.Workflow.onAction('start'),
        policy: { concurrency: 'exhaust' },
        steps: [
          Logix.Workflow.call({
            key: 'call.port',
            service: SubmitPort,
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
          Layer.succeed(SubmitPort, port),
        ),
      })

      try {
        yield* Effect.promise(() =>
          runtime.runPromise(
            Effect.gen(function* () {
              const rt = yield* M.tag

              yield* rt.dispatch({ _tag: 'start', payload: 1 })
              yield* flushAllHostScheduler(hostScheduler)

              // second start should be dropped while the first is waiting on gate
              yield* rt.dispatch({ _tag: 'start', payload: 2 })
              yield* flushAllHostScheduler(hostScheduler)

              yield* Deferred.succeed(gate, undefined)
              yield* flushAllHostScheduler(hostScheduler)

              expect(yield* rt.getState).toEqual({ done: 1 })

              const trace = ring.getSnapshot().filter((e) => e.type === 'trace:effectop') as Array<Debug.Event>
              const drops = trace.filter((e) => getTraceName(e) === 'workflow.drop')
              expect(drops.length).toBeGreaterThanOrEqual(1)
              expect(getTraceMeta(drops[0]!)?.reason).toBe('exhaust')
            }),
          ),
        )
      } finally {
        yield* Effect.promise(() => runtime.dispose())
      }
    }),
  )

  it.effect('T201: delay is cancellable (timer.cancel) and writes back latest only', () =>
    Effect.gen(function* () {
      const M = Logix.Module.make('WorkflowRuntime.075.DelayLatest', {
        state: Schema.Struct({ done: Schema.Number }),
        actions: { start: Schema.Number, done: Schema.Number },
        reducers: {
          done: Logix.Module.Reducer.mutate((draft, payload: number) => {
            ;(draft as { done: number }).done = payload
          }),
        },
      })

      const program = Logix.Workflow.make({
        localId: 'delayLatest',
        trigger: Logix.Workflow.onAction('start'),
        policy: { concurrency: 'latest' },
        steps: [
          Logix.Workflow.delay({ key: 'delay.1', ms: 10 }),
          Logix.Workflow.dispatch({ key: 'dispatch.done', actionTag: 'done', payload: Logix.Workflow.payload() }),
        ],
      })

      const impl = M.withWorkflow(program).implement({ initial: { done: 0 } })

      const ring = Debug.makeRingBufferSink(512)
      const hostScheduler = makeTestHostScheduler()
      const runtime = Logix.Runtime.make(impl, {
        middleware: [Middleware.makeDebugObserver()],
        layer: Layer.mergeAll(
          testHostSchedulerLayer(hostScheduler),
          Debug.replace([ring.sink]),
          Debug.diagnosticsLevel('full'),
        ),
      })

      const flushOnlyMicrotasksUntil = (predicate: () => boolean): Effect.Effect<void> =>
        Effect.gen(function* () {
          for (let turn = 0; turn < 128; turn += 1) {
            if (predicate()) return
            yield* Effect.sync(() => {
              hostScheduler.flushMicrotasks({ max: 10_000 })
            })
            yield* Effect.yieldNow()
          }
          throw new Error('[WorkflowRuntime.075] timed out waiting for predicate')
        })

      try {
        yield* Effect.promise(() =>
          runtime.runPromise(
            Effect.gen(function* () {
              const rt = yield* M.tag

              yield* rt.dispatch({ _tag: 'start', payload: 1 })

              yield* flushOnlyMicrotasksUntil(() => {
                const hasSchedule = ring.getSnapshot().some((e) => getTraceName(e) === 'workflow.timer.schedule')
                const hasPendingTimer = hostScheduler.getQueueSize().macrotasks > 0
                return hasSchedule && hasPendingTimer
              })

              // cancel the first run before running macrotasks (timers)
              yield* rt.dispatch({ _tag: 'start', payload: 2 })
              yield* flushOnlyMicrotasksUntil(() =>
                ring.getSnapshot().some((e) => getTraceName(e) === 'workflow.timer.cancel'),
              )

              yield* flushAllHostScheduler(hostScheduler)

              expect(yield* rt.getState).toEqual({ done: 2 })

              const trace = ring.getSnapshot().filter((e) => e.type === 'trace:effectop') as Array<Debug.Event>
              const scheduleCount = trace.filter((e) => getTraceName(e) === 'workflow.timer.schedule').length
              const cancelCount = trace.filter((e) => getTraceName(e) === 'workflow.timer.cancel').length
              const firedCount = trace.filter((e) => getTraceName(e) === 'workflow.timer.fired').length

              expect(scheduleCount).toBeGreaterThanOrEqual(1)
              expect(cancelCount).toBeGreaterThanOrEqual(1)
              expect(firedCount).toBeGreaterThanOrEqual(1)
            }),
          ),
        )
      } finally {
        yield* Effect.promise(() => runtime.dispose())
      }
    }),
  )

  it.effect('SC-002: timer-triggered dispatch appears in trace:tick.triggerSummary (kind=timer)', () =>
    Effect.gen(function* () {
      const M = Logix.Module.make('WorkflowRuntime.075.TickTriggerSummary', {
        state: Schema.Struct({ done: Schema.Number }),
        actions: { start: Schema.Void, done: Schema.Void },
        reducers: {
          done: Logix.Module.Reducer.mutate((draft) => {
            ;(draft as { done: number }).done += 1
          }),
        },
      })

      const program = Logix.Workflow.make({
        localId: 'delay',
        trigger: Logix.Workflow.onAction('start'),
        policy: { concurrency: 'latest' },
        steps: [Logix.Workflow.delay({ key: 'delay.1', ms: 10 }), Logix.Workflow.dispatch({ key: 'dispatch.done', actionTag: 'done' })],
      })

      const impl = M.withWorkflow(program).implement({ initial: { done: 0 } })

      const ring = Debug.makeRingBufferSink(256)
      const hostScheduler = makeTestHostScheduler()
      const debugLayer = Debug.devtoolsHubLayer(Debug.replace([ring.sink]), {
        diagnosticsLevel: 'full',
      }) as unknown as Layer.Layer<unknown, never, never>
      const runtime = Logix.Runtime.make(impl, {
        middleware: [Middleware.makeDebugObserver()],
        layer: Layer.mergeAll(testHostSchedulerLayer(hostScheduler), debugLayer),
      })

      try {
        yield* Effect.promise(() =>
          runtime.runPromise(
            Effect.gen(function* () {
              const rt = yield* M.tag
              yield* rt.dispatch({ _tag: 'start' })
              yield* flushAllHostScheduler(hostScheduler)
              expect(yield* rt.getState).toEqual({ done: 1 })
            }),
          ),
        )

        const ticks = ring.getSnapshot().filter((e) => e.type === 'trace:tick') as Array<Debug.Event>
        const timerTick = ticks.find((e) => {
          const record = e as unknown as Record<string, unknown>
          const data = record.data
          if (!isRecord(data)) return false
          const triggerSummary = data.triggerSummary
          if (!isRecord(triggerSummary)) return false
          const kinds = triggerSummary.kinds
          if (!Array.isArray(kinds)) return false
          return kinds.some((k) => isRecord(k) && k.kind === 'timer')
        })
        expect(timerTick).toBeDefined()
      } finally {
        yield* Effect.promise(() => runtime.dispose())
      }
    }),
  )

  it.effect('T202: diagnostics gate (off|light|sampled)', () =>
    Effect.gen(function* () {
      const M = Logix.Module.make('WorkflowRuntime.075.DiagnosticsGate', {
        state: Schema.Struct({ done: Schema.Number }),
        actions: { start: Schema.Number, done: Schema.Number },
        reducers: {
          done: Logix.Module.Reducer.mutate((draft, payload: number) => {
            ;(draft as { done: number }).done = payload
          }),
        },
      })

      const program = Logix.Workflow.make({
        localId: 'gate',
        trigger: Logix.Workflow.onAction('start'),
        steps: [
          Logix.Workflow.call({
            key: 'call.port',
            service: SubmitPort,
            input: Logix.Workflow.payload(),
            onSuccess: [Logix.Workflow.dispatch({ key: 'dispatch.done', actionTag: 'done', payload: Logix.Workflow.payload() })],
            onFailure: [],
          }),
        ],
      })

      const impl = M.withWorkflow(program).implement({ initial: { done: 0 } })

      const runOnce = async (diagnosticsLevel: Debug.DiagnosticsLevel, n: number): Promise<number> => {
        const ring = Debug.makeRingBufferSink(1024)
        const hostScheduler = makeTestHostScheduler()
        const runtime = Logix.Runtime.make(impl, {
          middleware: [Middleware.makeDebugObserver()],
          layer: Layer.mergeAll(
            testHostSchedulerLayer(hostScheduler),
            Debug.replace([ring.sink]),
            Debug.diagnosticsLevel(diagnosticsLevel),
            Layer.succeed(SubmitPort, (_input: unknown) => Effect.void),
          ),
        })

        try {
          return await runtime.runPromise(
            Effect.gen(function* () {
              const rt = yield* M.tag
              for (let i = 0; i < n; i += 1) {
                yield* rt.dispatch({ _tag: 'start', payload: i + 1 })
                yield* flushAllHostScheduler(hostScheduler)
              }

              const trace = ring.getSnapshot().filter((e) => e.type === 'trace:effectop') as Array<Debug.Event>
              return trace.filter((e) => (getTraceName(e) ?? '').startsWith('workflow.')).length
            }),
          )
        } finally {
          await runtime.dispose()
        }
      }

      expect(yield* Effect.promise(() => runOnce('off', 1))).toBe(0)
      expect(yield* Effect.promise(() => runOnce('light', 1))).toBeGreaterThan(0)

      // sampled: 1/16 by runSeq (deterministic); first 15 runs should be unobserved.
      expect(yield* Effect.promise(() => runOnce('sampled', 15))).toBe(0)
      expect(yield* Effect.promise(() => runOnce('sampled', 16))).toBeGreaterThan(0)
    }),
  )

  it.effect('T203: actions$ watcher is single-subscription per module instance', () =>
    Effect.gen(function* () {
      const M = Logix.Module.make('WorkflowRuntime.075.SingleWatcher', {
        state: Schema.Struct({ n: Schema.Number }),
        actions: { a1: Schema.Void, a2: Schema.Void, inc: Schema.Number },
        reducers: {
          inc: Logix.Module.Reducer.mutate((draft, payload: number) => {
            ;(draft as { n: number }).n += payload
          }),
        },
      })

      const p1 = Logix.Workflow.make({
        localId: 'p1',
        trigger: Logix.Workflow.onAction('a1'),
        steps: [Logix.Workflow.dispatch({ key: 'inc.1', actionTag: 'inc', payload: Logix.Workflow.constValue(1) })],
      })
      const p2 = Logix.Workflow.make({
        localId: 'p2',
        trigger: Logix.Workflow.onAction('a2'),
        steps: [Logix.Workflow.dispatch({ key: 'inc.2', actionTag: 'inc', payload: Logix.Workflow.constValue(2) })],
      })

      const impl = M.withWorkflows([p1, p2]).implement({ initial: { n: 0 } })

      const hostScheduler = makeTestHostScheduler()
      const runtime = Logix.Runtime.make(impl, {
        layer: Layer.mergeAll(testHostSchedulerLayer(hostScheduler), Layer.empty),
      })

      try {
        yield* Effect.promise(() =>
          runtime.runPromise(
            Effect.gen(function* () {
              const rt = yield* M.tag

              // wait until the run fiber (watcher) has started
              for (let i = 0; i < 32; i += 1) {
                if (__unsafeGetWatcherStartCount(rt) === 1) break
                yield* Effect.yieldNow()
              }

              expect(__unsafeGetWatcherStartCount(rt)).toBe(1)

              yield* rt.dispatch({ _tag: 'a1' })
              yield* rt.dispatch({ _tag: 'a2' })
              yield* flushAllHostScheduler(hostScheduler)

              expect(yield* rt.getState).toEqual({ n: 3 })
              expect(__unsafeGetWatcherStartCount(rt)).toBe(1)
            }),
          ),
        )
      } finally {
        yield* Effect.promise(() => runtime.dispose())
      }
    }),
  )
})
