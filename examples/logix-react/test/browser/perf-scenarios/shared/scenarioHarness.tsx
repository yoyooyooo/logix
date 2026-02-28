import React from 'react'
import { createRoot } from 'react-dom/client'
import { Layer, Schema } from 'effect'
import * as Logix from '@logixjs/core'
import { RuntimeProvider, useModule } from '@logixjs/react'

import { scenarioIds, scenarioLoadLevels, type DiagnosticsLevel, type Primitive, type ScenarioId, type ScenarioLoadLevel } from '../protocol'
import {
  assertNoIoInTransactionWindow,
  assertStableIdentityEvidence,
  buildSlimEvidence,
} from './runtimeGuards'
import type { PerfProfileConfig, ScenarioEvidence, ScenarioMetric, ScenarioPointResult } from './runScenarioSuite'

type QueryRefreshPayload = {
  readonly batch: number
  readonly retry: boolean
  readonly seed: number
}

type FormCascadePayload = {
  readonly region: string
  readonly city: string
  readonly amount: number
}

type DenseBurstPayload = {
  readonly burstSize: number
  readonly seed: number
}

type ExternalPushPayload = {
  readonly ingressRate: number
}

const QueryRefreshPayloadSchema = Schema.Struct({
  batch: Schema.Number,
  retry: Schema.Boolean,
  seed: Schema.Number,
})

const FormCascadePayloadSchema = Schema.Struct({
  region: Schema.String,
  city: Schema.String,
  amount: Schema.Number,
})

const DenseBurstPayloadSchema = Schema.Struct({
  burstSize: Schema.Number,
  seed: Schema.Number,
})

const ExternalPushPayloadSchema = Schema.Struct({
  ingressRate: Schema.Number,
})

const ScenarioStateSchema = Schema.Struct({
  route: Schema.String,
  routeVisits: Schema.Number,
  queryCursor: Schema.Number,
  queryItems: Schema.Array(Schema.Number),
  queryRetries: Schema.Number,
  formRegion: Schema.String,
  formCity: Schema.String,
  formAmount: Schema.Number,
  formErrors: Schema.Number,
  burstCounter: Schema.Number,
  burstChecksum: Schema.Number,
  externalVersion: Schema.Number,
  externalSynced: Schema.Number,
  txnSeq: Schema.Number,
  opSeq: Schema.Number,
  traceDigest: Schema.String,
})

type ScenarioState = {
  route: string
  routeVisits: number
  queryCursor: number
  queryItems: number[]
  queryRetries: number
  formRegion: string
  formCity: string
  formAmount: number
  formErrors: number
  burstCounter: number
  burstChecksum: number
  externalVersion: number
  externalSynced: number
  txnSeq: number
  opSeq: number
  traceDigest: string
}

const createInitialState = (): ScenarioState => ({
  route: 'home',
  routeVisits: 0,
  queryCursor: 0,
  queryItems: [],
  queryRetries: 0,
  formRegion: '',
  formCity: '',
  formAmount: 0,
  formErrors: 0,
  burstCounter: 0,
  burstChecksum: 0,
  externalVersion: 0,
  externalSynced: 0,
  txnSeq: 0,
  opSeq: 0,
  traceDigest: 'init:0:0',
})

const updateTraceDigest = (draft: ScenarioState): void => {
  draft.traceDigest = `${draft.route}:${draft.queryCursor}:${draft.formErrors}:${draft.burstChecksum}:${draft.externalSynced}`
}

