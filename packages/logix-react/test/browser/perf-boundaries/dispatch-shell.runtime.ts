import { Effect, Layer, Schema } from 'effect'
import * as Logix from '@logixjs/core'
import { makePerfKernelLayer, silentDebugLayer } from './harness.js'

export type DispatchShellEntrypointMode = 'reuseScope' | 'resolveEach'
export type DispatchShellDiagnosticsLevel = Logix.Debug.DiagnosticsLevel

export type DispatchShellControlPlane = {
  readonly tuningId?: string
}

export type DispatchShellTxnPhaseTiming = {
  readonly queueResolvePolicyMs?: number
  readonly queueBackpressureMs?: number
  readonly queueEnqueueBookkeepingMs?: number
  readonly queueWaitMs?: number
  readonly queueStartHandoffMs?: number
  readonly dispatchActionRecordMs?: number
  readonly dispatchActionCommitHubMs?: number
  readonly dispatchActionCount?: number
  readonly bodyShellMs?: number
  readonly asyncEscapeGuardMs?: number
  readonly traitConvergeMs?: number
  readonly scopedValidateMs?: number
  readonly sourceSyncMs?: number
  readonly commitTotalMs?: number
  readonly commitRowIdSyncMs?: number
  readonly commitPublishCommitMs?: number
  readonly commitStateUpdateDebugRecordMs?: number
  readonly commitOnCommitBeforeStateUpdateMs?: number
  readonly commitOnCommitAfterStateUpdateMs?: number
  readonly traceCount: number
}

const summarizeTxnPhaseTimings = (
  traces: ReadonlyArray<any>,
): DispatchShellTxnPhaseTiming | undefined => {
  if (traces.length === 0) return undefined

  const average = (values: ReadonlyArray<number>): number | undefined => {
    if (values.length === 0) return undefined
    const total = values.reduce((sum, value) => sum + value, 0)
    return total / values.length
  }

  const numericField = (pick: (trace: any) => unknown): number | undefined =>
    average(
      traces
        .map((trace) => pick(trace))
        .filter((value): value is number => typeof value === "number" && Number.isFinite(value)),
    )

  return {
    queueResolvePolicyMs: numericField((trace) => trace?.queue?.resolvePolicyMs),
    queueBackpressureMs: numericField((trace) => trace?.queue?.backpressureMs),
    queueEnqueueBookkeepingMs: numericField((trace) => trace?.queue?.enqueueBookkeepingMs),
    queueWaitMs: numericField((trace) => trace?.queue?.queueWaitMs),
    queueStartHandoffMs: numericField((trace) => trace?.queue?.startHandoffMs),
    dispatchActionRecordMs: numericField((trace) => trace?.dispatchActionRecordMs),
    dispatchActionCommitHubMs: numericField((trace) => trace?.dispatchActionCommitHubMs),
    dispatchActionCount: numericField((trace) => trace?.dispatchActionCount),
    bodyShellMs: numericField((trace) => trace?.bodyShellMs),
    asyncEscapeGuardMs: numericField((trace) => trace?.asyncEscapeGuardMs),
    traitConvergeMs: numericField((trace) => trace?.traitConvergeMs),
    scopedValidateMs: numericField((trace) => trace?.scopedValidateMs),
    sourceSyncMs: numericField((trace) => trace?.sourceSyncMs),
    commitTotalMs: numericField((trace) => trace?.commit?.totalMs),
    commitRowIdSyncMs: numericField((trace) => trace?.commit?.rowIdSyncMs),
    commitPublishCommitMs: numericField((trace) => trace?.commit?.publishCommitMs),
    commitStateUpdateDebugRecordMs: numericField((trace) => trace?.commit?.stateUpdateDebugRecordMs),
    commitOnCommitBeforeStateUpdateMs: numericField((trace) => trace?.commit?.onCommitBeforeStateUpdateMs),
    commitOnCommitAfterStateUpdateMs: numericField((trace) => trace?.commit?.onCommitAfterStateUpdateMs),
    traceCount: traces.length,
  }
}

const readDispatchShellControlPlaneFromEnv = (): DispatchShellControlPlane => ({
  tuningId:
    typeof import.meta.env.VITE_LOGIX_PERF_TUNING_ID === 'string' &&
    import.meta.env.VITE_LOGIX_PERF_TUNING_ID.trim().length > 0
      ? import.meta.env.VITE_LOGIX_PERF_TUNING_ID.trim()
      : undefined,
})

export type DispatchShellRuntime = {
  readonly module: any
  readonly runtime: ReturnType<typeof Logix.Runtime.make>
  readonly clearTxnPhaseTimings: () => void
  readonly getTxnPhaseTimingSummary: () => DispatchShellTxnPhaseTiming | undefined
}

export type DispatchShellSampleBreakdown = {
  readonly resolveScopeMsPerDispatch: number
  readonly dispatchAwaitMsPerDispatch: number
}

const readClockMs = (): number => {
  const perf = globalThis.performance
  if (perf && typeof perf.now === 'function') {
    return perf.now()
  }
  return Date.now()
}

