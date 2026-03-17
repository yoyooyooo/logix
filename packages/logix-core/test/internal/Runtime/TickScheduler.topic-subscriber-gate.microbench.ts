import { Effect } from 'effect'
import { getGlobalHostScheduler } from '../../../src/internal/runtime/core/HostScheduler.js'
import { makeJobQueue } from '../../../src/internal/runtime/core/JobQueue.js'
import { makeModuleInstanceKey, makeReadQueryTopicKey, makeRuntimeStore } from '../../../src/internal/runtime/core/RuntimeStore.js'
import { makeTickScheduler } from '../../../src/internal/runtime/core/TickScheduler.js'

type CommitMeta = {
  readonly txnSeq: number
  readonly txnId: string
  readonly commitMode: 'normal'
  readonly priority: 'normal'
  readonly originKind: 'dispatch'
  readonly originName: 'bench'
}

type Sample = {
  readonly totalMs: number
  readonly moduleVersion: number
  readonly selectorVersion?: number
}

type SampleGroup = {
  readonly rounds: ReadonlyArray<Sample>
  readonly meanMs: number
  readonly minMs: number
  readonly maxMs: number
}

const ITERATIONS = 4_000
const WARMUP_ITERATIONS = 400
const ROUNDS = 6

const makeMeta = (n: number): CommitMeta => ({
  txnSeq: n,
  txnId: `i-1::t${n}`,
  commitMode: 'normal',
  priority: 'normal',
  originKind: 'dispatch',
  originName: 'bench',
})

