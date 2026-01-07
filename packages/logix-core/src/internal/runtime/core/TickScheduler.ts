import { Effect, FiberRef } from 'effect'
import * as Debug from './DebugSink.js'
import * as DevtoolsHub from './DevtoolsHub.js'
import type { DeclarativeLinkRuntime } from './DeclarativeLinkRuntime.js'
import type { HostScheduler } from './HostScheduler.js'
import { makeJobQueue, type JobQueue } from './JobQueue.js'
import * as TaskRunner from './TaskRunner.js'
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
  /**
   * Microtask starvation protection threshold:
   * - Counts consecutive ticks scheduled on microtask boundaries without yielding to host (best-effort).
   * - Exceeding the limit forces the next tick to start on a macrotask boundary.
   */
  readonly microtaskChainDepthLimit?: number
  /**
   * Optional degraded-tick telemetry (opt-in, sampled):
   * - Runs even when diagnostics=off (Devtools disabled).
   * - Intended for production health signals (frequency of stable=false / forced yield).
   */
  readonly telemetry?: TickSchedulerTelemetryConfig
}

export interface TickSchedulerTelemetryEvent {
  readonly tickSeq: number
  readonly stable: boolean
  readonly degradeReason?: TickDegradeReason
  readonly forcedMacrotask?: boolean
  readonly scheduleReason?: TickScheduleReason
  readonly microtaskChainDepth?: number
  readonly deferredWorkCount?: number
}

