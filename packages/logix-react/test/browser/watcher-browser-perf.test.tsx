import { expect, test } from 'vitest'
import React from 'react'
import { render } from 'vitest-browser-react'
import { Layer, ManagedRuntime } from 'effect'
import matrix from '@logixjs/perf-evidence/assets/matrix.json'
import { RuntimeProvider } from '../../src/RuntimeProvider.js'
import { useModule } from '../../src/Hooks.js'
import { makePerfCounterIncWatchersLogic, makePerfCounterModule } from '../../src/internal/store/perfWorkloads.js'
import { emitPerfReport, type PerfReport } from './perf-boundaries/protocol.js'
import { getProfileConfig, makePerfKernelLayer, runMatrixSuite, withNodeEnv } from './perf-boundaries/harness.js'

const PerfModule = makePerfCounterModule('PerfBrowserCounter')

const nextFrame = (): Promise<void> => new Promise((resolve) => requestAnimationFrame(() => resolve()))
const MAX_CAPTURE_SAMPLE_ATTEMPTS = 3
const RETRYABLE_CAPTURE_ERRORS = new Set(['watcherNativeCaptureMissing', 'watcherHandlerStartMissing'])
const SAMPLE_STAGE_TIMEOUT_MS = 3_000

type PerfAppProps = {
  readonly onIncrementNativeCapture?: (atMs: number) => void
  readonly onIncrementHandlerStart?: (atMs: number) => void
}

const PerfApp: React.FC<PerfAppProps> = ({ onIncrementNativeCapture, onIncrementHandlerStart }) => {
  const perf = useModule(PerfModule.tag)
  const value = useModule(perf, (s) => (s as { value: number }).value)
  const buttonRef = React.useRef<HTMLButtonElement | null>(null)

  React.useLayoutEffect(() => {
    const button = buttonRef.current
    if (!button || !onIncrementNativeCapture) {
      return
    }

    const handleNativeCapture = () => {
      onIncrementNativeCapture(performance.now())
    }

    button.addEventListener('click', handleNativeCapture, { capture: true })
    return () => {
      button.removeEventListener('click', handleNativeCapture, { capture: true })
    }
  }, [onIncrementNativeCapture])

  return (
    <div>
      <p>Value: {value}</p>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          onIncrementHandlerStart?.(performance.now())
          perf.actions.inc()
        }}
      >
        Increment
      </button>
    </div>
  )
}

const requireSuite = (id: string) => {
  const suite = (matrix.suites as any[]).find((candidate) => candidate.id === id)
  if (!suite) {
    throw new Error(`[watcher-browser-perf] Missing perf matrix suite: ${id}`)
  }
  return suite as any
}

const paintSuite = requireSuite('watchers.clickToPaint')
const domStableSuite = requireSuite('watchers.clickToDomStable')

const watchersLevels = paintSuite.axes.watchers as number[]
const strictModeLevels = paintSuite.axes.reactStrictMode as boolean[]

const { runs, warmupDiscard, timeoutMs } = getProfileConfig(matrix)

const resolveProfileId = (): string => {
  const profile = import.meta.env.VITE_LOGIX_PERF_PROFILE
  const profiles = (matrix as any).defaults?.profiles ?? {}
  if (profile && profiles[profile]) {
    return profile
  }
  return 'matrix.defaults'
}

const TEST_TIMEOUT_MS = Math.max(30_000, timeoutMs * watchersLevels.length * strictModeLevels.length * 2)

type SampleMetrics = {
  readonly clickInvokeToNativeCaptureMs: number
  readonly nativeCaptureToHandlerMs: number
  readonly handlerToDomStableMs: number
  readonly domStableToPaintGapMs: number
  readonly paintishMs: number
  readonly domStableMs: number
}

const sampleKeyOf = (args: { readonly watchers: number; readonly reactStrictMode: boolean }): string =>
  `${args.reactStrictMode ? 'strict' : 'loose'}:${args.watchers}`

