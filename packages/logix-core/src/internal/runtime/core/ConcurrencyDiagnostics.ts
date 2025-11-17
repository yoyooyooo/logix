import { Effect, Ref } from 'effect'
import * as Debug from './DebugSink.js'
import type { RuntimeInternalsResolvedConcurrencyPolicy } from './RuntimeInternals.js'

type PressureKey = string

type PressureCooldownState = {
  readonly lastEmittedAtMs: number
  readonly suppressedCount: number
}

const keyOf = (trigger: Debug.TriggerRef): PressureKey =>
  `${trigger.kind}::${typeof trigger.name === 'string' ? trigger.name : ''}`

const nowMs = Effect.clockWith((clock) => clock.currentTimeMillis)

export interface ConcurrencyDiagnostics {
  readonly emitPressureIfNeeded: (args: {
    readonly policy: RuntimeInternalsResolvedConcurrencyPolicy
    readonly trigger: Debug.TriggerRef
    readonly backlogCount?: number
    readonly inFlight?: number
    readonly saturatedDurationMs?: number
  }) => Effect.Effect<void>
  readonly emitUnboundedPolicyIfNeeded: (args: {
    readonly policy: RuntimeInternalsResolvedConcurrencyPolicy
    readonly trigger: Debug.TriggerRef
  }) => Effect.Effect<void>
}

export const make = (args: {
  readonly moduleId: string | undefined
  readonly instanceId: string
}): Effect.Effect<ConcurrencyDiagnostics> =>
  Effect.gen(function* () {
    const pressureCooldownByKeyRef = yield* Ref.make<Readonly<Record<PressureKey, PressureCooldownState>>>({})

    const unboundedEnabledEmittedRef = yield* Ref.make(false)
    const unboundedBlockedEmittedRef = yield* Ref.make(false)

    const emitPressureIfNeeded: ConcurrencyDiagnostics['emitPressureIfNeeded'] = (inArgs) =>
      Effect.gen(function* () {
        const policy = inArgs.policy

        const backlogCount = inArgs.backlogCount ?? 0
        const saturatedDurationMs = inArgs.saturatedDurationMs ?? 0

        const threshold = policy.pressureWarningThreshold
        const meetsThreshold =
          backlogCount >= threshold.backlogCount || saturatedDurationMs >= threshold.backlogDurationMs

        if (!meetsThreshold) {
          return
        }

        const cooldownMs = policy.warningCooldownMs
        const now = yield* nowMs
        const key = keyOf(inArgs.trigger)

        const decision = yield* Ref.modify(
          pressureCooldownByKeyRef,
          (
            byKey,
          ): readonly [
            { readonly _tag: 'emit'; readonly suppressedCount: number } | { readonly _tag: 'suppress' },
            Readonly<Record<PressureKey, PressureCooldownState>>,
          ] => {
            const prev = byKey[key]
            if (prev && now - prev.lastEmittedAtMs < cooldownMs) {
              return [
                { _tag: 'suppress' },
                {
                  ...byKey,
                  [key]: {
                    lastEmittedAtMs: prev.lastEmittedAtMs,
                    suppressedCount: prev.suppressedCount + 1,
                  },
                },
              ] as const
            }

            const suppressedCount = prev?.suppressedCount ?? 0
            return [
              { _tag: 'emit', suppressedCount },
              {
                ...byKey,
                [key]: {
                  lastEmittedAtMs: now,
                  suppressedCount: 0,
                },
              },
            ] as const
          },
        )

        if (decision._tag === 'suppress') {
          return
        }

        const details: Record<string, unknown> = {
          configScope: policy.concurrencyLimitScope,
          limit: policy.concurrencyLimit,
          backlogCount,
          saturatedDurationMs,
          threshold: {
            backlogCount: threshold.backlogCount,
            backlogDurationMs: threshold.backlogDurationMs,
          },
          cooldownMs,
          degradeStrategy: decision.suppressedCount > 0 ? ('cooldown' as const) : ('none' as const),
          suppressedCount: decision.suppressedCount,
          sampleRate: 1,
          droppedCount: 0,
        }
        if (typeof inArgs.inFlight === 'number' && Number.isFinite(inArgs.inFlight)) {
          details.inFlight = inArgs.inFlight
        }

        yield* Debug.record({
          type: 'diagnostic',
          moduleId: args.moduleId,
          instanceId: args.instanceId,
          code: 'concurrency::pressure',
          severity: 'warning',
          message: 'Concurrency pressure detected (backpressure / saturation).',
          hint: 'Reduce trigger frequency, split work, switch to runLatest or batch processing; or tune concurrency/backpressure limits via concurrencyPolicy.',
          kind: 'concurrency:pressure',
          trigger: {
            kind: inArgs.trigger.kind,
            name: inArgs.trigger.name,
            details,
          },
        })
      })

    const emitUnboundedPolicyIfNeeded: ConcurrencyDiagnostics['emitUnboundedPolicyIfNeeded'] = (inArgs) =>
      Effect.gen(function* () {
        const policy = inArgs.policy

        // 1) effective unbounded: emit only once (SC-004 / FR-004)
        if (policy.concurrencyLimit === 'unbounded' && policy.allowUnbounded === true) {
          const shouldEmit = yield* Ref.modify(unboundedEnabledEmittedRef, (emitted) =>
            emitted ? ([false, true] as const) : ([true, true] as const),
          )
          if (!shouldEmit) {
            return
          }

          const details: Record<string, unknown> = {
            configScope: policy.concurrencyLimitScope,
            limit: policy.concurrencyLimit,
          }

          yield* Debug.record({
            type: 'diagnostic',
            moduleId: args.moduleId,
            instanceId: args.instanceId,
            code: 'concurrency::unbounded_enabled',
            severity: 'error',
            message: 'Unbounded concurrency is enabled (risk: resource exhaustion).',
            hint:
              'Enable only for short-lived, controlled, cancelable fan-out; prefer bounded concurrency and increase gradually; ' +
              'avoid piling up long-running or never-ending tasks under unbounded.',
            kind: 'concurrency:unbounded_enabled',
            trigger: {
              kind: inArgs.trigger.kind,
              name: inArgs.trigger.name,
              details,
            },
          })
          return
        }

        // 2) requested unbounded without explicit allow: fall back to bounded + diagnostic (T023)
        const requestedUnbounded =
          policy.requestedConcurrencyLimit === 'unbounded' && policy.concurrencyLimit !== 'unbounded'

        if (!requestedUnbounded) {
          return
        }

        const shouldEmit = yield* Ref.modify(unboundedBlockedEmittedRef, (emitted) =>
          emitted ? ([false, true] as const) : ([true, true] as const),
        )
        if (!shouldEmit) {
          return
        }

        const details: Record<string, unknown> = {
          configScope: policy.requestedConcurrencyLimitScope,
          limit: policy.requestedConcurrencyLimit,
        }

        yield* Debug.record({
          type: 'diagnostic',
          moduleId: args.moduleId,
          instanceId: args.instanceId,
          code: 'concurrency::unbounded_requires_opt_in',
          severity: 'error',
          message: 'Unbounded concurrency was requested but is not allowed; falling back to bounded concurrency.',
          hint:
            'If you really need unbounded, explicitly set concurrencyPolicy.allowUnbounded = true; ' +
            'otherwise set concurrencyPolicy.concurrencyLimit to a positive integer limit.',
          kind: 'concurrency:unbounded_blocked',
          trigger: {
            kind: inArgs.trigger.kind,
            name: inArgs.trigger.name,
            details,
          },
        })
      })

    return { emitPressureIfNeeded, emitUnboundedPolicyIfNeeded }
  })
