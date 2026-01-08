import { Effect, Layer } from 'effect'
import { execFileSync } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { performance } from 'node:perf_hooks'
import { dirname } from 'node:path'
import * as Logix from '@logixjs/core'

const nowMs = (): number => performance.now()

type Summary = {
  readonly n: number
  readonly p50Ms: number
  readonly p95Ms: number
}

const quantile = (sorted: ReadonlyArray<number>, q: number): number => {
  if (sorted.length === 0) return Number.NaN
  const clamped = Math.min(1, Math.max(0, q))
  const idx = Math.floor(clamped * (sorted.length - 1))
  return sorted[idx]!
}

const summarize = (samples: ReadonlyArray<number>): Summary => {
  const sorted = samples.slice().sort((a, b) => a - b)
  return {
    n: sorted.length,
    p50Ms: quantile(sorted, 0.5),
    p95Ms: quantile(sorted, 0.95),
  }
}

const gcIfAvailable = (): void => {
  if (typeof (globalThis as any).gc === 'function') {
    ;(globalThis as any).gc()
  }
}

const heapUsed = (): number => process.memoryUsage().heapUsed

const safeExec = (cmd: string, args: ReadonlyArray<string>): string | undefined => {
  try {
    return execFileSync(cmd, [...args], { encoding: 'utf8' }).trim()
  } catch {
    return undefined
  }
}

const readGitMeta = ():
  | {
      readonly branch?: string
      readonly commit?: string
      readonly dirty?: boolean
    }
  | undefined => {
  const branch = safeExec('git', ['branch', '--show-current'])
  const commit = safeExec('git', ['rev-parse', 'HEAD'])
  const dirty = safeExec('git', ['status', '--porcelain'])
  if (!branch && !commit && dirty == null) return undefined
  return {
    branch: branch || undefined,
    commit: commit || undefined,
    dirty: dirty != null ? dirty.length > 0 : undefined,
  }
}

const runTimed = async (args: {
  readonly runs: number
  readonly warmupDiscard: number
  readonly runOnce: () => Promise<void>
}): Promise<{
  readonly runs: number
  readonly warmupDiscard: number
  readonly samplesMs: ReadonlyArray<number>
  readonly heapDeltaBytesSamples: ReadonlyArray<number>
  readonly timeMs: Summary
  readonly heapDeltaBytes: Summary
}> => {
  const samples: number[] = []
  const heaps: number[] = []

  for (let i = 0; i < args.runs; i++) {
    gcIfAvailable()
    const heapBefore = heapUsed()

    const start = nowMs()
    await args.runOnce()
    const end = nowMs()

    gcIfAvailable()
    const heapAfter = heapUsed()

    samples.push(end - start)
    heaps.push(heapAfter - heapBefore)
  }

  const trimmedSamples = samples.slice(Math.min(args.warmupDiscard, samples.length))
  const trimmedHeaps = heaps.slice(Math.min(args.warmupDiscard, heaps.length))

  return {
    runs: args.runs,
    warmupDiscard: args.warmupDiscard,
    samplesMs: trimmedSamples,
    heapDeltaBytesSamples: trimmedHeaps,
    timeMs: summarize(trimmedSamples),
    heapDeltaBytes: summarize(trimmedHeaps),
  }
}

type RingBufferAlgo = 'shift' | 'batch_splice'

const benchRingBufferAlgo = (args: {
  readonly algo: RingBufferAlgo
  readonly bufferSize: number
  readonly iters: number
}): {
  readonly algo: RingBufferAlgo
  readonly bufferSize: number
  readonly iters: number
  readonly totalMs: number
  readonly nsPerOp: number
  readonly trimOps: number
  readonly maxLength: number
  readonly finalLength: number
} => {
  const ring: number[] = []
  const seq: number[] = []

  let trimOps = 0
  let maxLength = 0

  const ensureRingBufferSize = (): void => {
    if (args.bufferSize <= 0) {
      ring.length = 0
      seq.length = 0
      return
    }
    if (ring.length <= args.bufferSize) return
    const excess = ring.length - args.bufferSize
    ring.splice(0, excess)
    seq.splice(0, excess)
    trimOps += 1
  }

  const trimRingBufferIfNeeded = (): void => {
    if (args.bufferSize <= 0) {
      ring.length = 0
      seq.length = 0
      return
    }

    if (args.bufferSize <= 64) {
      ensureRingBufferSize()
      return
    }

    const slack = Math.min(1024, Math.floor(args.bufferSize / 2))
    const threshold = args.bufferSize + Math.max(1, slack)
    if (ring.length <= threshold) return

    const excess = ring.length - args.bufferSize
    ring.splice(0, excess)
    seq.splice(0, excess)
    trimOps += 1
  }

  const push = (value: number) => {
    ring.push(value)
    seq.push(value)

    if (args.algo === 'shift') {
      if (args.bufferSize <= 0) {
        ring.length = 0
        seq.length = 0
      } else if (ring.length > args.bufferSize) {
        ring.shift()
        seq.shift()
        trimOps += 1
      }
    } else {
      trimRingBufferIfNeeded()
    }

    if (ring.length > maxLength) {
      maxLength = ring.length
    }
  }

  const start = nowMs()
  for (let i = 0; i < args.iters; i++) {
    push(i)
  }
  const end = nowMs()

  const totalMs = end - start

  return {
    algo: args.algo,
    bufferSize: args.bufferSize,
    iters: args.iters,
    totalMs,
    nsPerOp: (totalMs * 1_000_000) / Math.max(1, args.iters),
    trimOps,
    maxLength,
    finalLength: ring.length,
  }
}

