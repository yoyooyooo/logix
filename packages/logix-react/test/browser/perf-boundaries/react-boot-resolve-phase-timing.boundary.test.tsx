import * as CoreDebug from '@logixjs/core/repo-internal/debug-api'
import * as RuntimeContracts from '@logixjs/core/repo-internal/runtime-contracts'
import { expect, test } from 'vitest'
import React from 'react'
import { render } from 'vitest-browser-react'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '@logixjs/core'
import { RuntimeProvider, type YieldStrategy } from '../../../src/RuntimeProvider.js'
import { useModule, useSelector } from '../../../src/Hooks.js'
import { useProgramRuntimeBlueprint } from '../../../src/internal/hooks/useProgramRuntimeBlueprint.js'
import { makePerfKernelLayer, summarizeMs, withNodeEnv } from './harness.js'

const State = Schema.Struct({ count: Schema.Number })
const Actions = { inc: Schema.Void }

const ProgramModule = Logix.Module.make('PerfReactBootResolvePhaseTiming.Program', { state: State, actions: Actions })
const TagModule = Logix.Module.make('PerfReactBootResolvePhaseTiming.Tag', { state: State, actions: Actions })

const LocalProgram = Logix.Program.make(ProgramModule, { initial: { count: 0 }, logics: [] })
const LocalBlueprint = RuntimeContracts.getProgramRuntimeBlueprint(LocalProgram)
const TagModuleProgram = Logix.Program.make(TagModule, { initial: { count: 0 }, logics: [] })

const App: React.FC<{ readonly keyMode: 'auto' | 'explicit' }> = ({ keyMode }) => {
  const local =
    keyMode === 'explicit' ? useProgramRuntimeBlueprint(LocalBlueprint, { key: 'shared' }) : useProgramRuntimeBlueprint(LocalBlueprint)
  const programCount = useSelector(local, (s) => (s as { count: number }).count)

  const tag = useModule(TagModule.tag)
  const tagCount = useSelector(tag, (s) => (s as { count: number }).count)

  return (
    <div>
      <p>Program: {programCount}</p>
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
  events: ReadonlyArray<CoreDebug.Event>,
  predicate: (event: CoreDebug.Event) => boolean,
  timeoutMs: number,
): Promise<CoreDebug.Event> => {
  const deadline = performance.now() + timeoutMs
  while (performance.now() < deadline) {
    const hit = events.find(predicate)
    if (hit) return hit
    await nextFrame()
  }
  throw new Error('waitForEvent timeout')
}

type PhaseSample = {
  readonly providerReadyMs: number
  readonly providerEffectDelayMs: number
  readonly configSnapshotSyncMs: number
  readonly programResolveMs: number
  readonly programInitMs: number
  readonly tagInitMs: number
  readonly tagResolveMs: number
  readonly bootToProgramReadyMs: number
  readonly bootToTagReadyMs: number
}

const collectPhaseSample = async (params: {
  readonly keyMode: 'auto' | 'explicit'
  readonly yieldStrategy: YieldStrategy
}): Promise<PhaseSample> => {
  const events: CoreDebug.Event[] = []

  const debugLayer = CoreDebug.devtoolsHubLayer(
    CoreDebug.replace([
      {
        record: (event: CoreDebug.Event) =>
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

  const runtime = Logix.Runtime.make(TagModuleProgram, {
    layer: Layer.mergeAll(debugLayer, makePerfKernelLayer()) as Layer.Layer<any, never, never>,
    label: `perf:reactBootResolvePhaseTiming:${params.keyMode}:${params.yieldStrategy}`,
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
    await waitForBodyText('Program: 0', 3_000)
    const programReadyAt = performance.now()
    await waitForBodyText('Tag: 0', 3_000)
    const tagReadyAt = performance.now()

    const providerGating = (await waitForEvent(events, (event) => event.type === 'trace:react.provider.gating', 1_000)) as any
    const configSnapshot = (await waitForEvent(
      events,
      (event) => event.type === 'trace:react.runtime.config.snapshot' && (event as any).data?.mode === 'sync',
      1_000,
    )) as any
    const programResolve = (await waitForEvent(
      events,
      (event) => event.type === 'trace:react.program.resolve',
      1_000,
    )) as any
    const programInit = (await waitForEvent(
      events,
      (event) => event.type === 'trace:react.module.init' && event.moduleId === ProgramModule.id,
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
      providerReadyMs: providerGating.data.durationMs,
      providerEffectDelayMs: providerGating.data.effectDelayMs,
      configSnapshotSyncMs: configSnapshot.data.durationMs,
      programResolveMs: programResolve.data.durationMs,
      programInitMs: programInit.data.durationMs,
      tagInitMs: tagInit.data.durationMs,
      tagResolveMs: tagResolve.data.durationMs,
      bootToProgramReadyMs: programReadyAt - startedAt,
      bootToTagReadyMs: tagReadyAt - startedAt,
    }
  } finally {
    screen.unmount()
    document.body.innerHTML = ''
    await runtime.dispose()
  }
}

test(
  'perf boundary: react bootResolve sync phases',
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
          providerReadyMs: pick('providerReadyMs'),
          providerEffectDelayMs: pick('providerEffectDelayMs'),
          configSnapshotSyncMs: pick('configSnapshotSyncMs'),
          programResolveMs: pick('programResolveMs'),
          programInitMs: pick('programInitMs'),
          tagInitMs: pick('tagInitMs'),
          tagResolveMs: pick('tagResolveMs'),
          bootToProgramReadyMs: pick('bootToProgramReadyMs'),
          bootToTagReadyMs: pick('bootToTagReadyMs'),
        }

        expect(row.providerReadyMs).toBeGreaterThanOrEqual(0)
        expect(row.providerEffectDelayMs).toBeGreaterThanOrEqual(0)
        expect(row.configSnapshotSyncMs).toBeGreaterThanOrEqual(0)
        expect(row.programResolveMs).toBeGreaterThanOrEqual(0)
        expect(row.programInitMs).toBeGreaterThanOrEqual(0)
        expect(row.tagInitMs).toBeGreaterThanOrEqual(0)
        expect(row.tagResolveMs).toBeGreaterThanOrEqual(0)
        summary.push(row)
      }

      console.info('PERF_REACT_BOOTRESOLVE_PHASE_TIMING', JSON.stringify(summary))
    })
  },
)
