import React, { useContext, useEffect, useMemo, useState } from 'react'
import { Cause, Effect, Layer, ManagedRuntime, Scope, ServiceMap } from 'effect'
import * as Logix from '@logixjs/core'
import { RuntimeContext, ReactRuntimeContextValue } from './ReactContext.js'
import { DEFAULT_CONFIG_SNAPSHOT, ReactRuntimeConfigSnapshot, type ReactConfigSnapshot } from './config.js'
import { ControlplaneKernel, fingerprintReactConfigSnapshot } from './ControlplaneKernel.js'
import { isDevEnv } from './env.js'
import type { FallbackPhase } from './fallback.js'
import { FallbackProbe, resolveRuntimeProviderFallback } from './fallback.js'
import { createRuntimeAdapter, useLayerBinding } from './runtimeBindings.js'
import { getModuleCache, type ModuleCacheFactory } from '../store/ModuleCache.js'
import {
  resolveRuntimeProviderPolicy,
  type ModuleHandle,
  type RuntimeProviderPolicy,
  type RuntimeProviderPolicyMode,
  DEFAULT_PRELOAD_CONCURRENCY,
} from './policy.js'
import { buildDeferPreloadPlan } from './preloadPlan.js'

const SYNC_CONFIG_OVER_BUDGET_BY_RUNTIME = new WeakMap<object, true>()
const CONFIG_RESOLVE_OWNER_ID_BY_RUNTIME = new WeakMap<object, number>()
let configResolveOwnerSeq = 0

type ConfigResolveOwner = 'runtime.base' | 'runtime.layer-bound'
type ConfigResolveLane = 'neutral' | 'config' | 'preload'
type ConfigResolvePhase = 'boot' | 'ready'
type ConfigResolveToken = `${number}:${ConfigResolveOwner}:${ConfigResolveLane}:${ConfigResolvePhase}`
type ConfigResolveOwnerKey = `${number}:${ConfigResolveOwner}:${ConfigResolveLane}`
type OwnerResolveLane = ConfigResolveLane
type OwnerResolveMethod = 'read' | 'readSync' | 'warmSync' | 'preload'
type OwnerResolveCause =
  | 'boot-confirm'
  | 'ready-confirm'
  | 'config-boot-owner-lock'
  | 'neutral-settled-refresh-allowed'
  | 'defer-preload-dispatch'
  | 'defer-preload-reuse-inflight'
  | 'defer-preload-token-completed'
type OwnerResolveReason =
  | OwnerResolveCause
  | 'kernel-ticket-expired'
  | 'kernel-ticket-committed'
  | 'owner-lane-cancelled'
  | 'owner-phase-mismatch'
  | 'config-fingerprint-unchanged'
  | 'neutral-unsettled-refresh-blocked'
  | 'policy-mode-preload-disabled'
  | 'sync-warm-preload-ready'
  | 'defer-preload-unconfigured'
  | 'defer-preload-wait-runtime-ready'
  | 'defer-preload-plan-empty'
  | 'owner-resolve-error'
type OwnerResolveAction =
  | 'resolve-requested'
  | 'resolve-run'
  | 'resolve-commit'
  | 'resolve-skip'
  | 'resolve-stale-drop'
  | 'resolve-reject'
type OwnerResolveReadiness = 'pending' | 'sync-ready' | 'async-ready' | 'stale' | 'cancelled'
type OwnerResolveTicket = {
  readonly ownerKey: ConfigResolveOwnerKey
  readonly lane: OwnerResolveLane
  readonly epoch: number
}
type OwnerResolveRequested = {
  readonly ownerKey: ConfigResolveOwnerKey
  readonly lane: OwnerResolveLane
  readonly method: OwnerResolveMethod
  readonly cause: OwnerResolveCause
  readonly phase: ConfigResolvePhase
  readonly epoch: number
  readonly ticket: OwnerResolveTicket
  readonly fingerprint: string
}
type OwnerResolveDecision = {
  readonly action: OwnerResolveAction
  readonly reason: OwnerResolveReason
  readonly reasonCode: string
  readonly executor: 'phase-machine' | 'legacy-control'
  readonly cancelBoundary: 'owner-lane' | 'none'
  readonly readiness: OwnerResolveReadiness
}
type OwnerResolvePhaseTrace = OwnerResolveRequested &
  OwnerResolveDecision & {
    readonly owner: ConfigResolveOwner
    readonly token: ConfigResolveToken
  }
type ConfigResolveShadowStatus = 'Idle' | 'AsyncInFlight' | 'AsyncReady'
type ConfigResolveShadowEvent =
  | 'request-start'
  | 'request-reused'
  | 'resolve-commit'
  | 'resolve-stale-drop'
  | 'resolve-reject'
type NeutralLanePhaseMachineDecision =
  | {
      readonly action: 'run'
      readonly reason: 'ready-confirm'
      readonly phase: 'ready'
      readonly method: 'read'
      readonly cause: 'ready-confirm'
      readonly executor: 'phase-machine'
    }
  | {
      readonly action: 'run'
      readonly reason: 'boot-confirm'
      readonly phase: 'boot'
      readonly method: 'read'
      readonly cause: 'boot-confirm'
      readonly executor: 'phase-machine'
    }
type ConfigLanePhaseMachineDecision =
  | {
      readonly action: 'run'
      readonly reason: 'config-boot-owner-lock'
      readonly phase: 'boot'
      readonly method: 'readSync'
      readonly cause: 'config-boot-owner-lock'
      readonly executor: 'phase-machine'
    }
  | {
      readonly action: 'run'
      readonly reason: 'neutral-settled-refresh-allowed'
      readonly phase: 'ready'
      readonly method: 'warmSync'
      readonly cause: 'neutral-settled-refresh-allowed'
      readonly executor: 'phase-machine'
    }
  | {
      readonly action: 'skip'
      readonly reason: 'neutral-unsettled-refresh-blocked'
      readonly phase: 'ready'
      readonly method: 'warmSync'
      readonly cause: 'neutral-settled-refresh-allowed'
      readonly executor: 'phase-machine'
    }
  | {
      readonly action: 'skip'
      readonly reason: 'config-fingerprint-unchanged'
      readonly phase: 'ready'
      readonly method: 'warmSync'
      readonly cause: 'neutral-settled-refresh-allowed'
      readonly executor: 'phase-machine'
    }
type PreloadLanePhaseMachineDecision =
  | {
      readonly action: 'run'
      readonly reason: 'defer-preload-dispatch'
      readonly phase: ConfigResolvePhase
      readonly method: 'preload'
      readonly cause: 'defer-preload-dispatch'
      readonly executor: 'phase-machine'
    }
  | {
      readonly action: 'skip'
      readonly reason:
        | 'policy-mode-preload-disabled'
        | 'sync-warm-preload-ready'
        | 'defer-preload-unconfigured'
        | 'defer-preload-wait-runtime-ready'
        | 'defer-preload-plan-empty'
        | 'defer-preload-reuse-inflight'
        | 'defer-preload-token-completed'
      readonly phase: ConfigResolvePhase
      readonly method: 'preload'
      readonly cause: OwnerResolveCause
      readonly executor: 'phase-machine'
    }
type ConfigResolveControl = {
  readonly ownerId: number
  readonly lane: ConfigResolveLane
  readonly owner: ConfigResolveOwner
  readonly phase: ConfigResolvePhase
  readonly token: ConfigResolveToken
}
type ConfigResolveShadowState = {
  readonly ownerKey: ConfigResolveOwnerKey
  readonly ownerId: number
  readonly owner: ConfigResolveOwner
  readonly lane: ConfigResolveLane
  readonly phase: ConfigResolvePhase
  readonly epoch: number
  readonly status: ConfigResolveShadowStatus
  readonly token: ConfigResolveToken
  readonly inFlight: boolean
}
type OwnerLanePhaseMachineDecision = {
  readonly action: 'run' | 'skip'
  readonly reason: OwnerResolveReason
  readonly phase: ConfigResolvePhase
  readonly method: OwnerResolveMethod
  readonly cause: OwnerResolveCause
  readonly executor: 'phase-machine' | 'legacy-control'
}
type OwnerLaneReadiness = 'pending' | 'async-ready'
type OwnerLaneCancelBoundary = {
  cancelled: boolean
  readonly callbacks: Set<() => void> | null
}
type OwnerLaneResolveInFlight = {
  readonly token: ConfigResolveToken
  readonly promise: Promise<unknown>
  readonly cancelBoundary: OwnerLaneCancelBoundary | null
}
type OwnerLaneRegistryEntry = {
  latestToken: ConfigResolveToken | null
  readonly completedTokens: Set<ConfigResolveToken>
  inFlight: OwnerLaneResolveInFlight | null
  retainedCancels: OwnerLaneCancelBoundary | null
  readiness: OwnerLaneReadiness
}

