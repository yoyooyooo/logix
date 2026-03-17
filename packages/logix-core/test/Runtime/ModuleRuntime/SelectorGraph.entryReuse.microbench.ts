import { Effect, PubSub } from 'effect'
import * as Logix from '@logixjs/core'
import { normalizeFieldPath, type FieldPath } from '../../../src/internal/field-path.js'
import * as SelectorGraph from '../../../src/internal/runtime/core/SelectorGraph.js'

type BenchSample = {
  readonly totalMs: number
}

type BenchSummary = {
  readonly rounds: ReadonlyArray<BenchSample>
  readonly meanMs: number
  readonly minMs: number
  readonly maxMs: number
}

type BaselineEntry = {
  readonly selectorId: string
  readonly reads: ReadonlyArray<FieldPath>
  readonly hub: PubSub.PubSub<any>
  subscriberCount: number
}

const selector = Object.assign((s: { readonly count: number }) => s.count, {
  fieldPaths: ['count'],
})

const readQuery = Logix.ReadQuery.compile(selector as any)

const CYCLES = 20_000
const ROUNDS = 5

const summarize = (rounds: ReadonlyArray<BenchSample>): BenchSummary => {
  let totalMs = 0
  let minMs = Number.POSITIVE_INFINITY
  let maxMs = 0

  for (const round of rounds) {
    totalMs += round.totalMs
    if (round.totalMs < minMs) minMs = round.totalMs
    if (round.totalMs > maxMs) maxMs = round.totalMs
  }

  return {
    rounds,
    meanMs: totalMs / rounds.length,
    minMs,
    maxMs,
  }
}

const makeBaselineGraph = () => {
  const activeEntriesById = new Map<string, BaselineEntry>()

  return {
    ensureEntry: () =>
      Effect.gen(function* () {
        const existing = activeEntriesById.get(readQuery.selectorId)
        if (existing) {
          return existing
        }

        const hub = yield* PubSub.unbounded<any>()
        const reads: Array<FieldPath> = []
        for (const rawRead of readQuery.reads) {
          if (typeof rawRead !== 'string') continue
          const read = normalizeFieldPath(rawRead)
          if (read == null) continue
          reads.push(read)
        }

        const entry: BaselineEntry = {
          selectorId: readQuery.selectorId,
          reads,
          hub,
          subscriberCount: 0,
        }

        activeEntriesById.set(readQuery.selectorId, entry)
        return entry
      }),
    releaseEntry: () => {
      const entry = activeEntriesById.get(readQuery.selectorId)
      if (!entry) return
      entry.subscriberCount = Math.max(0, entry.subscriberCount - 1)
      if (entry.subscriberCount > 0) return
      activeEntriesById.delete(readQuery.selectorId)
    },
  }
}

const runScenario = (label: 'current' | 'baseline'): BenchSample => {
  const startedAt = performance.now()

  if (label === 'current') {
    const graph = SelectorGraph.make<{ readonly count: number }>({
      moduleId: 'BenchModule',
      instanceId: 'bench-instance',
    })

    for (let i = 0; i < CYCLES; i += 1) {
      const entry = Effect.runSync(graph.ensureEntry(readQuery as any))
      entry.subscriberCount += 1
      graph.releaseEntry(readQuery.selectorId)
    }
  } else {
    const graph = makeBaselineGraph()

    for (let i = 0; i < CYCLES; i += 1) {
      const entry = Effect.runSync(graph.ensureEntry())
      entry.subscriberCount += 1
      graph.releaseEntry()
    }
  }

  return {
    totalMs: performance.now() - startedAt,
  }
}

const main = () => {
  const currentRounds: BenchSample[] = []
  const baselineRounds: BenchSample[] = []

  for (let round = 0; round < ROUNDS; round += 1) {
    currentRounds.push(runScenario('current'))
    baselineRounds.push(runScenario('baseline'))
  }

  console.log(
    JSON.stringify(
      {
        config: {
          cycles: CYCLES,
          rounds: ROUNDS,
        },
        current: summarize(currentRounds),
        baseline: summarize(baselineRounds),
      },
      null,
      2,
    ),
  )
}

main()
