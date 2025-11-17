import { describe, it, expect } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '@logix/core'
import * as CoreNg from '../src/index.js'

describe('core-ng: Exec VM evidence', () => {
  it.effect(
    'should emit trace:exec-vm in diagnostics=light for core-ng',
    () =>
      Effect.gen(function* () {
        const Root = Logix.Module.make('CoreNg.ExecVmEvidence.verify', {
          state: Schema.Struct({ count: Schema.Number }),
          actions: { inc: Schema.Void },
          reducers: {
            inc: (s: any) => ({ ...s, count: (s?.count ?? 0) + 1 }),
          },
        })

        const program = Root.implement({ initial: { count: 0 }, logics: [] })

        const runOnce = (runId: string, extraLayer?: Layer.Layer<any, any, any>) =>
          Logix.Observability.trialRunModule(program, {
            runId,
            diagnosticsLevel: 'light',
            maxEvents: 200,
            buildEnv: { hostKind: 'node', config: {} },
            ...(extraLayer ? { layer: extraLayer } : {}),
          })

        const before = yield* runOnce('run:test:exec-vm:before')

        const afterLayer = Layer.mergeAll(
          CoreNg.coreNgKernelLayer(),
          Logix.Kernel.runtimeDefaultServicesOverridesLayer({
            txnQueue: { implId: 'trace' },
            transaction: { implId: CoreNg.CORE_NG_IMPL_ID },
          }),
        )
        const after = yield* runOnce('run:test:exec-vm:after', afterLayer)

        const runtimeServicesEvidence: any = after.environment?.runtimeServicesEvidence
        const transactionBinding: any = Array.isArray(runtimeServicesEvidence?.bindings)
          ? runtimeServicesEvidence.bindings.find((b: any) => b?.serviceId === 'transaction')
          : undefined
        expect(transactionBinding?.implId).toBe(CoreNg.CORE_NG_IMPL_ID)

        const getExecVmEvents = (report: any) =>
          Array.isArray(report?.evidence?.events)
            ? report.evidence.events.filter(
                (e: any) => e?.type === 'debug:event' && e?.payload?.label === 'trace:exec-vm',
              )
            : []

        expect(getExecVmEvents(before).length).toBe(0)

        const execVmEvents = getExecVmEvents(after)
        if (execVmEvents.length === 0) {
          const labels = Array.isArray(after.evidence?.events)
            ? after.evidence.events
                .filter((e: any) => e?.type === 'debug:event')
                .map((e: any) => e?.payload?.label)
                .filter((s: any) => typeof s === 'string')
                .slice(0, 20)
            : []
          throw new Error(`missing trace:exec-vm (debug:event labels: ${JSON.stringify(labels)})`)
        }
        expect(execVmEvents.length).toBeGreaterThan(0)
        const payload: any = execVmEvents[0]?.payload
        expect(payload?.meta?.version).toBe('v1')
        expect(payload?.meta?.stage).toBe('assembly')
        expect(payload?.meta?.hit).toBe(true)
        expect(payload?.meta?.reasonCode).toBeUndefined()
        expect(payload?.meta?.serviceId).toBe('transaction')
        expect(payload?.meta?.implId).toBe('core-ng')

        expect(() => JSON.stringify(after)).not.toThrow()
      }),
    20_000,
  )

  it.effect(
    'should emit trace:exec-vm hit=false when LOGIX_CORE_NG_EXEC_VM_MODE=off',
    () =>
      Effect.gen(function* () {
        const Root = Logix.Module.make('CoreNg.ExecVmEvidence.disabled', {
          state: Schema.Struct({ count: Schema.Number }),
          actions: { inc: Schema.Void },
          reducers: {
            inc: (s: any) => ({ ...s, count: (s?.count ?? 0) + 1 }),
          },
        })

        const program = Root.implement({ initial: { count: 0 }, logics: [] })

        const afterLayer = Layer.mergeAll(
          CoreNg.coreNgKernelLayer(),
          Logix.Kernel.runtimeDefaultServicesOverridesLayer({
            txnQueue: { implId: 'trace' },
            transaction: { implId: CoreNg.CORE_NG_IMPL_ID },
          }),
        )

        const report = yield* Logix.Observability.trialRunModule(program, {
          runId: 'run:test:exec-vm:disabled',
          diagnosticsLevel: 'light',
          maxEvents: 200,
          buildEnv: { hostKind: 'node', config: { LOGIX_CORE_NG_EXEC_VM_MODE: 'off' } },
          layer: afterLayer,
        })

        const execVmEvents = Array.isArray(report?.evidence?.events)
          ? report.evidence.events.filter(
              (e: any) => e?.type === 'debug:event' && e?.payload?.label === 'trace:exec-vm',
            )
          : []
        expect(execVmEvents.length).toBeGreaterThan(0)

        const payload: any = execVmEvents[0]?.payload
        expect(payload?.meta?.hit).toBe(false)
        expect(payload?.meta?.reasonCode).toBe('disabled')
        expect(payload?.meta?.reasonDetail).toBeUndefined()
      }),
    20_000,
  )

  it.effect(
    'should provide stable execIrHash for same program',
    () =>
      Effect.gen(function* () {
        const State = Schema.Struct({
          a: Schema.Number,
          derivedA: Schema.Number,
        })

        const M = Logix.Module.make('CoreNg.ExecVmEvidence.execIrHash', {
          state: State,
          actions: { mutateA: Schema.Void },
          reducers: {
            mutateA: (s: any) => ({ ...s, a: (s?.a ?? 0) + 1 }),
          },
          traits: Logix.StateTrait.from(State)({
            derivedA: Logix.StateTrait.computed({
              deps: ['a'],
              get: (a) => a + 1,
            }),
          }),
        })

        const impl = M.implement({
          initial: { a: 0, derivedA: 1 } as any,
          logics: [],
        })

        const layer = Layer.mergeAll(CoreNg.coreNgFullCutoverLayer({ capabilities: ['test:fullCutover'] }))

        const runOnce = () =>
          Effect.gen(function* () {
            const ring = Logix.Debug.makeRingBufferSink(256)
            const runLayer = Layer.mergeAll(
              layer,
              Logix.Debug.replace([ring.sink]),
              Logix.Debug.diagnosticsLevel('light'),
            )
            const runtime = Logix.Runtime.make(impl, {
              stateTransaction: { traitConvergeMode: 'dirty' },
              layer: runLayer as any,
            })

            const program = Effect.gen(function* () {
              const rt: any = yield* M.tag
              yield* rt.dispatch({ _tag: 'mutateA', payload: undefined } as any)
              yield* Effect.sleep('10 millis')

              const next = yield* rt.getState
              expect(next.derivedA).toBe(next.a + 1)
            })

            yield* Effect.promise(() => runtime.runPromise(program))

            const hash = ring
              .getSnapshot()
              .filter((e) => e.type === 'trace:exec-vm')
              .map((e: any) => e?.data?.execIrHash)
              .find((v) => typeof v === 'string' && v.length > 0)

            return hash
          })

        const h1 = yield* runOnce()
        const h2 = yield* runOnce()

        expect(typeof h1).toBe('string')
        expect(h1).toBe(h2)
      }),
    20_000,
  )
})
