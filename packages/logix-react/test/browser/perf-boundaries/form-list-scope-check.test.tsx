import { test } from 'vitest'
import { Effect, Layer } from 'effect'
import * as Logix from '@logix/core'
import matrix from '@logix/perf-evidence/assets/matrix.json'
import { emitPerfReport, type PerfReport } from './protocol.js'
import { getProfileConfig, makePerfKernelLayer, runMatrixSuite, silentDebugLayer, withNodeEnv } from './harness.js'
import { readConvergeControlPlaneFromEnv } from './converge-runtime.js'
import {
  makePerfListScopeCheckModule,
  makePerfListScopeInitialState,
  type PerfListScopeRow,
} from '../../../src/internal/store/perfWorkloads.js'

const suite = (matrix.suites as any[]).find((s) => s.id === 'form.listScopeCheck') as any

const rowsLevels = suite.axes.rows as number[]
const requestedModeLevels = suite.axes.requestedMode as Array<'full' | 'auto'>
const diagnosticsLevels = suite.axes.diagnosticsLevel as Array<'off' | 'light' | 'full'>

const { runs, warmupDiscard, timeoutMs } = getProfileConfig(matrix)

const resolveProfileId = (): string => {
  const profile = import.meta.env.VITE_LOGIX_PERF_PROFILE
  const profiles = (matrix as any).defaults?.profiles ?? {}
  if (profile && profiles[profile]) {
    return profile
  }
  return 'matrix.defaults'
}

const TEST_TIMEOUT_MS = Math.max(
  30_000,
  timeoutMs * rowsLevels.length * requestedModeLevels.length * diagnosticsLevels.length,
)

const pickDuplicateIndices = (rowCount: number): ReadonlyArray<number> => {
  const clamped = Math.max(1, rowCount)
  const a = Math.floor(clamped / 4)
  const b = Math.floor(clamped / 2)
  const c = Math.floor((clamped * 3) / 4)
  const out: number[] = []
  for (const idx of [a, b, c]) {
    const next = Math.max(0, Math.min(clamped - 1, idx))
    if (!out.includes(next)) out.push(next)
  }
  while (out.length < Math.min(3, clamped)) {
    const next = (out[out.length - 1]! + 1) % clamped
    if (!out.includes(next)) out.push(next)
  }
  return out
}

const makeWarehouseIdForIndex = (idx: number): string => `WH-${String(idx).padStart(3, '0')}`

type ListScopeRuntime = {
  readonly module: any
  readonly runtime: ReturnType<typeof Logix.Runtime.make>
  readonly flipDuplicates: () => boolean
  readonly getLastConvergeDecision: () => unknown | undefined
  readonly clearLastConvergeDecision: () => void
}

const makeListScopeRuntime = (
  rows: number,
  requestedMode: 'full' | 'auto',
  diagnosticsLevel: 'off' | 'light' | 'full',
): ListScopeRuntime => {
  const perfKernelLayer = makePerfKernelLayer()
  const PerfModule = makePerfListScopeCheckModule(`PerfFormListScopeCheckRows${rows}`)

  const impl = PerfModule.implement({
    initial: makePerfListScopeInitialState(rows) as any,
    logics: [],
  })

  const controlPlane = readConvergeControlPlaneFromEnv()

  let duplicatesOn = false
  const flipDuplicates = (): boolean => {
    duplicatesOn = !duplicatesOn
    return duplicatesOn
  }

  let lastDecision: unknown | undefined
  const clearLastConvergeDecision = (): void => {
    lastDecision = undefined
  }
  const getLastConvergeDecision = (): unknown | undefined => lastDecision

  const captureSink: Logix.Debug.Sink = {
    record: (event: Logix.Debug.Event) =>
      Effect.sync(() => {
        if (event.type !== 'state:update') return
        const decision = (event as any)?.traitSummary?.converge
        if (decision != null) {
          lastDecision = decision
        }
      }),
  }

  const baseDebugLayer =
    requestedMode === 'auto'
      ? (Logix.Debug.replace([captureSink]) as Layer.Layer<any, never, never>)
      : (silentDebugLayer as Layer.Layer<any, never, never>)

  const debugLayer = Logix.Debug.devtoolsHubLayer(baseDebugLayer, {
    diagnosticsLevel,
  }) as Layer.Layer<any, never, never>

  const runtime = Logix.Runtime.make(impl, {
    stateTransaction: {
      traitConvergeMode: requestedMode,
      traitConvergeBudgetMs: controlPlane.traitConvergeBudgetMs,
      traitConvergeDecisionBudgetMs: controlPlane.traitConvergeDecisionBudgetMs,
    },
    layer: Layer.mergeAll(debugLayer, perfKernelLayer) as Layer.Layer<any, never, never>,
    label: [
      `perf:form:listScopeCheck:${requestedMode}:${rows}:${diagnosticsLevel}`,
      controlPlane.tuningId ? `tuning:${controlPlane.tuningId}` : undefined,
    ]
      .filter(Boolean)
      .join(' '),
  })

  return {
    module: PerfModule as any,
    runtime,
    flipDuplicates,
    getLastConvergeDecision,
    clearLastConvergeDecision,
  }
}