const makeDiagnosticsLayer = (level: Logix.Debug.DiagnosticsLevel): Layer.Layer<any, never, never> =>
  Layer.mergeAll(Logix.Debug.runtimeLabel('perf'), Logix.Debug.diagnosticsLevel(level)) as Layer.Layer<
    any,
    never,
    never
  >

const benchDevtoolsHubRecord = async (args: {
  readonly bufferSize: number
  readonly diagnosticsLevel: Logix.Debug.DiagnosticsLevel
  readonly events: number
}): Promise<{
  readonly bufferSize: number
  readonly diagnosticsLevel: Logix.Debug.DiagnosticsLevel
  readonly events: number
  readonly result: Awaited<ReturnType<typeof runTimed>>
  readonly snapshotAfter: {
    readonly eventsLength: number
    readonly instances: number
    readonly latestStates: number
    readonly latestTraitSummaries: number
    readonly exportBudget: { readonly dropped: number; readonly oversized: number }
    readonly snapshotToken: Logix.Debug.SnapshotToken
  }
}> => {
  const layer = Layer.mergeAll(
    makeDiagnosticsLayer(args.diagnosticsLevel),
    Logix.Debug.devtoolsHubLayer({
      bufferSize: args.bufferSize,
      diagnosticsLevel: args.diagnosticsLevel,
    }),
  ) as Layer.Layer<any, never, never>

  const event: any = {
    type: 'trace:perf',
    moduleId: 'Perf027',
    instanceId: 'i-1',
    runtimeLabel: 'PerfRuntime',
    timestamp: 0,
    data: { ok: true },
  }

  const program = Effect.gen(function* () {
    for (let i = 0; i < args.events; i++) {
      yield* Logix.Debug.record(event as any)
    }
  }).pipe(Effect.provide(layer))

  const RUNS = Number.parseInt(process.env.RUNS ?? '10', 10)
  const WARMUP_DISCARD = Number.parseInt(process.env.WARMUP_DISCARD ?? '2', 10)

  const result = await runTimed({
    runs: RUNS,
    warmupDiscard: WARMUP_DISCARD,
    runOnce: async () => {
      Logix.Debug.clearDevtoolsEvents()
      await Effect.runPromise(program)
    },
  })

  const snapshot = Logix.Debug.getDevtoolsSnapshot()
  return {
    bufferSize: args.bufferSize,
    diagnosticsLevel: args.diagnosticsLevel,
    events: args.events,
    result,
    snapshotAfter: {
      eventsLength: snapshot.events.length,
      instances: snapshot.instances.size,
      latestStates: snapshot.latestStates.size,
      latestTraitSummaries: snapshot.latestTraitSummaries.size,
      exportBudget: snapshot.exportBudget,
      snapshotToken: snapshot.snapshotToken,
    },
  }
}

