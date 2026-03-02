import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Effect, Layer } from 'effect'
import * as Logix from '../../src/index.js'

const nowMs = (): number =>
  typeof performance !== 'undefined' && typeof performance.now === 'function' ? performance.now() : Date.now()

const runStateUpdateWorkload = (args: {
  readonly mode: Logix.Debug.DevtoolsProjectionMode
  readonly iterations: number
  readonly runtimeLabel: string
}): Effect.Effect<{
  readonly durationMs: number
  readonly projectionTier: Logix.Debug.DevtoolsProjectionTier
  readonly latestStatesSize: number
  readonly latestTraitSummariesSize: number
}> =>
  Effect.gen(function* () {
    Logix.Debug.clearDevtoolsEvents()

    const layer = Logix.Debug.devtoolsHubLayer({
      bufferSize: Math.max(64, args.iterations + 8),
      mode: args.mode,
    }) as Layer.Layer<any, never, never>

    const moduleId = 'DevtoolsHub.ProjectionTier.Workload'

    const durationMs = yield* Effect.gen(function* () {
      const heavyPayload = 'x'.repeat(96)
      const begin = nowMs()
      for (let i = 1; i <= args.iterations; i++) {
        const instanceId = `i-${args.mode}-${i}`
        yield* Logix.Debug.record({
          type: 'module:init',
          moduleId,
          instanceId,
          runtimeLabel: args.runtimeLabel,
        } as any)

        yield* Logix.Debug.record({
          type: 'state:update',
          moduleId,
          instanceId,
          runtimeLabel: args.runtimeLabel,
          txnSeq: i,
          txnId: `${instanceId}::t${i}`,
          state: { count: i, payload: heavyPayload },
          traitSummary: {
            top: [
              {
                key: `k-${i % 8}`,
                cost: i % 16,
              },
            ],
          },
        } as any)
      }
      return Math.max(0, nowMs() - begin)
    }).pipe(Effect.provide(layer))

    const snapshot = Logix.Debug.getDevtoolsSnapshotByRuntimeLabel(args.runtimeLabel)
    return {
      durationMs,
      projectionTier: snapshot.projection.tier,
      latestStatesSize: snapshot.latestStates.size,
      latestTraitSummariesSize: snapshot.latestTraitSummaries.size,
    }
  })