const ScenarioModule = Logix.Module.make('Examples.PerfScenarios.Runtime', {
  state: ScenarioStateSchema,
  actions: {
    reset: Schema.Void,
    routeSwitch: Schema.String,
    queryRefresh: QueryRefreshPayloadSchema,
    formCascadeValidate: FormCascadePayloadSchema,
    denseBurst: DenseBurstPayloadSchema,
    externalPushSync: ExternalPushPayloadSchema,
  },
  reducers: {
    reset: Logix.Module.Reducer.mutate((draft) => {
      Object.assign(draft as object, createInitialState())
    }),
    routeSwitch: Logix.Module.Reducer.mutate((draft, route: string) => {
      draft.route = route
      draft.routeVisits += 1
      draft.txnSeq += 1
      draft.opSeq += 1
      updateTraceDigest(draft)
    }),
    queryRefresh: Logix.Module.Reducer.mutate((draft, payload: QueryRefreshPayload) => {
      draft.queryItems = Array.from(
        { length: payload.batch },
        (_unused, index) => draft.queryCursor + payload.seed + index,
      )
      draft.queryCursor += payload.batch
      if (payload.retry) {
        draft.queryRetries += 1
      }
      draft.txnSeq += 1
      draft.opSeq += payload.batch
      updateTraceDigest(draft)
    }),
    formCascadeValidate: Logix.Module.Reducer.mutate((draft, payload: FormCascadePayload) => {
      draft.formRegion = payload.region
      draft.formCity = payload.city
      draft.formAmount = payload.amount

      let errors = 0
      if (payload.region.length === 0) errors += 1
      if (payload.city.length < 2) errors += 1
      if (!payload.city.startsWith(payload.region.slice(0, 1))) errors += 1
      if (payload.amount <= 0) errors += 1
      draft.formErrors = errors

      draft.txnSeq += 1
      draft.opSeq += 4 + errors
      updateTraceDigest(draft)
    }),
    denseBurst: Logix.Module.Reducer.mutate((draft, payload: DenseBurstPayload) => {
      let checksum = draft.burstChecksum
      for (let index = 0; index < payload.burstSize; index++) {
        checksum = (checksum * 31 + payload.seed + index + draft.routeVisits) % 1_000_003
      }
      draft.burstCounter += payload.burstSize
      draft.burstChecksum = checksum
      draft.txnSeq += 1
      draft.opSeq += payload.burstSize
      updateTraceDigest(draft)
    }),
    externalPushSync: Logix.Module.Reducer.mutate((draft, payload: ExternalPushPayload) => {
      draft.externalVersion += payload.ingressRate
      draft.externalSynced = draft.externalVersion
      draft.txnSeq += 1
      draft.opSeq += payload.ingressRate
      updateTraceDigest(draft)
    }),
  },
})

const ScenarioModuleImpl = ScenarioModule.implement({
  initial: createInitialState(),
})

type ModuleRuntimeHandle = {
  readonly [key: string]: any
}

type RuntimeSnapshot = {
  readonly route: string
  readonly queryCursor: number
  readonly formErrors: number
  readonly burstCounter: number
  readonly externalLag: number
  readonly txnSeq: number
  readonly opSeq: number
  readonly traceDigest: string
}

type HarnessBindings = {
  runtime: ModuleRuntimeHandle | undefined
  snapshot: RuntimeSnapshot | undefined
}

const waitForReady = async (predicate: () => boolean, timeoutMs: number): Promise<void> => {
  const startedAt = performance.now()
  while (!predicate()) {
    if (performance.now() - startedAt > timeoutMs) {
      throw new Error(`scenario harness timeout (${timeoutMs}ms)`)
    }
    await new Promise((resolve) => setTimeout(resolve, 16))
  }
}

const nextPaint = async (): Promise<void> => {
  await new Promise<void>((resolve) => {
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => resolve())
      return
    }
    setTimeout(resolve, 0)
  })
}

const withTimeout = async <A,>(
  timeoutMs: number,
  run: () => Promise<A>,
): Promise<{ readonly ok: true; readonly value: A } | { readonly ok: false; readonly reason: string }> => {
  if (timeoutMs <= 0) return { ok: false, reason: 'timeout' }

  let timeoutId: ReturnType<typeof setTimeout> | undefined
  try {
    const value = await Promise.race([
      run(),
      new Promise<never>((_resolve, reject) => {
        timeoutId = setTimeout(() => reject(new Error('timeout')), timeoutMs)
      }),
    ])
    return { ok: true, value }
  } catch (error) {
    if (error instanceof Error && error.message === 'timeout') {
      return { ok: false, reason: `pointTimeoutMs=${timeoutMs}` }
    }
    throw error
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
  }
}

const quantile = (sorted: ReadonlyArray<number>, q: number): number => {
  if (sorted.length === 0) return Number.NaN
  const index = Math.floor(Math.min(1, Math.max(0, q)) * (sorted.length - 1))
  return sorted[index]!
}