export const makeDispatchShellRuntime = (
  stateWidth: number,
  options?: { readonly captureTxnPhaseTiming?: boolean },
): DispatchShellRuntime => {
  const fields: Record<string, unknown> = {}
  for (let i = 0; i < stateWidth; i++) {
    fields[`f${i}`] = Schema.Number
  }

  const State = Schema.Struct(fields as any)
  const Actions = {
    bump: Schema.Void,
  }

  const bumpReducer = Logix.Module.Reducer.mutate((draft: any) => {
    draft.f0 = (draft.f0 as number) + 1
  })

  const M = Logix.Module.make(`PerfDispatchShell${stateWidth}`, {
    state: State as any,
    actions: Actions,
    reducers: { bump: bumpReducer } as any,
  })

  const initial: Record<string, number> = {}
  for (let i = 0; i < stateWidth; i++) {
    initial[`f${i}`] = 0
  }

  const impl = M.implement({
    initial: initial as any,
    logics: [],
  })

  const controlPlane = readDispatchShellControlPlaneFromEnv()
  const phaseTraces: any[] = []
  const clearTxnPhaseTimings = (): void => {
    phaseTraces.length = 0
  }
  const getTxnPhaseTimingSummary = (): DispatchShellTxnPhaseTiming | undefined => summarizeTxnPhaseTimings(phaseTraces)

  const captureTxnPhaseLayer = Logix.Debug.replace([
    {
      record: (event) => {
        if (event.type === 'trace:txn-phase') {
          phaseTraces.push((event as any).data)
        }
        return Effect.void
      },
    },
  ])

  const runtime = Logix.Runtime.make(impl, {
    stateTransaction: {
      instrumentation: 'light',
    },
    layer: Layer.mergeAll(
      options?.captureTxnPhaseTiming ? captureTxnPhaseLayer : silentDebugLayer,
      makePerfKernelLayer(),
    ) as Layer.Layer<any, never, never>,
    label: [
      `perf:dispatch-shell:${stateWidth}`,
      controlPlane.tuningId ? `tuning:${controlPlane.tuningId}` : undefined,
    ]
      .filter(Boolean)
      .join(' '),
  })

  return {
    module: M as any,
    runtime,
    clearTxnPhaseTimings,
    getTxnPhaseTimingSummary,
  }
}

export const runDispatchShellSample = (
  rt: DispatchShellRuntime,
  entrypointMode: DispatchShellEntrypointMode,
  iterations: number,
): Effect.Effect<void, never, any> =>
  Effect.gen(function* () {
    if (entrypointMode === 'reuseScope') {
      const moduleScope = (yield* rt.module.tag) as any
      for (let i = 0; i < iterations; i++) {
        yield* moduleScope.dispatch({ _tag: 'bump' } as any)
      }
      return
    }

    for (let i = 0; i < iterations; i++) {
      const moduleScope = (yield* rt.module.tag) as any
      yield* moduleScope.dispatch({ _tag: 'bump' } as any)
    }
  }) as Effect.Effect<void, never, any>

export const runDispatchShellSampleWithDiagnosticsLevel = (
  rt: DispatchShellRuntime,
  entrypointMode: DispatchShellEntrypointMode,
  iterations: number,
  diagnosticsLevel: DispatchShellDiagnosticsLevel,
): Effect.Effect<void, never, any> =>
  runDispatchShellSample(rt, entrypointMode, iterations).pipe(
    (effect) => Effect.provideService(effect, Logix.Debug.internal.currentDiagnosticsLevel, diagnosticsLevel),
  )

export const runDispatchShellSampleWithBreakdown = (
  rt: DispatchShellRuntime,
  entrypointMode: DispatchShellEntrypointMode,
  iterations: number,
): Effect.Effect<DispatchShellSampleBreakdown, never, any> =>
  Effect.gen(function* () {
    if (entrypointMode === 'reuseScope') {
      const resolveStartedAtMs = readClockMs()
      const moduleScope = (yield* rt.module.tag) as any
      const resolveScopeMsPerDispatch = Math.max(0, readClockMs() - resolveStartedAtMs) / iterations

      let dispatchAwaitTotalMs = 0
      for (let i = 0; i < iterations; i++) {
        const dispatchStartedAtMs = readClockMs()
        yield* moduleScope.dispatch({ _tag: 'bump' } as any)
        dispatchAwaitTotalMs += Math.max(0, readClockMs() - dispatchStartedAtMs)
      }

      return {
        resolveScopeMsPerDispatch,
        dispatchAwaitMsPerDispatch: dispatchAwaitTotalMs / iterations,
      }
    }

    let resolveScopeTotalMs = 0
    let dispatchAwaitTotalMs = 0
    for (let i = 0; i < iterations; i++) {
      const resolveStartedAtMs = readClockMs()
      const moduleScope = (yield* rt.module.tag) as any
      resolveScopeTotalMs += Math.max(0, readClockMs() - resolveStartedAtMs)

      const dispatchStartedAtMs = readClockMs()
      yield* moduleScope.dispatch({ _tag: 'bump' } as any)
      dispatchAwaitTotalMs += Math.max(0, readClockMs() - dispatchStartedAtMs)
    }

    return {
      resolveScopeMsPerDispatch: resolveScopeTotalMs / iterations,
      dispatchAwaitMsPerDispatch: dispatchAwaitTotalMs / iterations,
    }
  }) as Effect.Effect<DispatchShellSampleBreakdown, never, any>
