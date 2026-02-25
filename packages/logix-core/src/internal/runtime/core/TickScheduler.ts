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

type SchedulingDegradeState = {
  readonly tickSeq: number
  readonly reason: TickDegradeReason
  readonly moduleId: string
  readonly instanceId: string
  readonly txnSeq: number
  readonly txnId: string
  readonly opSeq: number
  readonly configScope: 'builtin' | 'runtime_default' | 'runtime_module' | 'provider'
  readonly limit: number | 'unbounded'
  readonly backlogCount: number
}

type SchedulingAnchor = {
  readonly moduleId: string
  readonly instanceId: string
  readonly txnSeq: number
  readonly txnId: string
  readonly opSeq: number
}

const toSchedulingAnchor = (commit: RuntimeStoreModuleCommit | undefined): SchedulingAnchor | undefined => {
  if (!commit) return undefined
  if (typeof commit.opSeq !== 'number') return undefined
  return {
    moduleId: commit.moduleId,
    instanceId: commit.instanceId,
    txnSeq: commit.meta.txnSeq,
    txnId: commit.meta.txnId,
    opSeq: commit.opSeq,
  }
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

const topicKeyResolutionCacheLimit = 1024

const toTriggerKind = (originKind: string | undefined): TriggerKind => {
  if (originKind === 'action') return 'dispatch'
  if (originKind === 'trait-external-store') return 'externalStore'
  if (originKind?.includes('timer')) return 'timer'
  return 'unknown'
}

const toLane = (priority: StateCommitPriority): TickLane => (priority === 'low' ? 'nonUrgent' : 'urgent')

const maxPriority = (a: StateCommitPriority, b: StateCommitPriority): StateCommitPriority =>
  a === 'normal' || b === 'normal' ? 'normal' : 'low'

type MutablePendingDrain = {
  readonly modules: Map<ModuleInstanceKey, RuntimeStoreModuleCommit>
  readonly dirtyTopics: Map<string, StateCommitPriority>
}

const mergeDrainInPlace = (base: MutablePendingDrain, next: RuntimeStorePendingDrain): void => {
  for (const [k, commit] of next.modules) {
    const prev = base.modules.get(k)
    if (!prev) {
      base.modules.set(k, commit)
    } else {
      const mergedPriority = maxPriority(prev.meta.priority, commit.meta.priority)
      if (mergedPriority === commit.meta.priority) {
        base.modules.set(k, commit)
      } else {
        base.modules.set(k, {
          ...commit,
          meta: {
            ...commit.meta,
            priority: mergedPriority,
          },
        })
      }
    }
  }

  for (const [k, p] of next.dirtyTopics) {
    const prev = base.dirtyTopics.get(k)
    if (!prev) {
      base.dirtyTopics.set(k, p)
      continue
    }
    const mergedPriority = maxPriority(prev, p)
    if (mergedPriority !== prev) {
      base.dirtyTopics.set(k, mergedPriority)
    }
  }
}

const emptyDrain = (): MutablePendingDrain => ({ modules: new Map(), dirtyTopics: new Map() })

type BudgetPartitionResult = {
  readonly acceptedModules: Map<ModuleInstanceKey, RuntimeStoreModuleCommit>
  readonly deferredModules: Map<ModuleInstanceKey, RuntimeStoreModuleCommit>
  readonly urgentCapExceeded: boolean
  readonly deferredNonUrgentCount: number
}

const partitionModulesForBudget = (args: {
  readonly modules: ReadonlyMap<ModuleInstanceKey, RuntimeStoreModuleCommit>
  readonly maxSteps: number
  readonly urgentStepCap: number
}): BudgetPartitionResult => {
  let urgentCount = 0
  for (const commit of args.modules.values()) {
    if (toLane(commit.meta.priority) === 'urgent') {
      urgentCount += 1
    }
  }

  const urgentCap = Math.max(0, args.urgentStepCap)
  const urgentCapExceeded = urgentCount > urgentCap
  const nonUrgentBudget = Math.max(0, args.maxSteps)

  let acceptedUrgentCount = 0
  let deferredNonUrgentCount = 0

  const acceptedModules = new Map<ModuleInstanceKey, RuntimeStoreModuleCommit>()
  const deferredModules = new Map<ModuleInstanceKey, RuntimeStoreModuleCommit>()

  for (const commit of args.modules.values()) {
    if (toLane(commit.meta.priority) !== 'urgent') continue
    if (urgentCapExceeded && acceptedUrgentCount >= urgentCap) {
      deferredModules.set(commit.moduleInstanceKey, commit)
      continue
    }
    acceptedModules.set(commit.moduleInstanceKey, commit)
    acceptedUrgentCount += 1
  }

  if (urgentCapExceeded) {
    for (const commit of args.modules.values()) {
      if (toLane(commit.meta.priority) === 'urgent') continue
      deferredModules.set(commit.moduleInstanceKey, commit)
      deferredNonUrgentCount += 1
    }
    return {
      acceptedModules,
      deferredModules,
      urgentCapExceeded,
      deferredNonUrgentCount,
    }
  }

  let acceptedNonUrgentCount = 0
  for (const commit of args.modules.values()) {
    if (toLane(commit.meta.priority) === 'urgent') continue
    if (acceptedNonUrgentCount >= nonUrgentBudget) {
      deferredModules.set(commit.moduleInstanceKey, commit)
      deferredNonUrgentCount += 1
      continue
    }
    acceptedModules.set(commit.moduleInstanceKey, commit)
    acceptedNonUrgentCount += 1
  }

  return {
    acceptedModules,
    deferredModules,
    urgentCapExceeded,
    deferredNonUrgentCount,
  }
}

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
  let lastSchedulingDegrade: SchedulingDegradeState | undefined
  let lastSchedulingAnchor: SchedulingAnchor | undefined
  let lastSchedulingPolicy: RuntimeStoreModuleCommit['schedulingPolicy']

  let coalescedModules = 0
  let coalescedTopics = 0
  const topicKeyToModuleInstanceKeyCache = new Map<string, ModuleInstanceKey | null>()

  const rememberTopicKeyResolution = (topicKey: string, moduleInstanceKey: ModuleInstanceKey | undefined): ModuleInstanceKey | undefined => {
    if (topicKeyToModuleInstanceKeyCache.has(topicKey)) {
      topicKeyToModuleInstanceKeyCache.delete(topicKey)
    } else if (topicKeyToModuleInstanceKeyCache.size >= topicKeyResolutionCacheLimit) {
      const oldestKey = topicKeyToModuleInstanceKeyCache.keys().next().value
      if (oldestKey !== undefined) {
        topicKeyToModuleInstanceKeyCache.delete(oldestKey)
      }
    }
    topicKeyToModuleInstanceKeyCache.set(topicKey, moduleInstanceKey ?? null)
    return moduleInstanceKey
  }

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
    const shouldEmitSchedulingDiagnostics = diagnosticsLevel !== 'off'

    const captured: {
      drainRounds: number
      stable: boolean
      degradeReason?: TickDegradeReason
      deferred?: RuntimeStorePendingDrain
      accepted: MutablePendingDrain
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
      mergeDrainInPlace(captured.accepted, drained)

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
    const { acceptedModules, deferredModules, urgentCapExceeded, deferredNonUrgentCount } = partitionModulesForBudget({
      modules: captured.accepted.modules,
      maxSteps: config.maxSteps,
      urgentStepCap: config.urgentStepCap,
    })

    if (urgentCapExceeded) {
      captured.stable = false
      captured.degradeReason = 'cycle_detected'
    } else if (deferredNonUrgentCount > 0) {
      captured.stable = false
      captured.degradeReason = captured.degradeReason ?? 'budget_steps'
    }

    const acceptedTopics = new Map<string, StateCommitPriority>()
    const deferredTopics = new Map<string, StateCommitPriority>()

    for (const [topicKey, priority] of captured.accepted.dirtyTopics) {
      const moduleInstanceKey = storeTopicToModuleInstanceKey(topicKey)
      if (!moduleInstanceKey) continue
      if (acceptedModules.has(moduleInstanceKey)) {
        acceptedTopics.set(topicKey, priority)
      } else if (deferredModules.has(moduleInstanceKey)) {
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

    const anchorCommitForScheduling = (() => {
      for (const commit of acceptedModules.values()) {
        return commit
      }
      if (deferredDrain) {
        for (const commit of deferredDrain.modules.values()) {
          return commit
        }
      }
      return undefined
    })()

    const schedulingAnchorCandidate = toSchedulingAnchor(anchorCommitForScheduling)
    if (schedulingAnchorCandidate) {
      lastSchedulingAnchor = schedulingAnchorCandidate
    }
    const schedulingAnchor = schedulingAnchorCandidate ?? lastSchedulingAnchor

    if (anchorCommitForScheduling?.schedulingPolicy) {
      lastSchedulingPolicy = anchorCommitForScheduling.schedulingPolicy
    }
    const schedulingPolicy = anchorCommitForScheduling?.schedulingPolicy ?? lastSchedulingPolicy
    const schedulingConfigScope = schedulingPolicy?.configScope ?? 'builtin'
    const schedulingLimit = schedulingPolicy?.concurrencyLimit ?? 16
    const schedulingThreshold = schedulingPolicy?.pressureWarningThreshold ?? {
      backlogCount: 1000,
      backlogDurationMs: 5000,
    }
    const schedulingCooldownMs = schedulingPolicy?.warningCooldownMs ?? 30_000
    const backlogCount = deferredDrain ? deferredDrain.modules.size + deferredDrain.dirtyTopics.size : 0

    if (!captured.stable && shouldEmitSchedulingDiagnostics && schedulingAnchor && !lastSchedulingDegrade) {
      const reason = captured.degradeReason ?? 'unknown'
      yield* Debug.record({
        type: 'diagnostic',
        moduleId: schedulingAnchor.moduleId,
        instanceId: schedulingAnchor.instanceId,
        txnSeq: schedulingAnchor.txnSeq,
        txnId: schedulingAnchor.txnId,
        opSeq: schedulingAnchor.opSeq,
        code: 'scheduling::degrade',
        severity: 'warning',
        message: 'Scheduling degraded: tick execution deferred part of the backlog.',
        hint:
          'Inspect reason/backlog and align queue/tick/concurrency knobs through the same scheduling policy surface.',
        kind: 'scheduling:degrade',
        trigger: {
          kind: 'tickScheduler',
          name: 'flushTick',
          details: {
            eventKind: 'degrade',
            reason,
            tickSeq: currentTickSeq,
            backlogCount,
            configScope: schedulingConfigScope,
            limit: schedulingLimit,
            threshold: schedulingThreshold,
            cooldownMs: schedulingCooldownMs,
            schedule: {
              startedAs: schedule.startedAs ?? 'unknown',
              forcedMacrotask: schedule.forcedMacrotask === true,
              reason: schedule.reason ?? 'unknown',
              microtaskChainDepth: schedule.microtaskChainDepth ?? 0,
            },
          },
        },
      })

      lastSchedulingDegrade = {
        tickSeq: currentTickSeq,
        reason,
        moduleId: schedulingAnchor.moduleId,
        instanceId: schedulingAnchor.instanceId,
        txnSeq: schedulingAnchor.txnSeq,
        txnId: schedulingAnchor.txnId,
        opSeq: schedulingAnchor.opSeq,
        configScope: schedulingConfigScope,
        limit: schedulingLimit,
        backlogCount,
      }
    } else if (captured.stable && lastSchedulingDegrade) {
      const previous = lastSchedulingDegrade
      if (shouldEmitSchedulingDiagnostics) {
        const recoverAnchor = schedulingAnchor ?? previous
        yield* Debug.record({
          type: 'diagnostic',
          moduleId: recoverAnchor.moduleId,
          instanceId: recoverAnchor.instanceId,
          txnSeq: recoverAnchor.txnSeq,
          txnId: recoverAnchor.txnId,
          opSeq: recoverAnchor.opSeq,
          code: 'scheduling::recover',
          severity: 'info',
          message: 'Scheduling recovered: backlog/degrade condition cleared.',
          hint: 'No immediate action needed unless degrade/recover oscillates frequently.',
          kind: 'scheduling:recover',
          trigger: {
            kind: 'tickScheduler',
            name: 'flushTick',
            details: {
              eventKind: 'recover',
              tickSeq: currentTickSeq,
              fromTickSeq: previous.tickSeq,
              fromReason: previous.reason,
              previousBacklogCount: previous.backlogCount,
              configScope: previous.configScope,
              limit: previous.limit,
              schedule: {
                startedAs: schedule.startedAs ?? 'unknown',
                forcedMacrotask: schedule.forcedMacrotask === true,
                reason: schedule.reason ?? 'unknown',
                microtaskChainDepth: schedule.microtaskChainDepth ?? 0,
              },
            },
          },
        })
      }
      lastSchedulingDegrade = undefined
    }

    let startedAtMs: number | undefined
    let triggerSummary: any | undefined
    let anchor: any | undefined
    let backlog: any | undefined
    let result: any | undefined

    if (shouldEmitTrace) {
      startedAtMs = Date.now()

      let triggerTotal = 0
      let triggerPrimary: any = undefined
      let triggerAnchor: RuntimeStoreModuleCommit | undefined
      const triggerKindsOrder: TriggerKind[] = []
      let externalStoreCount = 0
      let dispatchCount = 0
      let timerCount = 0
      let unknownCount = 0

      for (const commit of captured.accepted.modules.values()) {
        if (!triggerAnchor) {
          triggerAnchor = commit
        }
        triggerTotal += 1

        const kind = toTriggerKind(commit.meta.originKind)
        if (!triggerPrimary) {
          triggerPrimary = {
            kind,
            moduleId: commit.moduleId,
            instanceId: commit.instanceId,
            fieldPath: kind === 'externalStore' ? commit.meta.originName : undefined,
            actionTag: kind === 'dispatch' ? commit.meta.originName : undefined,
          }
        }

        switch (kind) {
          case 'externalStore': {
            if (externalStoreCount === 0) triggerKindsOrder.push(kind)
            externalStoreCount += 1
            break
          }
          case 'dispatch': {
            if (dispatchCount === 0) triggerKindsOrder.push(kind)
            dispatchCount += 1
            break
          }
          case 'timer': {
            if (timerCount === 0) triggerKindsOrder.push(kind)
            timerCount += 1
            break
          }
          default: {
            if (unknownCount === 0) triggerKindsOrder.push(kind)
            unknownCount += 1
            break
          }
        }
      }

      const kinds: Array<{ kind: TriggerKind; count: number }> = []
      for (const kind of triggerKindsOrder) {
        switch (kind) {
          case 'externalStore':
            kinds.push({ kind, count: externalStoreCount })
            break
          case 'dispatch':
            kinds.push({ kind, count: dispatchCount })
            break
          case 'timer':
            kinds.push({ kind, count: timerCount })
            break
          default:
            kinds.push({ kind, count: unknownCount })
            break
        }
      }

      triggerSummary = {
        total: triggerTotal,
        kinds,
        primary: triggerPrimary,
        coalescedCount: {
          modules: coalescedModules,
          topics: coalescedTopics,
        },
      }

      if (triggerAnchor) {
        anchor = {
          moduleId: triggerAnchor.moduleId,
          instanceId: triggerAnchor.instanceId,
          txnSeq: triggerAnchor.meta.txnSeq,
          txnId: triggerAnchor.meta.txnId,
          ...(typeof triggerAnchor.opSeq === 'number' ? { opSeq: triggerAnchor.opSeq } : null),
        }
      }

      const deferredWork = captured.deferred
      if (deferredWork) {
        const pendingDeferredWork = deferredWork.modules.size + deferredWork.dirtyTopics.size
        let pendingExternalInputs = 0
        let firstDeferred: RuntimeStoreModuleCommit | undefined
        let firstExternalStoreDeferred: RuntimeStoreModuleCommit | undefined

        for (const deferred of deferredWork.modules.values()) {
          if (!firstDeferred) {
            firstDeferred = deferred
          }
          const kind = toTriggerKind(deferred.meta.originKind)
          if (kind === 'externalStore') {
            pendingExternalInputs += 1
            if (!firstExternalStoreDeferred) {
              firstExternalStoreDeferred = deferred
            }
          }
        }

        const primaryDeferred = firstExternalStoreDeferred ?? firstDeferred
        let deferredPrimary: any = undefined
        if (primaryDeferred) {
          const kind = toTriggerKind(primaryDeferred.meta.originKind)
          const isExternalStore = kind === 'externalStore'
          deferredPrimary = {
            kind: isExternalStore ? ('externalStore' as const) : ('unknown' as const),
            moduleId: primaryDeferred.moduleId,
            instanceId: primaryDeferred.instanceId,
            fieldPath: isExternalStore ? primaryDeferred.meta.originName : undefined,
            storeId: undefined,
          }
        }

        backlog = {
          pendingExternalInputs,
          pendingDeferredWork,
          deferredPrimary,
        }
      }

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

    store.commitTick({
      tickSeq: currentTickSeq,
      accepted: acceptedDrain,
      onListener: (listener) => {
        try {
          listener()
        } catch {
          // best-effort: never let a subscriber break the tick
        }
      },
    })

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
    const cached = topicKeyToModuleInstanceKeyCache.get(topicKey)
    if (cached !== undefined) {
      return cached === null ? undefined : cached
    }

    const idx = topicKey.indexOf('::rq:')
    if (idx > 0) {
      return rememberTopicKeyResolution(topicKey, topicKey.slice(0, idx) as ModuleInstanceKey)
    }
    if (topicKey.includes('::')) {
      return rememberTopicKeyResolution(topicKey, topicKey as ModuleInstanceKey)
    }
    return rememberTopicKeyResolution(topicKey, undefined)
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
