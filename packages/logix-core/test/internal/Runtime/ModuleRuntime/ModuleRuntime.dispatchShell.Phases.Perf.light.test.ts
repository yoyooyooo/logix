import { describe, expect, it } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Debug from '../../../../src/Debug.js'
import * as Logix from '../../../../src/index.js'
import {
  ledgerSummaryForDispatchShellPhases,
  toTxnPhaseTraceV1,
  writeRuntimeShellLedgerV1,
} from '../_perf/runtimeShellLedger.v1.js'

const now = (): number => {
  const perf = (globalThis as any).performance as { now?: () => number } | undefined
  if (perf && typeof perf.now === 'function') {
    return perf.now()
  }
  return Date.now()
}

const quantile = (samples: ReadonlyArray<number>, q: number): number => {
  if (samples.length === 0) return 0
  const sorted = Array.from(samples).sort((a, b) => a - b)
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil(q * sorted.length) - 1))
  return sorted[idx]!
}

const average = (samples: ReadonlyArray<number>): number =>
  samples.length === 0 ? 0 : samples.reduce((sum, value) => sum + value, 0) / samples.length

describe('ModuleRuntime.dispatch shell phases · perf baseline (Diagnostics=light)', () => {
  it.effect('records reproducible dispatch shell phase evidence', () =>
    Effect.gen(function* () {
      const prevNodeEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'
      try {
        const iterations = Number(process.env.LOGIX_PERF_ITERS ?? 400)
        const warmup = Number(process.env.LOGIX_PERF_WARMUP ?? 80)

        const M = Logix.Module.make('ModuleRuntime.DispatchShell.Phases.Perf', {
          state: Schema.Struct({
            count: Schema.Number,
          }),
          actions: {
            bump: Schema.Void,
          },
          reducers: {
            bump: Logix.Module.Reducer.mutate((draft: any) => {
              draft.count += 1
            }),
          },
        })

        const impl = M.implement({
          initial: { count: 0 },
          logics: [],
        })

        const ring = Debug.makeRingBufferSink((iterations + warmup) * 12 + 64)
        const runtime = Logix.Runtime.make(impl, {
          layer: Layer.mergeAll(
            Debug.diagnosticsLevel('light'),
            Debug.traceMode('on'),
            Debug.replace([ring.sink]) as Layer.Layer<any, never, never>,
          ) as Layer.Layer<any, never, never>,
        })

        const dispatchSamples = (yield* Effect.promise(() =>
          runtime.runPromise(
            Effect.gen(function* () {
              const rt: any = yield* Effect.service(M.tag).pipe(Effect.orDie)

              for (let i = 0; i < warmup; i += 1) {
                yield* rt.dispatch({ _tag: 'bump' })
              }

              ring.clear()

              const samples: number[] = []
              for (let i = 0; i < iterations; i += 1) {
                const startedAtMs = now()
                yield* rt.dispatch({ _tag: 'bump' })
                samples.push(now() - startedAtMs)
              }
              return samples
            }),
          ),
        )) as ReadonlyArray<number>

        const traces = ring
          .getSnapshot()
          .filter((event) => event.type === 'trace:txn-phase' && event.moduleId === 'ModuleRuntime.DispatchShell.Phases.Perf')
          .map((event) => (event as any).data)

        expect(dispatchSamples).toHaveLength(iterations)
        expect(traces).toHaveLength(iterations)

        const txnPreludeSamples = traces.map((trace) => trace?.txnPreludeMs ?? 0)
        const queueContextLookupSamples = traces.map((trace) => trace?.queue?.contextLookupMs ?? 0)
        const queueResolvePolicySamples = traces.map((trace) => trace?.queue?.resolvePolicyMs ?? 0)
        const bodyShellSamples = traces.map((trace) => trace?.bodyShellMs ?? 0)
        const asyncEscapeGuardSamples = traces.map((trace) => trace?.asyncEscapeGuardMs ?? 0)
        const commitTotalSamples = traces.map((trace) => trace?.commit?.totalMs ?? 0)
        const dispatchActionRecordSamples = traces.map((trace) => trace?.dispatchActionRecordMs ?? 0)
        const dispatchActionCommitHubSamples = traces.map((trace) => trace?.dispatchActionCommitHubMs ?? 0)
        const residualSamples = traces.map((trace, index) => {
          const dispatchMs = dispatchSamples[index] ?? 0
          return Math.max(
            0,
            dispatchMs -
              (txnPreludeSamples[index] ?? 0) -
              (queueContextLookupSamples[index] ?? 0) -
              (queueResolvePolicySamples[index] ?? 0) -
              (bodyShellSamples[index] ?? 0) -
              (commitTotalSamples[index] ?? 0) -
              (dispatchActionRecordSamples[index] ?? 0) -
              (dispatchActionCommitHubSamples[index] ?? 0),
          )
        })

        console.log(
          `[perf] dispatch-shell-phases diagnostics=light iters=${iterations} warmup=${warmup} ` +
            `dispatch.p50=${quantile(dispatchSamples, 0.5).toFixed(3)}ms dispatch.p95=${quantile(dispatchSamples, 0.95).toFixed(3)}ms ` +
            `txnPrelude.avg=${average(txnPreludeSamples).toFixed(3)}ms queueContext.avg=${average(queueContextLookupSamples).toFixed(3)}ms ` +
            `queueResolve.avg=${average(queueResolvePolicySamples).toFixed(3)}ms bodyShell.avg=${average(bodyShellSamples).toFixed(3)}ms ` +
            `asyncEscape.avg=${average(asyncEscapeGuardSamples).toFixed(3)}ms commit.avg=${average(commitTotalSamples).toFixed(3)}ms ` +
            `dispatchRecord.avg=${average(dispatchActionRecordSamples).toFixed(3)}ms dispatchCommitHub.avg=${average(dispatchActionCommitHubSamples).toFixed(3)}ms ` +
            `residual.avg=${average(residualSamples).toFixed(3)}ms`,
        )

        writeRuntimeShellLedgerV1({
          segmentId: 'dispatchShell.phases.light',
          suiteRef: {
            suiteId: 'ModuleRuntime.dispatchShell.Phases.Perf.light',
            command:
              'pnpm -C packages/logix-core exec vitest run test/internal/Runtime/ModuleRuntime/ModuleRuntime.dispatchShell.Phases.Perf.light.test.ts',
            artifactRef: 'specs/103-effect-v4-forward-cutover/perf/2026-03-19-p0-2plus-hot-context.after.json',
          },
          config: { diagnosticsLevel: 'light', iterations, warmup },
          samples: dispatchSamples.map((dispatchMs, index) => ({
            kind: 'dispatchShell.phases',
            index,
            dispatchMs,
            txnPhase: toTxnPhaseTraceV1(traces[index]),
            residualMs: residualSamples[index] ?? 0,
          })),
          summaryMetrics: ledgerSummaryForDispatchShellPhases(dispatchSamples, residualSamples),
          summaryNotes: [`aggregated from ${iterations} dispatch samples`],
          profile: 'quick',
        })

        yield* Effect.promise(() => runtime.dispose())
      } finally {
        if (prevNodeEnv == null) {
          delete process.env.NODE_ENV
        } else {
          process.env.NODE_ENV = prevNodeEnv
        }
      }
    }),
  )
})