const summarize = (rounds: ReadonlyArray<Sample>): SampleGroup => {
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

const runModuleScenario = async (mode: 'current' | 'baseline'): Promise<Sample> => {
  const store = makeRuntimeStore()
  const queue = makeJobQueue()
  const scheduler = makeTickScheduler({
    runtimeStore: store,
    queue,
    hostScheduler: getGlobalHostScheduler(),
    config: { maxSteps: 64, urgentStepCap: 64, maxDrainRounds: 4 },
  })

  const moduleKey = makeModuleInstanceKey('BenchTopic', 'i-1')
  store.registerModuleInstance({
    moduleId: 'BenchTopic',
    instanceId: 'i-1',
    moduleInstanceKey: moduleKey,
    initialState: { v: 0 },
  })

  for (let i = 1; i <= WARMUP_ITERATIONS; i += 1) {
    const commit = {
      moduleId: 'BenchTopic',
      instanceId: 'i-1',
      moduleInstanceKey: moduleKey,
      state: { v: i },
      meta: makeMeta(i),
      opSeq: i,
    }

    if (mode === 'current') {
      await Effect.runPromise(scheduler.onModuleCommit(commit))
    } else {
      queue.enqueueModuleCommit(commit)
      queue.markTopicDirty(moduleKey, 'normal')
    }
    await Effect.runPromise(scheduler.flushNow)
  }

  const startedAt = performance.now()
  for (let i = WARMUP_ITERATIONS + 1; i <= WARMUP_ITERATIONS + ITERATIONS; i += 1) {
    const commit = {
      moduleId: 'BenchTopic',
      instanceId: 'i-1',
      moduleInstanceKey: moduleKey,
      state: { v: i },
      meta: makeMeta(i),
      opSeq: i,
    }

    if (mode === 'current') {
      await Effect.runPromise(scheduler.onModuleCommit(commit))
    } else {
      queue.enqueueModuleCommit(commit)
      queue.markTopicDirty(moduleKey, 'normal')
    }
    await Effect.runPromise(scheduler.flushNow)
  }

  return {
    totalMs: performance.now() - startedAt,
    moduleVersion: store.getTopicVersion(moduleKey),
  }
}

const runSelectorScenario = async (mode: 'current' | 'baseline'): Promise<Sample> => {
  const store = makeRuntimeStore()
  const queue = makeJobQueue()
  const scheduler = makeTickScheduler({
    runtimeStore: store,
    queue,
    hostScheduler: getGlobalHostScheduler(),
    config: { maxSteps: 64, urgentStepCap: 64, maxDrainRounds: 4 },
  })

  const moduleKey = makeModuleInstanceKey('BenchSelector', 'i-1')
  const selectorTopic = makeReadQueryTopicKey(moduleKey, 'view')
  store.registerModuleInstance({
    moduleId: 'BenchSelector',
    instanceId: 'i-1',
    moduleInstanceKey: moduleKey,
    initialState: { v: 0 },
  })

  for (let i = 1; i <= WARMUP_ITERATIONS; i += 1) {
    const commit = {
      moduleId: 'BenchSelector',
      instanceId: 'i-1',
      moduleInstanceKey: moduleKey,
      state: { v: i },
      meta: makeMeta(i),
      opSeq: i,
    }

    await Effect.runPromise(scheduler.onModuleCommit(commit))
    if (mode === 'current') {
      scheduler.onSelectorChanged({
        moduleInstanceKey: moduleKey,
        selectorId: 'view',
        priority: 'normal',
      })
    } else {
      queue.markTopicDirty(selectorTopic, 'normal')
    }
    await Effect.runPromise(scheduler.flushNow)
  }

  const startedAt = performance.now()
  for (let i = WARMUP_ITERATIONS + 1; i <= WARMUP_ITERATIONS + ITERATIONS; i += 1) {
    const commit = {
      moduleId: 'BenchSelector',
      instanceId: 'i-1',
      moduleInstanceKey: moduleKey,
      state: { v: i },
      meta: makeMeta(i),
      opSeq: i,
    }

    await Effect.runPromise(scheduler.onModuleCommit(commit))
    if (mode === 'current') {
      scheduler.onSelectorChanged({
        moduleInstanceKey: moduleKey,
        selectorId: 'view',
        priority: 'normal',
      })
    } else {
      queue.markTopicDirty(selectorTopic, 'normal')
    }
    await Effect.runPromise(scheduler.flushNow)
  }

  return {
    totalMs: performance.now() - startedAt,
    moduleVersion: store.getTopicVersion(moduleKey),
    selectorVersion: store.getTopicVersion(selectorTopic),
  }
}

const runCommitTickModuleScenario = async (withDirtyTopic: boolean): Promise<Sample> => {
  const store = makeRuntimeStore()
  const moduleKey = makeModuleInstanceKey('CommitBenchModule', 'i-1')
  store.registerModuleInstance({
    moduleId: 'CommitBenchModule',
    instanceId: 'i-1',
    moduleInstanceKey: moduleKey,
    initialState: { v: 0 },
  })

  for (let i = 1; i <= WARMUP_ITERATIONS; i += 1) {
    store.commitTick({
      tickSeq: i,
      accepted: {
        modules: new Map([
          [
            moduleKey,
            {
              moduleId: 'CommitBenchModule',
              instanceId: 'i-1',
              moduleInstanceKey: moduleKey,
              state: { v: i },
              meta: makeMeta(i),
              opSeq: i,
            },
          ],
        ]),
        dirtyTopics: withDirtyTopic ? new Map([[moduleKey, 'normal' as const]]) : new Map(),
      },
    })
  }

  const startedAt = performance.now()
  for (let i = WARMUP_ITERATIONS + 1; i <= WARMUP_ITERATIONS + ITERATIONS; i += 1) {
    store.commitTick({
      tickSeq: i,
      accepted: {
        modules: new Map([
          [
            moduleKey,
            {
              moduleId: 'CommitBenchModule',
              instanceId: 'i-1',
              moduleInstanceKey: moduleKey,
              state: { v: i },
              meta: makeMeta(i),
              opSeq: i,
            },
          ],
        ]),
        dirtyTopics: withDirtyTopic ? new Map([[moduleKey, 'normal' as const]]) : new Map(),
      },
    })
  }

  return {
    totalMs: performance.now() - startedAt,
    moduleVersion: store.getTopicVersion(moduleKey),
  }
}

const runCommitTickSelectorScenario = async (withDirtyTopic: boolean): Promise<Sample> => {
  const store = makeRuntimeStore()
  const moduleKey = makeModuleInstanceKey('CommitBenchSelector', 'i-1')
  const selectorTopic = makeReadQueryTopicKey(moduleKey, 'view')
  store.registerModuleInstance({
    moduleId: 'CommitBenchSelector',
    instanceId: 'i-1',
    moduleInstanceKey: moduleKey,
    initialState: { v: 0 },
  })

  for (let i = 1; i <= WARMUP_ITERATIONS; i += 1) {
    store.commitTick({
      tickSeq: i,
      accepted: {
        modules: new Map(),
        dirtyTopics: withDirtyTopic ? new Map([[selectorTopic, 'normal' as const]]) : new Map(),
      },
    })
  }

  const startedAt = performance.now()
  for (let i = WARMUP_ITERATIONS + 1; i <= WARMUP_ITERATIONS + ITERATIONS; i += 1) {
    store.commitTick({
      tickSeq: i,
      accepted: {
        modules: new Map(),
        dirtyTopics: withDirtyTopic ? new Map([[selectorTopic, 'normal' as const]]) : new Map(),
      },
    })
  }

  return {
    totalMs: performance.now() - startedAt,
    moduleVersion: store.getTopicVersion(moduleKey),
    selectorVersion: store.getTopicVersion(selectorTopic),
  }
}

const runAll = async () => {
  const moduleCurrent: Array<Sample> = []
  const moduleBaseline: Array<Sample> = []
  const selectorCurrent: Array<Sample> = []
  const selectorBaseline: Array<Sample> = []
  const commitTickModuleCurrent: Array<Sample> = []
  const commitTickModuleBaseline: Array<Sample> = []
  const commitTickSelectorCurrent: Array<Sample> = []
  const commitTickSelectorBaseline: Array<Sample> = []

  for (let round = 0; round < ROUNDS; round += 1) {
    if (round % 2 === 0) {
      moduleCurrent.push(await runModuleScenario('current'))
      moduleBaseline.push(await runModuleScenario('baseline'))
      selectorCurrent.push(await runSelectorScenario('current'))
      selectorBaseline.push(await runSelectorScenario('baseline'))
      commitTickModuleCurrent.push(await runCommitTickModuleScenario(false))
      commitTickModuleBaseline.push(await runCommitTickModuleScenario(true))
      commitTickSelectorCurrent.push(await runCommitTickSelectorScenario(false))
      commitTickSelectorBaseline.push(await runCommitTickSelectorScenario(true))
      continue
    }

    commitTickModuleBaseline.push(await runCommitTickModuleScenario(true))
    commitTickModuleCurrent.push(await runCommitTickModuleScenario(false))
    commitTickSelectorBaseline.push(await runCommitTickSelectorScenario(true))
    commitTickSelectorCurrent.push(await runCommitTickSelectorScenario(false))
    moduleBaseline.push(await runModuleScenario('baseline'))
    moduleCurrent.push(await runModuleScenario('current'))
    selectorBaseline.push(await runSelectorScenario('baseline'))
    selectorCurrent.push(await runSelectorScenario('current'))
  }

  const result = {
    iterations: ITERATIONS,
    warmupIterations: WARMUP_ITERATIONS,
    rounds: ROUNDS,
    moduleCurrent: summarize(moduleCurrent),
    moduleBaseline: summarize(moduleBaseline),
    selectorCurrent: summarize(selectorCurrent),
    selectorBaseline: summarize(selectorBaseline),
    commitTickModuleCurrent: summarize(commitTickModuleCurrent),
    commitTickModuleBaseline: summarize(commitTickModuleBaseline),
    commitTickSelectorCurrent: summarize(commitTickSelectorCurrent),
    commitTickSelectorBaseline: summarize(commitTickSelectorBaseline),
  }

  console.log(JSON.stringify(result, null, 2))
}

void runAll()
