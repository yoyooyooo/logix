import { describe, expect, it } from '@effect/vitest'
import { Effect } from 'effect'
import { readFileSync } from 'node:fs'
import * as ConcurrencyDiagnostics from '../../../src/internal/runtime/core/ConcurrencyDiagnostics.js'
import * as Debug from '../../../src/Debug.js'

const readJson = (url: URL): any => JSON.parse(readFileSync(url, 'utf8'))

describe('contracts (021): limit unbounded concurrency', () => {
  it('parses schemas', () => {
    const policySchema = readJson(
      new URL(
        '../../../../../specs/021-limit-unbounded-concurrency/contracts/concurrency-policy.schema.json',
        import.meta.url,
      ),
    )
    const diagnosticDetailsSchema = readJson(
      new URL(
        '../../../../../specs/021-limit-unbounded-concurrency/contracts/concurrency-diagnostic-details.schema.json',
        import.meta.url,
      ),
    )

    expect(String(policySchema.$schema)).toContain('json-schema')
    expect(policySchema.title).toBe('ConcurrencyPolicy')

    expect(String(diagnosticDetailsSchema.$schema)).toContain('json-schema')
    expect(diagnosticDetailsSchema.title).toBe('ConcurrencyDiagnosticDetails')
  })

  it.effect('emitted diagnostic.trigger.details should be slim, serializable, and schema-aligned', () =>
    Effect.gen(function* () {
      const diagnosticDetailsSchema = readJson(
        new URL(
          '../../../../../specs/021-limit-unbounded-concurrency/contracts/concurrency-diagnostic-details.schema.json',
          import.meta.url,
        ),
      )

      const allowedKeys = new Set<string>(Object.keys(diagnosticDetailsSchema.properties ?? {}))
      const requiredKeys = new Set<string>(diagnosticDetailsSchema.required ?? [])

      const validateDetails = (details: unknown): void => {
        expect(details).toBeTypeOf('object')
        expect(details).not.toBeNull()

        const record = details as Record<string, unknown>

        for (const key of requiredKeys) {
          expect(Object.prototype.hasOwnProperty.call(record, key)).toBe(true)
        }
        for (const key of Object.keys(record)) {
          expect(allowedKeys.has(key)).toBe(true)
        }

        const configScope = record.configScope
        expect(configScope).toBeTypeOf('string')
        expect((diagnosticDetailsSchema.properties?.configScope?.enum ?? []).includes(configScope)).toBe(true)

        const limit = record.limit
        expect(limit === 'unbounded' || (typeof limit === 'number' && limit >= 1)).toBe(true)

        // JSON-serialization hard gate (slim and exportable).
        const json = JSON.stringify(record)
        const parsed = JSON.parse(json)
        expect(typeof parsed).toBe('object')
        expect(parsed).not.toBeNull()
      }

      const ring = Debug.makeRingBufferSink(64)

      const mkPolicy = (overrides?: Partial<any>): any => ({
        concurrencyLimit: 16,
        losslessBackpressureCapacity: 4096,
        allowUnbounded: false,
        pressureWarningThreshold: { backlogCount: 1, backlogDurationMs: 1 },
        warningCooldownMs: 10,
        configScope: 'runtime_default',
        concurrencyLimitScope: 'runtime_default',
        requestedConcurrencyLimit: 16,
        requestedConcurrencyLimitScope: 'runtime_default',
        allowUnboundedScope: 'runtime_default',
        ...(overrides ?? {}),
      })

      const program = Effect.locally(Debug.internal.currentDebugSinks as any, [ring.sink as Debug.Sink])(
        Effect.gen(function* () {
          const diagnostics = yield* ConcurrencyDiagnostics.make({
            moduleId: 'Contracts021',
            instanceId: 'i-contracts-021',
          })

          yield* diagnostics.emitPressureIfNeeded({
            policy: mkPolicy({
              pressureWarningThreshold: { backlogCount: 1, backlogDurationMs: 1 },
              warningCooldownMs: 1,
            }),
            trigger: { kind: 'txnQueue', name: 'enqueueTransaction' },
            backlogCount: 1,
            saturatedDurationMs: 1,
            inFlight: 0,
          })

          yield* diagnostics.emitUnboundedPolicyIfNeeded({
            policy: mkPolicy({
              concurrencyLimit: 'unbounded',
              allowUnbounded: true,
              requestedConcurrencyLimit: 'unbounded',
              configScope: 'provider',
              concurrencyLimitScope: 'provider',
              requestedConcurrencyLimitScope: 'provider',
              allowUnboundedScope: 'provider',
            }),
            trigger: { kind: 'concurrencyPolicy', name: 'resolve' },
          })

          yield* diagnostics.emitUnboundedPolicyIfNeeded({
            policy: mkPolicy({
              concurrencyLimit: 16,
              allowUnbounded: false,
              requestedConcurrencyLimit: 'unbounded',
              configScope: 'runtime_default',
              concurrencyLimitScope: 'runtime_default',
              requestedConcurrencyLimitScope: 'provider',
              allowUnboundedScope: 'builtin',
            }),
            trigger: { kind: 'concurrencyPolicy', name: 'resolve' },
          })
        }),
      )

      yield* program

      const events = ring.getSnapshot().filter((e) => e.type === 'diagnostic' && e.code.startsWith('concurrency::'))

      expect(events.length).toBe(3)

      for (const e of events as any) {
        validateDetails(e.trigger?.details)
      }
    }),
  )
})