const createOwnerLaneRegistryEntry = (): OwnerLaneRegistryEntry => ({
  latestToken: null,
  completedTokens: new Set(),
  inFlight: null,
  retainedCancels: null,
  readiness: 'pending',
})

const createOwnerLaneCancelBoundary = (callbacks: Set<() => void> | null): OwnerLaneCancelBoundary => ({
  cancelled: false,
  callbacks,
})

const clearOwnerLaneRetainedCancelsIfMatched = (
  entry: OwnerLaneRegistryEntry,
  cancelBoundary: OwnerLaneCancelBoundary | null,
): void => {
  if (cancelBoundary !== null && entry.retainedCancels === cancelBoundary) {
    entry.retainedCancels = null
  }
}

const cancelOwnerLaneCancelBoundary = (cancelBoundary: OwnerLaneCancelBoundary | null): void => {
  if (!cancelBoundary || cancelBoundary.cancelled) {
    return
  }
  cancelBoundary.cancelled = true
  if (!cancelBoundary.callbacks) {
    return
  }
  for (const cancel of cancelBoundary.callbacks) cancel()
}

const getOwnerLaneRegistryEntry = (
  registry: Map<ConfigResolveOwnerKey, OwnerLaneRegistryEntry>,
  ownerKey: ConfigResolveOwnerKey,
): OwnerLaneRegistryEntry => {
  const existing = registry.get(ownerKey)
  if (existing) {
    return existing
  }
  const created = createOwnerLaneRegistryEntry()
  registry.set(ownerKey, created)
  return created
}

const cancelOwnerLaneResolveInFlight = (
  entry: OwnerLaneRegistryEntry,
  inFlight: OwnerLaneResolveInFlight | null = entry.inFlight,
): void => {
  if (!inFlight) {
    return
  }
  if (entry.inFlight === inFlight) {
    entry.inFlight = null
  }
  clearOwnerLaneRetainedCancelsIfMatched(entry, inFlight.cancelBoundary)
  cancelOwnerLaneCancelBoundary(inFlight.cancelBoundary)
}

const cancelMismatchedOwnerLaneResolveInFlight = (
  entry: OwnerLaneRegistryEntry,
  token: ConfigResolveToken,
): void => {
  const currentInFlight = entry.inFlight
  if (!currentInFlight || currentInFlight.token === token) {
    return
  }
  cancelOwnerLaneResolveInFlight(entry, currentInFlight)
}

const publishOwnerLaneReadiness = (entry: OwnerLaneRegistryEntry, ready: boolean): void => {
  entry.readiness = ready ? 'async-ready' : 'pending'
}

const getConfigResolveOwnerId = (runtime: object): number => {
  const existing = CONFIG_RESOLVE_OWNER_ID_BY_RUNTIME.get(runtime)
  if (existing !== undefined) {
    return existing
  }
  const next = ++configResolveOwnerSeq
  CONFIG_RESOLVE_OWNER_ID_BY_RUNTIME.set(runtime, next)
  return next
}

const getConfigResolveOwnerKey = (
  ownerId: number,
  owner: ConfigResolveOwner,
  lane: ConfigResolveLane,
): ConfigResolveOwnerKey => `${ownerId}:${owner}:${lane}` as ConfigResolveOwnerKey

const OWNER_RESOLVE_REASON_CODE_MAP: Record<string, string> = {
  'boot-confirm': 'react.controlplane.read.boot.confirm',
  'ready-confirm': 'react.controlplane.read.ready.confirm',
  'config-boot-owner-lock': 'react.controlplane.config.boot.owner.lock',
  'neutral-settled-refresh-allowed': 'react.controlplane.config.ready.refresh.allowed',
  'defer-preload-dispatch': 'react.controlplane.preload.dispatch',
  'defer-preload-reuse-inflight': 'react.controlplane.preload.reuse.inflight',
  'defer-preload-token-completed': 'react.controlplane.preload.token.completed',
  'kernel-ticket-expired': 'react.controlplane.kernel.ticket.expired',
  'kernel-ticket-committed': 'react.controlplane.kernel.ticket.committed',
  'owner-lane-cancelled': 'react.controlplane.owner.lane.cancelled',
  'owner-phase-mismatch': 'react.controlplane.owner.phase.mismatch',
  'config-fingerprint-unchanged': 'react.controlplane.config.fingerprint.unchanged',
  'neutral-unsettled-refresh-blocked': 'react.controlplane.config.ready.refresh.blocked.unsettled',
  'policy-mode-preload-disabled': 'react.controlplane.preload.policy.disabled',
  'sync-warm-preload-ready': 'react.controlplane.preload.sync.warm.ready',
  'defer-preload-unconfigured': 'react.controlplane.preload.unconfigured',
  'defer-preload-wait-runtime-ready': 'react.controlplane.preload.wait.runtime.ready',
  'defer-preload-plan-empty': 'react.controlplane.preload.plan.empty',
  'owner-resolve-error': 'react.controlplane.owner.resolve.error',
}

const resolveOwnerReasonCode = (reason: OwnerResolveReason): string => {
  const known = OWNER_RESOLVE_REASON_CODE_MAP[reason]
  if (known) {
    return known
  }
  return `react.controlplane.owner.resolve.${reason.replace(/-/g, '.')}`
}

const resolveOwnerSkipReadiness = (reason: OwnerResolveReason): OwnerResolveReadiness => {
  switch (reason) {
    case 'config-fingerprint-unchanged':
      return 'sync-ready'
    case 'defer-preload-token-completed':
    case 'sync-warm-preload-ready':
    case 'defer-preload-unconfigured':
    case 'defer-preload-plan-empty':
      return 'async-ready'
    case 'owner-lane-cancelled':
      return 'cancelled'
    case 'kernel-ticket-expired':
      return 'stale'
    default:
      return 'pending'
  }
}

const createOwnerResolveDecision = (input: {
  readonly action: OwnerResolveAction
  readonly reason: OwnerResolveReason
  readonly executor: 'phase-machine' | 'legacy-control'
  readonly cancelBoundary: 'owner-lane' | 'none'
  readonly readiness: OwnerResolveReadiness
}): OwnerResolveDecision => ({
  action: input.action,
  reason: input.reason,
  reasonCode: resolveOwnerReasonCode(input.reason),
  executor: input.executor,
  cancelBoundary: input.cancelBoundary,
  readiness: input.readiness,
})

const getNextOwnerResolveEpoch = (args: {
  readonly ownerKey: ConfigResolveOwnerKey
  readonly reusedInFlight: boolean
  readonly epochByOwner: ReadonlyMap<ConfigResolveOwnerKey, number>
  readonly shadowStateByOwner: ReadonlyMap<ConfigResolveOwnerKey, ConfigResolveShadowState>
}): number => {
  const current = args.shadowStateByOwner.get(args.ownerKey)
  const prevEpoch = args.epochByOwner.get(args.ownerKey) ?? 0
  return args.reusedInFlight ? Math.max(prevEpoch, current?.epoch ?? 0, 1) : prevEpoch + 1
}

const createOwnerResolveRequested = (input: {
  readonly ownerKey: ConfigResolveOwnerKey
  readonly lane: OwnerResolveLane
  readonly method: OwnerResolveMethod
  readonly cause: OwnerResolveCause
  readonly phase: ConfigResolvePhase
  readonly epoch: number
  readonly fingerprint: string
}): OwnerResolveRequested => ({
  ownerKey: input.ownerKey,
  lane: input.lane,
  method: input.method,
  cause: input.cause,
  phase: input.phase,
  epoch: input.epoch,
  ticket: {
    ownerKey: input.ownerKey,
    lane: input.lane,
    epoch: input.epoch,
  },
  fingerprint: input.fingerprint,
})

const createOwnerResolvePhaseTrace = (input: {
  readonly requested: OwnerResolveRequested
  readonly decision: OwnerResolveDecision
  readonly owner: ConfigResolveOwner
  readonly token: ConfigResolveToken
}): OwnerResolvePhaseTrace => ({
  ...input.requested,
  ...input.decision,
  owner: input.owner,
  token: input.token,
})

const isSameConfigSnapshot = (a: ReactConfigSnapshot, b: ReactConfigSnapshot): boolean =>
  a.gcTime === b.gcTime &&
  a.initTimeoutMs === b.initTimeoutMs &&
  a.lowPriorityDelayMs === b.lowPriorityDelayMs &&
  a.lowPriorityMaxDelayMs === b.lowPriorityMaxDelayMs &&
  a.source === b.source