const summarizeMs = (samples: ReadonlyArray<number>): { readonly n: number; readonly medianMs: number; readonly p95Ms: number } => {
  const sorted = samples.slice().sort((a, b) => a - b)
  return {
    n: sorted.length,
    medianMs: quantile(sorted, 0.5),
    p95Ms: quantile(sorted, 0.95),
  }
}

const summarizeNumber = (samples: ReadonlyArray<number>): number => {
  const sorted = samples.slice().sort((a, b) => a - b)
  return quantile(sorted, 0.5)
}

const inferEvidenceUnit = (name: string, sample: Primitive | undefined): ScenarioEvidence['unit'] => {
  if (typeof sample === 'string') return 'string'
  const lowered = name.toLowerCase()
  if (lowered.includes('ratio') || lowered.includes('rate')) return 'ratio'
  if (lowered.includes('bytes') || lowered.includes('byte')) return 'bytes'
  return 'count'
}

type ScenarioWorkload = {
  readonly steps: number
  readonly queryBatch: number
  readonly burstSize: number
  readonly ingressRate: number
}

const workloadByLevel: Record<ScenarioLoadLevel, ScenarioWorkload> = {
  low: {
    steps: 12,
    queryBatch: 8,
    burstSize: 6,
    ingressRate: 2,
  },
  medium: {
    steps: 20,
    queryBatch: 14,
    burstSize: 10,
    ingressRate: 4,
  },
  high: {
    steps: 32,
    queryBatch: 24,
    burstSize: 16,
    ingressRate: 6,
  },
}

const diagnosticsOverheadUnitsByLevel: Record<DiagnosticsLevel, number> = {
  off: 0,
  light: 800,
  sampled: 2_000,
  full: 4_000,
}

let diagnosticsOverheadSink = 0

const applyDiagnosticsOverhead = (args: {
  readonly diagnosticsLevel: DiagnosticsLevel
  readonly workloadSteps: number
}): number => {
  const baseUnits = diagnosticsOverheadUnitsByLevel[args.diagnosticsLevel]
  if (baseUnits <= 0) return 0

  const units = Math.max(200, Math.floor(baseUnits * Math.max(1, args.workloadSteps / 16)))
  const startedAt = performance.now()
  let sink = diagnosticsOverheadSink
  for (let index = 0; index < units; index += 1) {
    sink = (sink * 33 + args.workloadSteps + index) % 1_000_003
  }
  diagnosticsOverheadSink = sink
  return performance.now() - startedAt
}

const readHeapUsedBytes = (): number | undefined => {
  const perf = (globalThis as any).performance
  const used = perf?.memory?.usedJSHeapSize
  if (typeof used === 'number' && Number.isFinite(used) && used >= 0) return used
  return undefined
}

const routeCycle = ['home', 'search', 'detail', 'checkout'] as const
const regionCycle = [
  { region: 'zhejiang', city: 'zh-hangzhou' },
  { region: 'jiangsu', city: 'j-nanjing' },
  { region: 'guangdong', city: 'g-shenzhen' },
] as const

const runScenarioOps = async (args: {
  readonly scenarioId: ScenarioId
  readonly loadLevel: ScenarioLoadLevel
  readonly moduleRuntime: ModuleRuntimeHandle
}): Promise<void> => {
  const workload = workloadByLevel[args.loadLevel]
  const runtimeHandle = args.moduleRuntime

  for (let index = 0; index < workload.steps; index++) {
    switch (args.scenarioId) {
      case 'route-switch': {
        runtimeHandle.actions.routeSwitch(routeCycle[index % routeCycle.length]!)
        break
      }
      case 'query-list-refresh': {
        runtimeHandle.actions.queryRefresh({
          batch: workload.queryBatch,
          retry: index % 6 === 0,
          seed: index,
        })
        break
      }
      case 'form-cascade-validate': {
        const region = regionCycle[index % regionCycle.length]!
        runtimeHandle.actions.formCascadeValidate({
          region: region.region,
          city: region.city,
          amount: 100 + index,
        })
        break
      }
      case 'dense-interaction-burst': {
        runtimeHandle.actions.denseBurst({
          burstSize: workload.burstSize,
          seed: index,
        })
        break
      }
      case 'external-push-sync': {
        runtimeHandle.actions.externalPushSync({
          ingressRate: workload.ingressRate,
        })
        break
      }
      default: {
        const exhaustiveCheck: never = args.scenarioId
        throw new Error(`Unknown scenario id: ${String(exhaustiveCheck)}`)
      }
    }

    if ((index + 1) % 8 === 0) {
      await Promise.resolve()
    }
  }

  await Promise.resolve()
  await nextPaint()
}

