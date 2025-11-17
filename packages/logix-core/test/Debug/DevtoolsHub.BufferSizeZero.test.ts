import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Effect, Layer } from 'effect'
import * as Logix from '../../src/index.js'

describe('DevtoolsHub (bufferSize=0)', () => {
  it.effect('bufferSize=0 should disable events window but keep minimal snapshot fields', () =>
    Effect.gen(function* () {
      Logix.Debug.clearDevtoolsEvents()

      const moduleId = 'DevtoolsHub.BufferSizeZero.test'
      const runtimeLabel = 'R::DevtoolsHub.BufferSizeZero'
      const instanceId = 'i-devtoolsHub-bufferSize-zero-1'

      const layer = Logix.Debug.devtoolsHubLayer({
        bufferSize: 0,
        diagnosticsLevel: 'full',
      }) as Layer.Layer<any, never, never>

      yield* Logix.Debug.record({
        type: 'module:init',
        moduleId,
        instanceId,
        runtimeLabel,
      } as any).pipe(Effect.provide(layer))

      yield* Logix.Debug.record({
        type: 'state:update',
        moduleId,
        instanceId,
        runtimeLabel,
        txnSeq: 1,
        state: { count: 1 },
      } as any).pipe(Effect.provide(layer))

      const snapshot = Logix.Debug.getDevtoolsSnapshot()
      expect(snapshot.events.length).toBe(0)
      expect(snapshot.instances.get(`${runtimeLabel}::${moduleId}`)).toBe(1)
      expect(snapshot.latestStates.get(`${runtimeLabel}::${moduleId}::${instanceId}`)).toEqual({
        count: 1,
      })

      const evidence = Logix.Debug.exportEvidencePackage()
      expect(evidence.events.length).toBe(0)
    }),
  )
})
