import { describe, expect, it } from '@effect/vitest'
import { Effect } from 'effect'
import * as Debug from '../../src/internal/debug-api.js'
import {
  createHotLifecycleResourceRegistry,
  makeHotLifecycleEvidence,
} from '../../src/internal/runtime/core/hotLifecycle/index.js'
import { importEvidencePackage } from '../../src/internal/verification/evidence.js'

describe('Debug hot lifecycle evidence export', () => {
  it.effect('exports lifecycle evidence as a first-class observation envelope event', () =>
    Effect.gen(function* () {
      Debug.startDevtoolsRun('debug-hmr-export')
      const registry = createHotLifecycleResourceRegistry({ ownerId: 'debug-owner' })
      const event = makeHotLifecycleEvidence({
        ownerId: 'debug-owner',
        eventSeq: 1,
        decision: 'dispose',
        reason: 'dispose-without-successor',
        previousRuntimeInstanceId: 'runtime:1',
        cleanupId: 'debug-owner::cleanup:1',
        resourceSummary: registry.summary(),
      })

      yield* Debug.record({
        type: 'runtime.hot-lifecycle',
        event,
      }).pipe(Effect.provide(Debug.devtoolsHubLayer({ bufferSize: 10, diagnosticsLevel: 'full' })))

      const pkg = importEvidencePackage(
        Debug.exportEvidencePackage({
          runId: 'debug-hmr-export',
          source: { host: 'vitest', label: 'debug-hot-lifecycle' },
        }),
      )

      expect(pkg.events).toHaveLength(1)
      expect(pkg.events[0]?.type).toBe('runtime.hot-lifecycle')
      expect((pkg.events[0]?.payload as any).decision).toBe('dispose')
    }).pipe(Effect.provide(Debug.diagnosticsLevel('full'))),
  )
})
