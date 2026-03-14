import { expect, test } from 'vitest'
import React from 'react'
import { render } from 'vitest-browser-react'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '@logixjs/core'
import { RuntimeProvider, type YieldStrategy } from '../../../src/RuntimeProvider.js'
import { useModule } from '../../../src/Hooks.js'
import { makePerfKernelLayer, summarizeMs, withNodeEnv } from './harness.js'

const State = Schema.Struct({ count: Schema.Number })
const Actions = { inc: Schema.Void }

const ImplModule = Logix.Module.make('PerfReactBootResolvePhaseProbe.Impl', { state: State, actions: Actions })
const TagModule = Logix.Module.make('PerfReactBootResolvePhaseProbe.Tag', { state: State, actions: Actions })

const ImplModuleImpl = ImplModule.implement({ initial: { count: 0 }, logics: [] }).impl
const TagModuleImpl = TagModule.implement({ initial: { count: 0 }, logics: [] }).impl

const App: React.FC<{ readonly keyMode: 'auto' | 'explicit' }> = ({ keyMode }) => {
  const impl = keyMode === 'explicit' ? useModule(ImplModuleImpl, { key: 'shared' }) : useModule(ImplModuleImpl)
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

const nextFrame = (): Promise<void> => new Promise((resolve) => requestAnimationFrame(() => resolve()))

const waitForBodyText = async (text: string, timeoutMs: number): Promise<void> => {
  const deadline = performance.now() + timeoutMs
  while (performance.now() < deadline) {
    if (document.body.textContent?.includes(text)) return
    await nextFrame()
  }
  throw new Error(`waitForBodyText timeout: ${text}`)
}

const waitForEvent = async (
  events: ReadonlyArray<Logix.Debug.Event>,
  predicate: (event: Logix.Debug.Event) => boolean,
  timeoutMs: number,
): Promise<Logix.Debug.Event> => {
  const deadline = performance.now() + timeoutMs
  while (performance.now() < deadline) {
    const hit = events.find(predicate)
    if (hit) return hit
    await nextFrame()
  }
  throw new Error('waitForEvent timeout')
}

type PhaseSample = {
  readonly providerGatingMs: number
  readonly configSnapshotSyncMs: number
  readonly implInitMs: number
  readonly tagInitMs: number
  readonly tagResolveMs: number
  readonly bootToImplReadyMs: number
  readonly bootToTagReadyMs: number
}

const collectPhaseSample = async (params: {
  readonly keyMode: 'auto' | 'explicit'
  readonly yieldStrategy: YieldStrategy
}): Promise<PhaseSample> => {
  const events: Logix.Debug.Event[] = []

  const debugLayer = Logix.Debug.devtoolsHubLayer(
    Logix.Debug.replace([
      {
        record: (event: Logix.Debug.Event) =>
          Effect.sync(() => {
            events.push(event)
          }),
      },
    ]) as Layer.Layer<any, never, never>,
    {
      diagnosticsLevel: 'light',
      traceMode: 'on',
    },
  ) as Layer.Layer<any, never, never>

  const runtime = Logix.Runtime.make(TagModuleImpl, {
    layer: Layer.mergeAll(debugLayer, makePerfKernelLayer()) as Layer.Layer<any, never, never>,
    label: `perf:reactBootResolvePhaseProbe:${params.keyMode}:${params.yieldStrategy}`,
  })

  document.body.innerHTML = ''
  const startedAt = performance.now()
  const screen = await render(
    <RuntimeProvider
      runtime={runtime}
      policy={{ mode: 'sync', syncBudgetMs: 1000, yield: { strategy: params.yieldStrategy } }}
      fallback={<p>Loading…</p>}
    >
      <App keyMode={params.keyMode} />
    </RuntimeProvider>,
  )

  try {
    await waitForBodyText('Impl: 0', 3_000)
    const implReadyAt = performance.now()
    await waitForBodyText('Tag: 0', 3_000)
    const tagReadyAt = performance.now()

    const providerGating = (await waitForEvent(events, (event) => event.type === 'trace:react.provider.gating', 1_000)) as any
    const configSnapshot = (await waitForEvent(
      events,
      (event) => event.type === 'trace:react.runtime.config.snapshot' && (event as any).data?.mode === 'sync',
      1_000,
    )) as any
    const implInit = (await waitForEvent(
      events,
      (event) => event.type === 'trace:react.module.init' && event.moduleId === ImplModule.id,
      1_000,
    )) as any
    const tagInit = (await waitForEvent(
      events,
      (event) => event.type === 'trace:react.module.init' && event.moduleId === TagModule.id,
      1_000,
    )) as any
    const tagResolve = (await waitForEvent(
      events,
      (event) => event.type === 'trace:react.moduleTag.resolve',
      1_000,
    )) as any

    return {
      providerGatingMs: providerGating.data.durationMs,
      configSnapshotSyncMs: configSnapshot.data.durationMs,
      implInitMs: implInit.data.durationMs,
      tagInitMs: tagInit.data.durationMs,
      tagResolveMs: tagResolve.data.durationMs,
      bootToImplReadyMs: implReadyAt - startedAt,
      bootToTagReadyMs: tagReadyAt - startedAt,
    }
  } finally {
    screen.unmount()
    document.body.innerHTML = ''
    await runtime.dispose()
  }
}

test(
  'perf probe: react bootResolve sync phases',
  { timeout: 30_000 },
  async () => {
    await withNodeEnv('production', async () => {
      const points = [
        { keyMode: 'explicit' as const, yieldStrategy: 'none' as const },
        { keyMode: 'auto' as const, yieldStrategy: 'none' as const },
        { keyMode: 'explicit' as const, yieldStrategy: 'microtask' as const },
        { keyMode: 'auto' as const, yieldStrategy: 'microtask' as const },
      ]

      const summary = []

      for (const point of points) {
        const samples: PhaseSample[] = []
        for (let i = 0; i < 5; i += 1) {
          samples.push(await collectPhaseSample(point))
        }

        const pick = (key: keyof PhaseSample) => summarizeMs(samples.map((sample) => sample[key])).medianMs

        const row = {
          ...point,
          providerGatingMs: pick('providerGatingMs'),
          configSnapshotSyncMs: pick('configSnapshotSyncMs'),
          implInitMs: pick('implInitMs'),
          tagInitMs: pick('tagInitMs'),
          tagResolveMs: pick('tagResolveMs'),
          bootToImplReadyMs: pick('bootToImplReadyMs'),
          bootToTagReadyMs: pick('bootToTagReadyMs'),
        }

        expect(row.providerGatingMs).toBeGreaterThanOrEqual(0)
        expect(row.configSnapshotSyncMs).toBeGreaterThanOrEqual(0)
        expect(row.implInitMs).toBeGreaterThanOrEqual(0)
        expect(row.tagInitMs).toBeGreaterThanOrEqual(0)
        expect(row.tagResolveMs).toBeGreaterThanOrEqual(0)
        summary.push(row)
      }

      console.info('PERF_REACT_BOOTRESOLVE_PHASE_PROBE', JSON.stringify(summary))
    })
  },
)
