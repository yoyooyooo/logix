import { describe } from '@effect/vitest'
import { it, expect } from '@effect/vitest'
import { Effect } from 'effect'
import type { ConcurrencyDiagnostics } from '../../../../src/internal/runtime/core/ConcurrencyDiagnostics.js'
import type { ResolvedConcurrencyPolicy } from '../../../../src/internal/runtime/ModuleRuntime.concurrencyPolicy.js'
import { makeEnqueueTransaction } from '../../../../src/internal/runtime/ModuleRuntime.txnQueue.js'
import * as EffectOpCore from '../../../../src/internal/runtime/core/EffectOpCore.js'
import * as Debug from '../../../../src/Debug.js'

describe('ModuleRuntime.txnQueue (diagnostics scope propagation)', () => {
  it.effect(
    'enqueueTransaction should propagate linkId/runtimeLabel/diagnosticsLevel/debugSinks without leaking across calls',
    () =>
      Effect.gen(function* () {
        const policy: ResolvedConcurrencyPolicy = {
          concurrencyLimit: 16,
          losslessBackpressureCapacity: 16,
          allowUnbounded: false,
          pressureWarningThreshold: {
            backlogCount: 1000,
            backlogDurationMs: 5000,
          },
          warningCooldownMs: 30_000,
          configScope: 'builtin',
          concurrencyLimitScope: 'builtin',
          requestedConcurrencyLimit: 16,
          requestedConcurrencyLimitScope: 'builtin',
          allowUnboundedScope: 'builtin',
        }

        const diagnostics: ConcurrencyDiagnostics = {
          emitPressureIfNeeded: () => Effect.void,
          emitUnboundedPolicyIfNeeded: () => Effect.void,
        }

        const enqueueTransaction = yield* makeEnqueueTransaction({
          moduleId: 'M',
          instanceId: 'i-1',
          resolveConcurrencyPolicy: () => Effect.succeed(policy),
          diagnostics,
        })

        const events1: Debug.Event[] = []
        const sink1: Debug.Sink = {
          record: (event) =>
            Effect.sync(() => {
              events1.push(event)
            }),
        }

        const events2: Debug.Event[] = []
        const sink2: Debug.Sink = {
          record: (event) =>
            Effect.sync(() => {
              events2.push(event)
            }),
        }

        const taskEffect = Effect.gen(function* () {
          const linkId = yield* EffectOpCore.currentLinkId
          const runtimeLabel = yield* Effect.service(Debug.internal.currentRuntimeLabel).pipe(Effect.orDie)
          const diagnosticsLevel = yield* Effect.service(Debug.internal.currentDiagnosticsLevel).pipe(Effect.orDie)
          const debugSinks = yield* Effect.service(Debug.internal.currentDebugSinks).pipe(Effect.orDie)

          yield* Debug.record({
            type: 'trace:txnQueue',
            moduleId: 'M',
            instanceId: 'i-1',
          } as any)

          return {
            linkId,
            runtimeLabel,
            diagnosticsLevel,
            debugSinks,
          }
        })

        const p1 = enqueueTransaction(
          Effect.provideService(
            Effect.provideService(
              Effect.provideService(
                Effect.provideService(taskEffect, Debug.internal.currentDebugSinks, [sink1]),
                Debug.internal.currentDiagnosticsLevel,
                'full',
              ),
              Debug.internal.currentRuntimeLabel,
              'R1',
            ),
            EffectOpCore.currentLinkId,
            'link-1',
          ),
        )

        const p2 = enqueueTransaction(
          Effect.provideService(
            Effect.provideService(
              Effect.provideService(
                Effect.provideService(taskEffect, Debug.internal.currentDebugSinks, [sink2]),
                Debug.internal.currentDiagnosticsLevel,
                'light',
              ),
              Debug.internal.currentRuntimeLabel,
              'R2',
            ),
            EffectOpCore.currentLinkId,
            'link-2',
          ),
        )

        const [r1, r2] = (yield* Effect.all([p1, p2] as any, { concurrency: 2 })) as any

        expect(r1.linkId).toBe('link-1')
        expect(r1.runtimeLabel).toBe('R1')
        expect(r1.diagnosticsLevel).toBe('full')
        expect(r1.debugSinks[0]).toBe(sink1)

        expect(r2.linkId).toBe('link-2')
        expect(r2.runtimeLabel).toBe('R2')
        expect(r2.diagnosticsLevel).toBe('light')
        expect(r2.debugSinks[0]).toBe(sink2)

        expect(events1.length).toBeGreaterThan(0)
        for (const event of events1) {
          expect((event as any).runtimeLabel).toBe('R1')
        }

        expect(events2.length).toBeGreaterThan(0)
        for (const event of events2) {
          expect((event as any).runtimeLabel).toBe('R2')
        }
      }) as any,
  )
})
