import { describe, it, expect } from '@effect/vitest'
import { Context, Effect, Exit, Layer, Scope, Schema, TestClock } from 'effect'
import * as Logix from '../../src/index.js'
import * as ProcessRuntime from '../../src/internal/runtime/core/process/ProcessRuntime.js'

describe('process: event budgets', () => {
  it.scoped('caps per-run trigger/dispatch events and emits a summary when exceeded', () =>
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
        const rt = Context.get(
          env as Context.Context<any>,
          ProcessRuntime.ProcessRuntimeTag as any,
        ) as ProcessRuntime.ProcessRuntime

        yield* rt.deliverPlatformEvent({ eventName: 'test:budget' })
        yield* Effect.yieldNow()
        yield* TestClock.adjust('20 millis')
        yield* Effect.yieldNow()

        for (let i = 0; i < 200; i++) {
          events = (yield* rt.getEventsSnapshot()) as any
          const hasSummary = events.some(
            (e) =>
              e.identity.identity.processId === 'ProcessEventBudget' &&
              e.type === 'process:trigger' &&
              e.error?.code === 'process::event_budget_exceeded',
          )
          if (hasSummary) break
          yield* Effect.yieldNow()
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
    }),
  )
})
