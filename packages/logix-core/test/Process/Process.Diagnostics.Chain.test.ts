import { describe, it, expect } from '@effect/vitest'
import { Context, Effect, Exit, Layer, Scope, Schema, TestClock } from 'effect'
import * as Logix from '../../src/index.js'
import * as ProcessRuntime from '../../src/internal/runtime/core/process/ProcessRuntime.js'

describe('process: diagnostics chain (trigger → dispatch → error/stop)', () => {
  it.scoped('should carry stable trigger + txnSeq into dispatch event', () =>
    Effect.gen(function* () {
      const SourceState = Schema.Struct({ ok: Schema.Boolean })
      const SourceActions = { ping: Schema.Any }

      const SourceModule = Logix.Module.make('ProcessDiagChainSource', {
        state: SourceState,
        actions: SourceActions,
      })

      const TargetState = Schema.Struct({ count: Schema.Number })
      const TargetActions = { inc: Schema.Void }

      const TargetModule = Logix.Module.make('ProcessDiagChainTarget', {
        state: TargetState,
        actions: TargetActions,
      })

      const TargetLogic = TargetModule.logic(($) =>
        Effect.gen(function* () {
          yield* $.onAction('inc').run(() => $.state.update((s) => ({ ...s, count: s.count + 1 })))
        }),
      )

      const base = Logix.Process.link({ modules: [SourceModule, TargetModule] as const }, ($) =>
        Effect.gen(function* () {
          const target = $[TargetModule.id]
          yield* target.actions.inc()
          return yield* Effect.fail(new Error('boom'))
        }),
      )

      const Proc = Logix.Process.attachMeta(base, {
        kind: 'process',
        definition: {
          processId: 'ProcessDiagChain',
          requires: [SourceModule.id, TargetModule.id],
          triggers: [{ kind: 'moduleAction', moduleId: SourceModule.id, actionId: 'ping' }],
          concurrency: { mode: 'serial', maxQueue: 16 },
          errorPolicy: { mode: 'failStop' },
          diagnosticsLevel: 'light',
        },
      })

      const Root = Logix.Module.make('ProcessDiagChainRoot', {
        state: Schema.Void,
        actions: {},
      })

      const RootImpl = Root.implement({
        initial: undefined,
        imports: [
          SourceModule.implement({ initial: { ok: true } }).impl,
          TargetModule.implement({ initial: { count: 0 }, logics: [TargetLogic] }).impl,
        ],
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

        const source = Context.get(env, SourceModule.tag)

        for (let i = 0; i < 10; i++) {
          yield* Effect.yieldNow()
        }

        const weirdPayload = { raw: BigInt(1), meta: { nested: true } }
        yield* source.dispatch({ _tag: 'ping', payload: weirdPayload } as any)
        yield* Effect.yieldNow()
        yield* TestClock.adjust('20 millis')
        yield* Effect.yieldNow()

        for (let i = 0; i < 100; i++) {
          events = (yield* rt.getEventsSnapshot()) as any
          const hasError = events.some(
            (e: any) => e.identity?.identity?.processId === 'ProcessDiagChain' && e.type === 'process:error',
          )
          if (hasError) break
          yield* Effect.yieldNow()
        }
      } finally {
        yield* Scope.close(scope, Exit.succeed(undefined))
      }

      const chain = events.filter((e) => e.identity.identity.processId === 'ProcessDiagChain')

      for (const e of chain) {
        expect(() => JSON.stringify(e)).not.toThrow()
      }

      const triggerEvent = chain.find((e) => e.type === 'process:trigger')
      if (!triggerEvent || triggerEvent.type !== 'process:trigger') {
        expect(triggerEvent).toBeTruthy()
        throw new Error('missing process:trigger event')
      }

      const trigger = triggerEvent.trigger
      if (!trigger) {
        throw new Error('missing process:trigger payload')
      }
      if (trigger.kind !== 'moduleAction') {
        throw new Error(`expected moduleAction trigger, got: ${trigger.kind}`)
      }
      expect(trigger.moduleId).toBe(SourceModule.id)
      expect(trigger.actionId).toBe('ping')
      expect(typeof trigger.txnSeq).toBe('number')

      const dispatchEvent = chain.find((e) => e.type === 'process:dispatch')
      if (!dispatchEvent || dispatchEvent.type !== 'process:dispatch') {
        expect(dispatchEvent).toBeTruthy()
        throw new Error('missing process:dispatch event')
      }

      const dispatch = dispatchEvent.dispatch
      if (!dispatch) {
        throw new Error('missing process:dispatch payload')
      }
      expect(dispatch.moduleId).toBe(TargetModule.id)
      expect(dispatch.actionId).toBe('inc')

      const dispatchTrigger = dispatchEvent.trigger
      if (!dispatchTrigger) {
        throw new Error('missing process:dispatch trigger payload')
      }
      if (dispatchTrigger.kind !== 'moduleAction') {
        throw new Error(`expected moduleAction dispatch trigger, got: ${dispatchTrigger.kind}`)
      }
      expect(dispatchTrigger.txnSeq).toBe(trigger.txnSeq)
      expect(dispatchTrigger.triggerSeq).toBe(trigger.triggerSeq)

      const errorEvent = chain.find((e) => e.type === 'process:error')
      expect(errorEvent).toBeTruthy()
      expect(errorEvent?.error?.message).toBe('boom')
    }),
  )
})
