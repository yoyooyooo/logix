import { Effect, FiberRef } from 'effect'
import * as Debug from './DebugSink.js'
import * as DevtoolsHub from './DevtoolsHub.js'
import type { DeclarativeLinkRuntime } from './DeclarativeLinkRuntime.js'
import {
  makeReadQueryTopicKey,
  type ModuleInstanceKey,
  type RuntimeStore,
  type RuntimeStoreModuleCommit,
  type RuntimeStorePendingDrain,
} from './RuntimeStore.js'
import type { StateCommitPriority } from './module.js'

export type TickLane = 'urgent' | 'nonUrgent'

export type TickDegradeReason = 'budget_steps' | 'cycle_detected' | 'unknown'

export interface TickSchedulerConfig {
  /**
   * Fixpoint step cap:
   * - Steps count "work acceptance units" within a single tick, not time.
   * - Exceeding the budget triggers a soft degrade (stable=false), deferring nonUrgent backlog to the next tick.
   */
  readonly maxSteps?: number
  /**
   * Urgent safety cap:
   * - Even urgent work may be cut when the system appears to be in a cycle (avoid freezing).
   */
  readonly urgentStepCap?: number
  /**
   * Drain-round cap:
   * - Bounds the number of drain rounds while capturing concurrent commits before committing the tick snapshot.
   * - Exceeding the cap is treated as a cycle (stable=false, degradeReason=cycle_detected).
   */
  readonly maxDrainRounds?: number
}

export interface TickScheduler {
  readonly getTickSeq: () => number
  readonly onModuleCommit: (commit: RuntimeStoreModuleCommit) => Effect.Effect<void, never, never>
  readonly onSelectorChanged: (args: {
    readonly moduleInstanceKey: ModuleInstanceKey
    readonly selectorId: string
    readonly priority: StateCommitPriority
  }) => void
  readonly flushNow: Effect.Effect<void, never, never>
}

// ---- Runtime.batch (sync boundary) ----

type BatchWaiter = { readonly resolve: () => void }

let batchDepth = 0
const batchWaiters = new Set<BatchWaiter>()

export const enterRuntimeBatch = (): void => {
  batchDepth += 1
}

export const exitRuntimeBatch = (): void => {
  batchDepth = Math.max(0, batchDepth - 1)
  if (batchDepth !== 0) return
  const waiters = Array.from(batchWaiters)
  batchWaiters.clear()
  for (const w of waiters) {
    try {
      w.resolve()
    } catch {
      // best-effort
    }
  }
}

const waitForBatchEndIfNeeded = (): Effect.Effect<void, never, never> =>
  Effect.gen(function* () {
    if (batchDepth === 0) return

    let resolve!: () => void
    const promise = new Promise<void>((r) => {
      resolve = r
    })

    const waiter: BatchWaiter = { resolve }
    batchWaiters.add(waiter)

    yield* Effect.promise(() => promise).pipe(
      Effect.ensuring(
        Effect.sync(() => {
          batchWaiters.delete(waiter)
        }),
      ),
    )
  })

const microtask = Effect.promise(() => new Promise<void>((r) => queueMicrotask(r)))

// ---- TickScheduler implementation ----

type TriggerKind = 'externalStore' | 'dispatch' | 'timer' | 'unknown'

const toTriggerKind = (originKind: string | undefined): TriggerKind => {
  if (originKind === 'action') return 'dispatch'
  if (originKind === 'trait-external-store') return 'externalStore'
  if (originKind?.includes('timer')) return 'timer'
  return 'unknown'
}

const toLane = (priority: StateCommitPriority): TickLane => (priority === 'low' ? 'nonUrgent' : 'urgent')

const maxPriority = (a: StateCommitPriority, b: StateCommitPriority): StateCommitPriority =>
  a === 'normal' || b === 'normal' ? 'normal' : 'low'

const mergeDrain = (base: RuntimeStorePendingDrain, next: RuntimeStorePendingDrain): RuntimeStorePendingDrain => {
  const modules = new Map(base.modules)
  for (const [k, commit] of next.modules) {
    const prev = modules.get(k)
    if (!prev) {
      modules.set(k, commit)
    } else {
      modules.set(k, {
        ...commit,
        meta: {
          ...commit.meta,
          priority: maxPriority(prev.meta.priority, commit.meta.priority),
        },
      })
    }
  }

  const dirtyTopics = new Map(base.dirtyTopics)
  for (const [k, p] of next.dirtyTopics) {
    const prev = dirtyTopics.get(k)
    dirtyTopics.set(k, prev ? maxPriority(prev, p) : p)
  }

  return { modules, dirtyTopics }
}

