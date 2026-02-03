import { describe } from 'vitest'
import { expect, it } from '@effect/vitest'
import { Effect } from 'effect'
import * as Logix from '../../src/index.js'

describe('Observability.ObservationEnvelope codec', () => {
  it.effect('parse should validate shape and support defaults for compat', () =>
    Effect.gen(function* () {
      const parsed = Logix.Observability.parseObservationEnvelope(
        {
          // compat: protocolVersion/runId may be injected by the container (e.g. EvidencePackage import)
          seq: 1,
          timestamp: 123,
          type: 'debug:event',
          payload: null,
        },
        { protocolVersion: 'v1', runId: 'run:test' },
      )

      expect(parsed).toEqual({
        protocolVersion: 'v1',
        runId: 'run:test',
        seq: 1,
        timestamp: 123,
        type: 'debug:event',
        payload: null,
      })

      expect(
        Logix.Observability.parseObservationEnvelope(
          {
            protocolVersion: 'v1',
            runId: 'run:test',
            seq: 0,
            timestamp: 123,
            type: 'debug:event',
            payload: null,
          },
          undefined,
        ),
      ).toBeUndefined()

      expect(
        Logix.Observability.parseObservationEnvelope(
          {
            protocolVersion: 'v1',
            runId: 'run:test',
            seq: 1,
            timestamp: Number.NaN,
            type: 'debug:event',
            payload: null,
          },
          undefined,
        ),
      ).toBeUndefined()

      expect(
        Logix.Observability.parseObservationEnvelope(
          {
            protocolVersion: 'v1',
            runId: 'run:test',
            seq: 1,
            timestamp: 123,
            type: 'debug:event',
            payload: () => undefined,
          },
          undefined,
        ),
      ).toBeUndefined()
    }),
  )

  it.effect('sort should order by seq (stable key)', () =>
    Effect.gen(function* () {
      const a: Logix.Observability.ObservationEnvelope = {
        protocolVersion: 'v1',
        runId: 'run:test',
        seq: 2,
        timestamp: 2,
        type: 'debug:event',
        payload: null,
      }
      const b: Logix.Observability.ObservationEnvelope = {
        protocolVersion: 'v1',
        runId: 'run:test',
        seq: 1,
        timestamp: 1,
        type: 'debug:event',
        payload: null,
      }

      expect(Logix.Observability.sortObservationEnvelopes([a, b]).map((e) => e.seq)).toEqual([1, 2])
    }),
  )
})

