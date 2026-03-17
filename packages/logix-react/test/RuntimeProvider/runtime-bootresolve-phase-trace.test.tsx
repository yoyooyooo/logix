// @vitest-environment happy-dom

import React from 'react'
import { render, waitFor, cleanup } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { ConfigProvider, Duration, Effect, Layer, References, Schema } from 'effect'
import * as Logix from '@logixjs/core'
import { RuntimeProvider, useModule } from '../../src/index.js'
import { ControlplaneKernel, fingerprintReactConfigSnapshot } from '../../src/internal/provider/ControlplaneKernel.js'

const State = Schema.Struct({ count: Schema.Number })
const Actions = { inc: Schema.Void }

const ImplModule = Logix.Module.make('ReactBootResolvePhaseTrace.Impl', { state: State, actions: Actions })
const TagModule = Logix.Module.make('ReactBootResolvePhaseTrace.Tag', { state: State, actions: Actions })

const ImplModuleImpl = ImplModule.implement({ initial: { count: 0 }, logics: [] }).impl
const TagModuleImpl = TagModule.implement({ initial: { count: 0 }, logics: [] }).impl

const AsyncPreloadState = Schema.Struct({ count: Schema.Number })
const AsyncPreloadActions = { inc: Schema.Void }
const AsyncPreloadModule = Logix.Module.make('ReactBootResolvePhaseTrace.AsyncPreload', {
  state: AsyncPreloadState,
  actions: AsyncPreloadActions,
})
const BaseAsyncPreloadImpl = AsyncPreloadModule.implement({
  initial: { count: 0 },
  logics: [],
}).impl

const parseOwnerIdFromOwnerKey = (ownerKey: unknown): number | null => {
  if (typeof ownerKey !== 'string') {
    return null
  }
  const value = Number(ownerKey.split(':', 1)[0])
  return Number.isFinite(value) ? value : null
}

const expectOwnerLanePhaseContract = (data: unknown): void => {
  expect(data && typeof data === 'object').toBe(true)
  const contract = data as any
  expect(['neutral', 'config', 'preload']).toContain(contract.lane)
  expect(['runtime.base', 'runtime.layer-bound']).toContain(contract.owner)
  expect(typeof contract.ownerKey).toBe('string')
  expect(String(contract.ownerKey)).toMatch(/^\d+:(runtime\.base|runtime\.layer-bound):(neutral|config|preload)$/)
  expect(['read', 'readSync', 'warmSync', 'preload']).toContain(contract.method)
  expect([
    'boot-confirm',
    'ready-confirm',
    'config-boot-owner-lock',
    'neutral-settled-refresh-allowed',
    'defer-preload-dispatch',
    'defer-preload-reuse-inflight',
    'defer-preload-token-completed',
  ]).toContain(contract.cause)
  expect(typeof contract.token).toBe('string')
  expect(String(contract.token)).toMatch(/^\d+:(runtime\.base|runtime\.layer-bound):(neutral|config|preload):(boot|ready)$/)
  expect(String(contract.token)).toContain(`:${contract.owner}:${contract.lane}:${contract.phase}`)
  expect([
    'resolve-requested',
    'resolve-run',
    'resolve-commit',
    'resolve-skip',
    'resolve-stale-drop',
    'resolve-reject',
  ]).toContain(contract.action)
  expect(typeof contract.reason).toBe('string')
  expect(typeof contract.reasonCode).toBe('string')
  expect(['boot', 'ready']).toContain(contract.phase)
  expect(['phase-machine', 'legacy-control']).toContain(contract.executor)
  expect(contract.cancelBoundary).toBe('owner-lane')
  expect(['pending', 'sync-ready', 'async-ready', 'stale', 'cancelled']).toContain(contract.readiness)
  expect(Number.isInteger(contract.epoch)).toBe(true)
  expect(contract.epoch).toBeGreaterThan(0)
  expect(contract.ticket).toEqual({
    ownerKey: contract.ownerKey,
    lane: contract.lane,
    epoch: contract.epoch,
  })
  expect(typeof contract.fingerprint).toBe('string')
}

const App: React.FC = () => {
  const impl = useModule(ImplModuleImpl, { key: 'shared' })
  const implCount = useModule(impl, (s) => (s as { count: number }).count)

  const tag = useModule(TagModule.tag)
  const tagCount = useModule(tag, (s) => (s as { count: number }).count)

  return (
    <div>
      <p>Impl: {implCount}</p>
      <p>Tag: {tagCount}</p>
    </div>
  )
}

