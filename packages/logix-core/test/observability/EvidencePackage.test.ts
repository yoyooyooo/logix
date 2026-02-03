import { describe } from 'vitest'
import { expect, it } from '@effect/vitest'
import { Effect } from 'effect'
import * as Logix from '../../src/index.js'

describe('Observability.EvidencePackage', () => {
  it.effect('should preserve recording window semantics (seq may not start at 1 and may have gaps)', () =>
    Effect.gen(function* () {
      const pkg = Logix.Observability.exportEvidencePackage({
        protocolVersion: 'v1',
        runId: 'run:test:window',
        source: { host: 'vitest' },
        events: [
          {
            protocolVersion: 'v1',
            runId: 'run:test:window',
            seq: 12,
            timestamp: 2,
            type: 'debug:event',
            payload: null,
          },
          {
            protocolVersion: 'v1',
            runId: 'run:test:window',
            seq: 10,
            timestamp: 1,
            type: 'debug:event',
            payload: null,
          },
        ],
      })

      expect(pkg.events.map((e) => e.seq)).toEqual([10, 12])

      const imported = Logix.Observability.importEvidencePackage(JSON.parse(JSON.stringify(pkg)))
      expect(imported.runId).toBe('run:test:window')
      expect(imported.protocolVersion).toBe('v1')
      expect(imported.events.map((e) => e.seq)).toEqual([10, 12])
    }),
  )

  it.effect('should enforce runId/protocolVersion invariants on import', () =>
    Effect.gen(function* () {
      const imported = Logix.Observability.importEvidencePackage({
        protocolVersion: 'v1',
        runId: 'run:test:invariant',
        createdAt: 0,
        source: { host: 'vitest' },
        events: [
          {
            protocolVersion: 'v1',
            runId: 'run:test:invariant',
            seq: 1,
            timestamp: 1,
            type: 'debug:event',
            payload: null,
          },
          {
            // mismatch: should be dropped
            protocolVersion: 'v1',
            runId: 'run:other',
            seq: 2,
            timestamp: 2,
            type: 'debug:event',
            payload: null,
          },
          {
            // mismatch: should be dropped
            protocolVersion: 'v2',
            runId: 'run:test:invariant',
            seq: 3,
            timestamp: 3,
            type: 'debug:event',
            payload: null,
          },
        ],
      })

      expect(imported.events.map((e) => e.seq)).toEqual([1])
    }),
  )
})