const decideNeutralLanePhaseMachine = (input: {
  readonly loaded: boolean
  readonly loadMode: 'none' | 'sync' | 'async'
  readonly syncOverBudget?: boolean
  readonly bootConfigOwnerLocked: boolean
}): NeutralLanePhaseMachineDecision => {
  const syncReadyNeutralLane =
    input.loaded && input.loadMode === 'sync' && !input.bootConfigOwnerLocked && !Boolean(input.syncOverBudget)

  if (syncReadyNeutralLane) {
    return {
      action: 'run',
      reason: 'ready-confirm',
      phase: 'ready',
      method: 'read',
      cause: 'ready-confirm',
      executor: 'phase-machine',
    }
  }

  return {
    action: 'run',
    reason: 'boot-confirm',
    phase: 'boot',
    method: 'read',
    cause: 'boot-confirm',
    executor: 'phase-machine',
  }
}

const decideConfigLanePhaseMachine = (input: {
  readonly phase: ConfigResolvePhase
  readonly bootConfigOwnerLocked: boolean
  readonly neutralSettled: boolean
}): ConfigLanePhaseMachineDecision => {
  if (input.phase === 'boot') {
    return {
      action: 'run',
      reason: 'config-boot-owner-lock',
      phase: 'boot',
      method: 'readSync',
      cause: 'config-boot-owner-lock',
      executor: 'phase-machine',
    }
  }

  if (!input.neutralSettled || !input.bootConfigOwnerLocked) {
    return {
      action: 'skip',
      reason: 'neutral-unsettled-refresh-blocked',
      phase: 'ready',
      method: 'warmSync',
      cause: 'neutral-settled-refresh-allowed',
      executor: 'phase-machine',
    }
  }

  return {
    action: 'run',
    reason: 'neutral-settled-refresh-allowed',
    phase: 'ready',
    method: 'warmSync',
    cause: 'neutral-settled-refresh-allowed',
    executor: 'phase-machine',
  }
}

const decidePreloadLanePhaseMachine = (input: {
  readonly policyMode: RuntimeProviderPolicyMode
  readonly phase: ConfigResolvePhase
  readonly syncWarmPreloadReady: boolean
  readonly hasPreloadPolicy: boolean
  readonly isLayerReady: boolean
  readonly isConfigReady: boolean
  readonly preloadPlanCount: number
}): PreloadLanePhaseMachineDecision => {
  if (input.policyMode !== 'defer') {
    return {
      action: 'skip',
      reason: 'policy-mode-preload-disabled',
      phase: input.phase,
      method: 'preload',
      cause: 'defer-preload-dispatch',
      executor: 'phase-machine',
    }
  }

  if (input.syncWarmPreloadReady) {
    return {
      action: 'skip',
      reason: 'sync-warm-preload-ready',
      phase: input.phase,
      method: 'preload',
      cause: 'defer-preload-dispatch',
      executor: 'phase-machine',
    }
  }

  if (!input.hasPreloadPolicy) {
    return {
      action: 'skip',
      reason: 'defer-preload-unconfigured',
      phase: input.phase,
      method: 'preload',
      cause: 'defer-preload-dispatch',
      executor: 'phase-machine',
    }
  }

  if (!input.isLayerReady || !input.isConfigReady) {
    return {
      action: 'skip',
      reason: 'defer-preload-wait-runtime-ready',
      phase: input.phase,
      method: 'preload',
      cause: 'defer-preload-dispatch',
      executor: 'phase-machine',
    }
  }

  if (input.preloadPlanCount === 0) {
    return {
      action: 'skip',
      reason: 'defer-preload-plan-empty',
      phase: input.phase,
      method: 'preload',
      cause: 'defer-preload-dispatch',
      executor: 'phase-machine',
    }
  }

  return {
    action: 'run',
    reason: 'defer-preload-dispatch',
    phase: input.phase,
    method: 'preload',
    cause: 'defer-preload-dispatch',
    executor: 'phase-machine',
  }
}

export interface RuntimeProviderProps {
  // The layer for the React integration must have a closed environment (R = never).
  // It should depend only on global env already provided by runtime, avoiding introducing unsatisfied deps inside the component tree.
  // Note: StateTransaction observation policy can only be configured via Logix.Runtime.make / Module.implement.
  // RuntimeProvider does not expose any stateTransaction-related props to avoid introducing a second transaction mode at the React layer.
  readonly layer?: Layer.Layer<any, any, never>
  readonly runtime?: ManagedRuntime.ManagedRuntime<any, any>
  readonly children: React.ReactNode
  readonly fallback?: React.ReactNode
  readonly policy?: RuntimeProviderPolicy
  readonly onError?: (cause: Cause.Cause<unknown>, context: RuntimeProviderErrorContext) => Effect.Effect<void>
}

export type RuntimeProviderErrorContext =
  | {
      readonly source: 'provider'
      readonly phase: 'provider.layer.build'
    }
  | {
      readonly source: 'provider'
      readonly phase: 'debug.lifecycle_error'
      readonly moduleId?: string
      readonly instanceId?: string
      readonly runtimeLabel?: string
    }
  | {
      readonly source: 'provider'
      readonly phase: 'debug.diagnostic_error'
      readonly code: string
      readonly message: string
      readonly hint?: string
      readonly moduleId?: string
      readonly instanceId?: string
      readonly runtimeLabel?: string
    }

