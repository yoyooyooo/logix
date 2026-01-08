import { expect, test } from 'vitest'
import React from 'react'
import { render } from 'vitest-browser-react'
import { Layer, Schema } from 'effect'
import * as Logix from '@logixjs/core'
import matrix from '@logixjs/perf-evidence/assets/matrix.json'
import { RuntimeProvider, type RuntimeProviderPolicyMode, type YieldStrategy } from '../../../src/RuntimeProvider.js'
import { useModule } from '../../../src/Hooks.js'
import { emitPerfReport, type PerfReport } from './protocol.js'
import {
  getProfileConfig,
  makePerfKernelLayer,
  runMatrixSuite,
  silentDebugLayer,
  type Params,
  withNodeEnv,
} from './harness.js'

const suite = (matrix.suites as any[]).find((s) => s.id === 'react.bootResolve') as any

const { runs, warmupDiscard, timeoutMs } = getProfileConfig(matrix)

const pointCount = Object.values(suite.axes as Record<string, ReadonlyArray<unknown>>).reduce(
  (acc, levels) => acc * levels.length,
  1,
)

const TEST_TIMEOUT_MS = Math.max(30_000, timeoutMs * pointCount)

const State = Schema.Struct({ count: Schema.Number })
const Actions = { inc: Schema.Void }

const ImplModule = Logix.Module.make('PerfReactBootResolve.Impl', { state: State, actions: Actions })
const TagModule = Logix.Module.make('PerfReactBootResolve.Tag', { state: State, actions: Actions })

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

test(
  'browser react boot/resolve baseline (provider + module init/tag resolve)',
  { timeout: TEST_TIMEOUT_MS },
  async () => {
    await withNodeEnv('production', async () => {
      const perfKernelLayer = makePerfKernelLayer()
      const { points, thresholds } = await runMatrixSuite(
        suite,
        { runs, warmupDiscard, timeoutMs },
        async (params: Params) => {
          const policyMode = params.policyMode as RuntimeProviderPolicyMode
          const yieldStrategy = params.yieldStrategy as YieldStrategy
          const keyMode = params.keyMode as 'auto' | 'explicit'

          const runtime = Logix.Runtime.make(TagModuleImpl, {
            layer: Layer.mergeAll(silentDebugLayer, perfKernelLayer) as Layer.Layer<any, never, never>,
            label: `perf:reactBootResolve:${policyMode}:${yieldStrategy}:${keyMode}`,
          })

          const policy = {
            mode: policyMode,
            yield: { strategy: yieldStrategy },
          }

          const app = (
            <RuntimeProvider runtime={runtime} policy={policy} fallback={<p>Loading…</p>}>
              <App keyMode={keyMode} />
            </RuntimeProvider>
          )

          document.body.innerHTML = ''

          const start = performance.now()
          const screen = await render(app)
          try {
            const perRunWaitMs = 3_000

            await waitForBodyText('Impl: 0', perRunWaitMs)
            const implReadyAt = performance.now()

            await waitForBodyText('Tag: 0', perRunWaitMs)
            const tagReadyAt = performance.now()

            return {
              metrics: {
                'e2e.bootToModuleImplReadyMs': implReadyAt - start,
                'e2e.bootToModuleTagReadyMs': tagReadyAt - start,
              },
            }
          } catch (error) {
            const reason = error instanceof Error ? error.message : 'unknown'
            return {
              metrics: {
                'e2e.bootToModuleImplReadyMs': { unavailableReason: reason },
                'e2e.bootToModuleTagReadyMs': { unavailableReason: reason },
              },
            }
          } finally {
            screen.unmount()
            document.body.innerHTML = ''
            await runtime.dispose()
          }
        },
        { cutOffOn: ['timeout'] },
      )

      const report: PerfReport = {
        schemaVersion: 1,
        meta: {
          createdAt: new Date().toISOString(),
          generator: 'packages/logix-react/test/browser/perf-boundaries/react-boot-resolve.test.tsx',
          matrixId: matrix.id,
          config: {
            runs,
            warmupDiscard,
            timeoutMs,
            headless: matrix.defaults.browser.headless,
            profile: (import.meta.env.VITE_LOGIX_PERF_PROFILE as string | undefined) ?? 'matrix.defaults',
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
            requiredEvidence: suite.requiredEvidence,
            metricCategories: {
              'e2e.bootToModuleImplReadyMs': 'e2e',
              'e2e.bootToModuleTagReadyMs': 'e2e',
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
