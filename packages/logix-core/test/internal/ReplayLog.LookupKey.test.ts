import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Effect } from 'effect'
import * as ReplayLog from '../../src/internal/runtime/core/ReplayLog.js'

describe('ReplayLog lookup key', () => {
  it.effect('consumeNextResourceSnapshot should support lookupKey matching while keeping legacy fallback', () =>
    Effect.gen(function* () {
      const log = ReplayLog.make([
        {
          _tag: 'ResourceSnapshot',
          resourceId: 'user/profile',
          fieldPath: 'profileResource',
          phase: 'loading',
          snapshot: { status: 'loading' },
          timestamp: 1,
          moduleId: 'M',
          instanceId: 'i1',
        },
        {
          _tag: 'ResourceSnapshot',
          resourceId: 'user/profile',
          fieldPath: 'profileResource',
          phase: 'success',
          snapshot: { status: 'success' },
          lookupKey: { staticIrDigest: 'converge_ir_v2:test', nodeId: 3 },
          timestamp: 2,
          moduleId: 'M',
          instanceId: 'i1',
        },
      ])

      const legacy = yield* log.consumeNextResourceSnapshot({
        resourceId: 'user/profile',
        fieldPath: 'profileResource',
        phase: 'loading',
        moduleId: 'M',
        instanceId: 'i1',
      })
      expect(legacy?._tag).toBe('ResourceSnapshot')

      const byLookup = yield* log.consumeNextResourceSnapshot({
        resourceId: 'user/profile',
        fieldPath: 'profileResource',
        phase: 'success',
        lookupKey: { staticIrDigest: 'converge_ir_v2:test', nodeId: 3 },
        moduleId: 'M',
        instanceId: 'i1',
      })
      expect(byLookup?._tag).toBe('ResourceSnapshot')
      expect((byLookup as any)?.lookupKey?.staticIrDigest).toBe('converge_ir_v2:test')
      expect((byLookup as any)?.lookupKey?.nodeId).toBe(3)

      const driftedPathLog = ReplayLog.make([
        {
          _tag: 'ResourceSnapshot',
          resourceId: 'user/profile',
          fieldPath: 'profileResource.v1',
          phase: 'success',
          snapshot: { status: 'success:drifted-path' },
          lookupKey: { staticIrDigest: 'converge_ir_v2:test', nodeId: 8 },
          timestamp: 21,
          moduleId: 'M',
          instanceId: 'i1',
        },
      ])
      const byLookupWithPathDrift = yield* driftedPathLog.consumeNextResourceSnapshot({
        resourceId: 'user/profile',
        fieldPath: 'profileResource.v2',
        phase: 'success',
        lookupKey: { staticIrDigest: 'converge_ir_v2:test', nodeId: 8 },
        moduleId: 'M',
        instanceId: 'i1',
      })
      expect((byLookupWithPathDrift as any)?.snapshot?.status).toBe('success:drifted-path')

      const digestOnlyAmbiguous = ReplayLog.make([
        {
          _tag: 'ResourceSnapshot',
          resourceId: 'user/profile',
          fieldPath: 'profileResource.a',
          phase: 'success',
          snapshot: { status: 'success:a' },
          lookupKey: { staticIrDigest: 'converge_ir_v2:ambiguous' },
          timestamp: 22,
          moduleId: 'M',
          instanceId: 'i1',
        },
        {
          _tag: 'ResourceSnapshot',
          resourceId: 'user/profile',
          fieldPath: 'profileResource.b',
          phase: 'success',
          snapshot: { status: 'success:b' },
          lookupKey: { staticIrDigest: 'converge_ir_v2:ambiguous' },
          timestamp: 23,
          moduleId: 'M',
          instanceId: 'i1',
        },
      ])
      const digestOnlyHit = yield* digestOnlyAmbiguous.consumeNextResourceSnapshot({
        resourceId: 'user/profile',
        fieldPath: 'profileResource.b',
        phase: 'success',
        lookupKey: { staticIrDigest: 'converge_ir_v2:ambiguous' },
        moduleId: 'M',
        instanceId: 'i1',
      })
      expect((digestOnlyHit as any)?.fieldPath).toBe('profileResource.b')

      const miss = yield* log.consumeNextResourceSnapshot({
        resourceId: 'user/profile',
        fieldPath: 'profileResource',
        phase: 'success',
        lookupKey: { staticIrDigest: 'converge_ir_v2:test', nodeId: 99 },
        moduleId: 'M',
        instanceId: 'i1',
      })
      expect(miss).toBeUndefined()

      const digestMismatchLog = ReplayLog.make([
        {
          _tag: 'ResourceSnapshot',
          resourceId: 'user/profile',
          fieldPath: 'profileResource',
          phase: 'success',
          snapshot: { status: 'success:digest-a' },
          lookupKey: { staticIrDigest: 'converge_ir_v2:a', nodeId: 3 },
          timestamp: 24,
          moduleId: 'M',
          instanceId: 'i1',
        },
      ])
      const digestMismatch = yield* digestMismatchLog.consumeNextResourceSnapshot({
        resourceId: 'user/profile',
        fieldPath: 'profileResource',
        phase: 'success',
        lookupKey: { staticIrDigest: 'converge_ir_v2:b', nodeId: 3 },
        moduleId: 'M',
        instanceId: 'i1',
      })
      expect(digestMismatch).toBeUndefined()

      // Legacy compatibility: old replay records may not carry moduleId/instanceId.
      const legacyScoped = ReplayLog.make([
        {
          _tag: 'ResourceSnapshot',
          resourceId: 'user/profile',
          fieldPath: 'profileResource',
          phase: 'success',
          snapshot: { status: 'success:legacy' },
          timestamp: 3,
        },
      ])
      const consumedLegacy = yield* legacyScoped.consumeNextResourceSnapshot({
        resourceId: 'user/profile',
        fieldPath: 'profileResource',
        phase: 'success',
        moduleId: 'M',
        instanceId: 'i1',
      })
      expect(consumedLegacy?._tag).toBe('ResourceSnapshot')
      expect((consumedLegacy as any)?.snapshot?.status).toBe('success:legacy')

      const scopedLog = ReplayLog.make([
        {
          _tag: 'ResourceSnapshot',
          resourceId: 'user/profile',
          fieldPath: 'profileResource',
          phase: 'success',
          snapshot: { status: 'success:other-scope' },
          timestamp: 4,
          moduleId: 'M2',
          instanceId: 'i2',
        },
        {
          _tag: 'ResourceSnapshot',
          resourceId: 'user/profile',
          fieldPath: 'profileResource',
          phase: 'success',
          snapshot: { status: 'success:strict' },
          timestamp: 5,
          moduleId: 'M',
          instanceId: 'i1',
        },
      ])
      const strict = yield* scopedLog.consumeNextResourceSnapshot({
        resourceId: 'user/profile',
        fieldPath: 'profileResource',
        phase: 'success',
        moduleId: 'M',
        instanceId: 'i1',
      })
      expect((strict as any)?.snapshot?.status).toBe('success:strict')

      const moduleScoped = ReplayLog.make([
        {
          _tag: 'ResourceSnapshot',
          resourceId: 'user/profile',
          fieldPath: 'profileResource',
          phase: 'success',
          snapshot: { status: 'success:module-fallback' },
          timestamp: 55,
          moduleId: 'M',
          instanceId: 'i2',
        },
      ])
      const moduleFallback = yield* moduleScoped.consumeNextResourceSnapshot({
        resourceId: 'user/profile',
        fieldPath: 'profileResource',
        phase: 'success',
        moduleId: 'M',
        instanceId: 'i1',
      })
      expect(moduleFallback).toBeUndefined()

      const moduleFallbackOptIn = yield* moduleScoped.consumeNextResourceSnapshot({
        resourceId: 'user/profile',
        fieldPath: 'profileResource',
        phase: 'success',
        moduleId: 'M',
        instanceId: 'i1',
        scopeFallbackMode: 'module_or_legacy',
      })
      expect((moduleFallbackOptIn as any)?.snapshot?.status).toBe('success:module-fallback')

      const mixedFallback = ReplayLog.make([
        {
          _tag: 'ResourceSnapshot',
          resourceId: 'user/profile',
          fieldPath: 'profileResource',
          phase: 'success',
          snapshot: { status: 'success:legacy-first' },
          timestamp: 56,
        },
        {
          _tag: 'ResourceSnapshot',
          resourceId: 'user/profile',
          fieldPath: 'profileResource',
          phase: 'success',
          snapshot: { status: 'success:module-second' },
          timestamp: 57,
          moduleId: 'M',
          instanceId: 'i2',
        },
      ])
      const mixedFallbackHit = yield* mixedFallback.consumeNextResourceSnapshot({
        resourceId: 'user/profile',
        fieldPath: 'profileResource',
        phase: 'success',
        moduleId: 'M',
        instanceId: 'i1',
        scopeFallbackMode: 'module_or_legacy',
      })
      expect((mixedFallbackHit as any)?.snapshot?.status).toBe('success:legacy-first')

      const mismatchOnly = ReplayLog.make([
        {
          _tag: 'ResourceSnapshot',
          resourceId: 'user/profile',
          fieldPath: 'profileResource',
          phase: 'success',
          snapshot: { status: 'success:mismatch-fallback' },
          timestamp: 6,
          moduleId: 'M2',
          instanceId: 'i2',
        },
      ])
      const fallback = yield* mismatchOnly.consumeNextResourceSnapshot({
        resourceId: 'user/profile',
        fieldPath: 'profileResource',
        phase: 'success',
        moduleId: 'M',
        instanceId: 'i1',
      })
      expect(fallback).toBeUndefined()

      const interleavedScopes = ReplayLog.make([
        {
          _tag: 'ResourceSnapshot',
          resourceId: 'user/profile',
          fieldPath: 'profileResource',
          phase: 'loading',
          snapshot: { status: 'loading:i2' },
          timestamp: 7,
          moduleId: 'M2',
          instanceId: 'i2',
        },
        {
          _tag: 'ResourceSnapshot',
          resourceId: 'user/profile',
          fieldPath: 'profileResource',
          phase: 'loading',
          snapshot: { status: 'loading:i1' },
          timestamp: 8,
          moduleId: 'M',
          instanceId: 'i1',
        },
      ])
      const firstScoped = yield* interleavedScopes.consumeNextResourceSnapshot({
        resourceId: 'user/profile',
        fieldPath: 'profileResource',
        phase: 'loading',
        moduleId: 'M',
        instanceId: 'i1',
      })
      expect((firstScoped as any)?.snapshot?.status).toBe('loading:i1')

      const secondScoped = yield* interleavedScopes.consumeNextResourceSnapshot({
        resourceId: 'user/profile',
        fieldPath: 'profileResource',
        phase: 'loading',
        moduleId: 'M2',
        instanceId: 'i2',
      })
      expect((secondScoped as any)?.snapshot?.status).toBe('loading:i2')

      const scopeKeyCollision = ReplayLog.make([
        {
          _tag: 'ResourceSnapshot',
          resourceId: 'user/profile',
          fieldPath: 'profileResource',
          phase: 'loading',
          snapshot: { status: 'loading:scope1' },
          timestamp: 9,
          moduleId: 'A::B',
          instanceId: 'C',
        },
        {
          _tag: 'ResourceSnapshot',
          resourceId: 'user/profile',
          fieldPath: 'profileResource',
          phase: 'loading',
          snapshot: { status: 'loading:scope2' },
          timestamp: 10,
          moduleId: 'A',
          instanceId: 'B::C',
        },
      ])
      const scope1 = yield* scopeKeyCollision.consumeNextResourceSnapshot({
        resourceId: 'user/profile',
        fieldPath: 'profileResource',
        phase: 'loading',
        moduleId: 'A::B',
        instanceId: 'C',
      })
      expect((scope1 as any)?.snapshot?.status).toBe('loading:scope1')

      const scope2 = yield* scopeKeyCollision.consumeNextResourceSnapshot({
        resourceId: 'user/profile',
        fieldPath: 'profileResource',
        phase: 'loading',
        moduleId: 'A',
        instanceId: 'B::C',
      })
      expect((scope2 as any)?.snapshot?.status).toBe('loading:scope2')
    }),
  )
})
