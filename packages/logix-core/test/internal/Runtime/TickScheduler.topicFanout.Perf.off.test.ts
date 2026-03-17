import { describe, expect, it } from 'vitest'
import {
  makeModuleInstanceKey,
  makeReadQueryTopicKey,
  makeRuntimeStore,
  type ModuleInstanceKey,
  type RuntimeStore,
  type RuntimeStoreModuleCommit,
  type RuntimeStorePendingDrain,
} from '../../../src/internal/runtime/core/RuntimeStore.js'

type PerfSummary = {
  readonly meanMs: number
  readonly p50Ms: number
  readonly p95Ms: number
}

const quantile = (values: ReadonlyArray<number>, q: number): number => {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil(values.length * q) - 1))
  return sorted[idx] ?? 0
}

const summarize = (values: ReadonlyArray<number>): PerfSummary => {
  const meanMs = values.reduce((sum, value) => sum + value, 0) / values.length
  return {
    meanMs,
    p50Ms: quantile(values, 0.5),
    p95Ms: quantile(values, 0.95),
  }
}

const measureMs = (run: () => void): number => {
  const startedAt = performance.now()
  run()
  return performance.now() - startedAt
}

const makeModuleCommit = (moduleInstanceKey: ModuleInstanceKey, tickSeq: number): RuntimeStoreModuleCommit => ({
  moduleId: 'PerfTopicFanout',
  instanceId: 'i-1',
  moduleInstanceKey,
  state: { value: tickSeq },
  meta: {
    txnSeq: tickSeq,
    txnId: `i-1::t${tickSeq}`,
    commitMode: 'normal',
    priority: 'normal',
    originKind: 'dispatch',
    originName: 'update',
  },
  opSeq: tickSeq,
})

const makeStoreCase = (topicKey: string, listenerCount: number) => {
  const store = makeRuntimeStore()
  const moduleInstanceKey = makeModuleInstanceKey('PerfTopicFanout', 'i-1')
  store.registerModuleInstance({
    moduleId: 'PerfTopicFanout',
    instanceId: 'i-1',
    moduleInstanceKey,
    initialState: { value: 0 },
  })

  let notifyCount = 0
  for (let index = 0; index < listenerCount; index += 1) {
    store.subscribeTopic(topicKey, () => {
      notifyCount += 1
    })
  }

  const accepted = (tickSeq: number): RuntimeStorePendingDrain => ({
    modules: new Map([[moduleInstanceKey, makeModuleCommit(moduleInstanceKey, tickSeq)]]),
    dirtyTopics: new Map([[topicKey, 'normal' as const]]),
  })

  return {
    store,
    accepted,
    readNotifyCount: () => notifyCount,
  }
}

const runLegacyInline = (
  store: RuntimeStore,
  accepted: RuntimeStorePendingDrain,
  tickSeq: number,
): { readonly commitMs: number; readonly fanoutMs: number; readonly notified: number } => {
  let notified = 0
  let fanoutMs = 0
  const commitMs = measureMs(() => {
    store.commitTick({
      tickSeq,
      accepted,
      onListener: (listener) => {
        const startedAt = performance.now()
        listener()
        fanoutMs += performance.now() - startedAt
        notified += 1
      },
    })
  })
  return { commitMs, fanoutMs, notified }
}

const runPostCommit = (
  store: RuntimeStore,
  accepted: RuntimeStorePendingDrain,
  tickSeq: number,
): { readonly commitMs: number; readonly fanoutMs: number; readonly notified: number } => {
  let committed!: ReturnType<RuntimeStore['commitTick']>
  const commitMs = measureMs(() => {
    committed = store.commitTick({
      tickSeq,
      accepted,
    })
  })

  let notified = 0
  const dispatchMs = measureMs(() => {
    for (const listener of committed.changedTopicListeners) {
      listener()
      notified += 1
    }
  })

  return { commitMs, fanoutMs: dispatchMs, notified }
}

const collectCase = (topicKind: 'module' | 'readQuery', listenerCount: number) => {
  const moduleInstanceKey = makeModuleInstanceKey('PerfTopicFanout', 'i-1')
  const topicKey =
    topicKind === 'module' ? moduleInstanceKey : makeReadQueryTopicKey(moduleInstanceKey, 'view')

  const iterations = 80
  const warmup = 10

  const legacyCommitSamples: number[] = []
  const postCommitSamples: number[] = []
  const legacyFanoutSamples: number[] = []
  const postFanoutSamples: number[] = []

  for (let index = 0; index < warmup; index += 1) {
    const legacyCase = makeStoreCase(topicKey, listenerCount)
    runLegacyInline(legacyCase.store, legacyCase.accepted(index + 1), index + 1)

    const currentCase = makeStoreCase(topicKey, listenerCount)
    runPostCommit(currentCase.store, currentCase.accepted(index + 1), index + 1)
  }

  for (let index = 0; index < iterations; index += 1) {
    const tickSeq = index + 1

    const legacyCase = makeStoreCase(topicKey, listenerCount)
    const legacy = runLegacyInline(legacyCase.store, legacyCase.accepted(tickSeq), tickSeq)
    legacyCommitSamples.push(Math.max(0, legacy.commitMs - legacy.fanoutMs))
    legacyFanoutSamples.push(legacy.fanoutMs)
    expect(legacy.notified).toBe(listenerCount)

    const currentCase = makeStoreCase(topicKey, listenerCount)
    const current = runPostCommit(currentCase.store, currentCase.accepted(tickSeq), tickSeq)
    postCommitSamples.push(current.commitMs)
    postFanoutSamples.push(current.fanoutMs)
    expect(current.notified).toBe(listenerCount)
  }

  return {
    legacyCommit: summarize(legacyCommitSamples),
    postCommit: summarize(postCommitSamples),
    legacyFanout: summarize(legacyFanoutSamples),
    postFanout: summarize(postFanoutSamples),
  }
}

describe('TickScheduler topic fanout perf', () => {
  it('measures module topic listener fanout outside commit critical section', () => {
    const listeners = [1, 64, 512, 2048] as const
    const rows = listeners.map((count) => ({
      listeners: count,
      ...collectCase('module', count),
    }))

    console.info(
      JSON.stringify(
        {
          suite: 'tickScheduler.topicFanout.module.off',
          rows,
        },
        null,
        2,
      ),
    )

    const heaviest = rows[rows.length - 1]!
    expect(heaviest.postCommit.meanMs).toBeLessThan(heaviest.legacyCommit.meanMs)
  })

  it('measures readQuery topic listener fanout outside commit critical section', () => {
    const listeners = [1, 64, 512, 2048] as const
    const rows = listeners.map((count) => ({
      listeners: count,
      ...collectCase('readQuery', count),
    }))

    console.info(
      JSON.stringify(
        {
          suite: 'tickScheduler.topicFanout.readQuery.off',
          rows,
        },
        null,
        2,
      ),
    )

    const heaviest = rows[rows.length - 1]!
    expect(heaviest.postCommit.meanMs).toBeLessThan(heaviest.legacyCommit.meanMs)
  })
})
