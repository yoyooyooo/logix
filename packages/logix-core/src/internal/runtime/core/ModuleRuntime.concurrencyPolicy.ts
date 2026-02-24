import { Effect, Option } from 'effect'
import type { ConcurrencyDiagnostics } from './ConcurrencyDiagnostics.js'
import {
  ConcurrencyPolicyOverridesTag,
  ConcurrencyPolicyTag,
  type ConcurrencyLimit,
  type ConcurrencyPolicy,
  type ConcurrencyPolicyOverrides,
  type ConcurrencyPolicyPatch,
} from './env.js'
import { normalizeBoolean, normalizePositiveInt, normalizePositiveNumber } from './normalize.js'

export type ConcurrencyPolicyConfigScope = 'builtin' | 'runtime_default' | 'runtime_module' | 'provider'

export type ResolvedConcurrencyPolicy = {
  readonly concurrencyLimit: ConcurrencyLimit
  readonly losslessBackpressureCapacity: number
  readonly allowUnbounded: boolean
  readonly pressureWarningThreshold: {
    readonly backlogCount: number
    readonly backlogDurationMs: number
  }
  readonly warningCooldownMs: number
  readonly configScope: ConcurrencyPolicyConfigScope
  /** Field-level scope for the effective concurrency limit. */
  readonly concurrencyLimitScope: ConcurrencyPolicyConfigScope
  /** The originally requested concurrency limit (for explaining the unbounded gate). */
  readonly requestedConcurrencyLimit: ConcurrencyLimit
  /** Field-level scope for the originally requested concurrency limit. */
  readonly requestedConcurrencyLimitScope: ConcurrencyPolicyConfigScope
  /** Field-level scope for allowUnbounded. */
  readonly allowUnboundedScope: ConcurrencyPolicyConfigScope
}

const normalizeConcurrencyLimit = (v: unknown): ConcurrencyLimit | undefined =>
  v === 'unbounded' ? 'unbounded' : normalizePositiveInt(v)

type ResolvedPolicyCache = {
  readonly runtimeDefaultFingerprint: string
  readonly runtimeModuleFingerprint: string
  readonly providerDefaultFingerprint: string
  readonly providerModuleFingerprint: string
  readonly resolved: ResolvedConcurrencyPolicy
}

const patchFingerprint = (
  patch: ConcurrencyPolicy | ConcurrencyPolicyPatch | ConcurrencyPolicyOverrides | undefined,
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

export const makeResolveConcurrencyPolicy = (args: {
  /** Original options.moduleId (may be undefined); used for module overrides map lookup. */
  readonly moduleId: string | undefined
  /** Optional: one-shot audit diagnostics for unbounded opt-in/blocked. */
  readonly diagnostics?: ConcurrencyDiagnostics
}): (() => Effect.Effect<ResolvedConcurrencyPolicy>) => {
  const builtinConcurrencyLimit: ConcurrencyLimit = 16
  const builtinLosslessBackpressureCapacity = 4096
  const builtinAllowUnbounded = false
  const builtinThresholdBacklogCount = 1000
  const builtinThresholdBacklogDurationMs = 5000
  const builtinWarningCooldownMs = 30_000
  let cache: ResolvedPolicyCache | undefined

  return () =>
    Effect.gen(function* () {
      const runtimeConfigOpt = yield* Effect.serviceOption(ConcurrencyPolicyTag)
      const overridesOpt = yield* Effect.serviceOption(ConcurrencyPolicyOverridesTag)

      const runtimeConfig: ConcurrencyPolicy | undefined = Option.isSome(runtimeConfigOpt)
        ? runtimeConfigOpt.value
        : undefined
      const providerOverrides: ConcurrencyPolicyOverrides | undefined = Option.isSome(overridesOpt)
        ? overridesOpt.value
        : undefined

      let concurrencyLimit: ConcurrencyLimit = builtinConcurrencyLimit
      let concurrencyLimitScope: ConcurrencyPolicyConfigScope = 'builtin'
      let lastBoundedConcurrencyLimit = builtinConcurrencyLimit as number
      let lastBoundedConcurrencyLimitScope: ConcurrencyPolicyConfigScope = 'builtin'

      let losslessBackpressureCapacity = builtinLosslessBackpressureCapacity
      let allowUnbounded = builtinAllowUnbounded
      let allowUnboundedScope: ConcurrencyPolicyConfigScope = 'builtin'
      let thresholdBacklogCount = builtinThresholdBacklogCount
      let thresholdBacklogDurationMs = builtinThresholdBacklogDurationMs
      let warningCooldownMs = builtinWarningCooldownMs

      let configScope: ConcurrencyPolicyConfigScope = 'builtin'

      const applyPatch = (
        patch: ConcurrencyPolicy | ConcurrencyPolicyPatch | ConcurrencyPolicyOverrides | undefined,
        scope: ConcurrencyPolicyConfigScope,
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
      const runtimeModulePatch: ConcurrencyPolicyPatch | undefined =
        moduleId && runtimeConfig?.overridesByModuleId ? runtimeConfig.overridesByModuleId[moduleId] : undefined
      const providerModulePatch: ConcurrencyPolicyPatch | undefined =
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
      const resolved: ResolvedConcurrencyPolicy = {
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
        runtimeDefaultFingerprint,
        runtimeModuleFingerprint,
        providerDefaultFingerprint,
        providerModuleFingerprint,
        resolved,
      }

      return resolved
    })
}
