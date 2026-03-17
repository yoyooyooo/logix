import { describe, it, expect } from '@effect/vitest'
import { Effect } from 'effect'
import { performance } from 'node:perf_hooks'

type FieldPath = ReadonlyArray<string>

type PerfSummary = {
  readonly n: number
  readonly p50Ms: number
  readonly p95Ms: number
  readonly meanMs: number
}

type Entry = {
  readonly selectorId: string
  readonly readsByRootKey: ReadonlyMap<string, ReadonlyArray<FieldPath>>
  readonly readRootKeys: ReadonlyArray<string>
  subscriberCount: number
  lastScheduledTxnSeq: number
}

type IndexedRootCandidate = {
  readonly selectorId: string
  readonly entry: Entry
  readonly readsForRoot: ReadonlyArray<FieldPath>
}

type Dataset = {
  readonly entries: ReadonlyArray<Entry>
  readonly selectorIdsByRoot: ReadonlyMap<string, ReadonlySet<string>>
  readonly candidateIndexByReadRoot: ReadonlyMap<string, ReadonlyArray<IndexedRootCandidate>>
  readonly dirtyPathsPerTxn: ReadonlyArray<ReadonlyArray<FieldPath>>
}

type DirtyRootScratchBucket = {
  generation: number
  readonly paths: Array<FieldPath>
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
  for (let index = 0; index < a.length; index += 1) {
    if (a[index] !== b[index]) return false
  }
  return true
}

const overlaps = (a: FieldPath, b: FieldPath): boolean => isPrefixOf(a, b) || isPrefixOf(b, a)