const pushSharedSample = (
  cache: Map<string, SampleMetrics[]>,
  args: { readonly watchers: number; readonly reactStrictMode: boolean },
  sample: SampleMetrics,
): void => {
  const key = sampleKeyOf(args)
  const queue = cache.get(key) ?? []
  queue.push(sample)
  cache.set(key, queue)
}

const shiftSharedSample = (
  cache: Map<string, SampleMetrics[]>,
  args: { readonly watchers: number; readonly reactStrictMode: boolean },
): SampleMetrics | undefined => {
  const key = sampleKeyOf(args)
  const queue = cache.get(key)
  if (!queue || queue.length === 0) {
    return undefined
  }
  const sample = queue.shift()
  if (queue.length === 0) {
    cache.delete(key)
  }
  return sample
}

const toPhaseEvidence = (sample: SampleMetrics) => ({
  'watchers.phase.clickInvokeToNativeCaptureMs': sample.clickInvokeToNativeCaptureMs,
  'watchers.phase.nativeCaptureToHandlerMs': sample.nativeCaptureToHandlerMs,
  'watchers.phase.handlerToDomStableMs': sample.handlerToDomStableMs,
  'watchers.phase.domStableToPaintGapMs': sample.domStableToPaintGapMs,
})

const waitForBodyText = async (text: string, timeoutMs: number, reason: string): Promise<void> => {
  const deadline = performance.now() + timeoutMs
  while (performance.now() < deadline) {
    if (document.body.textContent?.includes(text)) return
    await nextFrame()
  }
  throw new Error(reason)
}

const waitForIncrementButton = async (
  screen: Awaited<ReturnType<typeof render>>,
  timeoutMs: number,
): Promise<ReturnType<typeof screen.getByRole>> => {
  const deadline = performance.now() + timeoutMs
  while (performance.now() < deadline) {
    try {
      return screen.getByRole('button', { name: 'Increment' }).first()
    } catch {
      await nextFrame()
    }
  }
  throw new Error('watcherButtonMissing')
}

const collectSampleMetrics = async (args: { readonly watchers: number; readonly reactStrictMode: boolean }): Promise<SampleMetrics> => {
  for (let attempt = 0; attempt < MAX_CAPTURE_SAMPLE_ATTEMPTS; attempt++) {
    const perfKernelLayer = makePerfKernelLayer()
    const layer = PerfModule.live({ value: 0 }, makePerfCounterIncWatchersLogic(PerfModule, args.watchers))
    const runtime = ManagedRuntime.make(Layer.mergeAll(perfKernelLayer, layer) as Layer.Layer<any, never, never>)
    let nativeCaptureAt: number | undefined
    let handlerStartAt: number | undefined
    let retryableError: Error | undefined

    const app = (
      <RuntimeProvider runtime={runtime}>
        <PerfApp
          onIncrementNativeCapture={(atMs) => {
            nativeCaptureAt = atMs
          }}
          onIncrementHandlerStart={(atMs) => {
            handlerStartAt = atMs
          }}
        />
      </RuntimeProvider>
    )

    const screen = await render(args.reactStrictMode ? <React.StrictMode>{app}</React.StrictMode> : app)
    try {
      await waitForBodyText('Value: 0', SAMPLE_STAGE_TIMEOUT_MS, 'watcherInitValueMissing')
      await nextFrame()

      const button = await waitForIncrementButton(screen, SAMPLE_STAGE_TIMEOUT_MS)
      const clickInvokeAt = performance.now()
      await button.click()
      await waitForBodyText(`Value: ${args.watchers}`, SAMPLE_STAGE_TIMEOUT_MS, 'watcherIncrementResultMissing')
      const domStableAt = performance.now()
      await nextFrame()
      const paintishAt = performance.now()

      if (nativeCaptureAt === undefined) {
        throw new Error('watcherNativeCaptureMissing')
      }

      if (handlerStartAt === undefined) {
        throw new Error('watcherHandlerStartMissing')
      }

      return {
        clickInvokeToNativeCaptureMs: Math.max(0, nativeCaptureAt - clickInvokeAt),
        nativeCaptureToHandlerMs: Math.max(0, handlerStartAt - nativeCaptureAt),
        handlerToDomStableMs: Math.max(0, domStableAt - handlerStartAt),
        domStableToPaintGapMs: Math.max(0, paintishAt - domStableAt),
        domStableMs: domStableAt - nativeCaptureAt,
        paintishMs: paintishAt - nativeCaptureAt,
      }
    } catch (error) {
      if (
        error instanceof Error &&
        RETRYABLE_CAPTURE_ERRORS.has(error.message) &&
        attempt < MAX_CAPTURE_SAMPLE_ATTEMPTS - 1
      ) {
        retryableError = error
      } else {
        throw error
      }
    } finally {
      screen.unmount()
      await runtime.dispose()
    }

    if (retryableError) {
      await nextFrame()
    }
  }

  throw new Error('watcherSampleCollectionExhausted')
}