export const RuntimeProvider: React.FC<RuntimeProviderProps> = ({
  layer,
  runtime,
  children,
  fallback,
  policy,
  onError,
}) => {
  const parent = useContext(RuntimeContext)
  const baseRuntime = useRuntimeResolution(runtime, parent)
  const controlplaneKernelRef = React.useRef(ControlplaneKernel.make())
  const providerStartedAtRef = React.useRef(performance.now())
  const providerReadyAtRef = React.useRef<number | undefined>(undefined)
  const didReportProviderGatingRef = React.useRef(false)
  const resolvedPolicy = useMemo(
    () =>
      resolveRuntimeProviderPolicy({
        policy,
        parentPolicy: parent?.policy ?? null,
      }),
    [policy, parent?.policy],
  )

  const onErrorRef = React.useRef(onError)
  onErrorRef.current = onError

  const hasTickServices = useMemo(() => {
    try {
      Logix.InternalContracts.getRuntimeStore(baseRuntime)
      return true
    } catch {
      return false
    }
  }, [baseRuntime])

  const { binding: tickBinding } = useLayerBinding(
    baseRuntime,
    Logix.InternalContracts.tickServicesLayer as Layer.Layer<any, never, never>,
    !hasTickServices,
    onErrorRef.current,
  )

  const { binding: layerBinding } = useLayerBinding(baseRuntime, layer, Boolean(layer), onErrorRef.current)
  const isLayerReady = !layer || layerBinding !== null
  const configResolveOwnerId = useMemo(() => getConfigResolveOwnerId(baseRuntime as unknown as object), [baseRuntime])
  const configLayerResolveOwnerId = useMemo(
    () => (layerBinding ? getConfigResolveOwnerId(layerBinding.scope as unknown as object) : undefined),
    [layerBinding],
  )
  const configResolveLatestRef = React.useRef<{
    readonly ownerKey: ConfigResolveOwnerKey
    readonly token: ConfigResolveToken
  } | null>(null)
  const configResolveShadowEpochRef = React.useRef<Map<ConfigResolveOwnerKey, number>>(new Map())
  const configResolveShadowStateRef = React.useRef<Map<ConfigResolveOwnerKey, ConfigResolveShadowState>>(new Map())
  const preloadOwnerKey = useMemo(
    () => getConfigResolveOwnerKey(configResolveOwnerId, 'runtime.base', 'preload'),
    [configResolveOwnerId],
  )
  const ownerLaneRegistryRef = React.useRef<Map<ConfigResolveOwnerKey, OwnerLaneRegistryEntry>>(new Map())

  const onErrorSink = useMemo<Logix.Debug.Sink | null>(() => {
    if (!onError) return null
    const sink: Logix.Debug.Sink = {
      record: (event: Logix.Debug.Event) => {
        const handler = onErrorRef.current
        if (!handler) {
          return Effect.void
        }

        if (event.type === 'lifecycle:error') {
          return handler(event.cause as Cause.Cause<unknown>, {
            source: 'provider',
            phase: 'debug.lifecycle_error',
            moduleId: event.moduleId,
            instanceId: event.instanceId,
            runtimeLabel: event.runtimeLabel,
          }).pipe(Effect.catchCause(() => Effect.void))
        }

        if (event.type === 'diagnostic' && event.severity === 'error') {
          return handler(
            Cause.fail({
              code: event.code,
              message: event.message,
              hint: event.hint,
            }),
            {
              source: 'provider',
              phase: 'debug.diagnostic_error',
              code: event.code,
              message: event.message,
              hint: event.hint,
              moduleId: event.moduleId,
              instanceId: event.instanceId,
              runtimeLabel: event.runtimeLabel,
            },
          ).pipe(Effect.catchCause(() => Effect.void))
        }

        return Effect.void
      },
    }
    return sink
  }, [Boolean(onError)])

  const inheritedDebugSinks = useMemo<ReadonlyArray<Logix.Debug.Sink>>(() => {
    if (!onErrorSink) {
      return []
    }
    if (layerBinding) {
      return layerBinding.debugSinks
    }
    try {
      return baseRuntime.runSync(Effect.service(Logix.Debug.internal.currentDebugSinks).pipe(Effect.orDie))
    } catch {
      return []
    }
  }, [baseRuntime, layerBinding, onErrorSink])

  // Note: the same Provider subtree must share the same runtime adapter reference.
  // Otherwise ModuleCache (keyed by runtime WeakMap) degrades into "one cache per component",
  // causing `useModule(Impl,{ key })` to lose cross-component instance reuse.
  const runtimeWithBindings = useMemo(
    () =>
      tickBinding || layerBinding || onErrorSink
        ? createRuntimeAdapter(
            baseRuntime,
            [...(tickBinding ? [tickBinding.context] : []), ...(layerBinding ? [layerBinding.context] : [])],
            [...(tickBinding ? [tickBinding.scope] : []), ...(layerBinding ? [layerBinding.scope] : [])],
            layerBinding ? [layerBinding.loggers] : tickBinding ? [tickBinding.loggers] : [],
            layerBinding ? [layerBinding.logLevel] : tickBinding ? [tickBinding.logLevel] : [],
            [
              onErrorSink
                ? ([onErrorSink, ...inheritedDebugSinks] as ReadonlyArray<Logix.Debug.Sink>)
                : layerBinding
                  ? layerBinding.debugSinks
                  : [],
            ],
          )
        : baseRuntime,
    [baseRuntime, inheritedDebugSinks, layerBinding, onErrorSink, tickBinding],
  )

  const bootConfigOwnerLocked = useMemo(() => {
    if (!layer) {
      return false
    }
    if (!isLayerReady) {
      return true
    }
    try {
      const baseSnapshot = baseRuntime.runSync(
        ReactRuntimeConfigSnapshot.load as Effect.Effect<ReactConfigSnapshot, any, any>,
      )
      const boundSnapshot = runtimeWithBindings.runSync(
        ReactRuntimeConfigSnapshot.load as Effect.Effect<ReactConfigSnapshot, any, any>,
      )
      return !isSameConfigSnapshot(baseSnapshot, boundSnapshot)
    } catch {
      // Conservative fallback: unknown layer/config state keeps owner-aware gate enabled.
      return true
    }
  }, [baseRuntime, isLayerReady, layer, runtimeWithBindings])

  const didReportSyncConfigSnapshotRef = React.useRef(false)

  const [configState, setConfigState] = useState<{
    snapshot: ReactConfigSnapshot
    version: number
    loaded: boolean
    loadMode: 'none' | 'sync' | 'async'
    syncDurationMs?: number
    syncOverBudget?: boolean
  }>(() => {
    const budgetMs = resolvedPolicy.syncBudgetMs
    if (budgetMs <= 0) {
      // Explicitly disable sync attempt: fall back to async (no render-phase sync work).
      return { snapshot: DEFAULT_CONFIG_SNAPSHOT, version: 1, loaded: false, loadMode: 'none' }
    }

    if (SYNC_CONFIG_OVER_BUDGET_BY_RUNTIME.has(baseRuntime as unknown as object)) {
      // overBudget observed: avoid repeated render-phase blocking during subsequent remount/HMR.
      return { snapshot: DEFAULT_CONFIG_SNAPSHOT, version: 1, loaded: false, loadMode: 'none' }
    }

    const startedAt = performance.now()
    try {
      const snapshot = runtimeWithBindings.runSync(
        ReactRuntimeConfigSnapshot.load as Effect.Effect<ReactConfigSnapshot, any, any>,
      )
      const durationMs = performance.now() - startedAt
      const overBudget = durationMs > budgetMs
      if (overBudget) {
        SYNC_CONFIG_OVER_BUDGET_BY_RUNTIME.set(baseRuntime as unknown as object, true)
      }

      // overBudget: fall back to async gating to avoid stacking more sync work in the same commit.
      return {
        snapshot,
        version: 1,
        loaded: !overBudget && !bootConfigOwnerLocked,
        loadMode: 'sync',
        syncDurationMs: durationMs,
        syncOverBudget: overBudget,
      }
    } catch {
      return { snapshot: DEFAULT_CONFIG_SNAPSHOT, version: 1, loaded: false, loadMode: 'none' }
    }
  })

  useEffect(() => {
    if (configState.loadMode !== 'sync') {
      return
    }
    if (didReportSyncConfigSnapshotRef.current) {
      return
    }
    didReportSyncConfigSnapshotRef.current = true

    void runtimeWithBindings
      .runPromise(
        Logix.Debug.record({
          type: 'trace:react.runtime.config.snapshot',
          data: {
            source: configState.snapshot.source,
            mode: 'sync',
            durationMs:
              configState.syncDurationMs !== undefined ? Math.round(configState.syncDurationMs * 100) / 100 : undefined,
            syncBudgetMs: resolvedPolicy.syncBudgetMs,
            overBudget: Boolean(configState.syncOverBudget),
          },
        }) as unknown as Effect.Effect<void, never, never>,
      )
      .catch(() => {})
  }, [configState, resolvedPolicy.syncBudgetMs, runtimeWithBindings])

  const reportConfigResolveShadow = (
    event: ConfigResolveShadowEvent,
    state: ConfigResolveShadowState,
    extra?: Record<string, unknown>,
  ): void => {
    void runtimeWithBindings
      .runPromise(
        Logix.Debug.record({
          type: 'trace:react.runtime.controlplane.shadow',
          data: {
            event,
            ownerKey: state.ownerKey,
            ownerId: state.ownerId,
            owner: state.owner,
            lane: state.lane,
            phase: state.phase,
            epoch: state.epoch,
            status: state.status,
            token: state.token,
            ...extra,
          },
        }) as unknown as Effect.Effect<void, never, never>,
      )
      .catch(() => {})
  }

  const reportConfigResolveShadowInvariant = (code: string, data: Record<string, unknown>): void => {
    void runtimeWithBindings
      .runPromise(
        Logix.Debug.record({
          type: 'trace:react.runtime.controlplane.shadow.invariant',
          data: {
            code: `react.controlplane.shadow.${code}`,
            ...data,
          },
        }) as unknown as Effect.Effect<void, never, never>,
      )
      .catch(() => {})
  }

  const beginConfigResolveShadow = (
    control: ConfigResolveControl,
    token: ConfigResolveToken,
    reusedInFlight: boolean,
    epoch: number,
  ): ConfigResolveShadowState => {
    const ownerKey = getConfigResolveOwnerKey(control.ownerId, control.owner, control.lane)
    const current = configResolveShadowStateRef.current.get(ownerKey)

    if (reusedInFlight && current === undefined) {
      reportConfigResolveShadowInvariant('reuse-without-shadow-state', {
        ownerKey,
        owner: control.owner,
        lane: control.lane,
        phase: control.phase,
        token,
      })
    }

    configResolveShadowEpochRef.current.set(ownerKey, epoch)

    const shadowState: ConfigResolveShadowState = {
      ownerKey,
      ownerId: control.ownerId,
      owner: control.owner,
      lane: control.lane,
      phase: control.phase,
      epoch,
      status: 'AsyncInFlight',
      token,
      inFlight: true,
    }

    configResolveShadowStateRef.current.set(ownerKey, shadowState)
    return shadowState
  }

  const reportOwnerResolvePhaseTrace = (
    trace: OwnerResolvePhaseTrace,
    extra?: Record<string, unknown>,
  ): void => {
    void runtimeWithBindings
      .runPromise(
        Logix.Debug.record({
          type: 'trace:react.runtime.controlplane.phase-machine',
          data: {
            ...trace,
            ...extra,
          },
        }) as unknown as Effect.Effect<void, never, never>,
      )
      .catch(() => {})
  }

  useEffect(() => {
    if (layer && !isLayerReady) {
      return
    }

    const isConfigLaneResolvePath = layer && bootConfigOwnerLocked && configLayerResolveOwnerId !== undefined
    const neutralLaneDecision = decideNeutralLanePhaseMachine({
      loaded: configState.loaded,
      loadMode: configState.loadMode,
      syncOverBudget: configState.syncOverBudget,
      bootConfigOwnerLocked,
    })

    const resolveControl: ConfigResolveControl = isConfigLaneResolvePath
      ? {
          ownerId: configLayerResolveOwnerId,
          lane: 'config',
          owner: 'runtime.layer-bound',
          phase: providerReadyAtRef.current === undefined ? 'boot' : 'ready',
          token: `${configLayerResolveOwnerId}:runtime.layer-bound:config:${
            providerReadyAtRef.current === undefined ? 'boot' : 'ready'
          }` as ConfigResolveToken,
        }
      : {
          ownerId: configResolveOwnerId,
          lane: 'neutral',
          owner: 'runtime.base',
          phase: neutralLaneDecision.phase,
          token: `${configResolveOwnerId}:runtime.base:neutral:${neutralLaneDecision.phase}` as ConfigResolveToken,
        }

    const resolveOwner = resolveControl.owner
    const resolvePhase = resolveControl.phase
    const resolveLane = resolveControl.lane
    const resolveToken = resolveControl.token
    const resolveOwnerKey = getConfigResolveOwnerKey(resolveControl.ownerId, resolveOwner, resolveLane)
    const laneEntry = getOwnerLaneRegistryEntry(ownerLaneRegistryRef.current, resolveOwnerKey)
    const neutralSettled = providerReadyAtRef.current !== undefined
    const isNeutralLanePhaseMachine = resolveLane === 'neutral'
    if (neutralSettled) {
      controlplaneKernelRef.current.onNeutralSettled(resolveOwnerKey)
    }

    const phaseMachineDecisionRaw:
      | (NeutralLanePhaseMachineDecision & { readonly executor: 'phase-machine' })
      | ConfigLanePhaseMachineDecision
      | null = isNeutralLanePhaseMachine
      ? {
          ...neutralLaneDecision,
          executor: 'phase-machine' as const,
        }
        : resolveLane === 'config'
          ? decideConfigLanePhaseMachine({
            phase: resolvePhase,
            bootConfigOwnerLocked,
            neutralSettled,
          })
        : null

    const phaseMachineRunDecision =
      phaseMachineDecisionRaw !== null && phaseMachineDecisionRaw.action === 'run' ? phaseMachineDecisionRaw : null

    const kernelConfigConfirmDecision =
      phaseMachineRunDecision !== null
        ? controlplaneKernelRef.current.requestConfigConfirm({
            ownerKey: resolveOwnerKey,
            cause: phaseMachineRunDecision.reason,
            currentFingerprint: configState.loaded ? fingerprintReactConfigSnapshot(configState.snapshot) : null,
          })
        : null

    const phaseMachineDecision =
      kernelConfigConfirmDecision !== null && kernelConfigConfirmDecision.action === 'skip'
        ? ({
            action: 'skip',
            reason: kernelConfigConfirmDecision.reason,
            phase: 'ready',
            method: phaseMachineRunDecision!.method,
            cause: phaseMachineRunDecision!.cause,
            executor: 'phase-machine',
          } as const)
        : phaseMachineDecisionRaw

    const inFlight = laneEntry.inFlight
    const reusedInFlight = Boolean(inFlight && inFlight.token === resolveToken)
    const requestedEpoch = getNextOwnerResolveEpoch({
      ownerKey: resolveOwnerKey,
      reusedInFlight,
      epochByOwner: configResolveShadowEpochRef.current,
      shadowStateByOwner: configResolveShadowStateRef.current,
    })
    const requestedFingerprint = configState.loaded
      ? fingerprintReactConfigSnapshot(configState.snapshot)
      : 'config-unloaded'
    const ownerResolveRequested =
      phaseMachineDecision !== null
        ? createOwnerResolveRequested({
            ownerKey: resolveOwnerKey,
            lane: resolveLane,
            method: phaseMachineDecision.method,
            cause: phaseMachineDecision.cause,
            phase: phaseMachineDecision.phase,
            epoch: requestedEpoch,
            fingerprint: requestedFingerprint,
          })
        : null
    const initialOwnerResolveDecision =
      phaseMachineDecision !== null
        ? createOwnerResolveDecision({
            action: phaseMachineDecision.action === 'run' ? 'resolve-run' : 'resolve-skip',
            reason: phaseMachineDecision.reason,
            executor: phaseMachineDecision.executor,
            cancelBoundary: 'owner-lane',
            readiness:
              phaseMachineDecision.action === 'run'
                ? 'pending'
                : resolveOwnerSkipReadiness(phaseMachineDecision.reason),
          })
        : null
    const resolveExecutor = initialOwnerResolveDecision?.executor ?? 'legacy-control'
    const phaseMachineReason = initialOwnerResolveDecision?.reason

    if (ownerResolveRequested !== null && initialOwnerResolveDecision !== null) {
      reportOwnerResolvePhaseTrace(
        createOwnerResolvePhaseTrace({
          requested: ownerResolveRequested,
          decision: initialOwnerResolveDecision,
          owner: resolveOwner,
          token: resolveToken,
        }),
        {
          neutralSettled,
        },
      )
    }

    if (phaseMachineDecision?.action === 'skip') {
      return
    }

    laneEntry.latestToken = resolveToken
    configResolveLatestRef.current = {
      ownerKey: resolveOwnerKey,
      token: resolveToken,
    }

    if (laneEntry.completedTokens.has(resolveToken)) {
      return
    }

    let cancelled = false

    cancelMismatchedOwnerLaneResolveInFlight(laneEntry, resolveToken)
    const activeCancelBoundary = reusedInFlight
      ? ((inFlight as NonNullable<typeof inFlight>).cancelBoundary ?? createOwnerLaneCancelBoundary(null))
      : createOwnerLaneCancelBoundary(null)
    const promise =
      reusedInFlight
        ? ((inFlight as NonNullable<typeof inFlight>).promise as Promise<ReactConfigSnapshot>)
        : runtimeWithBindings.runPromise(ReactRuntimeConfigSnapshot.load as Effect.Effect<ReactConfigSnapshot, any, any>)

    if (!reusedInFlight) {
      laneEntry.inFlight = {
        token: resolveToken,
        promise,
        cancelBoundary: activeCancelBoundary,
      }
      laneEntry.retainedCancels = activeCancelBoundary
    }

    const shadowState = beginConfigResolveShadow(resolveControl, resolveToken, reusedInFlight, requestedEpoch)
    reportConfigResolveShadow(reusedInFlight ? 'request-reused' : 'request-start', shadowState, {
      executor: resolveExecutor,
      phaseMachineReason,
      cancelBoundary: 'owner-lane',
      kernelConfigTicket:
        kernelConfigConfirmDecision !== null && kernelConfigConfirmDecision.action === 'run'
          ? kernelConfigConfirmDecision.ticket
          : null,
    })

    promise
      .then((snapshot: ReactConfigSnapshot) => {
        const latestResolve = configResolveLatestRef.current
        const stillLatest = latestResolve?.ownerKey === resolveOwnerKey && latestResolve.token === resolveToken
        const kernelTicketStatus =
          kernelConfigConfirmDecision === null || kernelConfigConfirmDecision.action === 'skip'
            ? 'not-requested'
            : controlplaneKernelRef.current.isTicketCurrent(resolveOwnerKey, kernelConfigConfirmDecision.ticket)
              ? 'current'
              : 'expired'
        if (cancelled || activeCancelBoundary.cancelled || !stillLatest) {
          reportConfigResolveShadow(
            'resolve-stale-drop',
            {
              ...shadowState,
              inFlight: false,
            },
            {
              staleReason: cancelled
                ? 'effect-cancelled'
                : activeCancelBoundary.cancelled
                  ? 'owner-lane-cancelled'
                  : 'latest-token-mismatch',
              latestToken: latestResolve?.token ?? null,
            },
          )
          if (ownerResolveRequested !== null) {
            reportOwnerResolvePhaseTrace(
              createOwnerResolvePhaseTrace({
                requested: ownerResolveRequested,
                decision: createOwnerResolveDecision({
                  action: 'resolve-stale-drop',
                  reason: 'owner-lane-cancelled',
                  executor: resolveExecutor,
                  cancelBoundary: 'owner-lane',
                  readiness: 'cancelled',
                }),
                owner: resolveOwner,
                token: resolveToken,
              }),
            )
          }
          return
        }
        if (kernelTicketStatus === 'expired') {
          reportConfigResolveShadow(
            'resolve-stale-drop',
            {
              ...shadowState,
              inFlight: false,
            },
            {
              staleReason: 'kernel-ticket-expired',
              reasonCode: 'react.controlplane.kernel.ticket.expired',
              kernelTicket:
                kernelConfigConfirmDecision !== null && kernelConfigConfirmDecision.action === 'run'
                  ? kernelConfigConfirmDecision.ticket
                  : null,
            },
          )
          if (ownerResolveRequested !== null) {
            reportOwnerResolvePhaseTrace(
              createOwnerResolvePhaseTrace({
                requested: ownerResolveRequested,
                decision: createOwnerResolveDecision({
                  action: 'resolve-stale-drop',
                  reason: 'kernel-ticket-expired',
                  executor: resolveExecutor,
                  cancelBoundary: 'owner-lane',
                  readiness: 'stale',
                }),
                owner: resolveOwner,
                token: resolveToken,
              }),
            )
          }
          return
        }

        const fingerprint = fingerprintReactConfigSnapshot(snapshot)
        if (kernelConfigConfirmDecision !== null && kernelConfigConfirmDecision.action === 'run') {
          const kernelCommit = controlplaneKernelRef.current.commitTicket(
            resolveOwnerKey,
            kernelConfigConfirmDecision.ticket,
            fingerprint,
          )
          if (!kernelCommit.accepted) {
            reportConfigResolveShadow(
              'resolve-stale-drop',
              {
                ...shadowState,
                inFlight: false,
              },
              {
                staleReason: 'kernel-ticket-expired',
                reasonCode: 'react.controlplane.kernel.ticket.expired',
                kernelTicket: kernelConfigConfirmDecision.ticket,
                kernelTicketCommitReason: kernelCommit.reason,
              },
            )
            reportConfigResolveShadowInvariant('kernel-commit-ticket-expired', {
              ownerKey: resolveOwnerKey,
              token: resolveToken,
              kernelTicket: kernelConfigConfirmDecision.ticket,
              kernelTicketCommitReason: kernelCommit.reason,
            })
            if (ownerResolveRequested !== null) {
              reportOwnerResolvePhaseTrace(
                createOwnerResolvePhaseTrace({
                  requested: ownerResolveRequested,
                  decision: createOwnerResolveDecision({
                    action: 'resolve-stale-drop',
                    reason: 'kernel-ticket-expired',
                    executor: resolveExecutor,
                    cancelBoundary: 'owner-lane',
                    readiness: 'stale',
                  }),
                  owner: resolveOwner,
                  token: resolveToken,
                }),
              )
            }
            return
          }
        }

        if (laneEntry.inFlight?.token === resolveToken && laneEntry.inFlight?.promise === promise) {
          laneEntry.inFlight = null
        }
        clearOwnerLaneRetainedCancelsIfMatched(laneEntry, activeCancelBoundary)
        laneEntry.completedTokens.add(resolveToken)
        publishOwnerLaneReadiness(laneEntry, true)

        const currentShadowState = configResolveShadowStateRef.current.get(shadowState.ownerKey)
        if (
          currentShadowState === undefined ||
          currentShadowState.token !== resolveToken ||
          currentShadowState.status !== 'AsyncInFlight'
        ) {
          reportConfigResolveShadowInvariant('commit-without-inflight', {
            ownerKey: shadowState.ownerKey,
            token: resolveToken,
            expectedStatus: 'AsyncInFlight',
            observedStatus: currentShadowState?.status,
            observedToken: currentShadowState?.token,
          })
        }

        const committedShadowState: ConfigResolveShadowState = {
          ...shadowState,
          status: 'AsyncReady',
          inFlight: false,
          phase: resolvePhase,
          epoch: currentShadowState?.epoch ?? shadowState.epoch,
        }
        configResolveShadowStateRef.current.set(shadowState.ownerKey, committedShadowState)
        reportConfigResolveShadow('resolve-commit', committedShadowState)
        if (ownerResolveRequested !== null) {
          reportOwnerResolvePhaseTrace(
            createOwnerResolvePhaseTrace({
              requested: ownerResolveRequested,
              decision: createOwnerResolveDecision({
                action: 'resolve-commit',
                reason: 'kernel-ticket-committed',
                executor: resolveExecutor,
                cancelBoundary: 'owner-lane',
                readiness: 'async-ready',
              }),
              owner: resolveOwner,
              token: resolveToken,
            }),
          )
        }

        setConfigState((prev) => {
          const sameSnapshot =
            prev.snapshot.gcTime === snapshot.gcTime &&
            prev.snapshot.initTimeoutMs === snapshot.initTimeoutMs &&
            prev.snapshot.lowPriorityDelayMs === snapshot.lowPriorityDelayMs &&
            prev.snapshot.lowPriorityMaxDelayMs === snapshot.lowPriorityMaxDelayMs &&
            prev.snapshot.source === snapshot.source

          if (sameSnapshot && prev.loaded) {
            return prev
          }

          return {
            snapshot,
            version: prev.version,
            loaded: true,
            loadMode: 'async',
          }
        })

        void runtimeWithBindings
          .runPromise(
            Logix.Debug.record({
              type: 'trace:react.runtime.config.snapshot',
              data: {
                source: snapshot.source,
                mode: 'async',
                owner: resolveOwner,
                ownerKey: resolveOwnerKey,
                lane: resolveLane,
                phase: resolvePhase,
              },
            }) as unknown as Effect.Effect<void, never, never>,
          )
          .catch(() => {})
      })
      .catch((error) => {
        const latestResolve = configResolveLatestRef.current
        const stillLatest = latestResolve?.ownerKey === resolveOwnerKey && latestResolve.token === resolveToken
        if (cancelled || activeCancelBoundary.cancelled || !stillLatest) {
          reportConfigResolveShadow(
            'resolve-stale-drop',
            {
              ...shadowState,
              inFlight: false,
            },
            {
              staleReason: cancelled
                ? 'effect-cancelled'
                : activeCancelBoundary.cancelled
                  ? 'owner-lane-cancelled'
                  : 'latest-token-mismatch',
              latestToken: latestResolve?.token ?? null,
            },
          )
          if (ownerResolveRequested !== null) {
            reportOwnerResolvePhaseTrace(
              createOwnerResolvePhaseTrace({
                requested: ownerResolveRequested,
                decision: createOwnerResolveDecision({
                  action: 'resolve-stale-drop',
                  reason: 'owner-lane-cancelled',
                  executor: resolveExecutor,
                  cancelBoundary: 'owner-lane',
                  readiness: 'cancelled',
                }),
                owner: resolveOwner,
                token: resolveToken,
              }),
            )
          }
          return
        }
        if (laneEntry.inFlight?.token === resolveToken && laneEntry.inFlight?.promise === promise) {
          laneEntry.inFlight = null
        }
        clearOwnerLaneRetainedCancelsIfMatched(laneEntry, activeCancelBoundary)
        publishOwnerLaneReadiness(laneEntry, false)
        const rejectedShadowState: ConfigResolveShadowState = {
          ...shadowState,
          status: 'Idle',
          inFlight: false,
          phase: resolvePhase,
        }
        configResolveShadowStateRef.current.set(shadowState.ownerKey, rejectedShadowState)
        reportConfigResolveShadow('resolve-reject', rejectedShadowState, {
          errorTag: error instanceof Error ? error.name : typeof error,
          executor: resolveExecutor,
          phaseMachineReason,
        })
        if (ownerResolveRequested !== null) {
          reportOwnerResolvePhaseTrace(
            createOwnerResolvePhaseTrace({
              requested: ownerResolveRequested,
              decision: createOwnerResolveDecision({
                action: 'resolve-reject',
                reason: 'owner-resolve-error',
                executor: resolveExecutor,
                cancelBoundary: 'owner-lane',
                readiness: 'cancelled',
              }),
              owner: resolveOwner,
              token: resolveToken,
            }),
            {
              errorTag: error instanceof Error ? error.name : typeof error,
            },
          )
        }
        // eslint-disable-next-line no-console
        console.debug('[RuntimeProvider] Failed to load React runtime config snapshot, fallback to default.', error)
        setConfigState((prev) => ({
          snapshot: DEFAULT_CONFIG_SNAPSHOT,
          version: prev.version,
          loaded: true,
          loadMode: 'async',
        }))
      })

    return () => {
      cancelled = true
    }
  }, [
    bootConfigOwnerLocked,
    configLayerResolveOwnerId,
    configResolveOwnerId,
    configState.loaded,
    configState.loadMode,
    configState.syncOverBudget,
    isLayerReady,
    layer,
    runtimeWithBindings,
  ])

  const contextValue = useMemo<ReactRuntimeContextValue>(
    () => ({
      runtime: runtimeWithBindings,
      reactConfigSnapshot: configState.snapshot,
      configVersion: configState.version,
      policy: resolvedPolicy,
    }),
    [runtimeWithBindings, configState, resolvedPolicy],
  )

  const isTickServicesReady = hasTickServices || tickBinding !== null
  const layerConfigSyncGateReleased =
    !configState.loaded &&
    configState.loadMode === 'sync' &&
    !configState.syncOverBudget &&
    layer &&
    isLayerReady &&
    !bootConfigOwnerLocked
  const isConfigReady = configState.loaded || Boolean(layerConfigSyncGateReleased)

  const resolveFallback = (phase: FallbackPhase): React.ReactNode => {
    return resolveRuntimeProviderFallback({ fallback, phase, policyMode: resolvedPolicy.mode })
  }

  const preloadCache = useMemo(
    () => getModuleCache(runtimeWithBindings, configState.snapshot),
    [runtimeWithBindings, configState.snapshot],
  )

  const deferPreloadPlan = useMemo(
    () =>
      resolvedPolicy.mode === 'defer'
        ? buildDeferPreloadPlan({
            preload: resolvedPolicy.preload,
            gcTime: configState.snapshot.gcTime,
          })
        : [],
    [resolvedPolicy.mode, resolvedPolicy.preload, configState.snapshot.gcTime],
  )
  const preloadLanePhase: ConfigResolvePhase = providerReadyAtRef.current === undefined ? 'boot' : 'ready'

  const syncWarmPreloadReady = useMemo(() => {
    if (resolvedPolicy.mode !== 'defer') return false
    if (!resolvedPolicy.preload) return true
    if (!isLayerReady || !isConfigReady) return false

    if (deferPreloadPlan.length === 0) return true

    for (const entry of deferPreloadPlan) {
      const value = preloadCache.warmSync(entry.key, entry.factory, entry.gcTime, entry.ownerId, {
        entrypoint: 'react.runtime.preload.sync-warm',
        policyMode: 'defer',
        resolvePhase: preloadLanePhase,
      })
      if (!value) return false
    }

    return true
  }, [resolvedPolicy.mode, resolvedPolicy.preload, isLayerReady, isConfigReady, preloadCache, deferPreloadPlan, preloadLanePhase])

  const [deferReady, setDeferReady] = useState(false)
  useEffect(() => {
    if (resolvedPolicy.mode !== 'defer') {
      setDeferReady(false)
      return
    }
    setDeferReady(false)
  }, [resolvedPolicy.mode])

  const preloadPhaseMachineDecision = useMemo(
    () =>
      decidePreloadLanePhaseMachine({
        policyMode: resolvedPolicy.mode,
        phase: preloadLanePhase,
        syncWarmPreloadReady,
        hasPreloadPolicy: Boolean(resolvedPolicy.preload),
        isLayerReady,
        isConfigReady,
        preloadPlanCount: deferPreloadPlan.length,
      }),
    [
      deferPreloadPlan.length,
      isConfigReady,
      isLayerReady,
      preloadLanePhase,
      resolvedPolicy.mode,
      resolvedPolicy.preload,
      syncWarmPreloadReady,
    ],
  )

  useEffect(() => {
    return () => {
      const laneEntry = ownerLaneRegistryRef.current.get(preloadOwnerKey)
      if (!laneEntry) {
        return
      }
      cancelOwnerLaneResolveInFlight(laneEntry)
      laneEntry.latestToken = null
      laneEntry.completedTokens.clear()
      laneEntry.retainedCancels = null
      publishOwnerLaneReadiness(laneEntry, false)
    }
  }, [preloadOwnerKey])

  useEffect(() => {
    const laneEntry = getOwnerLaneRegistryEntry(ownerLaneRegistryRef.current, preloadOwnerKey)
    const preloadToken =
      `${configResolveOwnerId}:runtime.base:preload:${preloadPhaseMachineDecision.phase}` as ConfigResolveToken
    laneEntry.latestToken = preloadToken
    publishOwnerLaneReadiness(laneEntry, false)

    const inFlight = laneEntry.inFlight
    const reusedInFlight = Boolean(inFlight !== null && inFlight.token === preloadToken)
    const hasCompletedToken = laneEntry.completedTokens.has(preloadToken)
    const phaseMachineDecision: PreloadLanePhaseMachineDecision =
      preloadPhaseMachineDecision.action === 'run' && hasCompletedToken
        ? {
            action: 'skip',
            reason: 'defer-preload-token-completed',
            phase: preloadPhaseMachineDecision.phase,
            method: 'preload',
            cause: 'defer-preload-token-completed',
            executor: 'phase-machine',
          }
        : preloadPhaseMachineDecision.action === 'run' && inFlight !== null && inFlight.token === preloadToken
          ? {
              action: 'skip',
              reason: 'defer-preload-reuse-inflight',
              phase: preloadPhaseMachineDecision.phase,
              method: 'preload',
              cause: 'defer-preload-reuse-inflight',
              executor: 'phase-machine',
            }
        : preloadPhaseMachineDecision
    const requestedEpoch = getNextOwnerResolveEpoch({
      ownerKey: preloadOwnerKey,
      reusedInFlight,
      epochByOwner: configResolveShadowEpochRef.current,
      shadowStateByOwner: configResolveShadowStateRef.current,
    })
    const ownerResolveRequested = createOwnerResolveRequested({
      ownerKey: preloadOwnerKey,
      lane: 'preload',
      method: phaseMachineDecision.method,
      cause: phaseMachineDecision.cause,
      phase: phaseMachineDecision.phase,
      epoch: requestedEpoch,
      fingerprint: configState.loaded ? fingerprintReactConfigSnapshot(configState.snapshot) : 'config-unloaded',
    })
    const phaseMachineDecisionEvent = createOwnerResolveDecision({
      action: phaseMachineDecision.action === 'run' ? 'resolve-run' : 'resolve-skip',
      reason: phaseMachineDecision.reason,
      executor: phaseMachineDecision.executor,
      cancelBoundary: 'owner-lane',
      readiness:
        phaseMachineDecision.action === 'run'
          ? 'pending'
          : resolveOwnerSkipReadiness(phaseMachineDecision.reason),
    })

    let cancelled = false
    const observeInFlight = (promise: Promise<void>) => {
      promise
        .then(() => {
          if (cancelled || laneEntry.latestToken !== preloadToken) return
          laneEntry.completedTokens.add(preloadToken)
          publishOwnerLaneReadiness(laneEntry, true)
          setDeferReady(true)
        })
        .catch((error) => {
          if (cancelled || laneEntry.latestToken !== preloadToken) return
          if (onErrorRef.current) {
            runtimeWithBindings.runFork(
              onErrorRef
                .current(Cause.die(error), { source: 'provider', phase: 'provider.layer.build' })
                .pipe(Effect.catchCause(() => Effect.void)),
            )
          }
          publishOwnerLaneReadiness(laneEntry, true)
          setDeferReady(true)
        })
    }

    const cancelMismatchedInFlight = () => {
      cancelMismatchedOwnerLaneResolveInFlight(laneEntry, preloadToken)
    }

    void runtimeWithBindings
      .runPromise(
        Logix.Debug.record({
          type: 'trace:react.runtime.controlplane.phase-machine',
          data: {
            ...createOwnerResolvePhaseTrace({
              requested: ownerResolveRequested,
              decision: phaseMachineDecisionEvent,
              owner: 'runtime.base',
              token: preloadToken,
            }),
            policyMode: resolvedPolicy.mode,
            preloadEnabled: Boolean(resolvedPolicy.preload),
            preloadPlanCount: deferPreloadPlan.length,
            layerReady: isLayerReady,
            configReady: isConfigReady,
            syncWarmPreloadReady,
          },
        }) as unknown as Effect.Effect<void, never, never>,
      )
      .catch(() => {})

    if (phaseMachineDecision.action === 'skip') {
      if (
        phaseMachineDecision.reason !== 'defer-preload-reuse-inflight' &&
        phaseMachineDecision.reason !== 'defer-preload-token-completed'
      ) {
        cancelMismatchedInFlight()
      }

      if (
        phaseMachineDecision.reason === 'sync-warm-preload-ready' ||
        phaseMachineDecision.reason === 'defer-preload-unconfigured' ||
        phaseMachineDecision.reason === 'defer-preload-plan-empty' ||
        phaseMachineDecision.reason === 'defer-preload-token-completed'
      ) {
        publishOwnerLaneReadiness(laneEntry, true)
        setDeferReady(true)
      } else {
        publishOwnerLaneReadiness(laneEntry, false)
        setDeferReady(false)
      }

      if (
        phaseMachineDecision.reason === 'defer-preload-reuse-inflight' &&
        inFlight !== null &&
        inFlight.token === preloadToken
      ) {
        observeInFlight(inFlight.promise as Promise<void>)
      }

      return () => {
        cancelled = true
      }
    }

    const preloadPolicy = resolvedPolicy.preload
    if (!preloadPolicy) {
      publishOwnerLaneReadiness(laneEntry, true)
      setDeferReady(true)
      return () => {
        cancelled = true
      }
    }

    setDeferReady(false)
    cancelMismatchedInFlight()

    const cache = preloadCache

    const concurrency = Math.max(1, preloadPolicy.concurrency ?? DEFAULT_PRELOAD_CONCURRENCY)
    const allCancels = new Set<() => void>()
    const retainedCancelBoundary = createOwnerLaneCancelBoundary(allCancels)
    laneEntry.retainedCancels = retainedCancelBoundary

    const run = async () => {
      const queue = deferPreloadPlan.slice()

      const runOne = async (entry: (typeof deferPreloadPlan)[number]) => {
        const startedAt = performance.now()

        if (entry.handleKind === 'ModuleImpl') {
          const op = cache.preload(entry.key, entry.factory, {
            ownerId: entry.ownerId,
            yield: preloadPolicy.yield,
            entrypoint: 'react.runtime.preload',
            policyMode: 'defer',
            resolvePhase: phaseMachineDecision.phase,
            optimisticSyncBudgetMs: resolvedPolicy.syncBudgetMs,
          })
          allCancels.add(op.cancel)
          await op.promise

          const durationMs = performance.now() - startedAt
          void runtimeWithBindings
            .runPromise(
              Logix.Debug.record({
                type: 'trace:react.module.preload',
                moduleId: entry.ownerId,
                data: {
                  mode: 'defer',
                  handleKind: 'ModuleImpl',
                  key: entry.key,
                  durationMs: Math.round(durationMs * 100) / 100,
                  concurrency,
                  yieldStrategy: preloadPolicy.yield.strategy,
                  yieldOnlyWhenOverBudgetMs: preloadPolicy.yield.onlyWhenOverBudgetMs,
                },
              }) as unknown as Effect.Effect<void, never, never>,
            )
            .catch(() => {})

          return
        }

        const op = cache.preload(entry.key, entry.factory, {
          ownerId: entry.ownerId,
          yield: preloadPolicy.yield,
          entrypoint: 'react.runtime.preload',
          policyMode: 'defer',
          resolvePhase: phaseMachineDecision.phase,
          optimisticSyncBudgetMs: resolvedPolicy.syncBudgetMs,
        })
        allCancels.add(op.cancel)
        await op.promise

        const durationMs = performance.now() - startedAt
        void runtimeWithBindings
          .runPromise(
            Logix.Debug.record({
              type: 'trace:react.module.preload',
              data: {
                mode: 'defer',
                handleKind: 'ModuleTag',
                tokenId: entry.tokenId,
                key: entry.key,
                durationMs: Math.round(durationMs * 100) / 100,
                concurrency,
                yieldStrategy: preloadPolicy.yield.strategy,
                yieldOnlyWhenOverBudgetMs: preloadPolicy.yield.onlyWhenOverBudgetMs,
              },
            }) as unknown as Effect.Effect<void, never, never>,
          )
          .catch(() => {})
      }

      const workers = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
        while (true) {
          const next = queue.shift()
          if (!next) return
          await runOne(next)
        }
      })

      await Promise.all(workers)
    }

    laneEntry.completedTokens.delete(preloadToken)
    const runPromise = run()
    laneEntry.inFlight = {
      token: preloadToken,
      promise: runPromise,
      cancelBoundary: retainedCancelBoundary,
    }
    observeInFlight(runPromise)
    void runPromise.finally(() => {
      const currentInFlight = laneEntry.inFlight
      if (currentInFlight?.token === preloadToken && currentInFlight.promise === runPromise) {
        laneEntry.inFlight = null
      }
    })

    return () => {
      cancelled = true
    }
  }, [
    configResolveOwnerId,
    deferPreloadPlan,
    isConfigReady,
    isLayerReady,
    onErrorRef,
    preloadCache,
    preloadPhaseMachineDecision,
    preloadOwnerKey,
    resolvedPolicy.mode,
    resolvedPolicy.preload,
    resolvedPolicy.syncBudgetMs,
    runtimeWithBindings,
    syncWarmPreloadReady,
  ])

  // defer+preload: release preload holders after the subtree's first commit, avoiding permanently pinning preloaded handles.
  useEffect(() => {
    if (resolvedPolicy.mode !== 'defer' || !deferReady) {
      return
    }

    const laneEntry = ownerLaneRegistryRef.current.get(preloadOwnerKey)
    const retainedCancelBoundary = laneEntry?.retainedCancels
    const callbacks = retainedCancelBoundary?.callbacks
    if (!retainedCancelBoundary || !callbacks || callbacks.size === 0) {
      return
    }
    if (laneEntry) {
      laneEntry.retainedCancels = null
    }

    let released = false
    const release = () => {
      if (released) return
      released = true
      cancelOwnerLaneCancelBoundary(retainedCancelBoundary)
    }

    const timeout = setTimeout(release, 0)
    return () => {
      clearTimeout(timeout)
      release()
    }
  }, [resolvedPolicy.mode, deferReady, preloadOwnerKey])

  const isReady = isTickServicesReady && isLayerReady && isConfigReady && (resolvedPolicy.mode !== 'defer' || deferReady || syncWarmPreloadReady)
  if (isReady && providerReadyAtRef.current === undefined) {
    providerReadyAtRef.current = performance.now()
  }

  useEffect(() => {
    if (!isReady) {
      return
    }
    if (didReportProviderGatingRef.current) {
      return
    }
    let diagnosticsLevel: Logix.Debug.DiagnosticsLevel = 'off'
    try {
      diagnosticsLevel = runtimeWithBindings.runSync(
        Effect.service(Logix.Debug.internal.currentDiagnosticsLevel).pipe(Effect.orDie),
      )
    } catch {
      diagnosticsLevel = isDevEnv() ? 'light' : 'off'
    }
    if (diagnosticsLevel === 'off') {
      return
    }
    didReportProviderGatingRef.current = true

    const readyAt = providerReadyAtRef.current ?? performance.now()
    const durationMs = Math.round((readyAt - providerStartedAtRef.current) * 100) / 100
    const effectDelayMs = Math.round((performance.now() - readyAt) * 100) / 100

    void runtimeWithBindings
      .runPromise(
        Logix.Debug.record({
          type: 'trace:react.provider.gating',
          data: {
            event: 'ready',
            policyMode: resolvedPolicy.mode,
            durationMs,
            effectDelayMs,
            configLoadMode: configState.loadMode,
            syncOverBudget: Boolean(configState.syncOverBudget),
            syncDurationMs:
              configState.syncDurationMs !== undefined ? Math.round(configState.syncDurationMs * 100) / 100 : undefined,
          },
        }) as unknown as Effect.Effect<void, never, never>,
      )
      .catch(() => {})
  }, [configState.loadMode, configState.syncDurationMs, configState.syncOverBudget, isReady, resolvedPolicy.mode, runtimeWithBindings])

  if (!isReady) {
    const blockersList = [
      isTickServicesReady ? null : 'tick',
      isLayerReady ? null : 'layer',
      isConfigReady ? null : 'config',
      resolvedPolicy.mode !== 'defer' || deferReady || syncWarmPreloadReady ? null : 'preload',
    ].filter((x): x is string => x !== null)
    const blockers = blockersList.length > 0 ? blockersList.join('+') : undefined

    return (
      <FallbackProbe
        runtime={runtimeWithBindings}
        phase="provider.gating"
        policyMode={resolvedPolicy.mode}
        blockers={blockers}
      >
        {resolveFallback('provider.gating')}
      </FallbackProbe>
    )
  }

  const content =
    resolvedPolicy.mode === 'sync' ? (
      children
    ) : (
      <React.Suspense
        fallback={
          <FallbackProbe runtime={runtimeWithBindings} phase="react.suspense" policyMode={resolvedPolicy.mode}>
            {resolveFallback('react.suspense')}
          </FallbackProbe>
        }
      >
        {children}
      </React.Suspense>
    )

  return React.createElement(RuntimeContext.Provider, { value: contextValue }, content)
}

const useRuntimeResolution = (
  runtimeProp: ManagedRuntime.ManagedRuntime<any, any> | undefined,
  parent: ReactRuntimeContextValue | null,
) => {
  const baseRuntime = runtimeProp ?? parent?.runtime
  if (!baseRuntime) {
    throw new Error(
      '[RuntimeProvider] Missing runtime.\n' +
        '\n' +
        'Fix:\n' +
        '- Provide `runtime` prop: <RuntimeProvider runtime={runtime}>...\n' +
        '- Or nest under an ancestor RuntimeProvider that provides `runtime`.\n',
    )
  }
  return baseRuntime
}
