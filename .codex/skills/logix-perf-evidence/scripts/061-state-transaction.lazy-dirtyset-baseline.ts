import { Effect, SubscriptionRef } from 'effect'
import fs from 'node:fs'
import { performance } from 'node:perf_hooks'
import { makeFieldPathIdRegistry } from '../../../../packages/logix-core/src/internal/field-path.js'
import * as StateTransaction from '../../../../packages/logix-core/src/internal/runtime/core/StateTransaction.js'

const quantile = (sorted: ReadonlyArray<number>, q: number): number => {
  if (sorted.length === 0) return Number.NaN
  const clamped = Math.min(1, Math.max(0, q))
  const index = Math.floor(clamped * (sorted.length - 1))
  return sorted[index]!
}

const summarize = (
  samples: ReadonlyArray<number>,
): {
  readonly n: number
  readonly medianMsPerTxn: number
  readonly p95MsPerTxn: number
} => {
  const sorted = samples.slice().sort((a, b) => a - b)
  return {
    n: sorted.length,
    medianMsPerTxn: quantile(sorted, 0.5),
    p95MsPerTxn: quantile(sorted, 0.95),
  }
}

const parseIntOr = (raw: string | undefined, fallback: number): number => {
  if (typeof raw !== 'string') return fallback
  const parsed = Number.parseInt(raw, 10)
  if (!Number.isFinite(parsed)) return fallback
  return parsed
}

const parsePositiveIntOr = (raw: string | undefined, fallback: number): number => {
  const parsed = parseIntOr(raw, fallback)
  if (parsed <= 0) return fallback
  return parsed
}

const parseInstrumentation = (raw: string | undefined): StateTransaction.StateTxnInstrumentationLevel =>
  raw === 'full' ? 'full' : 'light'

interface ScenarioResult {
  readonly label: string
  readonly readDirtySet: boolean
  readonly runs: number
  readonly warmupDiscard: number
  readonly txnsPerRun: number
  readonly dirtyRoots: number
  readonly checksum: number
  readonly samplesMsPerTxn: ReadonlyArray<number>
  readonly stats: {
    readonly n: number
    readonly medianMsPerTxn: number
    readonly p95MsPerTxn: number
  }
}

const makeStatePair = (
  totalFields: number,
  dirtyRoots: number,
): {
  readonly stateA: Record<string, number>
  readonly stateB: Record<string, number>
} => {
  const stateA: Record<string, number> = {}
  const stateB: Record<string, number> = {}
  for (let i = 0; i < totalFields; i++) {
    const key = `k${i}`
    stateA[key] = 0
    stateB[key] = i < dirtyRoots ? 1 : 0
  }
  return { stateA, stateB }
}

const runScenario = (args: {
  readonly label: string
  readonly runs: number
  readonly warmupDiscard: number
  readonly txnsPerRun: number
  readonly dirtyPathIds: ReadonlyArray<number>
  readonly readDirtySet: boolean
  readonly instrumentation: StateTransaction.StateTxnInstrumentationLevel
  readonly registry: ReturnType<typeof makeFieldPathIdRegistry>
  readonly stateA: Record<string, number>
  readonly stateB: Record<string, number>
}): ScenarioResult => {
  const samplesMsPerTxn: number[] = []
  const stateRef = Effect.runSync(SubscriptionRef.make<Record<string, number>>(args.stateA))
  const ctx = StateTransaction.makeContext<Record<string, number>>({
    moduleId: 'Perf061StateTransactionLazyDirtySet',
    instanceId: `perf-061:${args.label}`,
    instrumentation: args.instrumentation,
    captureSnapshots: false,
    getFieldPathIdRegistry: () => args.registry,
    now: () => performance.now(),
  })

  let checksum = 0

  for (let run = 0; run < args.runs; run++) {
    let current = args.stateA
    let next = args.stateB
    const startedAt = performance.now()

    for (let index = 0; index < args.txnsPerRun; index++) {
      StateTransaction.beginTransaction(ctx, { kind: 'perf', name: args.label }, current)
      StateTransaction.updateDraft(ctx, next)

      for (const pathId of args.dirtyPathIds) {
        StateTransaction.recordPatch(ctx, pathId, 'reducer')
      }

      const committed = Effect.runSync(StateTransaction.commitWithState(ctx, stateRef))
      if (args.readDirtySet && committed) {
        checksum ^= committed.transaction.dirtySet.keyHash
      }

      const prev = current
      current = next
      next = prev
    }

    const endedAt = performance.now()
    const perTxn = (endedAt - startedAt) / args.txnsPerRun
    if (run >= args.warmupDiscard) {
      samplesMsPerTxn.push(perTxn)
    }
  }

  return {
    label: args.label,
    readDirtySet: args.readDirtySet,
    runs: args.runs,
    warmupDiscard: args.warmupDiscard,
    txnsPerRun: args.txnsPerRun,
    dirtyRoots: args.dirtyPathIds.length,
    checksum,
    samplesMsPerTxn,
    stats: summarize(samplesMsPerTxn),
  }
}

