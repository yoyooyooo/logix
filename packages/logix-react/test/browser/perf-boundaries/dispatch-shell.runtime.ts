import * as CoreDebug from '@logixjs/core/repo-internal/debug-api'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '@logixjs/core'
import { makePerfKernelLayer, silentDebugLayer } from './harness.js'

export type DispatchShellEntrypointMode = 'reuseScope' | 'resolveEach'
export type DispatchShellDiagnosticsLevel = CoreDebug.DiagnosticsLevel
export type DispatchShellShellMode = 'baseline' | 'fastPath'

export type DispatchShellControlPlane = {
  readonly tuningId?: string
  readonly shellMode: DispatchShellShellMode
}

export type DispatchShellTxnPhaseTiming = {
  readonly txnPreludeMs?: number
  readonly queueContextLookupMs?: number
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
  readonly fieldConvergeMs?: number
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

export type DispatchShellABSample = {
  readonly shellMode: DispatchShellShellMode
  readonly totalMs: number
  readonly phaseTiming?: DispatchShellTxnPhaseTiming
}

export type DispatchShellABPhaseDelta = {
  readonly name: string
  readonly group: 'scope' | 'queue/lane' | 'body' | 'commit' | 'diagnostics' | 'noop-phase' | 'other'
  readonly baselineMs?: number
  readonly fastPathMs?: number
  readonly deltaMs?: number
}

export type DispatchShellABComparison = {
  readonly baselineMode: DispatchShellShellMode
  readonly fastPathMode: DispatchShellShellMode
  readonly total: {
    readonly baselineMs: number
    readonly fastPathMs: number
    readonly deltaMs: number
  }
  readonly phaseDeltas: ReadonlyArray<DispatchShellABPhaseDelta>
  readonly migratedCost: boolean
  readonly migratedRisks: ReadonlyArray<DispatchShellABPhaseDelta>
}

export const dispatchShellSameCommitABModes = ['baseline', 'fastPath'] as const

export const parseDispatchShellShellModeEnv = (raw: string | undefined): DispatchShellShellMode => {
  const value = raw?.trim()
  if (value === '1' || value === 'fastPath') return 'fastPath'
  return 'baseline'
}

export const dispatchShellShellModeEvidence = (
  shellMode: DispatchShellShellMode,
): Record<string, string> => ({
  'runtime.shellMode': shellMode,
  'runtime.shellMode.source': 'test-only:same-commit-ab',
})

const phaseDeltaFields: ReadonlyArray<{
  readonly name: keyof DispatchShellTxnPhaseTiming
  readonly group: DispatchShellABPhaseDelta['group']
}> = [
  { name: 'txnPreludeMs', group: 'other' },
  { name: 'queueContextLookupMs', group: 'queue/lane' },
  { name: 'queueResolvePolicyMs', group: 'queue/lane' },
  { name: 'queueBackpressureMs', group: 'queue/lane' },
  { name: 'queueEnqueueBookkeepingMs', group: 'queue/lane' },
  { name: 'queueWaitMs', group: 'queue/lane' },
  { name: 'queueStartHandoffMs', group: 'queue/lane' },
  { name: 'dispatchActionRecordMs', group: 'diagnostics' },
  { name: 'dispatchActionCommitHubMs', group: 'commit' },
  { name: 'bodyShellMs', group: 'body' },
  { name: 'asyncEscapeGuardMs', group: 'body' },
  { name: 'fieldConvergeMs', group: 'noop-phase' },
  { name: 'scopedValidateMs', group: 'noop-phase' },
  { name: 'sourceSyncMs', group: 'noop-phase' },
  { name: 'commitTotalMs', group: 'commit' },
  { name: 'commitRowIdSyncMs', group: 'commit' },
  { name: 'commitPublishCommitMs', group: 'commit' },
  { name: 'commitStateUpdateDebugRecordMs', group: 'diagnostics' },
  { name: 'commitOnCommitBeforeStateUpdateMs', group: 'commit' },
  { name: 'commitOnCommitAfterStateUpdateMs', group: 'commit' },
]

const numberField = (timing: DispatchShellTxnPhaseTiming | undefined, name: keyof DispatchShellTxnPhaseTiming): number | undefined => {
  const value = timing?.[name]
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

export const compareDispatchShellABSamples = (
  baseline: DispatchShellABSample,
  fastPath: DispatchShellABSample,
  options?: { readonly epsilonMs?: number },
): DispatchShellABComparison => {
  const epsilonMs = options?.epsilonMs ?? 0
  const phaseDeltas = phaseDeltaFields.map((field): DispatchShellABPhaseDelta => {
    const baselineMs = numberField(baseline.phaseTiming, field.name)
    const fastPathMs = numberField(fastPath.phaseTiming, field.name)
    const deltaMs =
      baselineMs !== undefined && fastPathMs !== undefined
        ? fastPathMs - baselineMs
        : undefined
    return {
      name: field.name,
      group: field.group,
      baselineMs,
      fastPathMs,
      deltaMs,
    }
  })

  const migratedRisks = phaseDeltas.filter(
    (delta) =>
      delta.deltaMs !== undefined &&
      delta.deltaMs > epsilonMs &&
      (delta.group === 'queue/lane' || delta.group === 'commit' || delta.group === 'diagnostics'),
  )

  return {
    baselineMode: baseline.shellMode,
    fastPathMode: fastPath.shellMode,
    total: {
      baselineMs: baseline.totalMs,
      fastPathMs: fastPath.totalMs,
      deltaMs: fastPath.totalMs - baseline.totalMs,
    },
    phaseDeltas,
    migratedCost: fastPath.totalMs < baseline.totalMs && migratedRisks.length > 0,
    migratedRisks,
  }
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
    txnPreludeMs: numericField((trace) => trace?.txnPreludeMs),
    queueContextLookupMs: numericField((trace) => trace?.queue?.contextLookupMs),
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
    fieldConvergeMs: numericField((trace) => trace?.fieldConvergeMs),
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
  shellMode: parseDispatchShellShellModeEnv(
    typeof (import.meta.env as Record<string, string | undefined>).VITE_LOGIX_TXN_SHELL_FASTPATH === 'string'
      ? (import.meta.env as Record<string, string | undefined>).VITE_LOGIX_TXN_SHELL_FASTPATH
      : undefined,
  ),
})

export type DispatchShellRuntime = {
  readonly module: any
  readonly runtime: ReturnType<typeof Logix.Runtime.make>
  readonly shellMode: DispatchShellShellMode
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

  const program = Logix.Program.make(M, {
    initial: initial as any,
    logics: [],
  })

  const controlPlane = readDispatchShellControlPlaneFromEnv()
  const phaseTraces: any[] = []
  const clearTxnPhaseTimings = (): void => {
    phaseTraces.length = 0
  }
  const getTxnPhaseTimingSummary = (): DispatchShellTxnPhaseTiming | undefined => summarizeTxnPhaseTimings(phaseTraces)

  const captureTxnPhaseLayer = CoreDebug.replace([
    {
      record: (event) => {
        if (event.type === 'trace:txn-phase') {
          phaseTraces.push((event as any).data)
        }
        return Effect.void
      },
    },
  ])

  const runtime = Logix.Runtime.make(program, {
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
    shellMode: controlPlane.shellMode,
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
    (effect) => Effect.provideService(effect, CoreDebug.internal.currentDiagnosticsLevel, diagnosticsLevel),
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