const emptyDrain = (): RuntimeStorePendingDrain => ({ modules: new Map(), dirtyTopics: new Map() })

export const makeTickScheduler = (args: {
  readonly runtimeStore: RuntimeStore
  readonly config?: TickSchedulerConfig
  readonly declarativeLinkRuntime?: DeclarativeLinkRuntime
}): TickScheduler => {
  const store = args.runtimeStore
  const declarativeLinks = args.declarativeLinkRuntime

  const config: Required<TickSchedulerConfig> = {
    maxSteps: args.config?.maxSteps ?? 64,
    urgentStepCap: args.config?.urgentStepCap ?? 512,
    maxDrainRounds: args.config?.maxDrainRounds ?? 8,
  }

  let tickSeq = 0
  let scheduled = false

  const scheduleTick = (): Effect.Effect<void, never, never> =>
    Effect.gen(function* () {
      if (scheduled) return
      scheduled = true

      yield* Effect.fork(
        Effect.gen(function* () {
          try {
            yield* waitForBatchEndIfNeeded()
            yield* microtask
            yield* flushNow
          } finally {
            scheduled = false
            // If something was re-queued or arrived after commit, schedule the next tick (best-effort).
            if (store.hasPending()) {
              yield* scheduleTick()
            }
          }
        }),
      )
    })

  const flushNow: TickScheduler['flushNow'] = Effect.gen(function* () {
    if (!store.hasPending()) {
      return
    }

    tickSeq += 1
    const currentTickSeq = tickSeq

    const diagnosticsLevel = yield* FiberRef.get(Debug.currentDiagnosticsLevel)
    const shouldEmitTrace = DevtoolsHub.isDevtoolsEnabled() && diagnosticsLevel !== 'off'

    const captured: {
      drainRounds: number
      stable: boolean
      degradeReason?: TickDegradeReason
      deferred?: RuntimeStorePendingDrain
      accepted: RuntimeStorePendingDrain
    } = {
      drainRounds: 0,
      stable: true,
      accepted: emptyDrain(),
    }

    // Fixpoint capture: drain -> apply declarative links -> drain (bounded by maxDrainRounds).
    while (captured.drainRounds < config.maxDrainRounds) {
      const drained = store.drainPending()
      if (!drained) break
      captured.drainRounds += 1
      captured.accepted = mergeDrain(captured.accepted, drained)

      if (declarativeLinks && drained.modules.size > 0) {
        const changedModuleInstanceKeys = Array.from(drained.modules.keys())
        yield* declarativeLinks.applyForSources({
          tickSeq: currentTickSeq,
          acceptedModules: captured.accepted.modules,
          changedModuleInstanceKeys,
        })
      }
    }

    if (store.hasPending()) {
      captured.stable = false
      captured.degradeReason = 'cycle_detected'
    }

    // Budget enforcement (defer nonUrgent only; urgent may be cut only in cycle safety-break).
    const urgentModules: Array<RuntimeStoreModuleCommit> = []
    const nonUrgentModules: Array<RuntimeStoreModuleCommit> = []

    for (const commit of captured.accepted.modules.values()) {
      if (toLane(commit.meta.priority) === 'urgent') {
        urgentModules.push(commit)
      } else {
        nonUrgentModules.push(commit)
      }
    }

    const urgentCapExceeded = urgentModules.length > config.urgentStepCap
    const urgentAccepted = urgentCapExceeded ? urgentModules.slice(0, config.urgentStepCap) : urgentModules
    const urgentDeferred = urgentCapExceeded ? urgentModules.slice(config.urgentStepCap) : []

    const nonUrgentBudget = Math.max(0, config.maxSteps)
    const nonUrgentAccepted = urgentCapExceeded ? [] : nonUrgentModules.slice(0, nonUrgentBudget)
    const nonUrgentDeferred = urgentCapExceeded ? nonUrgentModules : nonUrgentModules.slice(nonUrgentBudget)

    if (urgentCapExceeded) {
      captured.stable = false
      captured.degradeReason = 'cycle_detected'
    } else if (nonUrgentDeferred.length > 0) {
      captured.stable = false
      captured.degradeReason = captured.degradeReason ?? 'budget_steps'
    }

    const acceptedModules = new Map<ModuleInstanceKey, RuntimeStoreModuleCommit>()
    const deferredModules = new Map<ModuleInstanceKey, RuntimeStoreModuleCommit>()

    for (const c of urgentAccepted) acceptedModules.set(c.moduleInstanceKey, c)
    for (const c of nonUrgentAccepted) acceptedModules.set(c.moduleInstanceKey, c)

    for (const c of urgentDeferred) deferredModules.set(c.moduleInstanceKey, c)
    for (const c of nonUrgentDeferred) deferredModules.set(c.moduleInstanceKey, c)

    const acceptedTopics = new Map<string, StateCommitPriority>()
    const deferredTopics = new Map<string, StateCommitPriority>()

    for (const [topicKey, priority] of captured.accepted.dirtyTopics) {
      const info = storeTopicToModuleInstanceKey(topicKey)
      if (!info) continue
      if (acceptedModules.has(info)) {
        acceptedTopics.set(topicKey, priority)
      } else if (deferredModules.has(info)) {
        deferredTopics.set(topicKey, priority)
      } else {
        // Conservative default: treat unknown topics as accepted.
        acceptedTopics.set(topicKey, priority)
      }
    }

    const acceptedDrain: RuntimeStorePendingDrain = {
      modules: acceptedModules,
      dirtyTopics: acceptedTopics,
    }

    const deferredDrain: RuntimeStorePendingDrain | undefined =
      deferredModules.size > 0 || deferredTopics.size > 0
        ? {
            modules: deferredModules,
            dirtyTopics: deferredTopics,
          }
        : undefined

    captured.deferred = deferredDrain

    let startedAtMs: number | undefined
    let triggerSummary: any | undefined
    let anchor: any | undefined
    let backlog: any | undefined
    let result: any | undefined

    if (shouldEmitTrace) {
      startedAtMs = Date.now()

      triggerSummary = (() => {
        const triggers = Array.from(captured.accepted.modules.values())
        const counts = new Map<TriggerKind, number>()
        let primary: any = undefined
        for (const t of triggers) {
          const kind = toTriggerKind(t.meta.originKind)
          counts.set(kind, (counts.get(kind) ?? 0) + 1)
          if (!primary) {
            primary = {
              kind,
              moduleId: t.moduleId,
              instanceId: t.instanceId,
              fieldPath: kind === 'externalStore' ? t.meta.originName : undefined,
              actionTag: kind === 'dispatch' ? t.meta.originName : undefined,
            }
          }
        }
        return {
          total: triggers.length,
          kinds: Array.from(counts.entries()).map(([kind, count]) => ({ kind, count })),
          primary,
        }
      })()

      anchor = (() => {
        const first = captured.accepted.modules.values().next().value as RuntimeStoreModuleCommit | undefined
        if (!first) return undefined
        return {
          moduleId: first.moduleId,
          instanceId: first.instanceId,
          txnSeq: first.meta.txnSeq,
          txnId: first.meta.txnId,
          ...(typeof first.opSeq === 'number' ? { opSeq: first.opSeq } : null),
        }
      })()

      backlog = (() => {
        const deferredWork = captured.deferred
        if (!deferredWork) return undefined
        const pendingDeferredWork = deferredWork.modules.size + deferredWork.dirtyTopics.size

        const deferredModulesList = Array.from(deferredWork.modules.values())
        const pendingExternalInputs = deferredModulesList.filter((m) => toTriggerKind(m.meta.originKind) === 'externalStore').length

        const primaryDeferred =
          deferredModulesList.find((m) => toTriggerKind(m.meta.originKind) === 'externalStore') ?? deferredModulesList[0]
        const kind = primaryDeferred ? toTriggerKind(primaryDeferred.meta.originKind) : 'unknown'

        const deferredPrimary =
          primaryDeferred != null
            ? {
                kind: kind === 'externalStore' ? ('externalStore' as const) : ('unknown' as const),
                moduleId: primaryDeferred.moduleId,
                instanceId: primaryDeferred.instanceId,
                fieldPath: kind === 'externalStore' ? primaryDeferred.meta.originName : undefined,
                storeId: undefined,
              }
            : undefined

        return {
          pendingExternalInputs,
          pendingDeferredWork,
          deferredPrimary,
        }
      })()

      result = {
        stable: captured.stable,
        ...(captured.stable ? null : { degradeReason: captured.degradeReason ?? 'unknown' }),
      } as const
    }

    if (shouldEmitTrace) {
      yield* Debug.record({
        type: 'trace:tick',
        moduleId: anchor?.moduleId,
        instanceId: anchor?.instanceId,
        data: {
          tickSeq: currentTickSeq,
          phase: 'start',
          timestampMs: startedAtMs!,
          triggerSummary,
          anchors: anchor,
          budget: {
            maxSteps: config.maxSteps,
            elapsedMs: 0,
            steps: 0,
            txnCount: acceptedModules.size,
          },
        },
      })
    }

    if (!captured.stable && shouldEmitTrace) {
      yield* Debug.record({
        type: 'trace:tick',
        moduleId: anchor?.moduleId,
        instanceId: anchor?.instanceId,
        data: {
          tickSeq: currentTickSeq,
          phase: 'budgetExceeded',
          timestampMs: Date.now(),
          triggerSummary,
          anchors: anchor,
          budget: {
            maxSteps: config.maxSteps,
            elapsedMs: Math.max(0, Date.now() - startedAtMs!),
            steps: config.maxSteps,
            txnCount: acceptedModules.size,
          },
          backlog,
          result,
        },
      })
    }

    // Requeue deferred backlog before committing the tick, so the next tick can pick it up.
    if (deferredDrain) {
      store.requeuePending(deferredDrain)
    }

    const committed = store.commitTick({
      tickSeq: currentTickSeq,
      accepted: acceptedDrain,
    })

    // Notify changed topics after committing the snapshot token.
    for (const { listeners } of committed.changedTopics.values()) {
      for (const listener of listeners) {
        try {
          listener()
        } catch {
          // best-effort: never let a subscriber break the tick
        }
      }
    }

    if (!captured.stable && shouldEmitTrace && backlog?.deferredPrimary) {
      const primary = backlog.deferredPrimary
      if (primary.kind === 'externalStore') {
        const moduleInstanceKey =
          primary.moduleId && primary.instanceId ? (`${primary.moduleId}::${primary.instanceId}` as ModuleInstanceKey) : undefined
        if (moduleInstanceKey && store.getModuleSubscriberCount(moduleInstanceKey) > 0) {
          yield* Debug.record({
            type: 'warn:priority-inversion',
            moduleId: primary.moduleId,
            instanceId: primary.instanceId,
            tickSeq: currentTickSeq,
            reason: 'deferredBacklog',
          })
        }
      }
    }

    if (shouldEmitTrace) {
      yield* Debug.record({
        type: 'trace:tick',
        moduleId: anchor?.moduleId,
        instanceId: anchor?.instanceId,
        data: {
          tickSeq: currentTickSeq,
          phase: 'settled',
          timestampMs: Date.now(),
          triggerSummary,
          anchors: anchor,
          budget: {
            maxSteps: config.maxSteps,
            elapsedMs: Math.max(0, Date.now() - startedAtMs!),
            steps: acceptedModules.size,
            txnCount: acceptedModules.size,
          },
          backlog,
          result,
        },
      })
    }
  })

  const storeTopicToModuleInstanceKey = (topicKey: string): ModuleInstanceKey | undefined => {
    const idx = topicKey.indexOf('::rq:')
    if (idx > 0) {
      return topicKey.slice(0, idx) as ModuleInstanceKey
    }
    if (topicKey.includes('::')) {
      return topicKey as ModuleInstanceKey
    }
    return undefined
  }

  const onSelectorChanged: TickScheduler['onSelectorChanged'] = ({ moduleInstanceKey, selectorId, priority }) => {
    store.markTopicDirty(makeReadQueryTopicKey(moduleInstanceKey, selectorId), priority)
  }

  const onModuleCommit: TickScheduler['onModuleCommit'] = (commit) =>
    Effect.gen(function* () {
      store.enqueueModuleCommit(commit)
      store.markTopicDirty(commit.moduleInstanceKey, commit.meta.priority)
      yield* scheduleTick()
    })

  return {
    getTickSeq: () => tickSeq,
    onModuleCommit,
    onSelectorChanged,
    flushNow,
  }
}
