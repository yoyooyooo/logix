import { Effect, Option } from 'effect'
import type { ConcurrencyDiagnostics } from './ConcurrencyDiagnostics.js'
import {
  SchedulingPolicySurfaceOverridesTag,
  SchedulingPolicySurfaceTag,
  type SchedulingPolicyLimit,
  type SchedulingPolicySurface,
  type SchedulingPolicySurfaceOverrides,
  type SchedulingPolicySurfacePatch,
} from './env.js'
import { normalizeBoolean, normalizePositiveInt, normalizePositiveNumber } from './normalize.js'

export type SchedulingPolicySurfaceConfigScope = 'builtin' | 'runtime_default' | 'runtime_module' | 'provider'
export type ConcurrencyPolicyConfigScope = SchedulingPolicySurfaceConfigScope

export type ResolvedSchedulingPolicySurface = {
  readonly concurrencyLimit: SchedulingPolicyLimit
  readonly losslessBackpressureCapacity: number
  readonly allowUnbounded: boolean
  readonly pressureWarningThreshold: {
    readonly backlogCount: number
    readonly backlogDurationMs: number
  }
  readonly warningCooldownMs: number
  readonly configScope: SchedulingPolicySurfaceConfigScope
  /** Field-level scope for the effective concurrency limit. */
  readonly concurrencyLimitScope: SchedulingPolicySurfaceConfigScope
  /** The originally requested concurrency limit (for explaining the unbounded gate). */
  readonly requestedConcurrencyLimit: SchedulingPolicyLimit
  /** Field-level scope for the originally requested concurrency limit. */
  readonly requestedConcurrencyLimitScope: SchedulingPolicySurfaceConfigScope
  /** Field-level scope for allowUnbounded. */
  readonly allowUnboundedScope: SchedulingPolicySurfaceConfigScope
}
export type ResolvedConcurrencyPolicy = ResolvedSchedulingPolicySurface

const normalizeConcurrencyLimit = (v: unknown): SchedulingPolicyLimit | undefined =>
  v === 'unbounded' ? 'unbounded' : normalizePositiveInt(v)

type ResolvedPolicyCache = {
  readonly runtimeConfigRef: SchedulingPolicySurface | undefined
  readonly runtimeModulePatchRef: SchedulingPolicySurfacePatch | undefined
  readonly providerOverridesRef: SchedulingPolicySurfaceOverrides | undefined
  readonly providerModulePatchRef: SchedulingPolicySurfacePatch | undefined
  readonly runtimeDefaultFingerprint: string
  readonly runtimeModuleFingerprint: string
  readonly providerDefaultFingerprint: string
  readonly providerModuleFingerprint: string
  readonly resolved: ResolvedSchedulingPolicySurface
}

export type SchedulingPolicyRuntimeSnapshot = {
  readonly runtimeConfig: SchedulingPolicySurface | undefined
  readonly providerOverrides: SchedulingPolicySurfaceOverrides | undefined
}

export type ConcurrencyPolicyRuntimeSnapshot = SchedulingPolicyRuntimeSnapshot

export const captureSchedulingPolicyRuntimeSnapshot = (): Effect.Effect<SchedulingPolicyRuntimeSnapshot, never, never> =>
  Effect.gen(function* () {
    const runtimeConfigOpt = yield* Effect.serviceOption(SchedulingPolicySurfaceTag)
    const overridesOpt = yield* Effect.serviceOption(SchedulingPolicySurfaceOverridesTag)
    const runtimeConfig = Option.isSome(runtimeConfigOpt) ? runtimeConfigOpt.value : undefined
    const providerOverrides = Option.isSome(overridesOpt) ? overridesOpt.value : undefined
    return { runtimeConfig, providerOverrides }
  })

export const captureConcurrencyPolicyRuntimeSnapshot = captureSchedulingPolicyRuntimeSnapshot

const patchFingerprint = (
  patch: SchedulingPolicySurface | SchedulingPolicySurfacePatch | SchedulingPolicySurfaceOverrides | undefined,
): string => {
  if (!patch) return ''
  const threshold = (patch as any).pressureWarningThreshold
  const thresholdCount =
    threshold && typeof threshold === 'object' ? String((threshold as any).backlogCount ?? '') : ''
  const thresholdDuration =
    threshold && typeof threshold === 'object' ? String((threshold as any).backlogDurationMs ?? '') : ''
  return [
    String((patch as any).concurrencyLimit ?? ''),
    String((patch as any).losslessBackpressureCapacity ?? ''),
    String((patch as any).allowUnbounded ?? ''),
    thresholdCount,
    thresholdDuration,
    String((patch as any).warningCooldownMs ?? ''),
  ].join('|')
}