const benchTxnQueue = async (args: {
  readonly iters: number
  readonly diagnosticsLevel: Logix.Debug.DiagnosticsLevel
  readonly hasLinkId: boolean
}): Promise<{
  readonly iters: number
  readonly diagnosticsLevel: Logix.Debug.DiagnosticsLevel
  readonly hasLinkId: boolean
  readonly result: Awaited<ReturnType<typeof runTimed>>
}> => {
  const layer = makeDiagnosticsLayer(args.diagnosticsLevel)

  const resolveConcurrencyPolicy = () =>
    Effect.succeed({
      concurrencyLimit: 16,
      losslessBackpressureCapacity: 4096,
      allowUnbounded: false,
      pressureWarningThreshold: { backlogCount: 1000, backlogDurationMs: 5000 },
      warningCooldownMs: 30_000,
      configScope: 'builtin',
      concurrencyLimitScope: 'builtin',
      requestedConcurrencyLimit: 16,
      requestedConcurrencyLimitScope: 'builtin',
      allowUnboundedScope: 'builtin',
    } as any)

  const diagnostics: any = {
    emitPressureIfNeeded: () => Effect.void,
    emitUnboundedPolicyIfNeeded: () => Effect.void,
  }

  const makeProgram = Effect.scoped(
    Effect.gen(function* () {
      const enqueue = yield* Logix.InternalContracts.makeEnqueueTransaction({
        moduleId: 'Perf027TxnQueue',
        instanceId: 'i-1',
        resolveConcurrencyPolicy,
        diagnostics,
      })

      for (let i = 0; i < args.iters; i++) {
        yield* enqueue(Effect.void)
      }
    }),
  ).pipe(Effect.provide(layer))

  const program = args.hasLinkId ? makeProgram.pipe(Logix.InternalContracts.withCurrentLinkId('i-1::l0')) : makeProgram

  const RUNS = Number.parseInt(process.env.RUNS ?? '10', 10)
  const WARMUP_DISCARD = Number.parseInt(process.env.WARMUP_DISCARD ?? '2', 10)

  const result = await runTimed({
    runs: RUNS,
    warmupDiscard: WARMUP_DISCARD,
    runOnce: async () => {
      await Effect.runPromise(program)
    },
  })

  return {
    iters: args.iters,
    diagnosticsLevel: args.diagnosticsLevel,
    hasLinkId: args.hasLinkId,
    result,
  }
}

const benchDevtoolsCleanupCurve = async (args: {
  readonly instances: number
}): Promise<{
  readonly instances: number
  readonly result: Awaited<ReturnType<typeof runTimed>>
  readonly snapshotAfter: {
    readonly instances: number
    readonly latestStates: number
    readonly latestTraitSummaries: number
  }
}> => {
  const layer = Layer.mergeAll(
    makeDiagnosticsLayer('full'),
    Logix.Debug.devtoolsHubLayer({
      bufferSize: 0,
      diagnosticsLevel: 'full',
    }),
  ) as Layer.Layer<any, never, never>

  const moduleId = 'Perf027Cleanup'
  const runtimeLabel = 'PerfRuntime'

  const program = Effect.gen(function* () {
    for (let i = 0; i < args.instances; i++) {
      const instanceId = `i-${i + 1}`
      yield* Logix.Debug.record({
        type: 'module:init',
        moduleId,
        instanceId,
        runtimeLabel,
        timestamp: 0,
      } as any)
    }

    for (let i = 0; i < args.instances; i++) {
      const instanceId = `i-${i + 1}`
      yield* Logix.Debug.record({
        type: 'state:update',
        moduleId,
        instanceId,
        runtimeLabel,
        txnSeq: 1,
        txnId: `${instanceId}::t1`,
        state: { n: i },
        traitSummary: { t: i },
        timestamp: 0,
      } as any)
    }

    for (let i = 0; i < args.instances; i++) {
      const instanceId = `i-${i + 1}`
      yield* Logix.Debug.record({
        type: 'module:destroy',
        moduleId,
        instanceId,
        runtimeLabel,
        timestamp: 0,
      } as any)
    }
  }).pipe(Effect.provide(layer))

  const RUNS = Number.parseInt(process.env.CLEANUP_RUNS ?? '10', 10)
  const WARMUP_DISCARD = Number.parseInt(process.env.CLEANUP_WARMUP_DISCARD ?? '2', 10)

  const result = await runTimed({
    runs: RUNS,
    warmupDiscard: WARMUP_DISCARD,
    runOnce: async () => {
      Logix.Debug.clearDevtoolsEvents()
      await Effect.runPromise(program)
    },
  })

  const snapshot = Logix.Debug.getDevtoolsSnapshot()
  return {
    instances: args.instances,
    result,
    snapshotAfter: {
      instances: snapshot.instances.size,
      latestStates: snapshot.latestStates.size,
      latestTraitSummaries: snapshot.latestTraitSummaries.size,
    },
  }
}