test(
  'browser watchers baseline: click-to-paint under different watcher counts',
  { timeout: TEST_TIMEOUT_MS },
  async () => {
    await withNodeEnv('production', async () => {
      const sharedSamples = new Map<string, SampleMetrics[]>()

      const { points: paintPoints, thresholds: paintThresholds } = await runMatrixSuite(
        paintSuite,
        { runs, warmupDiscard, timeoutMs },
        async (params) => {
          const sampleArgs = {
            watchers: params.watchers as number,
            reactStrictMode: params.reactStrictMode as boolean,
          } as const
          const sample = await collectSampleMetrics(sampleArgs)
          pushSharedSample(sharedSamples, sampleArgs, sample)
          return {
            metrics: {
              'e2e.clickToPaintMs': sample.paintishMs,
            },
            evidence: toPhaseEvidence(sample),
          }
        },
        { cutOffOn: ['timeout'] },
      )

      const { points: domStablePoints, thresholds: domStableThresholds } = await runMatrixSuite(
        domStableSuite,
        { runs, warmupDiscard, timeoutMs },
        async (params) => {
          const sampleArgs = {
            watchers: params.watchers as number,
            reactStrictMode: params.reactStrictMode as boolean,
          } as const
          const sample = shiftSharedSample(sharedSamples, sampleArgs) ?? (await collectSampleMetrics(sampleArgs))
          return {
            metrics: {
              'e2e.clickToDomStableMs': sample.domStableMs,
            },
            evidence: toPhaseEvidence(sample),
          }
        },
        { cutOffOn: ['timeout'] },
      )

      const report: PerfReport = {
        schemaVersion: 1,
        meta: {
          createdAt: new Date().toISOString(),
          generator: 'packages/logix-react/test/browser/watcher-browser-perf.test.tsx',
          matrixId: matrix.id,
          config: {
            runs,
            warmupDiscard,
            timeoutMs,
            headless: matrix.defaults.browser.headless,
            profile: resolveProfileId(),
            stability: matrix.defaults.stability,
          },
          env: {
            os: navigator.platform || 'unknown',
            arch: 'unknown',
            node: 'unknown',
            browser: {
              name: matrix.defaults.browser.name,
              headless: matrix.defaults.browser.headless,
            },
          },
        },
        suites: [
          {
            id: paintSuite.id,
            title: paintSuite.title,
            priority: paintSuite.priority,
            primaryAxis: paintSuite.primaryAxis,
            budgets: paintSuite.budgets,
            metricCategories: {
              'e2e.clickToPaintMs': 'e2e',
            },
            points: paintPoints,
            thresholds: paintThresholds,
          },
          {
            id: domStableSuite.id,
            title: domStableSuite.title,
            priority: domStableSuite.priority,
            primaryAxis: domStableSuite.primaryAxis,
            budgets: domStableSuite.budgets,
            metricCategories: {
              'e2e.clickToDomStableMs': 'e2e',
            },
            points: domStablePoints,
            thresholds: domStableThresholds,
          },
        ],
      }

      emitPerfReport(report)
    })
  },
)