export const makeResolveSchedulingPolicySurface = (args: {
  /** Original options.moduleId (may be undefined); used for module overrides map lookup. */
  readonly moduleId: string | undefined
  /** Optional: one-shot audit diagnostics for unbounded opt-in/blocked. */
  readonly diagnostics?: ConcurrencyDiagnostics
}): ((snapshot?: SchedulingPolicyRuntimeSnapshot) => Effect.Effect<ResolvedSchedulingPolicySurface>) => {
  const builtinConcurrencyLimit: SchedulingPolicyLimit = 16
  const builtinLosslessBackpressureCapacity = 4096
  const builtinAllowUnbounded = false
  const builtinThresholdBacklogCount = 1000
  const builtinThresholdBacklogDurationMs = 5000
  const builtinWarningCooldownMs = 30_000
  let cache: ResolvedPolicyCache | undefined
  const snapshotCache = new WeakMap<SchedulingPolicyRuntimeSnapshot, ResolvedSchedulingPolicySurface>()

  return (snapshot?: SchedulingPolicyRuntimeSnapshot) =>
    Effect.gen(function* () {
      if (snapshot) {
        const cachedFromSnapshot = snapshotCache.get(snapshot)
        if (cachedFromSnapshot) {
          if (args.diagnostics) {
            yield* args.diagnostics.emitUnboundedPolicyIfNeeded({
              policy: cachedFromSnapshot,
              trigger: { kind: 'concurrencyPolicy', name: 'resolve' },
            })
          }
          return cachedFromSnapshot
        }
      }

      let runtimeConfig: SchedulingPolicySurface | undefined
      let providerOverrides: SchedulingPolicySurfaceOverrides | undefined
      if (snapshot) {
        runtimeConfig = snapshot.runtimeConfig
        providerOverrides = snapshot.providerOverrides
      } else {
        const runtimeConfigOpt = yield* Effect.serviceOption(SchedulingPolicySurfaceTag)
        const overridesOpt = yield* Effect.serviceOption(SchedulingPolicySurfaceOverridesTag)
        runtimeConfig = Option.isSome(runtimeConfigOpt) ? runtimeConfigOpt.value : undefined
        providerOverrides = Option.isSome(overridesOpt) ? overridesOpt.value : undefined
      }

      let concurrencyLimit: SchedulingPolicyLimit = builtinConcurrencyLimit
      let concurrencyLimitScope: SchedulingPolicySurfaceConfigScope = 'builtin'
      let lastBoundedConcurrencyLimit = builtinConcurrencyLimit as number
      let lastBoundedConcurrencyLimitScope: SchedulingPolicySurfaceConfigScope = 'builtin'

      let losslessBackpressureCapacity = builtinLosslessBackpressureCapacity
      let allowUnbounded = builtinAllowUnbounded
      let allowUnboundedScope: SchedulingPolicySurfaceConfigScope = 'builtin'
      let thresholdBacklogCount = builtinThresholdBacklogCount
      let thresholdBacklogDurationMs = builtinThresholdBacklogDurationMs
      let warningCooldownMs = builtinWarningCooldownMs

      let configScope: SchedulingPolicySurfaceConfigScope = 'builtin'

      const applyPatch = (
        patch: SchedulingPolicySurface | SchedulingPolicySurfacePatch | SchedulingPolicySurfaceOverrides | undefined,
        scope: SchedulingPolicySurfaceConfigScope,
      ): void => {
        if (!patch) return
        let changed = false

        const limit = normalizeConcurrencyLimit((patch as any).concurrencyLimit)
        if (limit) {
          concurrencyLimit = limit
          concurrencyLimitScope = scope
          if (limit !== 'unbounded') {
            lastBoundedConcurrencyLimit = limit
            lastBoundedConcurrencyLimitScope = scope
          }
          changed = true
        }

        const capacity = normalizePositiveInt((patch as any).losslessBackpressureCapacity)
        if (capacity != null) {
          losslessBackpressureCapacity = capacity
          changed = true
        }

        const allow = normalizeBoolean((patch as any).allowUnbounded)
        if (allow != null) {
          allowUnbounded = allow
          allowUnboundedScope = scope
          changed = true
        }

        const threshold = (patch as any).pressureWarningThreshold
        if (threshold && typeof threshold === 'object') {
          const count = normalizePositiveInt((threshold as any).backlogCount)
          if (count != null) {
            thresholdBacklogCount = count
            changed = true
          }

          const duration = normalizePositiveNumber((threshold as any).backlogDurationMs)
          if (duration != null) {
            thresholdBacklogDurationMs = duration
            changed = true
          }
        }

        const cooldownMs = normalizePositiveNumber((patch as any).warningCooldownMs)
        if (cooldownMs != null) {
          warningCooldownMs = cooldownMs
          changed = true
        }

        if (changed) {
          configScope = scope
        }
      }

      const moduleId = args.moduleId
      const runtimeModulePatch: SchedulingPolicySurfacePatch | undefined =
        moduleId && runtimeConfig?.overridesByModuleId ? runtimeConfig.overridesByModuleId[moduleId] : undefined
      const providerModulePatch: SchedulingPolicySurfacePatch | undefined =
        moduleId && providerOverrides?.overridesByModuleId ? providerOverrides.overridesByModuleId[moduleId] : undefined

      const runtimeDefaultFingerprint = patchFingerprint(runtimeConfig)
      const runtimeModuleFingerprint = patchFingerprint(runtimeModulePatch)
      const providerDefaultFingerprint = patchFingerprint(providerOverrides)
      const providerModuleFingerprint = patchFingerprint(providerModulePatch)

      if (
        cache &&
        cache.runtimeDefaultFingerprint === runtimeDefaultFingerprint &&
        cache.runtimeModuleFingerprint === runtimeModuleFingerprint &&
        cache.providerDefaultFingerprint === providerDefaultFingerprint &&
        cache.providerModuleFingerprint === providerModuleFingerprint
      ) {
        if (args.diagnostics) {
          yield* args.diagnostics.emitUnboundedPolicyIfNeeded({
            policy: cache.resolved,
            trigger: { kind: 'concurrencyPolicy', name: 'resolve' },
          })
        }
        if (snapshot) {
          snapshotCache.set(snapshot, cache.resolved)
        }
        return cache.resolved
      }

      // priority: provider > runtime_module > runtime_default > builtin
      applyPatch(runtimeConfig, 'runtime_default')
      applyPatch(runtimeModulePatch, 'runtime_module')
      applyPatch(providerOverrides, 'provider')
      applyPatch(providerModulePatch, 'provider')

      const requestedConcurrencyLimit = concurrencyLimit
      const requestedConcurrencyLimitScope = concurrencyLimitScope

      // Unbounded gate: effective unbounded requires an explicit allowUnbounded=true (FR-004).
      if (typeof concurrencyLimit === 'string' && !allowUnbounded) {
        concurrencyLimit = lastBoundedConcurrencyLimit
        concurrencyLimitScope = lastBoundedConcurrencyLimitScope
      }

      // NOTE: diagnostics may add implementation-level metrics (e.g. "saturated duration"); the resolver only decides configuration.
      const resolved: ResolvedSchedulingPolicySurface = {
        concurrencyLimit,
        losslessBackpressureCapacity,
        allowUnbounded,
        pressureWarningThreshold: {
          backlogCount: thresholdBacklogCount,
          backlogDurationMs: thresholdBacklogDurationMs,
        },
        warningCooldownMs,
        configScope,
        concurrencyLimitScope,
        requestedConcurrencyLimit,
        requestedConcurrencyLimitScope,
        allowUnboundedScope,
      }

      if (args.diagnostics) {
        yield* args.diagnostics.emitUnboundedPolicyIfNeeded({
          policy: resolved,
          trigger: { kind: 'concurrencyPolicy', name: 'resolve' },
        })
      }

      cache = {
        runtimeConfigRef: runtimeConfig,
        runtimeModulePatchRef: runtimeModulePatch,
        providerOverridesRef: providerOverrides,
        providerModulePatchRef: providerModulePatch,
        runtimeDefaultFingerprint,
        runtimeModuleFingerprint,
        providerDefaultFingerprint,
        providerModuleFingerprint,
        resolved,
      }
      if (snapshot) {
        snapshotCache.set(snapshot, resolved)
      }

      return resolved
    })
}

export const makeResolveConcurrencyPolicy = makeResolveSchedulingPolicySurface
