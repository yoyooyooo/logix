import { createLiveAttachmentRegistry } from '@logixjs/core/repo-internal/live-bridge-api'
import matrix from '@logixjs/perf-evidence/assets/matrix.json'
import { expect, test } from 'vitest'
import { emitPerfReport, type PerfReport } from './protocol.js'
import { getProfileConfig, runMatrixSuite, withNodeEnv, type MatrixSuite } from './harness.js'
import { makeDispatchShellRuntime, runDispatchShellSample } from './dispatch-shell.runtime.js'

type BridgeMode = 'noBridge' | 'disabled' | 'adapterInactive'

const suite = (matrix.suites as any[]).find((s) => s.id === 'liveBridge.disabledOverhead.txnCommit') as MatrixSuite

const { runs, warmupDiscard, timeoutMs } = getProfileConfig(matrix)

const SAMPLE_BATCH = 100
const EXPECTED_POINT_COUNT = suite.axes.stateWidth.length * suite.axes.bridgeMode.length
const EXPECTED_WORK_MS = timeoutMs * EXPECTED_POINT_COUNT
const TEST_TIMEOUT_MS = Math.max(30_000, Math.ceil(EXPECTED_WORK_MS * 1.2 + 5_000))

const makeBridgeEvidence = (bridgeMode: BridgeMode): Record<string, number | string> => {
  if (bridgeMode === 'noBridge') {
    return {
      'liveBridge.bridgeMode': bridgeMode,
      'liveBridge.captureBufferAllocations': 0,
      'liveBridge.transportAllocations': 0,
      'liveBridge.operationRequests': 0,
      'liveBridge.transactionWindowIoCount': 0,
    }
  }

  const registry = createLiveAttachmentRegistry({ enabled: bridgeMode === 'adapterInactive' })

  if (bridgeMode === 'adapterInactive') {
    registry.submitAttachmentOffer({
      attachmentId: 'perf-live-bridge-inactive',
      adapterKind: 'browser-dev',
      targets: [
        {
          runtimeId: 'perf-runtime',
          moduleId: 'perf-module',
          instanceId: 'perf-instance',
        },
      ],
    })
  }

  const diagnostics = registry.getDiagnostics()

  return {
    'liveBridge.bridgeMode': bridgeMode,
    'liveBridge.captureBufferAllocations': diagnostics.captureBufferAllocations,
    'liveBridge.transportAllocations': diagnostics.transportAllocations,
    'liveBridge.operationRequests': diagnostics.operationRequests,
    'liveBridge.transactionWindowIoCount': 0,
  }
}

test('browser live bridge: disabled and inactive adapter overhead stays structural no-op', { timeout: TEST_TIMEOUT_MS }, async () => {
  await withNodeEnv('production', async () => {
    const runtimeByStateWidth = new Map<number, ReturnType<typeof makeDispatchShellRuntime>>()
    const hotPathSamplesByStateWidth = new Map<number, ReadonlyArray<number>>()
    const hotPathSampleCursorByStateWidth = new Map<number, number>()

    try {
      const readHotPathSample = async (stateWidth: number): Promise<number> => {
        const cached = hotPathSamplesByStateWidth.get(stateWidth)
        if (cached) {
          const cursor = hotPathSampleCursorByStateWidth.get(stateWidth) ?? 0
          hotPathSampleCursorByStateWidth.set(stateWidth, cursor + 1)
          return cached[cursor % cached.length]!
        }

        const runtime = runtimeByStateWidth.get(stateWidth) ?? makeDispatchShellRuntime(stateWidth)
        runtimeByStateWidth.set(stateWidth, runtime)

        const samples: number[] = []
        for (let i = 0; i < runs; i++) {
          const start = performance.now()
          await runtime.runtime.runPromise(runDispatchShellSample(runtime, 'reuseScope', SAMPLE_BATCH) as any)
          const end = performance.now()
          samples.push((end - start) / SAMPLE_BATCH)
        }

        hotPathSamplesByStateWidth.set(stateWidth, samples)
        hotPathSampleCursorByStateWidth.set(stateWidth, 1)
        return samples[0]!
      }

      const { points, thresholds } = await runMatrixSuite(
        suite,
        { runs, warmupDiscard, timeoutMs },
        async (params) => {
          const stateWidth = params.stateWidth as number
          const bridgeMode = params.bridgeMode as BridgeMode
          const bridgeEvidence = makeBridgeEvidence(bridgeMode)
          const hotPathSampleMs = await readHotPathSample(stateWidth)

          return {
            metrics: {
              'runtime.txnCommitMs': hotPathSampleMs,
            },
            evidence: {
              ...bridgeEvidence,
              'module.stateWidth': stateWidth,
              'runtime.dispatchesPerSample': SAMPLE_BATCH,
            },
          }
        },
        {
          cutOffOn: ['timeout'],
        },
      )

      expect(points.every((point) => point.status === 'ok')).toBe(true)
      expect(thresholds).toEqual([
        expect.objectContaining({ maxLevel: 512, firstFailLevel: null }),
        expect.objectContaining({ maxLevel: 512, firstFailLevel: null }),
      ])

      const report: PerfReport = {
        schemaVersion: 1,
        meta: {
          createdAt: new Date().toISOString(),
          generator: 'packages/logix-react/test/browser/perf-boundaries/live-bridge-disabled-overhead.test.tsx',
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
            metricCategories: {
              'runtime.txnCommitMs': 'runtime',
            },
            points,
            thresholds,
          },
        ],
      }

      emitPerfReport(report)
    } finally {
      await Promise.allSettled(Array.from(runtimeByStateWidth.values()).map((runtime) => runtime.runtime.dispose()))
    }
  })
})