const isRedundantDirtyRoot = (existingDirtyRoots: ReadonlyArray<FieldPath>, dirtyRoot: FieldPath): boolean => {
  for (let index = 0; index < existingDirtyRoots.length; index += 1) {
    if (isPrefixOf(existingDirtyRoots[index]!, dirtyRoot)) {
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
  for (let index = 0; index < existingDirtyRoots.length; index += 1) {
    const existing = existingDirtyRoots[index]!
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

const makeDataset = (args: {
  readonly selectors: number
  readonly rootCount: number
  readonly dirtyRootsPerTxn: number
  readonly txns: number
  readonly seed: number
}): Dataset => {
  const rng = makeRng(args.seed)
  const entries: Array<Entry> = []
  const selectorIdsByRoot = new Map<string, Set<string>>()
  const candidateIndexByReadRoot = new Map<string, Array<IndexedRootCandidate>>()

  for (let index = 0; index < args.selectors; index += 1) {
    const selectorId = `s${index}`
    const rootA = `root${index % args.rootCount}`
    const rootB = `root${(index * 7 + 3) % args.rootCount}`
    const roots = rootA === rootB ? [rootA] : [rootA, rootB]
    const readsByRootKey = new Map<string, ReadonlyArray<FieldPath>>()

    for (let rootIndex = 0; rootIndex < roots.length; rootIndex += 1) {
      const rootKey = roots[rootIndex]!
      const readsForRoot: Array<FieldPath> = [
        [rootKey, `leaf${index % 4}`],
        [rootKey, `branch${Math.floor(index / 3) % 6}`, `field${index % 3}`],
      ]
      if (index % 5 === 0) {
        readsForRoot.push([rootKey])
      }
      readsByRootKey.set(rootKey, readsForRoot)
    }

    const entry: Entry = {
      selectorId,
      readsByRootKey,
      readRootKeys: Array.from(readsByRootKey.keys()),
      subscriberCount: 1,
      lastScheduledTxnSeq: -1,
    }
    entries.push(entry)

    for (let rootIndex = 0; rootIndex < entry.readRootKeys.length; rootIndex += 1) {
      const rootKey = entry.readRootKeys[rootIndex]!
      const readsForRoot = entry.readsByRootKey.get(rootKey)!
      const selectorIds = selectorIdsByRoot.get(rootKey)
      if (selectorIds) {
        selectorIds.add(selectorId)
      } else {
        selectorIdsByRoot.set(rootKey, new Set([selectorId]))
      }

      const candidate: IndexedRootCandidate = {
        selectorId,
        entry,
        readsForRoot,
      }
      const indexed = candidateIndexByReadRoot.get(rootKey)
      if (indexed) {
        indexed.push(candidate)
      } else {
        candidateIndexByReadRoot.set(rootKey, [candidate])
      }
    }
  }

  const dirtyPathsPerTxn: Array<ReadonlyArray<FieldPath>> = []
  for (let txn = 0; txn < args.txns; txn += 1) {
    const dirtyPaths: Array<FieldPath> = []
    for (let rootIndex = 0; rootIndex < args.dirtyRootsPerTxn; rootIndex += 1) {
      const rootKey = `root${Math.floor(rng() * args.rootCount)}`
      if (rng() < 0.35) {
        dirtyPaths.push([rootKey])
      } else {
        dirtyPaths.push([rootKey, `branch${Math.floor(rng() * 6)}`, `field${Math.floor(rng() * 3)}`])
      }
      if (rng() < 0.25) {
        dirtyPaths.push([rootKey, `leaf${Math.floor(rng() * 4)}`])
      }
    }
    dirtyPathsPerTxn.push(dirtyPaths)
  }

  return {
    entries,
    selectorIdsByRoot,
    candidateIndexByReadRoot,
    dirtyPathsPerTxn,
  }
}

const runLegacyScheduling = (args: {
  readonly dataset: Dataset
  readonly txns: ReadonlyArray<ReadonlyArray<FieldPath>>
}): number => {
  const selectorsById = new Map(args.dataset.entries.map((entry) => [entry.selectorId, entry] as const))
  let scheduled = 0

  for (let txnSeq = 1; txnSeq <= args.txns.length; txnSeq += 1) {
    const dirtyPaths = args.txns[txnSeq - 1]!
    const indexedCandidatesByRoot = new Map<string, ReadonlyArray<IndexedRootCandidate>>()
    const getIndexedCandidatesForRoot = (rootKey: string): ReadonlyArray<IndexedRootCandidate> => {
      const cached = indexedCandidatesByRoot.get(rootKey)
      if (cached) return cached

      const selectorIds = args.dataset.selectorIdsByRoot.get(rootKey)
      if (!selectorIds || selectorIds.size === 0) {
        indexedCandidatesByRoot.set(rootKey, [])
        return []
      }

      const indexed: Array<IndexedRootCandidate> = []
      for (const selectorId of selectorIds) {
        const entry = selectorsById.get(selectorId)
        if (!entry) continue
        const readsForRoot = entry.readsByRootKey.get(rootKey)
        if (!readsForRoot || readsForRoot.length === 0) continue
        indexed.push({
          selectorId,
          entry,
          readsForRoot,
        })
      }

      indexedCandidatesByRoot.set(rootKey, indexed)
      return indexed
    }

    const dirtyRootsToProcessByRoot = new Map<string, Array<FieldPath>>()
    for (let index = 0; index < dirtyPaths.length; index += 1) {
      const dirtyPath = dirtyPaths[index]!
      const rootKey = dirtyPath[0]!
      const existing = dirtyRootsToProcessByRoot.get(rootKey)
      if (existing) {
        upsertDirtyRoot(existing, dirtyPath)
      } else {
        dirtyRootsToProcessByRoot.set(rootKey, [dirtyPath])
      }
    }

    for (const [rootKey, dirtyRootsForRoot] of dirtyRootsToProcessByRoot) {
      const candidates = getIndexedCandidatesForRoot(rootKey)
      if (candidates.length === 0) continue

      const hasRootLevelDirty = dirtyRootsForRoot.some((path) => path.length <= 1)
      for (let candidateIndex = 0; candidateIndex < candidates.length; candidateIndex += 1) {
        const candidate = candidates[candidateIndex]!
        if (candidate.entry.subscriberCount === 0 || candidate.entry.lastScheduledTxnSeq === txnSeq) continue

        if (hasRootLevelDirty) {
          candidate.entry.lastScheduledTxnSeq = txnSeq
          scheduled += 1
          continue
        }

        let overlapsAnyDirtyRoot = false
        for (let dirtyIndex = 0; dirtyIndex < dirtyRootsForRoot.length; dirtyIndex += 1) {
          const dirtyRootPath = dirtyRootsForRoot[dirtyIndex]!
          for (let readIndex = 0; readIndex < candidate.readsForRoot.length; readIndex += 1) {
            if (overlaps(dirtyRootPath, candidate.readsForRoot[readIndex]!)) {
              overlapsAnyDirtyRoot = true
              break
            }
          }
          if (overlapsAnyDirtyRoot) break
        }

        if (!overlapsAnyDirtyRoot) continue
        candidate.entry.lastScheduledTxnSeq = txnSeq
        scheduled += 1
      }
    }
  }

  return scheduled
}

const runOptimizedScheduling = (args: {
  readonly dataset: Dataset
  readonly txns: ReadonlyArray<ReadonlyArray<FieldPath>>
}): number => {
  const dirtyRootScratchBuckets = new Map<string, DirtyRootScratchBucket>()
  const dirtyRootScratchActiveRootKeys: Array<string> = []
  let dirtyRootScratchGeneration = 0
  let scheduled = 0

  for (let txnSeq = 1; txnSeq <= args.txns.length; txnSeq += 1) {
    const dirtyPaths = args.txns[txnSeq - 1]!
    dirtyRootScratchGeneration += 1
    dirtyRootScratchActiveRootKeys.length = 0

    for (let index = 0; index < dirtyPaths.length; index += 1) {
      const dirtyPath = dirtyPaths[index]!
      const rootKey = dirtyPath[0]!
      const existing = dirtyRootScratchBuckets.get(rootKey)
      let scratchPaths: Array<FieldPath>
      if (existing) {
        if (existing.generation !== dirtyRootScratchGeneration) {
          existing.generation = dirtyRootScratchGeneration
          existing.paths.length = 0
          dirtyRootScratchActiveRootKeys.push(rootKey)
        }
        scratchPaths = existing.paths
      } else {
        const created: DirtyRootScratchBucket = {
          generation: dirtyRootScratchGeneration,
          paths: [],
        }
        dirtyRootScratchBuckets.set(rootKey, created)
        dirtyRootScratchActiveRootKeys.push(rootKey)
        scratchPaths = created.paths
      }
      upsertDirtyRoot(scratchPaths, dirtyPath)
    }

    for (let rootIndex = 0; rootIndex < dirtyRootScratchActiveRootKeys.length; rootIndex += 1) {
      const rootKey = dirtyRootScratchActiveRootKeys[rootIndex]!
      const dirtyRootsForRoot = dirtyRootScratchBuckets.get(rootKey)?.paths
      if (!dirtyRootsForRoot || dirtyRootsForRoot.length === 0) continue

      const candidates = args.dataset.candidateIndexByReadRoot.get(rootKey)
      if (!candidates || candidates.length === 0) continue

      const hasRootLevelDirty = dirtyRootsForRoot.some((path) => path.length <= 1)
      for (let candidateIndex = 0; candidateIndex < candidates.length; candidateIndex += 1) {
        const candidate = candidates[candidateIndex]!
        if (candidate.entry.subscriberCount === 0 || candidate.entry.lastScheduledTxnSeq === txnSeq) continue

        if (hasRootLevelDirty) {
          candidate.entry.lastScheduledTxnSeq = txnSeq
          scheduled += 1
          continue
        }

        let overlapsAnyDirtyRoot = false
        for (let dirtyIndex = 0; dirtyIndex < dirtyRootsForRoot.length; dirtyIndex += 1) {
          const dirtyRootPath = dirtyRootsForRoot[dirtyIndex]!
          for (let readIndex = 0; readIndex < candidate.readsForRoot.length; readIndex += 1) {
            if (overlaps(dirtyRootPath, candidate.readsForRoot[readIndex]!)) {
              overlapsAnyDirtyRoot = true
              break
            }
          }
          if (overlapsAnyDirtyRoot) break
        }

        if (!overlapsAnyDirtyRoot) continue
        candidate.entry.lastScheduledTxnSeq = txnSeq
        scheduled += 1
      }
    }
  }

  return scheduled
}

const benchmarkCase = (args: {
  readonly iterations: number
  readonly warmup: number
  readonly run: () => number
}): { readonly summary: PerfSummary; readonly scheduled: number } => {
  const warmup = Math.max(0, args.warmup)
  const iterations = Math.max(1, args.iterations)

  for (let iteration = 0; iteration < warmup; iteration += 1) {
    args.run()
  }

  const samples: number[] = []
  let scheduled = -1

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const t0 = performance.now()
    const nextScheduled = args.run()
    const dt = performance.now() - t0
    samples.push(dt)
    if (scheduled === -1) {
      scheduled = nextScheduled
    } else {
      expect(nextScheduled).toBe(scheduled)
    }
  }

  return {
    summary: summarize(samples),
    scheduled,
  }
}

describe('SelectorGraph invalidation scratch reuse perf evidence (Diagnostics=off)', () => {
  it.effect('should reduce scheduling-path overhead versus legacy commit-local rebuild', () =>
    Effect.sync(() => {
      const selectors = Number(process.env.LOGIX_PERF_SELECTORS ?? 1024)
      const rootCount = Number(process.env.LOGIX_PERF_ROOTS ?? 32)
      const dirtyRootsPerTxn = Number(process.env.LOGIX_PERF_DIRTY_ROOTS ?? 8)
      const txns = Number(process.env.LOGIX_PERF_TXNS ?? 256)
      const iterations = Number(process.env.LOGIX_PERF_ITERS ?? 40)
      const warmup = Number(process.env.LOGIX_PERF_WARMUP ?? 5)
      const seed = Number(process.env.LOGIX_PERF_SEED ?? 20260315)

      const dataset = makeDataset({
        selectors: Math.max(1, selectors),
        rootCount: Math.max(1, rootCount),
        dirtyRootsPerTxn: Math.max(1, dirtyRootsPerTxn),
        txns: Math.max(1, txns),
        seed,
      })

      const legacy = benchmarkCase({
        iterations,
        warmup,
        run: () => runLegacyScheduling({ dataset, txns: dataset.dirtyPathsPerTxn }),
      })
      const optimized = benchmarkCase({
        iterations,
        warmup,
        run: () => runOptimizedScheduling({ dataset, txns: dataset.dirtyPathsPerTxn }),
      })

      expect(legacy.scheduled).toBe(optimized.scheduled)

      const p95Ratio =
        legacy.summary.p95Ms > 0 && Number.isFinite(legacy.summary.p95Ms)
          ? optimized.summary.p95Ms / legacy.summary.p95Ms
          : Number.NaN

      const evidence = {
        scenario: 'selectorGraph.invalidationScratchReuse.off',
        dataset: {
          selectors: Math.max(1, selectors),
          rootCount: Math.max(1, rootCount),
          dirtyRootsPerTxn: Math.max(1, dirtyRootsPerTxn),
          txns: Math.max(1, txns),
          seed: seed >>> 0,
        },
        run: {
          iterations: Math.max(1, iterations),
          warmup: Math.max(0, warmup),
        },
        behavior: {
          scheduledLegacy: legacy.scheduled,
          scheduledOptimized: optimized.scheduled,
        },
        metrics: {
          legacy: legacy.summary,
          optimized: optimized.summary,
          ratio: {
            p95OptimizedOverLegacy: p95Ratio,
          },
        },
      } as const

      console.log(
        `[perf] SelectorGraph.InvalidationScratchReuse.off selectors=${selectors} roots=${rootCount} dirtyRootsPerTxn=${dirtyRootsPerTxn} txns=${txns} iters=${Math.max(
          1,
          iterations,
        )} legacy.p50=${legacy.summary.p50Ms.toFixed(3)}ms legacy.p95=${legacy.summary.p95Ms.toFixed(
          3,
        )}ms optimized.p50=${optimized.summary.p50Ms.toFixed(3)}ms optimized.p95=${optimized.summary.p95Ms.toFixed(
          3,
        )}ms p95.ratio=${Number.isFinite(p95Ratio) ? p95Ratio.toFixed(3) : 'NaN'}`,
      )
      console.log(`[perf:evidence] ${JSON.stringify(evidence)}`)
    }),
  )
})