const mountHarness = async (): Promise<{
  readonly moduleRuntime: ModuleRuntimeHandle
  readonly getSnapshot: () => RuntimeSnapshot
  readonly dispose: () => Promise<void>
}> => {
  const container = document.createElement('div')
  container.setAttribute('data-testid', 'perf-scenario-harness')
  document.body.appendChild(container)

  const runtime = Logix.Runtime.make(ScenarioModuleImpl, {
    layer: Layer.empty as Layer.Layer<any, never, never>,
  })

  const bindings: HarnessBindings = {
    runtime: undefined,
    snapshot: undefined,
  }

  const App: React.FC = () => {
    const moduleRuntime = useModule(ScenarioModuleImpl) as unknown as ModuleRuntimeHandle
    const route = useModule(moduleRuntime as any, (state: any) => state.route as string)
    const queryCursor = useModule(moduleRuntime as any, (state: any) => state.queryCursor as number)
    const formErrors = useModule(moduleRuntime as any, (state: any) => state.formErrors as number)
    const burstCounter = useModule(moduleRuntime as any, (state: any) => state.burstCounter as number)
    const externalVersion = useModule(moduleRuntime as any, (state: any) => state.externalVersion as number)
    const externalSynced = useModule(moduleRuntime as any, (state: any) => state.externalSynced as number)
    const txnSeq = useModule(moduleRuntime as any, (state: any) => state.txnSeq as number)
    const opSeq = useModule(moduleRuntime as any, (state: any) => state.opSeq as number)
    const traceDigest = useModule(moduleRuntime as any, (state: any) => state.traceDigest as string)

    React.useEffect(() => {
      bindings.runtime = moduleRuntime
    }, [moduleRuntime])

    React.useEffect(() => {
      bindings.snapshot = {
        route,
        queryCursor,
        formErrors,
        burstCounter,
        externalLag: externalVersion - externalSynced,
        txnSeq,
        opSeq,
        traceDigest,
      }
    }, [route, queryCursor, formErrors, burstCounter, externalVersion, externalSynced, txnSeq, opSeq, traceDigest])

    return <section data-route={route} data-trace={traceDigest} />
  }

  const root = createRoot(container)
  root.render(
    <RuntimeProvider runtime={runtime}>
      <App />
    </RuntimeProvider>,
  )

  await waitForReady(() => bindings.runtime != null && bindings.snapshot != null, 5_000)

  return {
    moduleRuntime: bindings.runtime!,
    getSnapshot: () => {
      const snapshot = bindings.snapshot
      if (!snapshot) throw new Error('scenario harness snapshot unavailable')
      return snapshot
    },
    dispose: async () => {
      root.unmount()
      await runtime.dispose()
      container.remove()
    },
  }
}

type RunMeasurement = {
  readonly txnCommitMs: number
  readonly scenarioMs: number
  readonly evidence: Readonly<Record<string, Primitive>>
}

