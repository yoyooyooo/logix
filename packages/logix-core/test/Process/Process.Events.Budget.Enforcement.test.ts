import { describe, it, expect } from '@effect/vitest'
import {Effect, Exit, Layer, Scope, Schema, ServiceMap } from 'effect'
import { TestClock } from 'effect/testing'
import * as Logix from '../../src/index.js'
import {
  makeRunBudgetEnvelopeV1,
  makeRunDegradeMarkerV1,
} from '../../src/internal/runtime/core/diagnosticsBudget.js'
import * as ProcessEvents from '../../src/internal/runtime/core/process/events.js'
import * as ProcessRuntime from '../../src/internal/runtime/core/process/ProcessRuntime.js'

describe('process: event budgets', () => {
  it.effect('caps per-run trigger/dispatch events and emits a summary when exceeded', () =>
    Effect.gen(function* () {
      const TargetState = Schema.Struct({ count: Schema.Number })
      const TargetActions = { inc: Schema.Void }

      const Target = Logix.Module.make('ProcessEventBudgetTarget', {
        state: TargetState,
        actions: TargetActions,
      })

      const TargetLogic = Target.logic(($) =>
        Effect.gen(function* () {
          yield* $.onAction('inc').run(() => $.state.update((s) => ({ ...s, count: s.count + 1 })))
        }),
      )

      const base = Logix.Process.link({ modules: [Target] as const }, ($) =>
        Effect.gen(function* () {
          const target = $[Target.id]
          for (let i = 0; i < 100; i++) {
            yield* target.actions.inc()
          }
        }),
      )

      const Proc = Logix.Process.attachMeta(base, {
        kind: 'process',
        definition: {
          processId: 'ProcessEventBudget',
          requires: [Target.id],
          triggers: [{ kind: 'platformEvent', platformEvent: 'test:budget' }],
          concurrency: { mode: 'serial', maxQueue: 16 },
          errorPolicy: { mode: 'failStop' },
          diagnosticsLevel: 'light',
        },
      })

      const Root = Logix.Module.make('ProcessEventBudgetRoot', {
        state: Schema.Void,
        actions: {},
      })

      const RootImpl = Root.implement({
        initial: undefined,
        imports: [Target.implement({ initial: { count: 0 }, logics: [TargetLogic] }).impl],
        processes: [Proc],
      })

      const layer = Layer.provideMerge(ProcessRuntime.layer())(RootImpl.impl.layer)

      let events: ReadonlyArray<Logix.Process.ProcessEvent> = []
      const scope = yield* Scope.make()
      try {
        const env = yield* Layer.buildWithScope(layer, scope)
        const rt = ServiceMap.get(env as ServiceMap.ServiceMap<any>, ProcessRuntime.ProcessRuntimeTag as any) as ProcessRuntime.ProcessRuntime

        yield* rt.deliverPlatformEvent({ eventName: 'test:budget' })
        yield* Effect.yieldNow
        yield* TestClock.adjust('20 millis')
        yield* Effect.yieldNow

        for (let i = 0; i < 200; i++) {
          events = (yield* rt.getEventsSnapshot()) as any
          const hasSummary = events.some(
            (e) =>
              e.identity.identity.processId === 'ProcessEventBudget' &&
              e.type === 'process:trigger' &&
              e.error?.code === 'process::event_budget_exceeded',
          )
          if (hasSummary) break
          yield* Effect.yieldNow
        }

        events = (yield* rt.getEventsSnapshot()) as any
      } finally {
        yield* Scope.close(scope, Exit.succeed(undefined))
      }

      const chain = events.filter(
        (e) =>
          e.identity.identity.processId === 'ProcessEventBudget' &&
          (e.type === 'process:trigger' || e.type === 'process:dispatch'),
      )

      const triggerInfo = chain.find((e) => e.type === 'process:trigger' && e.severity === 'info')
      const summary = chain.find(
        (e) =>
          e.type === 'process:trigger' &&
          e.severity === 'warning' &&
          e.error?.code === 'process::event_budget_exceeded',
      )

      expect(summary).toBeTruthy()
      expect(chain.length).toBeLessThanOrEqual(50)

      const dispatches = chain.filter((e) => e.type === 'process:dispatch')
      expect(dispatches.length).toBeLessThanOrEqual(48)

      expect(summary?.trigger?.triggerSeq).toBe(triggerInfo?.trigger?.triggerSeq)
      expect(summary?.budgetEnvelope?.contract).toBe('diagnostics_budget.v1')
      expect(summary?.budgetEnvelope?.domain).toBe('process')
      expect(summary?.budgetEnvelope?.usage?.dropped).toBeGreaterThanOrEqual(1)
      expect(summary?.degrade?.degraded).toBe(true)
      expect(summary?.degrade?.reason).toBe('budget_exceeded')
      // 旧口径兼容：保留 hint 文本，方便阶段性迁移。
      expect(summary?.error?.hint).toContain('maxEvents=')
    }),
  )

  it.effect('keeps event within maxBytes when envelope attachment itself would overflow budget', () =>
    Effect.gen(function* () {
      const event: Logix.Process.ProcessEvent = {
        type: 'process:trigger',
        identity: {
          identity: { processId: 'ProcessEventBudget', scope: { type: 'app', appId: 'app' } },
          runSeq: 1,
        },
        severity: 'info',
        eventSeq: 1,
        timestampMs: 1,
        trigger: {
          kind: 'platformEvent',
          platformEvent: 'test:budget',
          triggerSeq: 1,
        },
      }

      const maxBytes = 360
      const withBudgetEnvelope = {
        ...event,
        budgetEnvelope: makeRunBudgetEnvelopeV1({
          domain: 'process',
          runId: 'ProcessEventBudget@app:app::r1::g1',
          limits: { maxEvents: 8, maxBytes },
          usage: { emitted: 1, dropped: 0, downgraded: 0 },
        }),
        degrade: makeRunDegradeMarkerV1(false),
      } satisfies Logix.Process.ProcessEvent

      expect(ProcessEvents.estimateEventBytes(event)).toBeLessThanOrEqual(maxBytes)
      expect(ProcessEvents.estimateEventBytes(withBudgetEnvelope)).toBeGreaterThan(maxBytes)

      const state = ProcessEvents.makeProcessRunEventBudgetState({
        runId: 'ProcessEventBudget@app:app::r1::g1',
        maxEvents: 8,
        maxBytes,
      })

      const [decision, nextState] = ProcessEvents.applyProcessRunEventBudget(state, event)
      expect(decision._tag).toBe('emit')
      if (decision._tag !== 'emit') return

      expect(ProcessEvents.estimateEventBytes(decision.event)).toBeLessThanOrEqual(maxBytes)
      expect(decision.event.budgetEnvelope).toBeUndefined()
      expect(decision.event.degrade?.degraded).toBe(true)
      expect(nextState.downgraded).toBeGreaterThanOrEqual(1)
    }),
  )
})
