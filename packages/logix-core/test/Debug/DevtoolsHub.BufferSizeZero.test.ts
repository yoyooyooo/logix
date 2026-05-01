import * as CoreDebug from '@logixjs/core/repo-internal/debug-api'
import { describe } from '@effect/vitest'
import { it, expect } from '@effect/vitest'
import { Effect, Layer } from 'effect'
import * as Logix from '../../src/index.js'

describe('DevtoolsHub (bufferSize=0)', () => {
  it.effect('bufferSize=0 should disable events window but keep minimal snapshot fields', () =>
    Effect.gen(function* () {
      CoreDebug.clearDevtoolsEvents()

      const moduleId = 'DevtoolsHub.BufferSizeZero.test'
      const runtimeLabel = 'R::DevtoolsHub.BufferSizeZero'
      const instanceId = 'i-devtoolsHub-bufferSize-zero-1'

      const layer = CoreDebug.devtoolsHubLayer({
        bufferSize: 0,
        diagnosticsLevel: 'full',
      }) as Layer.Layer<any, never, never>

      yield* CoreDebug.record({
        type: 'module:init',
        moduleId,
        instanceId,
        runtimeLabel,
      } as any).pipe(Effect.provide(layer))

      yield* CoreDebug.record({
        type: 'state:update',
        moduleId,
        instanceId,
        runtimeLabel,
        txnSeq: 1,
        state: { count: 1 },
      } as any).pipe(Effect.provide(layer))

      const snapshot = CoreDebug.getDevtoolsSnapshot()
      expect(snapshot.events.length).toBe(0)
      expect(snapshot.instances.get(`${runtimeLabel}::${moduleId}`)).toBe(1)
      expect(snapshot.latestStates.get(`${runtimeLabel}::${moduleId}::${instanceId}`)).toEqual({
        count: 1,
      })

      const evidence = CoreDebug.exportEvidencePackage()
      expect(evidence.events.length).toBe(0)
    }),
  )
})