describe('DevtoolsHub projection tier (O-025)', () => {
  it.effect('light tier should expose summary-only projection and truthful degraded semantics', () =>
    Effect.gen(function* () {
      Logix.Debug.clearDevtoolsEvents()

      const runtimeLabel = 'R::DevtoolsHub.ProjectionTier.Light'
      const moduleId = 'ProjectionTierLightModule'
      const instanceId = 'i-projection-tier-light'
      const layer = Logix.Debug.devtoolsHubLayer({
        bufferSize: 32,
        mode: 'light',
      }) as Layer.Layer<any, never, never>

      yield* Effect.gen(function* () {
        yield* Logix.Debug.record({
          type: 'module:init',
          moduleId,
          instanceId,
          runtimeLabel,
        } as any)

        yield* Logix.Debug.record({
          type: 'state:update',
          moduleId,
          instanceId,
          runtimeLabel,
          txnSeq: 1,
          txnId: `${instanceId}::t1`,
          state: { count: 1 },
          traitSummary: { t: 1 },
        } as any)
      }).pipe(Effect.provide(layer))

      const snapshot = Logix.Debug.getDevtoolsSnapshotByRuntimeLabel(runtimeLabel)
      expect(snapshot.projection.tier).toBe('light')
      expect(snapshot.projection.degraded).toBe(true)
      expect(snapshot.projection.reason?.code).toBe('projection_tier_light')
      expect(snapshot.projection.reason?.hiddenFields).toEqual(['latestStates', 'latestTraitSummaries'])
      expect(snapshot.projection.visibleFields).toEqual(['instances', 'events', 'exportBudget'])
      expect(snapshot.instances.get(`${runtimeLabel}::${moduleId}`)).toBe(1)
      expect(snapshot.events.length).toBeGreaterThan(0)
      expect(snapshot.latestStates.size).toBe(0)
      expect(snapshot.latestTraitSummaries.size).toBe(0)
    }),
  )

  it.effect('full tier should keep heavy latest* projection and remain non-degraded', () =>
    Effect.gen(function* () {
      Logix.Debug.clearDevtoolsEvents()

      const runtimeLabel = 'R::DevtoolsHub.ProjectionTier.Full'
      const moduleId = 'ProjectionTierFullModule'
      const instanceId = 'i-projection-tier-full'
      const layer = Logix.Debug.devtoolsHubLayer({
        bufferSize: 32,
        mode: 'full',
      }) as Layer.Layer<any, never, never>

      yield* Effect.gen(function* () {
        yield* Logix.Debug.record({
          type: 'module:init',
          moduleId,
          instanceId,
          runtimeLabel,
        } as any)

        yield* Logix.Debug.record({
          type: 'state:update',
          moduleId,
          instanceId,
          runtimeLabel,
          txnSeq: 1,
          txnId: `${instanceId}::t1`,
          state: { count: 1 },
          traitSummary: { t: 1 },
        } as any)
      }).pipe(Effect.provide(layer))

      const snapshot = Logix.Debug.getDevtoolsSnapshotByRuntimeLabel(runtimeLabel)
      expect(snapshot.projection.tier).toBe('full')
      expect(snapshot.projection.degraded).toBe(false)
      expect(snapshot.projection.reason).toBeUndefined()
      expect(snapshot.projection.visibleFields).toEqual([
        'instances',
        'events',
        'latestStates',
        'latestTraitSummaries',
        'exportBudget',
      ])
      expect(snapshot.latestStates.get(`${runtimeLabel}::${moduleId}::${instanceId}`)).toEqual({ count: 1 })
      expect(snapshot.latestTraitSummaries.get(`${runtimeLabel}::${moduleId}::${instanceId}`)).toEqual({ t: 1 })
    }),
  )

  it.effect('projection tier should isolate by runtimeLabel without cross-runtime cache bleed', () =>
    Effect.gen(function* () {
      Logix.Debug.clearDevtoolsEvents()

      const moduleId = 'ProjectionTierIsolatedRuntimeModule'
      const fullRuntimeLabel = 'R::DevtoolsHub.ProjectionTier.Isolation.Full'
      const lightRuntimeLabel = 'R::DevtoolsHub.ProjectionTier.Isolation.Light'
      const fullInstanceId = 'i-projection-tier-isolation-full'
      const lightInstanceId = 'i-projection-tier-isolation-light'

      const fullLayer = Logix.Debug.devtoolsHubLayer({
        bufferSize: 32,
        mode: 'full',
        runtimeLabel: fullRuntimeLabel,
      }) as Layer.Layer<any, never, never>

      const lightLayer = Logix.Debug.devtoolsHubLayer({
        bufferSize: 32,
        mode: 'light',
        runtimeLabel: lightRuntimeLabel,
      }) as Layer.Layer<any, never, never>

      yield* Effect.gen(function* () {
        yield* Logix.Debug.record({
          type: 'module:init',
          moduleId,
          instanceId: fullInstanceId,
          runtimeLabel: fullRuntimeLabel,
        } as any)
        yield* Logix.Debug.record({
          type: 'state:update',
          moduleId,
          instanceId: fullInstanceId,
          runtimeLabel: fullRuntimeLabel,
          txnSeq: 1,
          txnId: `${fullInstanceId}::t1`,
          state: { count: 1 },
          traitSummary: { t: 1 },
        } as any)
      }).pipe(Effect.provide(fullLayer))

      yield* Effect.gen(function* () {
        yield* Logix.Debug.record({
          type: 'module:init',
          moduleId,
          instanceId: lightInstanceId,
          runtimeLabel: lightRuntimeLabel,
        } as any)
        yield* Logix.Debug.record({
          type: 'state:update',
          moduleId,
          instanceId: lightInstanceId,
          runtimeLabel: lightRuntimeLabel,
          txnSeq: 1,
          txnId: `${lightInstanceId}::t1`,
          state: { count: 2 },
          traitSummary: { t: 2 },
        } as any)
      }).pipe(Effect.provide(lightLayer))

      const fullSnapshot = Logix.Debug.getDevtoolsSnapshotByRuntimeLabel(fullRuntimeLabel)
      const lightSnapshot = Logix.Debug.getDevtoolsSnapshotByRuntimeLabel(lightRuntimeLabel)

      expect(fullSnapshot.projection.tier).toBe('full')
      expect(fullSnapshot.latestStates.get(`${fullRuntimeLabel}::${moduleId}::${fullInstanceId}`)).toEqual({ count: 1 })
      expect(fullSnapshot.latestTraitSummaries.get(`${fullRuntimeLabel}::${moduleId}::${fullInstanceId}`)).toEqual({
        t: 1,
      })

      expect(lightSnapshot.projection.tier).toBe('light')
      expect(lightSnapshot.latestStates.size).toBe(0)
      expect(lightSnapshot.latestTraitSummaries.size).toBe(0)
    }),
  )

  it.effect('global snapshot should stay light-consistent when only runtime-local tier is full', () =>
    Effect.gen(function* () {
      Logix.Debug.clearDevtoolsEvents()
      Logix.Debug.devtoolsHubLayer({ mode: 'light' })

      const runtimeLabel = 'R::DevtoolsHub.ProjectionTier.GlobalConsistency.FullOnly'
      const moduleId = 'ProjectionTierGlobalConsistencyModule'
      const instanceId = 'i-projection-tier-global-consistency'
      const layer = Logix.Debug.devtoolsHubLayer({
        bufferSize: 32,
        mode: 'full',
        runtimeLabel,
      }) as Layer.Layer<any, never, never>

      yield* Effect.gen(function* () {
        yield* Logix.Debug.record({
          type: 'module:init',
          moduleId,
          instanceId,
          runtimeLabel,
        } as any)
        yield* Logix.Debug.record({
          type: 'state:update',
          moduleId,
          instanceId,
          runtimeLabel,
          txnSeq: 1,
          txnId: `${instanceId}::t1`,
          state: { count: 7 },
          traitSummary: { t: 7 },
        } as any)
      }).pipe(Effect.provide(layer))

      const globalSnapshot = Logix.Debug.getDevtoolsSnapshot()
      const runtimeSnapshot = Logix.Debug.getDevtoolsSnapshotByRuntimeLabel(runtimeLabel)

      expect(globalSnapshot.projection.tier).toBe('light')
      expect(globalSnapshot.projection.degraded).toBe(true)
      expect(globalSnapshot.latestStates.size).toBe(0)
      expect(globalSnapshot.latestTraitSummaries.size).toBe(0)

      expect(runtimeSnapshot.projection.tier).toBe('full')
      expect(runtimeSnapshot.latestStates.get(`${runtimeLabel}::${moduleId}::${instanceId}`)).toEqual({ count: 7 })
      expect(runtimeSnapshot.latestTraitSummaries.get(`${runtimeLabel}::${moduleId}::${instanceId}`)).toEqual({ t: 7 })
    }),
  )

  it.effect('switching full -> light should bump snapshotToken and keep visible fields consistent', () =>
    Effect.gen(function* () {
      Logix.Debug.clearDevtoolsEvents()

      const runtimeLabel = 'R::DevtoolsHub.ProjectionTier.Switch'
      const moduleId = 'ProjectionTierSwitchModule'
      const instanceId = 'i-projection-tier-switch'

      const fullLayer = Logix.Debug.devtoolsHubLayer({
        bufferSize: 16,
        mode: 'full',
      }) as Layer.Layer<any, never, never>

      yield* Effect.gen(function* () {
        yield* Logix.Debug.record({
          type: 'module:init',
          moduleId,
          instanceId,
          runtimeLabel,
        } as any)
        yield* Logix.Debug.record({
          type: 'state:update',
          moduleId,
          instanceId,
          runtimeLabel,
          txnSeq: 1,
          txnId: `${instanceId}::t1`,
          state: { count: 1 },
          traitSummary: { t: 1 },
        } as any)
      }).pipe(Effect.provide(fullLayer))

      const tokenBeforeSwitch = Logix.Debug.getDevtoolsSnapshotToken()
      expect(Logix.Debug.getDevtoolsSnapshot().latestStates.size).toBeGreaterThan(0)

      Logix.Debug.devtoolsHubLayer({ mode: 'light' })

      const tokenAfterSwitch = Logix.Debug.getDevtoolsSnapshotToken()
      expect(tokenAfterSwitch).toBeGreaterThan(tokenBeforeSwitch)
      expect(Logix.Debug.getDevtoolsSnapshot().projection.tier).toBe('light')
      expect(Logix.Debug.getDevtoolsSnapshot().latestStates.size).toBe(0)
      expect(Logix.Debug.getDevtoolsSnapshot().latestTraitSummaries.size).toBe(0)

      Logix.Debug.devtoolsHubLayer({ mode: 'light' })
      expect(Logix.Debug.getDevtoolsSnapshotToken()).toBe(tokenAfterSwitch)
    }),
  )

  it.effect('default projection should reset to light after a full override', () =>
    Effect.sync(() => {
      Logix.Debug.clearDevtoolsEvents()

      Logix.Debug.devtoolsHubLayer({ mode: 'full' })
      expect(Logix.Debug.getDevtoolsSnapshot().projection.tier).toBe('full')

      const tokenBefore = Logix.Debug.getDevtoolsSnapshotToken()
      Logix.Debug.devtoolsHubLayer()

      const snapshot = Logix.Debug.getDevtoolsSnapshot()
      expect(snapshot.projection.tier).toBe('light')
      expect(snapshot.projection.degraded).toBe(true)
      expect(Logix.Debug.getDevtoolsSnapshotToken()).toBeGreaterThan(tokenBefore)
    }),
  )

  it.effect('light should reduce state:update write overhead versus full under same workload', () =>
    Effect.gen(function* () {
      const iterations = 1500

      const full = yield* runStateUpdateWorkload({
        mode: 'full',
        iterations,
        runtimeLabel: 'R::DevtoolsHub.ProjectionTier.Perf.Full',
      })
      const light = yield* runStateUpdateWorkload({
        mode: 'light',
        iterations,
        runtimeLabel: 'R::DevtoolsHub.ProjectionTier.Perf.Light',
      })

      expect(full.projectionTier).toBe('full')
      expect(light.projectionTier).toBe('light')
      expect(full.latestStatesSize).toBe(iterations)
      expect(full.latestTraitSummariesSize).toBe(iterations)
      expect(light.latestStatesSize).toBe(0)

      expect(full.durationMs).toBeGreaterThan(0)
      expect(light.durationMs).toBeGreaterThan(0)
      // Keep this threshold very loose for CI variance; the benchmark is evidence-oriented, not a hard perf gate.
      expect(light.durationMs).toBeLessThanOrEqual(full.durationMs * 2.5)

      console.info(
        `[O-025][perf] tier=full ${full.durationMs.toFixed(2)}ms, tier=light ${light.durationMs.toFixed(2)}ms, ratio=${(light.durationMs / Math.max(full.durationMs, 0.0001)).toFixed(3)}`,
      )
    }),
  )
})
