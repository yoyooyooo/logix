import { describe, it, expect } from '@effect/vitest'
import { Effect, Layer, Stream } from 'effect'
import * as Debug from '../../../src/internal/debug-api.js'
import * as Middleware from '../../../src/internal/middleware.js'
import * as EffectOpCore from '../../../src/internal/runtime/core/EffectOpCore.js'
import * as FlowRuntime from '../../../src/internal/runtime/core/FlowRuntime.js'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const getTraceMeta = (event: Debug.Event): Record<string, unknown> | undefined => {
  const record = event as unknown as Record<string, unknown>
  const data = record.data
  if (!isRecord(data)) return undefined
  const meta = data.meta
  return isRecord(meta) ? meta : undefined
}

const getTraceName = (event: Debug.Event): string | undefined => {
  const record = event as unknown as Record<string, unknown>
  const data = record.data
  if (!isRecord(data)) return undefined
  const name = data.name
  return typeof name === 'string' ? name : undefined
}

describe('FlowRuntime: diagnostics budget envelope', () => {
  it.effect('flow.run should carry budgetEnvelope/degrade in EffectOp meta', () =>
    Effect.gen(function* () {
      const flow = FlowRuntime.make<any, never>(undefined as any)
      const ring = Debug.makeRingBufferSink(64)

      const middlewareLayer = Layer.succeed(EffectOpCore.EffectOpMiddlewareTag, {
        stack: [Middleware.makeDebugObserver()],
      })

      const program = flow
        .run((n: number) => Effect.sync(() => n))(
          Stream.make(1, 2),
        )
        .pipe(
          Effect.provide(
            Layer.mergeAll(
              Debug.replace([ring.sink]),
              Debug.diagnosticsLevel('light'),
              middlewareLayer,
            ),
          ),
        )

      yield* program

      const trace = ring.getSnapshot().filter((e) => e.type === 'trace:effectop') as Array<Debug.Event>
      const runEvents = trace.filter((e) => getTraceName(e) === 'flow.run')
      const runMetas = runEvents
        .map((e) => getTraceMeta(e))
        .filter((meta): meta is Record<string, unknown> => isRecord(meta))
      const runBudgetEnvelopes = runMetas
        .map((meta) => meta.budgetEnvelope)
        .filter((envelope): envelope is Record<string, unknown> => isRecord(envelope))
      const degrade = runMetas
        .map((meta) => meta.degrade)
        .find((marker): marker is Record<string, unknown> => isRecord(marker))
      const runIds = runBudgetEnvelopes
        .map((envelope) => envelope.runId)
        .filter((runId): runId is string => typeof runId === 'string')

      expect(runEvents.length).toBe(2)
      expect(runBudgetEnvelopes.every((envelope) => envelope.contract === 'diagnostics_budget.v1')).toBe(true)
      expect(runBudgetEnvelopes.every((envelope) => envelope.domain === 'flow')).toBe(true)
      expect(new Set(runIds).size).toBe(2)
      expect(degrade?.degraded).toBe(false)
    }),
  )
})