const main = async (): Promise<void> => {
  const OUT_FILE = process.env.OUT_FILE ?? 'specs/027-runtime-observability-hardening/perf/after.local.r1.json'

  const EVENTS_100K = Number.parseInt(process.env.EVENTS_100K ?? '100000', 10)
  const EVENTS_NOT_FULL = Number.parseInt(process.env.EVENTS_NOT_FULL ?? '1000', 10)
  const TXN_ITERS = Number.parseInt(process.env.TXN_ITERS ?? '20000', 10)
  const CLEANUP_INSTANCES = Number.parseInt(process.env.CLEANUP_INSTANCES ?? '10000', 10)

  const ALGO_ITERS = Number.parseInt(process.env.ALGO_ITERS ?? '100000', 10)

  const algo = [
    benchRingBufferAlgo({ algo: 'shift', bufferSize: 500, iters: ALGO_ITERS }),
    benchRingBufferAlgo({ algo: 'shift', bufferSize: 5000, iters: ALGO_ITERS }),
    benchRingBufferAlgo({ algo: 'batch_splice', bufferSize: 500, iters: ALGO_ITERS }),
    benchRingBufferAlgo({ algo: 'batch_splice', bufferSize: 5000, iters: ALGO_ITERS }),
  ]

  const devtools500_notFull = await benchDevtoolsHubRecord({
    bufferSize: 500,
    diagnosticsLevel: 'light',
    events: Math.min(EVENTS_NOT_FULL, 400),
  })
  const devtools500_full = await benchDevtoolsHubRecord({
    bufferSize: 500,
    diagnosticsLevel: 'light',
    events: EVENTS_100K,
  })
  const devtools5000_notFull = await benchDevtoolsHubRecord({
    bufferSize: 5000,
    diagnosticsLevel: 'light',
    events: Math.min(EVENTS_NOT_FULL, 4000),
  })
  const devtools5000_full = await benchDevtoolsHubRecord({
    bufferSize: 5000,
    diagnosticsLevel: 'light',
    events: EVENTS_100K,
  })

  const txnNoLink = await benchTxnQueue({
    iters: TXN_ITERS,
    diagnosticsLevel: 'off',
    hasLinkId: false,
  })
  const txnWithLink = await benchTxnQueue({
    iters: TXN_ITERS,
    diagnosticsLevel: 'off',
    hasLinkId: true,
  })

  const cleanup = await benchDevtoolsCleanupCurve({ instances: CLEANUP_INSTANCES })

  const sc002Ratio = devtools5000_full.result.timeMs.p50Ms / Math.max(0.000001, devtools500_full.result.timeMs.p50Ms)

  const report = {
    meta: {
      createdAt: new Date().toISOString(),
      generator:
        '.codex/skills/logix-perf-evidence/scripts/027-runtime-observability-hardening.devtools-and-txn-baseline.ts',
      git: readGitMeta(),
      env: {
        node: process.version,
        platform: `${process.platform}/${process.arch}`,
        gc: typeof (globalThis as any).gc === 'function',
      },
      config: {
        outFile: OUT_FILE,
        runs: Number.parseInt(process.env.RUNS ?? '10', 10),
        warmupDiscard: Number.parseInt(process.env.WARMUP_DISCARD ?? '2', 10),
        eventsNotFull: EVENTS_NOT_FULL,
        events100k: EVENTS_100K,
        txnIters: TXN_ITERS,
        cleanupRuns: Number.parseInt(process.env.CLEANUP_RUNS ?? '10', 10),
        cleanupWarmupDiscard: Number.parseInt(process.env.CLEANUP_WARMUP_DISCARD ?? '2', 10),
        cleanupInstances: CLEANUP_INSTANCES,
        algoIters: ALGO_ITERS,
      },
    },
    suites: {
      ringBufferAlgorithm: algo,
      devtoolsHubRecord: {
        window500: { notFull: devtools500_notFull, full: devtools500_full },
        window5000: { notFull: devtools5000_notFull, full: devtools5000_full },
      },
      txnQueue: {
        noLinkId: txnNoLink,
        withLinkId: txnWithLink,
      },
      cleanupCurve: cleanup,
    },
    gate: {
      ok: sc002Ratio <= 1.1,
      sc002: {
        expectedMaxRatio: 1.1,
        p50Ratio5000Over500: sc002Ratio,
      },
    },
  } as const

  await mkdir(dirname(OUT_FILE), { recursive: true })
  await writeFile(OUT_FILE, `${JSON.stringify(report, null, 2)}\n`, 'utf8')

  // eslint-disable-next-line no-console
  console.log(`[logix-perf] wrote ${OUT_FILE}`)
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err)
  process.exitCode = 1
})
