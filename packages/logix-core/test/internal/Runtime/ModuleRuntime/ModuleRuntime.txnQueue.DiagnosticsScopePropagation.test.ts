import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Effect, FiberRef } from 'effect'
import type { ConcurrencyDiagnostics } from '../../../../src/internal/runtime/core/ConcurrencyDiagnostics.js'
import type { ResolvedConcurrencyPolicy } from '../../../../src/internal/runtime/ModuleRuntime.concurrencyPolicy.js'
import { makeEnqueueTransaction } from '../../../../src/internal/runtime/ModuleRuntime.txnQueue.js'
import * as EffectOpCore from '../../../../src/internal/runtime/core/EffectOpCore.js'
import * as Debug from '../../../../src/Debug.js'

describe('ModuleRuntime.txnQueue (diagnostics scope propagation)', () => {
  it.scoped(
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
          const linkId = yield* FiberRef.get(EffectOpCore.currentLinkId)
          const runtimeLabel = yield* FiberRef.get(Debug.internal.currentRuntimeLabel as any)
          const diagnosticsLevel = yield* FiberRef.get(Debug.internal.currentDiagnosticsLevel as any)
          const debugSinks = (yield* FiberRef.get(
            Debug.internal.currentDebugSinks as any,
          )) as unknown as ReadonlyArray<Debug.Sink>

          yield* Debug.record({
            type: 'trace:txnQueue',
            moduleId: 'M',
            instanceId: 'i-1',
          } as any)

          return {
            linkId,
            runtimeLabel,
            diagnosticsLevel,
            debugSinks: debugSinks as ReadonlyArray<Debug.Sink>,
          }
        })

        const p1 = Effect.locally(
          EffectOpCore.currentLinkId,
          'link-1',
        )(
          Effect.locally(
            Debug.internal.currentRuntimeLabel as any,
            'R1',
          )(
            Effect.locally(
              Debug.internal.currentDiagnosticsLevel as any,
              'full',
            )(Effect.locally(Debug.internal.currentDebugSinks as any, [sink1])(enqueueTransaction(taskEffect) as any)),
          ),
        )

        const p2 = Effect.locally(
          EffectOpCore.currentLinkId,
          'link-2',
        )(
          Effect.locally(
            Debug.internal.currentRuntimeLabel as any,
            'R2',
          )(
            Effect.locally(
              Debug.internal.currentDiagnosticsLevel as any,
              'light',
            )(Effect.locally(Debug.internal.currentDebugSinks as any, [sink2])(enqueueTransaction(taskEffect) as any)),
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

        expect(events1).toHaveLength(1)
        expect((events1[0] as any).runtimeLabel).toBe('R1')

        expect(events2).toHaveLength(1)
        expect((events2[0] as any).runtimeLabel).toBe('R2')
      }) as any,
  )
})
