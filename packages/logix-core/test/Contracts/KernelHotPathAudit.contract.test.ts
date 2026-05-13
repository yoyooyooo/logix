import { describe, expect, it } from '@effect/vitest'
import { Effect } from 'effect'
import {
  makeKernelHotPathAuditSink,
  recordKernelHotPathFallback,
  withKernelHotPathAuditSink,
} from '../../src/internal/runtime/core/KernelHotPathAudit.js'

describe('KernelHotPathAudit internal contract', () => {
  it.effect('records fallback counters only when an internal sink is installed', () =>
    Effect.gen(function* () {
      recordKernelHotPathFallback('source_dirty_gate', 'dirty_all')
      recordKernelHotPathFallback('selector_dirty_route', 'missing_registry')

      const sink = makeKernelHotPathAuditSink()
      yield* withKernelHotPathAuditSink(
        sink,
        Effect.sync(() => {
          recordKernelHotPathFallback('source_dirty_gate', 'dirty_all')
          recordKernelHotPathFallback('source_dirty_gate', 'dirty_all')
          recordKernelHotPathFallback('selector_dirty_route', 'missing_registry')
          recordKernelHotPathFallback('converge_dirty_plan', 'legacy_dirty_input')
        }),
      )

      expect(sink.snapshot()).toEqual({
        total: 4,
        byArea: {
          source_dirty_gate: 2,
          selector_dirty_route: 1,
          converge_dirty_plan: 1,
        },
        byReason: {
          dirty_all: 2,
          missing_registry: 1,
          legacy_dirty_input: 1,
        },
      })

      recordKernelHotPathFallback('source_dirty_gate', 'dirty_all')
      expect(sink.snapshot().total).toBe(4)
    }),
  )
})
