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

const PerfApp: React.FC = () => {
  const perf = useModule(PerfModule.tag)
  const value = useModule(perf, (s) => (s as { value: number }).value)

  return (
    <div>
      <p>Value: {value}</p>
      <button type="button" onClick={() => perf.actions.inc()}>
        Increment
      </button>
    </div>
  )
}

const suite = (matrix.suites as any[]).find((s) => s.id === 'watchers.clickToPaint') as any

const watchersLevels = suite.axes.watchers as number[]
const strictModeLevels = suite.axes.reactStrictMode as boolean[]

const { runs, warmupDiscard, timeoutMs } = getProfileConfig(matrix)

const resolveProfileId = (): string => {
  const profile = import.meta.env.VITE_LOGIX_PERF_PROFILE
  const profiles = (matrix as any).defaults?.profiles ?? {}
  if (profile && profiles[profile]) {
    return profile
  }
  return 'matrix.defaults'
}

const TEST_TIMEOUT_MS = Math.max(30_000, timeoutMs * watchersLevels.length * strictModeLevels.length)

test(
  'browser watchers baseline: click-to-paint under different watcher counts',
  { timeout: TEST_TIMEOUT_MS },
  async () => {
    await withNodeEnv('production', async () => {
      const perfKernelLayer = makePerfKernelLayer()
      const { points, thresholds } = await runMatrixSuite(
        suite,
        { runs, warmupDiscard, timeoutMs },
        async (params) => {
          const watchers = params.watchers as number
          const reactStrictMode = params.reactStrictMode as boolean

          const layer = PerfModule.live({ value: 0 }, makePerfCounterIncWatchersLogic(PerfModule, watchers))
          const runtime = ManagedRuntime.make(Layer.mergeAll(perfKernelLayer, layer) as Layer.Layer<any, never, never>)

          const app = (
            <RuntimeProvider runtime={runtime}>
              <PerfApp />
            </RuntimeProvider>
          )

          const screen = await render(reactStrictMode ? <React.StrictMode>{app}</React.StrictMode> : app)
          try {
            await expect.element(screen.getByText('Value: 0')).toBeInTheDocument()

            const button = screen.getByRole('button', { name: 'Increment' })
            const start = performance.now()
            await button.click()
            await expect.element(screen.getByText(`Value: ${watchers}`)).toBeInTheDocument()
            const end = performance.now()

            return {
              'e2e.clickToPaintMs': end - start,
            }
          } finally {
            screen.unmount()
            await runtime.dispose()
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
            id: suite.id,
            title: suite.title,
            priority: suite.priority,
            primaryAxis: suite.primaryAxis,
            budgets: suite.budgets,
            metricCategories: {
              'e2e.clickToPaintMs': 'e2e',
            },
            points,
            thresholds,
          },
        ],
      }

      emitPerfReport(report)
    })
  },
)
