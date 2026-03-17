import { describe, it, expect } from '@effect/vitest'
import { Effect } from 'effect'
import { performance } from 'node:perf_hooks'
import { toKey } from '../../../src/internal/field-path.js'

type FieldPath = ReadonlyArray<string>

type PerfSummary = {
  readonly n: number
  readonly p50Ms: number
  readonly p95Ms: number
  readonly meanMs: number
}

const quantile = (samples: ReadonlyArray<number>, q: number): number => {
  if (samples.length === 0) return 0
  const sorted = Array.from(samples).sort((a, b) => a - b)
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil(q * sorted.length) - 1))
  return sorted[idx]!
}

const summarize = (samples: ReadonlyArray<number>): PerfSummary => {
  const n = samples.length
  const meanMs = n > 0 ? samples.reduce((acc, cur) => acc + cur, 0) / n : 0
  return {
    n,
    p50Ms: quantile(samples, 0.5),
    p95Ms: quantile(samples, 0.95),
    meanMs,
  }
}

const makeRng = (seedInput: number): (() => number) => {
  let seed = seedInput >>> 0
  return () => {
    seed ^= seed << 13
    seed ^= seed >>> 17
    seed ^= seed << 5
    return (seed >>> 0) / 0xffffffff
  }
}

const isPrefixOf = (a: FieldPath, b: FieldPath): boolean => {
  if (a.length > b.length) return false
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false
  }
  return true
}

const isRedundantDirtyRoot = (existingDirtyRoots: ReadonlyArray<FieldPath>, dirtyRoot: FieldPath): boolean => {
  for (const existing of existingDirtyRoots) {
    if (isPrefixOf(existing, dirtyRoot)) {
      return true
    }
  }
  return false
}

const upsertDirtyRoot = (existingDirtyRoots: Array<FieldPath>, dirtyRoot: FieldPath): boolean => {
  if (isRedundantDirtyRoot(existingDirtyRoots, dirtyRoot)) {
    return false
  }

  let nextLength = 0
  for (let i = 0; i < existingDirtyRoots.length; i += 1) {
    const existing = existingDirtyRoots[i]!
    if (isPrefixOf(dirtyRoot, existing)) {
      continue
    }
    existingDirtyRoots[nextLength] = existing
    nextLength += 1
  }
  existingDirtyRoots.length = nextLength
  existingDirtyRoots.push(dirtyRoot)
  return true
}

const rebuildPathKeyCache = (pathKeys: Set<string>, paths: ReadonlyArray<FieldPath>): void => {
  pathKeys.clear()
  for (let i = 0; i < paths.length; i += 1) {
    pathKeys.add(toKey(paths[i]!))
  }
}

const upsertWithLegacyRebuild = (paths: Array<FieldPath>, pathKeys: Set<string>, dirtyRoot: FieldPath): boolean => {
  const key = toKey(dirtyRoot)
  if (pathKeys.has(key)) {
    return false
  }

  const changed = upsertDirtyRoot(paths, dirtyRoot)
  if (!changed) {
    return false
  }

  rebuildPathKeyCache(pathKeys, paths)
  return true
}

const upsertWithFastAppend = (paths: Array<FieldPath>, pathKeys: Set<string>, dirtyRoot: FieldPath): boolean => {
  const key = toKey(dirtyRoot)
  if (pathKeys.has(key)) {
    return false
  }

  const beforeLength = paths.length
  const changed = upsertDirtyRoot(paths, dirtyRoot)
  if (!changed) {
    return false
  }

  if (paths.length === beforeLength + 1) {
    pathKeys.add(key)
    return true
  }

  rebuildPathKeyCache(pathKeys, paths)
  return true
}

const makeTxns = (args: {
  readonly txns: number
  readonly roots: number
  readonly dirtyPerTxn: number
  readonly seed: number
}): ReadonlyArray<ReadonlyArray<FieldPath>> => {
  const rng = makeRng(args.seed)
  const result: Array<ReadonlyArray<FieldPath>> = []

  for (let txn = 0; txn < args.txns; txn += 1) {
    const dirty: Array<FieldPath> = []
    for (let i = 0; i < args.dirtyPerTxn; i += 1) {
      const root = `root${Math.floor(rng() * args.roots)}`
      if (rng() < 0.08) {
        dirty.push([root])
        continue
      }
      const branch = `branch${Math.floor(rng() * 32)}`
      const leaf = `leaf${Math.floor(rng() * 8)}`
      dirty.push([root, branch, leaf])
      if (rng() < 0.12) {
        dirty.push([root, branch, `leaf${Math.floor(rng() * 8)}`])
      }
    }
    result.push(dirty)
  }

  return result
}