afterEach(() => {
  cleanup()
})

describe('RuntimeProvider bootResolve phase traces', () => {
  it('emits provider gating and moduleTag resolve durations', async () => {
    const events: Logix.Debug.Event[] = []

    const debugLayer = Layer.mergeAll(
      Logix.Debug.diagnosticsLevel('light'),
      Logix.Debug.replace([
        {
          record: (event: Logix.Debug.Event) =>
            Effect.sync(() => {
              events.push(event)
            }),
        },
      ]) as Layer.Layer<any, never, never>,
    ) as Layer.Layer<any, never, never>

    const runtime = Logix.Runtime.make(TagModuleImpl, {
      layer: debugLayer,
    })

    render(
      <RuntimeProvider runtime={runtime} policy={{ mode: 'sync', syncBudgetMs: 1000 }}>
        <App />
      </RuntimeProvider>,
    )

    await waitFor(() => {
      expect(document.body.textContent).toContain('Impl: 0')
      expect(document.body.textContent).toContain('Tag: 0')
    })

    await waitFor(() => {
      const providerGating = events.find((event) => event.type === 'trace:react.provider.gating') as any
      const configSnapshot = events.find(
        (event) => event.type === 'trace:react.runtime.config.snapshot' && (event as any).data?.mode === 'sync',
      ) as any
      const moduleImplResolve = events.find((event) => event.type === 'trace:react.moduleImpl.resolve') as any
      const tagResolve = events.find((event) => event.type === 'trace:react.moduleTag.resolve') as any
      const implInit = events.find(
        (event) => event.type === 'trace:react.module.init' && event.moduleId === ImplModule.id,
      ) as any
      const tagInit = events.find(
        (event) => event.type === 'trace:react.module.init' && event.moduleId === TagModule.id,
      ) as any

      expect(typeof providerGating?.data?.durationMs).toBe('number')
      expect(typeof providerGating?.data?.effectDelayMs).toBe('number')
      expect(providerGating?.data?.policyMode).toBe('sync')

      expect(typeof configSnapshot?.data?.durationMs).toBe('number')
      expect(configSnapshot?.data?.mode).toBe('sync')

      expect(typeof moduleImplResolve?.data?.durationMs).toBe('number')
      expect(moduleImplResolve?.data?.cacheMode).toBe('sync')

      expect(typeof tagResolve?.data?.durationMs).toBe('number')
      expect(tagResolve?.data?.cacheMode).toBe('sync')

      expect(typeof implInit?.data?.durationMs).toBe('number')
      expect(typeof tagInit?.data?.durationMs).toBe('number')
    })

    await runtime.dispose()
  })

  it('keeps env-only provider layer on runtime.base owner path', async () => {
    const events: Logix.Debug.Event[] = []

    const debugLayer = Layer.mergeAll(
      Logix.Debug.diagnosticsLevel('light'),
      Logix.Debug.replace([
        {
          record: (event: Logix.Debug.Event) =>
            Effect.sync(() => {
              events.push(event)
            }),
        },
      ]) as Layer.Layer<any, never, never>,
    ) as Layer.Layer<any, never, never>

    const runtime = Logix.Runtime.make(TagModuleImpl, {
      layer: debugLayer,
    })

    const envOnlyLayer = Layer.succeed(References.MinimumLogLevel, 'Debug') as Layer.Layer<any, never, never>

    render(
      <RuntimeProvider
        runtime={runtime}
        layer={envOnlyLayer}
        fallback={<div data-testid="runtime-fallback">loading</div>}
        policy={{ mode: 'sync', syncBudgetMs: 1000 }}
      >
        <App />
      </RuntimeProvider>,
    )

    await waitFor(() => {
      expect(document.body.textContent).toContain('Impl: 0')
      expect(document.body.textContent).toContain('Tag: 0')
    })

    await waitFor(() => {
      const asyncSnapshots = events.filter(
        (event) => event.type === 'trace:react.runtime.config.snapshot' && (event as any).data?.mode === 'async',
      ) as Array<any>
      const shadowEvents = events.filter((event) => event.type === 'trace:react.runtime.controlplane.shadow') as Array<any>
      expect(asyncSnapshots.some((event) => event.data?.owner === 'runtime.base')).toBe(true)
      expect(asyncSnapshots.some((event) => event.data?.owner === 'runtime.layer-bound')).toBe(false)

      const runtimeBaseNeutralSnapshots = asyncSnapshots.filter(
        (event) => event.data?.owner === 'runtime.base' && event.data?.lane === 'neutral',
      )
      expect(runtimeBaseNeutralSnapshots).toHaveLength(1)

      const neutralStarts = shadowEvents.filter(
        (event) =>
          event.data?.event === 'request-start' &&
          event.data?.owner === 'runtime.base' &&
          event.data?.lane === 'neutral',
      )
      const neutralCommits = shadowEvents.filter(
        (event) =>
          event.data?.event === 'resolve-commit' &&
          event.data?.owner === 'runtime.base' &&
          event.data?.lane === 'neutral',
      )
      expect(neutralStarts).toHaveLength(1)
      expect(neutralCommits).toHaveLength(1)
      expect(neutralStarts[0].data?.epoch).toBe(neutralCommits[0].data?.epoch)
      expect(typeof neutralStarts[0].data?.ownerKey).toBe('string')
      expect(neutralStarts[0].data?.executor).toBe('phase-machine')

      const neutralPhaseMachineEvents = events.filter(
        (event) => event.type === 'trace:react.runtime.controlplane.phase-machine',
      ) as Array<any>
      const neutralPhaseMachineRuns = neutralPhaseMachineEvents.filter(
        (event) =>
          event.data?.lane === 'neutral' &&
          event.data?.action === 'resolve-run' &&
          (event.data?.phase === 'boot' || event.data?.phase === 'ready'),
      )
      expect(neutralPhaseMachineRuns.length).toBeGreaterThan(0)
      neutralPhaseMachineRuns.forEach((event) => expectOwnerLanePhaseContract(event.data))
      expect(neutralPhaseMachineRuns.every((event) => typeof event.data?.ownerKey === 'string')).toBe(true)
      expect(neutralPhaseMachineRuns.every((event) => event.data?.ownerKey === neutralStarts[0].data?.ownerKey)).toBe(true)
      expect(neutralPhaseMachineRuns.every((event) => event.data?.cancelBoundary === 'owner-lane')).toBe(true)

      const shadowInvariants = events.filter((event) => event.type === 'trace:react.runtime.controlplane.shadow.invariant')
      expect(shadowInvariants).toHaveLength(0)

      const configOnlyGatingFallback = events.find(
        (event) =>
          event.type === 'trace:react.fallback.duration' &&
          (event as any).data?.phase === 'provider.gating' &&
          (event as any).data?.blockers === 'config',
      )
      expect(configOnlyGatingFallback).toBeUndefined()
    })

    await runtime.dispose()
  })

  it('delegates configLane boot execution to phase-machine with controlled ready boundary', async () => {
    const events: Logix.Debug.Event[] = []

    const debugLayer = Layer.mergeAll(
      Logix.Debug.diagnosticsLevel('light'),
      Logix.Debug.replace([
        {
          record: (event: Logix.Debug.Event) =>
            Effect.sync(() => {
              events.push(event)
            }),
        },
      ]) as Layer.Layer<any, never, never>,
    ) as Layer.Layer<any, never, never>

    const runtime = Logix.Runtime.make(TagModuleImpl, {
      layer: debugLayer,
    })

    const configBearingLayer = ConfigProvider.layer(ConfigProvider.fromUnknown({ 'logix.react.gc_time': '1800' })) as Layer.Layer<
      any,
      never,
      never
    >

    render(
      <RuntimeProvider
        runtime={runtime}
        layer={configBearingLayer}
        fallback={<div data-testid="runtime-fallback">loading</div>}
        policy={{ mode: 'sync', syncBudgetMs: 1000 }}
      >
        <App />
      </RuntimeProvider>,
    )

    await waitFor(() => {
      expect(document.body.textContent).toContain('Impl: 0')
      expect(document.body.textContent).toContain('Tag: 0')
    })

    await waitFor(() => {
      const asyncSnapshots = events.filter(
        (event) => event.type === 'trace:react.runtime.config.snapshot' && (event as any).data?.mode === 'async',
      ) as Array<any>
      const shadowEvents = events.filter((event) => event.type === 'trace:react.runtime.controlplane.shadow') as Array<any>
      const phaseMachineEvents = events.filter(
        (event) => event.type === 'trace:react.runtime.controlplane.phase-machine',
      ) as Array<any>

      const configBootSnapshots = asyncSnapshots.filter(
        (event) =>
          event.data?.owner === 'runtime.layer-bound' && event.data?.lane === 'config' && event.data?.phase === 'boot',
      )
      expect(configBootSnapshots).toHaveLength(1)

      const configBootStarts = shadowEvents.filter(
        (event) =>
          event.data?.event === 'request-start' &&
          event.data?.owner === 'runtime.layer-bound' &&
          event.data?.lane === 'config' &&
          event.data?.phase === 'boot',
      )
      expect(configBootStarts).toHaveLength(1)
      expect(configBootStarts[0].data?.executor).toBe('phase-machine')

      const configBootPhaseMachineRuns = phaseMachineEvents.filter(
        (event) =>
          event.data?.lane === 'config' &&
          event.data?.phase === 'boot' &&
          event.data?.action === 'resolve-run' &&
          event.data?.reason === 'config-boot-owner-lock' &&
          event.data?.executor === 'phase-machine',
      )
      expect(configBootPhaseMachineRuns.length).toBeGreaterThan(0)
      configBootPhaseMachineRuns.forEach((event) => expectOwnerLanePhaseContract(event.data))
      expect(configBootPhaseMachineRuns.every((event) => typeof event.data?.ownerKey === 'string')).toBe(true)
      expect(configBootPhaseMachineRuns.every((event) => event.data?.ownerKey === configBootStarts[0].data?.ownerKey)).toBe(true)
      expect(configBootPhaseMachineRuns.every((event) => event.data?.cancelBoundary === 'owner-lane')).toBe(true)

      const configReadyPhaseEvents = phaseMachineEvents.filter(
        (event) => event.data?.lane === 'config' && event.data?.phase === 'ready',
      )
      if (configReadyPhaseEvents.length > 0) {
        configReadyPhaseEvents.forEach((event) => expectOwnerLanePhaseContract(event.data))
        expect(configReadyPhaseEvents.every((event) => event.data?.executor === 'phase-machine')).toBe(true)
        expect(configReadyPhaseEvents.every((event) => event.data?.cancelBoundary === 'owner-lane')).toBe(true)
      }

      const shadowInvariants = events.filter((event) => event.type === 'trace:react.runtime.controlplane.shadow.invariant')
      expect(shadowInvariants).toHaveLength(0)
    })

    await runtime.dispose()
  })

  it('dedupes configLane ready refresh after neutral settle when fingerprint stable', async () => {
    const events: Logix.Debug.Event[] = []

    const debugLayer = Layer.mergeAll(
      Logix.Debug.diagnosticsLevel('light'),
      Logix.Debug.replace([
        {
          record: (event: Logix.Debug.Event) =>
            Effect.sync(() => {
              events.push(event)
            }),
        },
      ]) as Layer.Layer<any, never, never>,
    ) as Layer.Layer<any, never, never>

    const runtime = Logix.Runtime.make(TagModuleImpl, {
      layer: debugLayer,
    })

    const configBearingLayer = ConfigProvider.layer(ConfigProvider.fromUnknown({ 'logix.react.gc_time': '1800' })) as Layer.Layer<
      any,
      never,
      never
    >

    render(
      <RuntimeProvider
        runtime={runtime}
        layer={configBearingLayer}
        fallback={<div data-testid="runtime-fallback">loading</div>}
        policy={{ mode: 'sync', syncBudgetMs: 1000 }}
      >
        <App />
      </RuntimeProvider>,
    )

    await waitFor(() => {
      expect(document.body.textContent).toContain('Impl: 0')
      expect(document.body.textContent).toContain('Tag: 0')
    })

    await waitFor(() => {
      const asyncSnapshots = events.filter(
        (event) => event.type === 'trace:react.runtime.config.snapshot' && (event as any).data?.mode === 'async',
      ) as Array<any>
      const phaseMachineEvents = events.filter(
        (event) => event.type === 'trace:react.runtime.controlplane.phase-machine',
      ) as Array<any>
      const shadowEvents = events.filter((event) => event.type === 'trace:react.runtime.controlplane.shadow') as Array<any>

      const configSnapshots = asyncSnapshots.filter(
        (event) => event.data?.owner === 'runtime.layer-bound' && event.data?.lane === 'config',
      )
      expect(configSnapshots).toHaveLength(1)
      expect(configSnapshots[0].data?.phase).toBe('boot')

      const configCommits = phaseMachineEvents.filter(
        (event) =>
          event.data?.lane === 'config' &&
          event.data?.action === 'resolve-commit',
      )
      expect(configCommits).toHaveLength(1)
      const ownerEpochCommits = new Set(configCommits.map((event) => `${event.data?.ownerKey}:${event.data?.epoch}`))
      expect(ownerEpochCommits.size).toBe(1)

      const configReadyAllowed = phaseMachineEvents.filter(
        (event) =>
          event.data?.lane === 'config' &&
          event.data?.phase === 'ready' &&
          event.data?.reason === 'neutral-settled-refresh-allowed' &&
          event.data?.action === 'resolve-run',
      )
      expect(configReadyAllowed).toHaveLength(0)

      const configReadySkips = phaseMachineEvents.filter(
        (event) =>
          event.data?.lane === 'config' &&
          event.data?.phase === 'ready' &&
          event.data?.reason === 'config-fingerprint-unchanged' &&
          event.data?.action === 'resolve-skip',
      )
      expect(configReadySkips.length).toBeGreaterThan(0)
      configReadySkips.forEach((event) => {
        expectOwnerLanePhaseContract(event.data)
        expect(event.data?.method).toBe('warmSync')
        expect(event.data?.cause).toBe('neutral-settled-refresh-allowed')
        expect(event.data?.reasonCode).toBe('react.controlplane.config.fingerprint.unchanged')
      })
    })

    await runtime.dispose()
  })

  it('ControlplaneKernel v1 enforces owner ticket and reports expired ticket reason', () => {
    const kernel = ControlplaneKernel.make()
    const ownerKey = '1:runtime.layer-bound:config'

    kernel.onNeutralSettled(ownerKey)

    const bootRun = kernel.requestConfigConfirm({
      ownerKey,
      cause: 'config-boot-owner-lock',
      currentFingerprint: null,
    })
    expect(bootRun.action).toBe('run')
    if (bootRun.action !== 'run') {
      return
    }

    const readyRun = kernel.requestConfigConfirm({
      ownerKey,
      cause: 'neutral-settled-refresh-allowed',
      currentFingerprint: null,
    })
    expect(readyRun.action).toBe('run')
    if (readyRun.action !== 'run') {
      return
    }

    const snapshot = {
      gcTime: 1800,
      initTimeoutMs: undefined,
      lowPriorityDelayMs: 16,
      lowPriorityMaxDelayMs: 50,
      source: 'config',
    } as const
    const fingerprint = fingerprintReactConfigSnapshot(snapshot)

    const staleCommit = kernel.commitTicket(ownerKey, bootRun.ticket, fingerprint)
    expect(staleCommit.accepted).toBe(false)
    expect(staleCommit.reason).toBe('ticket-expired')

    const currentCommit = kernel.commitTicket(ownerKey, readyRun.ticket, fingerprint)
    expect(currentCommit.accepted).toBe(true)
    expect(currentCommit.reason).toBe('ticket-committed')

    const neutralSettledSkip = kernel.requestConfigConfirm({
      ownerKey,
      cause: 'neutral-settled-refresh-allowed',
      currentFingerprint: fingerprint,
    })
    expect(neutralSettledSkip).toEqual({
      action: 'skip',
      reason: 'config-fingerprint-unchanged',
    })
  })

  it('marks preload lane as phase-machine skip when policy mode is suspend', async () => {
    const events: Logix.Debug.Event[] = []

    const debugLayer = Layer.mergeAll(
      Logix.Debug.diagnosticsLevel('light'),
      Logix.Debug.replace([
        {
          record: (event: Logix.Debug.Event) =>
            Effect.sync(() => {
              events.push(event)
            }),
        },
      ]) as Layer.Layer<any, never, never>,
    ) as Layer.Layer<any, never, never>

    const runtime = Logix.Runtime.make(TagModuleImpl, {
      layer: debugLayer,
    })

    render(
      <RuntimeProvider runtime={runtime} policy={{ mode: 'suspend', syncBudgetMs: 1000 }}>
        <App />
      </RuntimeProvider>,
    )

    await waitFor(() => {
      expect(document.body.textContent).toContain('Impl: 0')
      expect(document.body.textContent).toContain('Tag: 0')
    })

    await waitFor(() => {
      const preloadLaneSkips = events.filter(
        (event) =>
          event.type === 'trace:react.runtime.controlplane.phase-machine' &&
          (event as any).data?.lane === 'preload' &&
          (event as any).data?.action === 'resolve-skip' &&
          (event as any).data?.reason === 'policy-mode-preload-disabled' &&
          (event as any).data?.policyMode === 'suspend',
      )
      expect(preloadLaneSkips.length).toBeGreaterThan(0)
      preloadLaneSkips.forEach((event) => expectOwnerLanePhaseContract((event as any).data))
      expect(preloadLaneSkips.every((event) => (event as any).data?.executor === 'phase-machine')).toBe(true)
      expect(preloadLaneSkips.every((event) => typeof (event as any).data?.ownerKey === 'string')).toBe(true)
      expect(preloadLaneSkips.every((event) => (event as any).data?.cancelBoundary === 'owner-lane')).toBe(true)
    })

    await runtime.dispose()
  })

  it('delegates defer preload dispatch to phase-machine for async preload handles', async () => {
    const events: Logix.Debug.Event[] = []

    const debugLayer = Layer.mergeAll(
      Logix.Debug.diagnosticsLevel('light'),
      Logix.Debug.replace([
        {
          record: (event: Logix.Debug.Event) =>
            Effect.sync(() => {
              events.push(event)
            }),
        },
      ]) as Layer.Layer<any, never, never>,
    ) as Layer.Layer<any, never, never>

    const runtime = Logix.Runtime.make(TagModuleImpl, {
      layer: debugLayer,
    })

    let layerAccessCount = 0

    const InstrumentedAsyncImpl = new Proxy(BaseAsyncPreloadImpl, {
      get(target, prop, receiver) {
        if (prop === 'layer') {
          layerAccessCount += 1
          const moduleService = Reflect.get(target, 'module', receiver) as any
          return Layer.effect(
            moduleService,
            Effect.sleep(Duration.millis(1)).pipe(
              Effect.as({
                instanceId: `async-preload-${layerAccessCount}`,
              } as any),
            ),
          )
        }
        return Reflect.get(target, prop, receiver)
      },
    }) as typeof BaseAsyncPreloadImpl

    render(
      <RuntimeProvider
        runtime={runtime}
        policy={{ mode: 'defer', syncBudgetMs: 1000, preload: [InstrumentedAsyncImpl] }}
        fallback={<div data-testid="runtime-fallback">loading</div>}
      >
        <div data-testid="runtime-ready">ready</div>
      </RuntimeProvider>,
    )

    await waitFor(() => {
      expect(document.body.textContent).toContain('ready')
    })

    await waitFor(() => {
      const preloadLaneRun = events.filter(
        (event) =>
          event.type === 'trace:react.runtime.controlplane.phase-machine' &&
          (event as any).data?.lane === 'preload' &&
          (event as any).data?.action === 'resolve-run' &&
          (event as any).data?.reason === 'defer-preload-dispatch' &&
          (event as any).data?.policyMode === 'defer',
      )
      expect(preloadLaneRun.length).toBeGreaterThan(0)
      preloadLaneRun.forEach((event) => expectOwnerLanePhaseContract((event as any).data))
      expect(preloadLaneRun.every((event) => String((event as any).data?.ownerKey).endsWith(':runtime.base:preload'))).toBe(true)
      expect(preloadLaneRun.every((event) => (event as any).data?.cancelBoundary === 'owner-lane')).toBe(true)

      const neutralLaneRuns = events.filter(
        (event) =>
          event.type === 'trace:react.runtime.controlplane.phase-machine' &&
          (event as any).data?.lane === 'neutral' &&
          (event as any).data?.owner === 'runtime.base' &&
          (event as any).data?.action === 'resolve-run',
      ) as Array<any>
      expect(neutralLaneRuns.length).toBeGreaterThan(0)
      neutralLaneRuns.forEach((event) => expectOwnerLanePhaseContract(event.data))

      const preloadOwnerId = parseOwnerIdFromOwnerKey((preloadLaneRun[0] as any)?.data?.ownerKey)
      const neutralOwnerId = parseOwnerIdFromOwnerKey(neutralLaneRuns[0]?.data?.ownerKey)
      expect(preloadOwnerId).not.toBeNull()
      expect(neutralOwnerId).not.toBeNull()
      expect(preloadOwnerId).toBe(neutralOwnerId)
      expect(neutralLaneRuns.every((event) => event.data?.cancelBoundary === 'owner-lane')).toBe(true)
    })

    await waitFor(() => {
      const preloadTrace = events.filter(
        (event) => event.type === 'trace:react.module.preload' && (event as any).data?.mode === 'defer',
      )
      expect(preloadTrace.length).toBeGreaterThan(0)
    })

    expect(layerAccessCount).toBeGreaterThan(0)

    await runtime.dispose()
  })

  it('reuses in-flight preload token across rerender without duplicate dispatch', async () => {
    const events: Logix.Debug.Event[] = []

    const debugLayer = Layer.mergeAll(
      Logix.Debug.diagnosticsLevel('light'),
      Logix.Debug.replace([
        {
          record: (event: Logix.Debug.Event) =>
            Effect.sync(() => {
              events.push(event)
            }),
        },
      ]) as Layer.Layer<any, never, never>,
    ) as Layer.Layer<any, never, never>

    const runtime = Logix.Runtime.make(TagModuleImpl, {
      layer: debugLayer,
    })

    const SlowAsyncPreloadImpl = new Proxy(BaseAsyncPreloadImpl, {
      get(target, prop, receiver) {
        if (prop === 'layer') {
          const moduleService = Reflect.get(target, 'module', receiver) as any
          return Layer.effect(
            moduleService,
            Effect.sleep(Duration.millis(20)).pipe(
              Effect.as({
                instanceId: 'stage-e-preload-inflight',
              } as any),
            ),
          )
        }
        return Reflect.get(target, prop, receiver)
      },
    }) as typeof BaseAsyncPreloadImpl

    const Wrapper: React.FC = () => {
      const [pass, setPass] = React.useState(0)

      React.useEffect(() => {
        const timer = setTimeout(() => {
          setPass(1)
        }, 0)
        return () => {
          clearTimeout(timer)
        }
      }, [])

      return (
        <RuntimeProvider
          runtime={runtime}
          policy={{
            mode: 'defer',
            syncBudgetMs: 1000,
            preload: pass === 0 ? [SlowAsyncPreloadImpl] : [SlowAsyncPreloadImpl],
          }}
          fallback={<div data-testid="runtime-fallback">loading</div>}
        >
          <div data-testid="runtime-ready">{`ready-${pass}`}</div>
        </RuntimeProvider>
      )
    }

    render(<Wrapper />)

    await waitFor(() => {
      expect(document.body.textContent).toContain('ready-1')
    })

    await waitFor(() => {
      const preloadPhaseMachineEvents = events.filter(
        (event) => event.type === 'trace:react.runtime.controlplane.phase-machine' && (event as any).data?.lane === 'preload',
      ) as Array<any>
      preloadPhaseMachineEvents.forEach((event) => expectOwnerLanePhaseContract(event.data))
      const ownerKeys = new Set(preloadPhaseMachineEvents.map((event) => event.data?.ownerKey))
      expect(ownerKeys.size).toBe(1)
      expect(String(Array.from(ownerKeys)[0])).toMatch(/:runtime\.base:preload$/)

      const preloadRunEvents = events.filter(
        (event) =>
          event.type === 'trace:react.runtime.controlplane.phase-machine' &&
          (event as any).data?.lane === 'preload' &&
          (event as any).data?.action === 'resolve-run' &&
          (event as any).data?.reason === 'defer-preload-dispatch',
      )
      expect(preloadRunEvents).toHaveLength(1)

      const reuseEvents = events.filter(
        (event) =>
          event.type === 'trace:react.runtime.controlplane.phase-machine' &&
          (event as any).data?.lane === 'preload' &&
          (event as any).data?.action === 'resolve-skip' &&
          (event as any).data?.reason === 'defer-preload-reuse-inflight',
      )
      expect(reuseEvents.length).toBeGreaterThan(0)
      reuseEvents.forEach((event) => expectOwnerLanePhaseContract((event as any).data))
      expect(reuseEvents.every((event) => (event as any).data?.cancelBoundary === 'owner-lane')).toBe(true)
    })

    await runtime.dispose()
  })
})