export interface TickSchedulerTelemetryConfig {
  /** Sample rate in [0, 1]. Default: 0 (disabled). */
  readonly sampleRate?: number
  /** Called for ticks that are degraded (stable=false) and/or started on a forced macrotask boundary. */
  readonly onTickDegraded?: (event: TickSchedulerTelemetryEvent) => void
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
  batchDepth === 0
    ? Effect.void
    : Effect.async<void, never>((resume, signal) => {

    let done = false
    const cleanup = () => {
      if (done) return
      done = true
      batchWaiters.delete(waiter)
      try {
        signal.removeEventListener('abort', onAbort)
      } catch {
        // best-effort
      }
    }

    const onAbort = () => {
      cleanup()
    }

    const waiter: BatchWaiter = {
      resolve: () => {
        cleanup()
        resume(Effect.void)
      },
    }

    batchWaiters.add(waiter)
    try {
      signal.addEventListener('abort', onAbort, { once: true })
    } catch {
      // best-effort
    }
  })

// ---- TickScheduler implementation ----

type TriggerKind = 'externalStore' | 'dispatch' | 'timer' | 'unknown'

type TickScheduleStartedAs = 'microtask' | 'macrotask' | 'batch' | 'unknown'
type TickScheduleReason = 'budget' | 'cycle_detected' | 'microtask_starvation' | 'unknown'

type TickSchedule = {
  readonly startedAs?: TickScheduleStartedAs
  readonly microtaskChainDepth?: number
  readonly forcedMacrotask?: boolean
  readonly reason?: TickScheduleReason
}

const clampSampleRate = (sampleRate: number | undefined): number => {
  if (typeof sampleRate !== 'number' || !Number.isFinite(sampleRate)) return 0
  if (sampleRate <= 0) return 0
  if (sampleRate >= 1) return 1
  return sampleRate
}

const shouldSampleTick = (tickSeq: number, sampleRate: number): boolean => {
  if (sampleRate <= 0) return false
  if (sampleRate >= 1) return true
  // Deterministic sampling: stable across runs, avoids Math.random() and keeps overhead minimal.
  const x = tickSeq >>> 0
  const h = Math.imul(x ^ 0x9e3779b9, 0x85ebca6b) >>> 0
  return h / 0xffffffff < sampleRate
}

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
  readonly queue?: JobQueue
  readonly hostScheduler: HostScheduler
  readonly config?: TickSchedulerConfig
  readonly declarativeLinkRuntime?: DeclarativeLinkRuntime
}): TickScheduler => {
  const store = args.runtimeStore
  const hostScheduler = args.hostScheduler
  const declarativeLinks = args.declarativeLinkRuntime
  const queue = args.queue ?? makeJobQueue()

  const config: Required<Pick<TickSchedulerConfig, 'maxSteps' | 'urgentStepCap' | 'maxDrainRounds' | 'microtaskChainDepthLimit'>> = {
    maxSteps: args.config?.maxSteps ?? 64,
    urgentStepCap: args.config?.urgentStepCap ?? 512,
    maxDrainRounds: args.config?.maxDrainRounds ?? 8,
    microtaskChainDepthLimit: args.config?.microtaskChainDepthLimit ?? 32,
  }
  const telemetry = args.config?.telemetry
  const telemetrySampleRate = clampSampleRate(telemetry?.sampleRate)

  let tickSeq = 0
  let scheduled = false
  let microtaskChainDepth = 0
  let nextForcedReason: TickScheduleReason | undefined

  let coalescedModules = 0
  let coalescedTopics = 0

  const yieldMicrotask = Effect.async<void, never>((resume) => {
    hostScheduler.scheduleMicrotask(() => resume(Effect.void))
  })
  const yieldMacrotask = Effect.async<void, never>((resume, signal) => {
    const cancel = hostScheduler.scheduleMacrotask(() => resume(Effect.void))
    try {
      signal.addEventListener(
        'abort',
        () => {
          cancel()
        },
        { once: true },
      )
    } catch {
      // best-effort
    }
  })

  const scheduleTick = (): Effect.Effect<void, never, never> =>
    Effect.gen(function* () {
      if (scheduled) return
      scheduled = true

      const waitedForBatch = batchDepth > 0

      const forcedReason = nextForcedReason
      nextForcedReason = undefined

      const shouldYieldForStarvation =
        forcedReason == null && microtaskChainDepth >= Math.max(1, config.microtaskChainDepthLimit)

      const reason: TickScheduleReason | undefined = forcedReason ?? (shouldYieldForStarvation ? 'microtask_starvation' : undefined)
      const boundary: 'microtask' | 'macrotask' = reason ? 'macrotask' : 'microtask'
      const startedAs: TickScheduleStartedAs = waitedForBatch ? 'batch' : boundary
      const depthAtSchedule = microtaskChainDepth

      yield* Effect.forkDaemon(
        Effect.locally(TaskRunner.inSyncTransactionFiber, false)(
          Effect.gen(function* () {
            try {
              yield* waitForBatchEndIfNeeded()
              if (boundary === 'microtask') {
                yield* yieldMicrotask
                microtaskChainDepth += 1
              } else {
                yield* yieldMacrotask
                microtaskChainDepth = 0
              }

              const schedule: TickSchedule = {
                startedAs,
                microtaskChainDepth: boundary === 'macrotask' ? depthAtSchedule : microtaskChainDepth,
                ...(boundary === 'macrotask' ? { forcedMacrotask: true, reason: reason ?? 'unknown' } : {}),
              }

              const outcome = yield* flushTick(schedule)
              if (!outcome.stable) {
                nextForcedReason =
                  outcome.degradeReason === 'budget_steps'
                    ? 'budget'
                    : outcome.degradeReason === 'cycle_detected'
                      ? 'cycle_detected'
                      : 'unknown'
              }
            } finally {
              scheduled = false
              // If something was re-queued or arrived after commit, schedule the next tick (best-effort).
              if (queue.hasPending()) {
                yield* scheduleTick()
              } else {
                // Reset chain depth when the system becomes idle (avoid forcing a macrotask on the next unrelated tick).
                microtaskChainDepth = 0
              }
            }
          }),
        ),
      )
    })

  const flushTick = (schedule: TickSchedule): Effect.Effect<{ stable: boolean; degradeReason?: TickDegradeReason }, never, never> =>
    Effect.gen(function* () {
    if (!queue.hasPending()) {
      return { stable: true }
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
      const drained = queue.drain()
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

    if (queue.hasPending()) {
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
          coalescedCount: {
            modules: coalescedModules,
            topics: coalescedTopics,
          },
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

    if (shouldEmitTrace && schedule.forcedMacrotask && schedule.reason === 'microtask_starvation') {
      yield* Debug.record({
        type: 'warn:microtask-starvation',
        moduleId: anchor?.moduleId,
        instanceId: anchor?.instanceId,
        tickSeq: currentTickSeq,
        microtaskChainDepth: schedule.microtaskChainDepth,
      })
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
          schedule,
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
          schedule,
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
      queue.requeue(deferredDrain)
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
          schedule,
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

    if (telemetry?.onTickDegraded && (schedule.forcedMacrotask || !captured.stable) && shouldSampleTick(currentTickSeq, telemetrySampleRate)) {
      try {
        telemetry.onTickDegraded({
          tickSeq: currentTickSeq,
          stable: captured.stable,
          degradeReason: captured.stable ? undefined : (captured.degradeReason ?? 'unknown'),
          forcedMacrotask: schedule.forcedMacrotask,
          scheduleReason: schedule.reason,
          microtaskChainDepth: schedule.microtaskChainDepth,
          deferredWorkCount: deferredDrain ? deferredDrain.modules.size + deferredDrain.dirtyTopics.size : 0,
        })
      } catch {
        // best-effort: never let user telemetry break the tick
      }
    }
    coalescedModules = 0
    coalescedTopics = 0

    return { stable: captured.stable, degradeReason: captured.degradeReason }
  })

  const flushNow: TickScheduler['flushNow'] = flushTick({ startedAs: 'unknown' }).pipe(Effect.asVoid)

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
    const coalesced = queue.markTopicDirty(makeReadQueryTopicKey(moduleInstanceKey, selectorId), priority)
    if (coalesced) coalescedTopics += 1
  }

  const onModuleCommit: TickScheduler['onModuleCommit'] = (commit) =>
    Effect.gen(function* () {
      const coalescedCommit = queue.enqueueModuleCommit(commit)
      if (coalescedCommit) coalescedModules += 1
      const coalescedTopic = queue.markTopicDirty(commit.moduleInstanceKey, commit.meta.priority)
      if (coalescedTopic) coalescedTopics += 1
      yield* scheduleTick()
    })

  return {
    getTickSeq: () => tickSeq,
    onModuleCommit,
    onSelectorChanged,
    flushNow,
  }
}
