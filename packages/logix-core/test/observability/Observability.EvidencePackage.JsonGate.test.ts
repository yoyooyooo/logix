import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Effect } from 'effect'
import * as Logix from '../../src/index.js'

describe('Observability.EvidencePackage JSON hard gate', () => {
  it.effect('export -> stringify -> parse -> import should never crash (seq may have gaps)', () =>
    Effect.gen(function* () {
      Logix.Debug.clearDevtoolsEvents()

      const layer = Logix.Debug.devtoolsHubLayer({
        bufferSize: 10,
        diagnosticsLevel: 'full',
      })

      const cause: any = { bigint: 1n, fn: () => undefined }
      cause.self = cause

      yield* Logix.Debug.record({
        type: 'lifecycle:error',
        moduleId: 'M',
        instanceId: 'i-1',
        cause,
      }).pipe(Effect.provide(layer))

      const exported = Logix.Debug.exportEvidencePackage({
        source: { host: 'vitest', label: 'Observability.EvidencePackage.JsonGate' },
      })

      expect(() => JSON.stringify(exported)).not.toThrow()

      const parsed: any = JSON.parse(JSON.stringify(exported))
      if (Array.isArray(parsed?.events) && parsed.events.length >= 2) {
        const first = parsed.events[0]
        const second = parsed.events[1]
        if (first && second && typeof first.seq === 'number') {
          second.seq = first.seq + 2
        }
      }

      const imported = Logix.Observability.importEvidencePackage(parsed)
      expect(imported.runId).toEqual(expect.any(String))
      expect(imported.events.length).toBeGreaterThan(0)
      expect(() => JSON.stringify(imported)).not.toThrow()
    }),
  )
})