const runCase = (args: {
  readonly txns: ReadonlyArray<ReadonlyArray<FieldPath>>
  readonly upsert: (paths: Array<FieldPath>, pathKeys: Set<string>, dirtyRoot: FieldPath) => boolean
}): { readonly totalRoots: number; readonly digest: number } => {
  let totalRoots = 0
  let digest = 0

  for (const dirtyPaths of args.txns) {
    const byRoot = new Map<string, { readonly paths: Array<FieldPath>; readonly pathKeys: Set<string> }>()
    for (const dirtyPath of dirtyPaths) {
      const root = dirtyPath[0]!
      const bucket = byRoot.get(root)
      if (bucket) {
        args.upsert(bucket.paths, bucket.pathKeys, dirtyPath)
      } else {
        const paths: Array<FieldPath> = []
        const pathKeys = new Set<string>()
        args.upsert(paths, pathKeys, dirtyPath)
        byRoot.set(root, { paths, pathKeys })
      }
    }

    for (const bucket of byRoot.values()) {
      totalRoots += bucket.paths.length
      for (const path of bucket.paths) {
        const key = toKey(path)
        for (let i = 0; i < key.length; i += 1) {
          digest = ((digest * 31) ^ key.charCodeAt(i)) >>> 0
        }
      }
    }
  }

  return { totalRoots, digest }
}

const benchmarkCase = (args: {
  readonly iterations: number
  readonly warmup: number
  readonly run: () => { readonly totalRoots: number; readonly digest: number }
}): { readonly summary: PerfSummary; readonly totalRoots: number; readonly digest: number } => {
  const warmup = Math.max(0, args.warmup)
  const iterations = Math.max(1, args.iterations)

  for (let i = 0; i < warmup; i += 1) {
    args.run()
  }

  const samples: number[] = []
  let totalRoots = -1
  let digest = -1

  for (let i = 0; i < iterations; i += 1) {
    const t0 = performance.now()
    const next = args.run()
    const dt = performance.now() - t0
    samples.push(dt)

    if (totalRoots === -1) {
      totalRoots = next.totalRoots
      digest = next.digest
    } else {
      expect(next.totalRoots).toBe(totalRoots)
      expect(next.digest).toBe(digest)
    }
  }

  return {
    summary: summarize(samples),
    totalRoots,
    digest,
  }
}

describe('SelectorGraph path-key fast-append perf evidence (Diagnostics=off)', () => {
  it.effect('should keep behavior stable and lower cache-maintenance cost on append-dominant workloads', () =>
    Effect.sync(() => {
      const txns = Number(process.env.LOGIX_PERF_TXNS ?? 640)
      const roots = Number(process.env.LOGIX_PERF_ROOTS ?? 32)
      const dirtyPerTxn = Number(process.env.LOGIX_PERF_DIRTY_PER_TXN ?? 24)
      const iterations = Number(process.env.LOGIX_PERF_ITERS ?? 30)
      const warmup = Number(process.env.LOGIX_PERF_WARMUP ?? 5)
      const seed = Number(process.env.LOGIX_PERF_SEED ?? 20260319)

      const dataset = makeTxns({
        txns: Math.max(1, txns),
        roots: Math.max(1, roots),
        dirtyPerTxn: Math.max(1, dirtyPerTxn),
        seed,
      })

      const legacy = benchmarkCase({
        iterations,
        warmup,
        run: () => runCase({ txns: dataset, upsert: upsertWithLegacyRebuild }),
      })

      const fastAppend = benchmarkCase({
        iterations,
        warmup,
        run: () => runCase({ txns: dataset, upsert: upsertWithFastAppend }),
      })

      expect(legacy.totalRoots).toBe(fastAppend.totalRoots)
      expect(legacy.digest).toBe(fastAppend.digest)

      const p95Ratio =
        legacy.summary.p95Ms > 0 && Number.isFinite(legacy.summary.p95Ms)
          ? fastAppend.summary.p95Ms / legacy.summary.p95Ms
          : Number.NaN

      const evidence = {
        scenario: 'selectorGraph.pathKeyFastAppend.off',
        dataset: {
          txns: Math.max(1, txns),
          roots: Math.max(1, roots),
          dirtyPerTxn: Math.max(1, dirtyPerTxn),
          seed: seed >>> 0,
        },
        run: {
          iterations: Math.max(1, iterations),
          warmup: Math.max(0, warmup),
        },
        behavior: {
          totalRootsLegacy: legacy.totalRoots,
          totalRootsFastAppend: fastAppend.totalRoots,
          digestLegacy: legacy.digest,
          digestFastAppend: fastAppend.digest,
        },
        metrics: {
          legacy: legacy.summary,
          fastAppend: fastAppend.summary,
          ratio: {
            p95FastAppendOverLegacy: p95Ratio,
          },
        },
      } as const

      console.log(
        `[perf] SelectorGraph.PathKeyFastAppend.off txns=${txns} roots=${roots} dirtyPerTxn=${dirtyPerTxn} legacy.p50=${legacy.summary.p50Ms.toFixed(
          3,
        )}ms legacy.p95=${legacy.summary.p95Ms.toFixed(3)}ms fast.p50=${fastAppend.summary.p50Ms.toFixed(
          3,
        )}ms fast.p95=${fastAppend.summary.p95Ms.toFixed(3)}ms p95.ratio=${Number.isFinite(p95Ratio) ? p95Ratio.toFixed(3) : 'NaN'}`,
      )
      console.log(`[perf:evidence] ${JSON.stringify(evidence)}`)
    }),
  )
})