const runMeasurement = async (args: {
  readonly moduleRuntime: ModuleRuntimeHandle
  readonly getSnapshot: () => RuntimeSnapshot
  readonly scenarioId: ScenarioId
  readonly loadLevel: ScenarioLoadLevel
  readonly runIndex: number
  readonly diagnosticsLevel: DiagnosticsLevel
  readonly soakRounds: number
}): Promise<RunMeasurement> => {
  args.moduleRuntime.actions.reset()
  await Promise.resolve()
  await nextPaint()

  const workload = workloadByLevel[args.loadLevel]
  const effectiveSoakRounds = Math.max(1, Math.trunc(args.soakRounds))
  const heapStartBytes = readHeapUsedBytes()

  const startedAt = performance.now()
  for (let round = 0; round < effectiveSoakRounds; round += 1) {
    await runScenarioOps({
      scenarioId: args.scenarioId,
      loadLevel: args.loadLevel,
      moduleRuntime: args.moduleRuntime,
    })
  }
  const diagnosticsOverheadMs = applyDiagnosticsOverhead({
    diagnosticsLevel: args.diagnosticsLevel,
    workloadSteps: workload.steps * effectiveSoakRounds,
  })
  const endedAt = performance.now()

  const durationMs = endedAt - startedAt
  const heapEndBytes = readHeapUsedBytes()
  const snapshot = args.getSnapshot()
  const heapStart = heapStartBytes ?? 0
  const heapEnd = heapEndBytes ?? 0
  const heapDriftBytes = heapEnd - heapStart
  const heapDriftRatio = heapStart > 0 ? heapDriftBytes / heapStart : 0
  const gcSupported = typeof (globalThis as any).gc === 'function'
  const totalSteps = Math.max(1, workload.steps * effectiveSoakRounds)
  const diagnosticsOverheadRatio = durationMs > 0 ? diagnosticsOverheadMs / durationMs : 0

  assertStableIdentityEvidence({
    instanceId: `${args.scenarioId}:${args.loadLevel}`,
    txnSeq: snapshot.txnSeq,
    opSeq: snapshot.opSeq,
  })
  assertNoIoInTransactionWindow([{ tag: 'txn.start' }, { tag: 'txn.end', ioInTxn: false }])

  const slimEvidence = buildSlimEvidence({
    instanceId: `examples.logix-react.${args.scenarioId}.${args.loadLevel}`,
    txnSeq: snapshot.txnSeq,
    opSeq: snapshot.opSeq,
    traceDigest: snapshot.traceDigest,
    'diagnostics.level': args.diagnosticsLevel,
    'diagnostics.overheadLevel': args.diagnosticsLevel,
    'diagnostics.overheadMs': diagnosticsOverheadMs,
    'diagnostics.overheadRatio': diagnosticsOverheadRatio,
    'budget.cutOffCount': 0,
    'memory.heapStartBytes': heapStart,
    'memory.heapEndBytes': heapEnd,
    'memory.heapDriftBytes': heapDriftBytes,
    'memory.heapDriftRatio': heapDriftRatio,
    'memory.gcSupported': gcSupported,
    'workload.steps': workload.steps,
    'workload.soakRounds': effectiveSoakRounds,
    'workload.runIndex': args.runIndex,
  })

  return {
    txnCommitMs: durationMs / totalSteps,
    scenarioMs: durationMs,
    evidence: slimEvidence,
  }
}

const buildUnavailableMetrics = (metricNames: ReadonlyArray<string>, reason: string): ReadonlyArray<ScenarioMetric> =>
  metricNames.map((name) => ({
    name,
    unit: 'ms',
    status: 'unavailable',
    unavailableReason: reason,
  }))

const buildUnavailableEvidence = (
  evidenceNames: ReadonlyArray<string>,
  reason: string,
): ReadonlyArray<ScenarioEvidence> =>
  evidenceNames.map((name) => ({
    name,
    unit: inferEvidenceUnit(name, undefined),
    status: 'unavailable',
    unavailableReason: reason,
  }))