test(
  'browser perf boundaries: form list-scope cross-row check (full vs auto)',
  { timeout: TEST_TIMEOUT_MS },
  async () => {
    await withNodeEnv('production', async () => {
      const controlPlane = readConvergeControlPlaneFromEnv()
      const runtimeByKey = new Map<string, ListScopeRuntime>()
      const lastEvictsByKey = new Map<string, number>()

      try {
        const { points, thresholds } = await runMatrixSuite(
          suite,
          { runs, warmupDiscard, timeoutMs },
          async (params) => {
            const diagnosticsLevel = params.diagnosticsLevel as 'off' | 'light' | 'full'
            const requestedMode = params.requestedMode as 'full' | 'auto'
            const rows = params.rows as number
            const key = `${requestedMode}:${rows}:${diagnosticsLevel}`
            const cached = runtimeByKey.get(key) ?? makeListScopeRuntime(rows, requestedMode, diagnosticsLevel)
            runtimeByKey.set(key, cached)

            cached.clearLastConvergeDecision()

            const program = Effect.gen(function* () {
              const moduleScope = (yield* cached.module.tag) as any
              const duplicateIndices = pickDuplicateIndices(rows)
              const duplicatesOn = cached.flipDuplicates()
              const duplicateValue = 'WH-DUP'

              yield* Logix.InternalContracts.runWithStateTransaction(
                moduleScope,
                { kind: 'perf', name: 'form:listScopeCheck' },
                () =>
                  Effect.gen(function* () {
                    const prev = yield* moduleScope.getState
                    const prevItems = (prev as any).items as ReadonlyArray<PerfListScopeRow>
                    const nextItems = prevItems.slice()

                    for (const idx of duplicateIndices) {
                      const row = nextItems[idx]
                      if (!row) continue
                      nextItems[idx] = {
                        ...row,
                        warehouseId: duplicatesOn ? duplicateValue : makeWarehouseIdForIndex(idx),
                      }
                    }

                    Logix.InternalContracts.recordStatePatch(
                      moduleScope,
                      'items',
                      'perf',
                    )

                    yield* moduleScope.setState({
                      ...(prev as any),
                      items: nextItems,
                    })

                    yield* Logix.TraitLifecycle.scopedValidate(moduleScope as any, {
                      mode: 'valueChange',
                      target: Logix.TraitLifecycle.Ref.list('items'),
                    })
                  }),
              )
            })

            const start = performance.now()
            await cached.runtime.runPromise(program as Effect.Effect<void, never, any>)
            const end = performance.now()

            const decision = cached.getLastConvergeDecision() as any

            if (requestedMode !== 'auto') {
              return {
                metrics: {
                  'runtime.txnCommitMs': end - start,
                  'runtime.decisionMs': { unavailableReason: 'notApplicable' },
                },
                evidence: {
                  'converge.requestedMode': requestedMode,
                  'converge.executedMode': 'full',
                  'converge.outcome': { unavailableReason: 'notApplicable' },
                  'converge.reasons': { unavailableReason: 'notApplicable' },
                  'converge.decisionBudgetMs': { unavailableReason: 'notApplicable' },
                  'converge.decisionDurationMs': { unavailableReason: 'notApplicable' },
                  'cache.size': { unavailableReason: 'notApplicable' },
                  'cache.hit': { unavailableReason: 'notApplicable' },
                  'cache.miss': { unavailableReason: 'notApplicable' },
                  'cache.evict': { unavailableReason: 'notApplicable' },
                  'cache.invalidate': { unavailableReason: 'notApplicable' },
                  'diagnostics.level': diagnosticsLevel,
                },
              }
            }

            const cache = decision?.cache as any
            const cacheHit = !!cache?.hit
            const cacheEvicts = typeof cache?.evicts === 'number' ? cache.evicts : 0
            const prevEvicts = lastEvictsByKey.get(key) ?? 0
            lastEvictsByKey.set(key, cacheEvicts)
            const evictDelta = Math.max(0, cacheEvicts - prevEvicts)

            return {
              metrics: {
                'runtime.txnCommitMs': end - start,
                'runtime.decisionMs':
                  typeof decision?.decisionDurationMs === 'number'
                    ? decision.decisionDurationMs
                    : { unavailableReason: 'decisionMissing' },
              },
              evidence: {
                'converge.requestedMode': requestedMode,
                'converge.executedMode':
                  typeof decision?.executedMode === 'string'
                    ? decision.executedMode
                    : { unavailableReason: 'decisionMissing' },
                'converge.outcome':
                  typeof decision?.outcome === 'string' ? decision.outcome : { unavailableReason: 'decisionMissing' },
                'converge.reasons': Array.isArray(decision?.reasons)
                  ? (decision.reasons as Array<unknown>).join(',')
                  : { unavailableReason: 'decisionMissing' },
                'converge.decisionBudgetMs':
                  typeof decision?.decisionBudgetMs === 'number'
                    ? decision.decisionBudgetMs
                    : typeof controlPlane.traitConvergeDecisionBudgetMs === 'number'
                      ? controlPlane.traitConvergeDecisionBudgetMs
                      : { unavailableReason: 'decisionMissing' },
                'converge.decisionDurationMs':
                  typeof decision?.decisionDurationMs === 'number'
                    ? decision.decisionDurationMs
                    : { unavailableReason: 'decisionMissing' },
                'cache.size': typeof cache?.size === 'number' ? cache.size : { unavailableReason: 'cacheMissing' },
                'cache.hit': cache ? (cacheHit ? 1 : 0) : { unavailableReason: 'cacheMissing' },
                'cache.miss': cache ? (cacheHit ? 0 : 1) : { unavailableReason: 'cacheMissing' },
                'cache.evict': cache ? evictDelta : { unavailableReason: 'cacheMissing' },
                'cache.invalidate': cache && cache.missReason === 'generation_bumped' ? 1 : 0,
                'diagnostics.level': diagnosticsLevel,
              },
            }
          },
          {
            cutOffOn: ['timeout'],
          },
        )

        type ComparisonResult = {
          readonly kind: 'ratio' | 'delta'
          readonly metric: string
          readonly numeratorWhere: Record<string, unknown>
          readonly denominatorWhere: Record<string, unknown>
          readonly unit: 'ratio' | 'ms'
          readonly stats: {
            readonly median: number
            readonly p95: number
          }
        }

        const findPoint = (expected: Record<string, unknown>): any | undefined =>
          (points as any[]).find((p) =>
            Object.keys(expected).every((k) => (p as any).params?.[k] === (expected as any)[k]),
          )

        const getMetricStats = (
          point: any,
          metric: string,
        ): { readonly median: number; readonly p95: number } | undefined => {
          if (!point || point.status !== 'ok') return undefined
          const m = (point.metrics as any[] | undefined)?.find((x) => x?.name === metric)
          if (!m || m.status !== 'ok') return undefined
          return {
            median: m.stats.medianMs,
            p95: m.stats.p95Ms,
          }
        }

        const computeFormDiagnosticsComparisons = (): ReadonlyArray<ComparisonResult> => {
          const out: Array<ComparisonResult> = []
          const metric = 'runtime.txnCommitMs'

          for (const requestedMode of requestedModeLevels) {
            for (const rows of rowsLevels) {
              const denomWhere = { requestedMode, rows, diagnosticsLevel: 'off' }
              const denomPoint = findPoint(denomWhere)
              const denom = getMetricStats(denomPoint, metric)
              if (!denom) continue

              for (const level of ['light', 'full'] as const) {
                const numeratorWhere = { requestedMode, rows, diagnosticsLevel: level }
                const numeratorPoint = findPoint(numeratorWhere)
                const num = getMetricStats(numeratorPoint, metric)
                if (!num) continue

                out.push({
                  kind: 'ratio',
                  metric,
                  numeratorWhere,
                  denominatorWhere: denomWhere,
                  unit: 'ratio',
                  stats: {
                    median: num.median / denom.median,
                    p95: num.p95 / denom.p95,
                  },
                })

                out.push({
                  kind: 'delta',
                  metric,
                  numeratorWhere,
                  denominatorWhere: denomWhere,
                  unit: 'ms',
                  stats: {
                    median: num.median - denom.median,
                    p95: num.p95 - denom.p95,
                  },
                })
              }
            }
          }

          return out
        }

        const comparisons = computeFormDiagnosticsComparisons()

        const report: PerfReport = {
          schemaVersion: 1,
          meta: {
            createdAt: new Date().toISOString(),
            generator: 'packages/logix-react/test/browser/perf-boundaries/form-list-scope-check.test.tsx',
            matrixId: matrix.id,
            config: {
              runs,
              warmupDiscard,
              timeoutMs,
              headless: matrix.defaults.browser.headless,
              profile: resolveProfileId(),
              stability: matrix.defaults.stability,
              controlPlane,
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
                'runtime.decisionMs': 'runtime',
              },
              points,
              thresholds,
              comparisons,
            },
          ],
        }

        emitPerfReport(report)
      } finally {
        await Promise.allSettled(Array.from(runtimeByKey.values()).map((rt) => rt.runtime.dispose()))
      }
    })
  },
)
