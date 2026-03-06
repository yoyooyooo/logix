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

const paintSuite = (matrix.suites as any[]).find((s) => s.id === 'watchers.clickToPaint') as any
const domStableSuite = (matrix.suites as any[]).find((s) => s.id === 'watchers.clickToDomStable') as any

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

const toPhaseEvidence = (sample: SampleMetrics) => ({
  'watchers.phase.clickInvokeToNativeCaptureMs': sample.clickInvokeToNativeCaptureMs,
  'watchers.phase.nativeCaptureToHandlerMs': sample.nativeCaptureToHandlerMs,
  'watchers.phase.handlerToDomStableMs': sample.handlerToDomStableMs,
  'watchers.phase.domStableToPaintGapMs': sample.domStableToPaintGapMs,
})

const collectSampleMetrics = async (args: { readonly watchers: number; readonly reactStrictMode: boolean }): Promise<SampleMetrics> => {
  const perfKernelLayer = makePerfKernelLayer()
  const layer = PerfModule.live({ value: 0 }, makePerfCounterIncWatchersLogic(PerfModule, args.watchers))
  const runtime = ManagedRuntime.make(Layer.mergeAll(perfKernelLayer, layer) as Layer.Layer<any, never, never>)
  let nativeCaptureAt: number | undefined
  let handlerStartAt: number | undefined

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
    await expect.element(screen.getByText('Value: 0')).toBeInTheDocument()
    await nextFrame()

    const button = screen.getByRole('button', { name: 'Increment' }).first()
    const clickInvokeAt = performance.now()
    await button.click()
    await expect.element(screen.getByText(`Value: ${args.watchers}`)).toBeInTheDocument()
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
      domStableMs: domStableAt - clickInvokeAt,
      paintishMs: paintishAt - clickInvokeAt,
    }
  } finally {
    screen.unmount()
    await runtime.dispose()
  }
}

test(
  'browser watchers baseline: click-to-paint under different watcher counts',
  { timeout: TEST_TIMEOUT_MS },
  async () => {
    await withNodeEnv('production', async () => {
      const { points: paintPoints, thresholds: paintThresholds } = await runMatrixSuite(
        paintSuite,
        { runs, warmupDiscard, timeoutMs },
        async (params) => {
          const sample = await collectSampleMetrics({
            watchers: params.watchers as number,
            reactStrictMode: params.reactStrictMode as boolean,
          })
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
          const sample = await collectSampleMetrics({
            watchers: params.watchers as number,
            reactStrictMode: params.reactStrictMode as boolean,
          })
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