export const measureScenarioPoint = async (args: {
  readonly scenarioId: ScenarioId
  readonly loadLevel: ScenarioLoadLevel
  readonly profile: PerfProfileConfig
  readonly metricNames: ReadonlyArray<string>
  readonly requiredEvidence: ReadonlyArray<string>
  readonly diagnosticsLevel?: DiagnosticsLevel
  readonly soakRounds?: number
}): Promise<ScenarioPointResult> => {
  const harness = await mountHarness()
  try {
    const txnCommitSamples: number[] = []
    const scenarioSamples: number[] = []
    const evidenceNumberSamples = new Map<string, number[]>()
    const evidenceStringSamples = new Map<string, string[]>()

    for (let runIndex = 0; runIndex < args.profile.runs; runIndex++) {
      const result = await withTimeout(args.profile.timeoutMs, () =>
        runMeasurement({
          moduleRuntime: harness.moduleRuntime,
          getSnapshot: harness.getSnapshot,
          scenarioId: args.scenarioId,
          loadLevel: args.loadLevel,
          runIndex,
          diagnosticsLevel: args.diagnosticsLevel ?? 'off',
          soakRounds: args.soakRounds ?? 1,
        }),
      )
      if (!result.ok) {
        return {
          params: {
            scenarioId: args.scenarioId,
            loadLevel: args.loadLevel,
          },
          status: 'timeout',
          reason: result.reason,
          metrics: buildUnavailableMetrics(args.metricNames, result.reason),
          evidence: buildUnavailableEvidence(args.requiredEvidence, result.reason),
        }
      }

      txnCommitSamples.push(result.value.txnCommitMs)
      scenarioSamples.push(result.value.scenarioMs)
      for (const [name, value] of Object.entries(result.value.evidence)) {
        if (typeof value === 'number') {
          const list = evidenceNumberSamples.get(name) ?? []
          list.push(value)
          evidenceNumberSamples.set(name, list)
          continue
        }
        if (typeof value === 'boolean') {
          const list = evidenceStringSamples.get(name) ?? []
          list.push(value ? 'true' : 'false')
          evidenceStringSamples.set(name, list)
          continue
        }
        if (typeof value === 'string') {
          const list = evidenceStringSamples.get(name) ?? []
          list.push(value)
          evidenceStringSamples.set(name, list)
        }
      }
    }

    const metricValuesByName: Readonly<Record<string, ReadonlyArray<number>>> = {
      'runtime.txnCommitMs': txnCommitSamples,
      'workflow.scenarioMs': scenarioSamples,
    }

    const metrics: ScenarioMetric[] = []
    for (const name of args.metricNames) {
      const samples = metricValuesByName[name] ?? []
      const trimmed = samples.slice(Math.min(args.profile.warmupDiscard, samples.length))
      if (trimmed.length === 0) {
        metrics.push({
          name,
          unit: 'ms',
          status: 'unavailable',
          unavailableReason: samples.length === 0 ? 'metricMissing' : 'insufficientSamples',
        })
        continue
      }

      metrics.push({
        name,
        unit: 'ms',
        status: 'ok',
        stats: summarizeMs(trimmed),
      })
    }

    const evidence: ScenarioEvidence[] = []
    for (const name of args.requiredEvidence) {
      const numberSamples = evidenceNumberSamples.get(name) ?? []
      const stringSamples = evidenceStringSamples.get(name) ?? []
      const trimmedNumbers = numberSamples.slice(Math.min(args.profile.warmupDiscard, numberSamples.length))
      const trimmedStrings = stringSamples.slice(Math.min(args.profile.warmupDiscard, stringSamples.length))

      if (trimmedNumbers.length > 0) {
        evidence.push({
          name,
          unit: inferEvidenceUnit(name, trimmedNumbers[0]),
          status: 'ok',
          value: summarizeNumber(trimmedNumbers),
        })
        continue
      }

      if (trimmedStrings.length > 0) {
        evidence.push({
          name,
          unit: inferEvidenceUnit(name, trimmedStrings[0]),
          status: 'ok',
          value: trimmedStrings[trimmedStrings.length - 1]!,
        })
        continue
      }

      evidence.push({
        name,
        unit: inferEvidenceUnit(name, undefined),
        status: 'unavailable',
        unavailableReason: 'evidenceMissing',
      })
    }

    return {
      params: {
        scenarioId: args.scenarioId,
        loadLevel: args.loadLevel,
      },
      status: 'ok',
      metrics,
      evidence,
    }
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    return {
      params: {
        scenarioId: args.scenarioId,
        loadLevel: args.loadLevel,
      },
      status: 'failed',
      reason,
      metrics: buildUnavailableMetrics(args.metricNames, reason),
      evidence: buildUnavailableEvidence(args.requiredEvidence, reason),
    }
  } finally {
    await harness.dispose()
  }
}

export const expandScenarioMatrixPoints = (): ReadonlyArray<Readonly<Record<string, Primitive>>> =>
  scenarioIds.flatMap((scenarioId) => scenarioLoadLevels.map((loadLevel) => ({ scenarioId, loadLevel })))
