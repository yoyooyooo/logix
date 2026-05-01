import * as CoreDebug from '@logixjs/core/repo-internal/debug-api'
import { describe } from '@effect/vitest'
import { it, expect } from '@effect/vitest'
import { Effect, Layer } from 'effect'
import * as Logix from '../../src/index.js'

describe('DevtoolsHub (instance cleanup)', () => {
  it.effect('module:destroy should cleanup caches even when diagnosticsLevel=off, and ignore late state:update', () =>
    Effect.gen(function* () {
      CoreDebug.clearDevtoolsEvents()

      const moduleId = 'DevtoolsHub.InstanceCleanup.test'
      const runtimeLabel = 'R::DevtoolsHub.InstanceCleanup'
      const instanceId = 'i-devtoolsHub-instance-cleanup-1'

      const moduleKey = `${runtimeLabel}::${moduleId}`
      const instanceKey = `${runtimeLabel}::${moduleId}::${instanceId}`

      const fullLayer = CoreDebug.devtoolsHubLayer({
        bufferSize: 10,
        diagnosticsLevel: 'full',
      }) as Layer.Layer<any, never, never>

      const offLayer = CoreDebug.devtoolsHubLayer({
        bufferSize: 10,
        diagnosticsLevel: 'off',
      }) as Layer.Layer<any, never, never>

      yield* CoreDebug.record({
        type: 'module:init',
        moduleId,
        instanceId,
        runtimeLabel,
      } as any).pipe(Effect.provide(fullLayer))

      yield* CoreDebug.record({
        type: 'trace:instanceLabel',
        instanceId,
        data: { label: 'Cleanup Instance' },
      } as any).pipe(Effect.provide(fullLayer))

      yield* CoreDebug.record({
        type: 'state:update',
        moduleId,
        instanceId,
        runtimeLabel,
        txnSeq: 1,
        txnId: `${instanceId}::t1`,
        state: { ok: true, n: 1 },
        fieldSummary: { t: 1 },
      } as any).pipe(Effect.provide(fullLayer))

      expect(CoreDebug.getDevtoolsSnapshot().instances.get(moduleKey)).toBe(1)
      expect(CoreDebug.getDevtoolsSnapshot().latestStates.get(instanceKey)).toEqual({
        ok: true,
        n: 1,
      })
      expect(CoreDebug.getDevtoolsSnapshot().latestFieldSummaries.get(instanceKey)).toEqual({
        t: 1,
      })
      expect(CoreDebug.getInstanceLabel(instanceId)).toBe('Cleanup Instance')

      // When diagnosticsLevel=off, refs may early-return, but module:destroy cleanup must still run.
      yield* CoreDebug.record({
        type: 'module:destroy',
        moduleId,
        instanceId,
        runtimeLabel,
      } as any).pipe(Effect.provide(offLayer))

      expect(CoreDebug.getDevtoolsSnapshot().instances.get(moduleKey)).toBeUndefined()
      expect(CoreDebug.getDevtoolsSnapshot().latestStates.has(instanceKey)).toBe(false)
      expect(CoreDebug.getDevtoolsSnapshot().latestFieldSummaries.has(instanceKey)).toBe(false)
      expect(CoreDebug.getInstanceLabel(instanceId)).toBeUndefined()

      // Late state:update after module:destroy may enter the window, but must not rebuild latest* derived caches.
      yield* CoreDebug.record({
        type: 'state:update',
        moduleId,
        instanceId,
        runtimeLabel,
        txnSeq: 2,
        txnId: `${instanceId}::t2`,
        state: { ok: true, n: 2 },
        fieldSummary: { t: 2 },
      } as any).pipe(Effect.provide(fullLayer))

      expect(CoreDebug.getDevtoolsSnapshot().latestStates.has(instanceKey)).toBe(false)
      expect(CoreDebug.getDevtoolsSnapshot().latestFieldSummaries.has(instanceKey)).toBe(false)
    }),
  )
})