const main = (): void => {
  const runs = parsePositiveIntOr(process.env.RUNS, 24)
  const warmupDiscard = Math.max(0, parseIntOr(process.env.WARMUP_DISCARD, 4))
  const txnsPerRun = parsePositiveIntOr(process.env.TXNS_PER_RUN, 250)
  const totalFields = parsePositiveIntOr(process.env.TOTAL_FIELDS, 256)
  const dirtyRootsRequested = parsePositiveIntOr(process.env.DIRTY_ROOTS, 64)
  const dirtyRoots = Math.min(totalFields, dirtyRootsRequested)
  const instrumentation = parseInstrumentation(process.env.INSTRUMENTATION)

  const registry = makeFieldPathIdRegistry(Array.from({ length: totalFields }, (_, id) => [`k${id}`]))
  const dirtyPathIds = Array.from({ length: dirtyRoots }, (_, id) => id)
  const { stateA, stateB } = makeStatePair(totalFields, dirtyRoots)

  const before = runScenario({
    label: 'before.eager-read-dirty-set',
    runs,
    warmupDiscard,
    txnsPerRun,
    dirtyPathIds,
    readDirtySet: true,
    instrumentation,
    registry,
    stateA,
    stateB,
  })

  const after = runScenario({
    label: 'after.lazy-skip-dirty-set',
    runs,
    warmupDiscard,
    txnsPerRun,
    dirtyPathIds,
    readDirtySet: false,
    instrumentation,
    registry,
    stateA,
    stateB,
  })

  const medianDeltaMsPerTxn = before.stats.medianMsPerTxn - after.stats.medianMsPerTxn
  const p95DeltaMsPerTxn = before.stats.p95MsPerTxn - after.stats.p95MsPerTxn
  const medianSpeedupRatio =
    Number.isFinite(after.stats.medianMsPerTxn) && after.stats.medianMsPerTxn > 0
      ? before.stats.medianMsPerTxn / after.stats.medianMsPerTxn
      : Number.NaN

  const result = {
    meta: {
      node: process.version,
      platform: process.platform,
      arch: process.arch,
      runs,
      warmupDiscard,
      txnsPerRun,
      totalFields,
      dirtyRoots,
      instrumentation,
      benchmark:
        'StateTransaction.commitWithState dirtySet path: before=eager read dirtySet, after=lazy skip dirtySet',
    },
    before,
    after,
    diff: {
      medianDeltaMsPerTxn,
      p95DeltaMsPerTxn,
      medianSpeedupRatio,
      interpretation:
        'positive delta means lazy dirty-set path reduced per-transaction commit overhead versus eager dirty-set read baseline',
    },
  } as const

  const json = JSON.stringify(result, null, 2)
  const outFile = process.env.OUT_FILE
  if (typeof outFile === 'string' && outFile.trim().length > 0) {
    fs.writeFileSync(outFile, json, 'utf8')
    // eslint-disable-next-line no-console
    console.error(`[logix-perf] wrote ${outFile}`)
    return
  }

  // eslint-disable-next-line no-console
  console.log(json)
}

main()
