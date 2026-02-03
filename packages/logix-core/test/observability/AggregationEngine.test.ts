import { describe } from 'vitest'
import { expect, it } from '@effect/vitest'
import { Effect } from 'effect'
import type { JsonValue } from '../../src/internal/observability/jsonValue.js'
import * as Logix from '../../src/index.js'

describe('Observability aggregation engine', () => {
  it.effect('should be deterministic (same input -> same output) and sort by seq', () =>
    Effect.gen(function* () {
      const payload1: JsonValue = {
        eventId: 'i-1::e1',
        eventSeq: 1,
        moduleId: 'M',
        instanceId: 'i-1',
        txnSeq: 0,
        timestamp: 10,
        kind: 'lifecycle',
        label: 'module:init',
      }

      const payload2: JsonValue = {
        eventId: 'i-1::e2',
        eventSeq: 2,
        moduleId: 'M',
        instanceId: 'i-1',
        txnSeq: 1,
        txnId: 'i-1::t1',
        timestamp: 20,
        kind: 'state',
        label: 'state:update',
        meta: {
          state: { count: 1 },
          traitSummary: { dirty: { rootCount: 1 } },
        },
      }

      const events: ReadonlyArray<Logix.Observability.ObservationEnvelope> = [
        {
          protocolVersion: 'v1',
          runId: 'run:test:agg',
          seq: 2,
          timestamp: 20,
          type: 'debug:event',
          payload: payload2,
        },
        {
          protocolVersion: 'v1',
          runId: 'run:test:agg',
          seq: 1,
          timestamp: 10,
          type: 'debug:event',
          payload: payload1,
        },
      ]

      const a = Logix.Observability.aggregateObservationEnvelopes({ runId: 'run:test:agg', protocolVersion: 'v1', events })
      const b = Logix.Observability.aggregateObservationEnvelopes({ runId: 'run:test:agg', protocolVersion: 'v1', events })

      expect(a).toEqual(b)
      expect(a.timeline.map((e) => e.seq)).toEqual([1, 2])
      expect(a.instances).toEqual([['unknown::M', 1]])
      expect(a.latestStates).toEqual([['unknown::M::i-1', { count: 1 }]])
    }),
  )
})

