import { test } from 'vitest'
import { Effect, Layer } from 'effect'
import * as Logix from '@logixjs/core'
import matrix from '@logixjs/perf-evidence/assets/matrix.json'
import { emitPerfReport, type PerfReport } from './protocol.js'
import { getProfileConfig, makePerfKernelLayer, runMatrixSuite, withNodeEnv } from './harness.js'
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

const readBoolEnv = (raw: unknown): boolean => {
  if (raw === true) return true
  if (typeof raw !== 'string') return false
  const trimmed = raw.trim().toLowerCase()
  return trimmed === '1' || trimmed === 'true' || trimmed === 'yes' || trimmed === 'on'
}

const OUTLIER_CAPTURE_ENABLED = readBoolEnv(import.meta.env.VITE_LOGIX_PERF_OUTLIER_CAPTURE)

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
  readonly getLastTraitValidateTrace: () => unknown | undefined
  readonly getLastTraitCheckTrace: () => unknown | undefined
  readonly getLastTraitConvergeTrace: () => unknown | undefined
  readonly clearLastTraitTraces: () => void
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

  let lastTraitValidateTrace: unknown | undefined
  let lastTraitCheckTrace: unknown | undefined
  let lastTraitConvergeTrace: unknown | undefined

  const clearLastTraitTraces = (): void => {
    lastTraitValidateTrace = undefined
    lastTraitCheckTrace = undefined
    lastTraitConvergeTrace = undefined
  }

  const getLastTraitValidateTrace = (): unknown | undefined => lastTraitValidateTrace
  const getLastTraitCheckTrace = (): unknown | undefined => lastTraitCheckTrace
  const getLastTraitConvergeTrace = (): unknown | undefined => lastTraitConvergeTrace

  const captureSink: Logix.Debug.Sink = {
    record: (event: Logix.Debug.Event) =>
      Effect.sync(() => {
        if (event.type === 'state:update') {
          const decision = (event as any)?.traitSummary?.converge
          if (decision != null) {
            lastDecision = decision
          }
        }

        if (!OUTLIER_CAPTURE_ENABLED) return

        // Minimal trace capture for outlier forensics (off by default to avoid perturbing perf).
        if (event.type === 'trace:trait:validate') {
          lastTraitValidateTrace = (event as any)?.data
        } else if (event.type === 'trace:trait:check') {
          lastTraitCheckTrace = (event as any)?.data
        } else if (event.type === 'trace:trait:converge') {
          lastTraitConvergeTrace = (event as any)?.data
        }
      }),
  }

  const baseDebugLayer = Logix.Debug.replace([captureSink]) as Layer.Layer<any, never, never>

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
    getLastTraitValidateTrace,
    getLastTraitCheckTrace,
    getLastTraitConvergeTrace,
    clearLastTraitTraces,
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
      const runStateByKey = new Map<
        string,
        {
          runIndex: number
          maxTxnCommitMs: number
          maxDetail: string | undefined
        }
      >()

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

            const state =
              runStateByKey.get(key) ??
              (() => {
                const created = { runIndex: 0, maxTxnCommitMs: -Infinity, maxDetail: undefined }
                runStateByKey.set(key, created)
                return created
              })()
            const runIndex = state.runIndex
            state.runIndex += 1

            cached.clearLastConvergeDecision()
            cached.clearLastTraitTraces()

            const duplicatesOn = cached.flipDuplicates()
            // Evidence sampling: keep at most (warmupDiscard+1) samples so evidence survives trimming,
            // but avoid retaining per-run evidence arrays that can perturb txnCommitMs via GC.
            const evidenceStart = Math.max(0, runs - (warmupDiscard + 1))
            const emitEvidence = runIndex >= evidenceStart

            const program = Effect.gen(function* () {
              const moduleScope = (yield* cached.module.tag) as any
              const duplicateIndices = pickDuplicateIndices(rows)
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

                    // Record per-row dirty evidence so list-scope checks can use incremental hints.
                    for (const idx of duplicateIndices) {
                      Logix.InternalContracts.recordStatePatch(moduleScope, `items.${idx}.warehouseId`, 'perf')
                    }

                    yield* moduleScope.setState({
                      ...(prev as any),
                      items: nextItems,
                    })

                    // Validate only the touched rows (realistic onChange path) instead of list-level validate.
                    for (const idx of duplicateIndices) {
                      yield* Logix.TraitLifecycle.scopedValidate(moduleScope as any, {
                        mode: 'valueChange',
                        target: Logix.TraitLifecycle.Ref.item('items', idx, { field: 'warehouseId' }),
                      })
                    }
                  }),
              )
            })

            const start = performance.now()
            await cached.runtime.runPromise(program as Effect.Effect<void, never, any>)
            const end = performance.now()
            const txnCommitMs = end - start

            const decision = cached.getLastConvergeDecision() as any

            if (OUTLIER_CAPTURE_ENABLED && runIndex >= warmupDiscard && txnCommitMs > state.maxTxnCommitMs) {
              state.maxTxnCommitMs = txnCommitMs

              const converge = cached.getLastTraitConvergeTrace() as any
              const validate = cached.getLastTraitValidateTrace() as any
              const check = cached.getLastTraitCheckTrace() as any

              const pickConverge = (d: any): unknown => {
                if (!d || typeof d !== 'object') return undefined
                return {
                  requestedMode: d.requestedMode,
                  executedMode: d.executedMode,
                  outcome: d.outcome,
                  reasons: Array.isArray(d.reasons) ? d.reasons.slice(0, 8) : d.reasons,
                  decisionBudgetMs: d.decisionBudgetMs,
                  decisionDurationMs: d.decisionDurationMs,
                  executionBudgetMs: d.executionBudgetMs,
                  executionDurationMs: d.executionDurationMs,
                  stepStats: d.stepStats,
                  dirty: d.dirty,
                  cache: d.cache,
                }
              }

              try {
                state.maxDetail = JSON.stringify({
                  txnCommitMs: Number(txnCommitMs.toFixed(3)),
                  runIndex,
                  rows,
                  diagnosticsLevel,
                  requestedMode,
                  duplicatesOn,
                  converge: pickConverge(converge ?? decision),
                  traitValidate: validate,
                  traitCheck: check
                    ? {
                        ruleId: check.ruleId,
                        summary: check.summary,
                      }
                    : undefined,
                })
              } catch {
                state.maxDetail = `unserializable_outlier txnCommitMs=${Number(txnCommitMs.toFixed(3))} runIndex=${runIndex}`
              }
            }

            if (requestedMode !== 'auto') {
              return {
                metrics: {
                  'runtime.txnCommitMs': txnCommitMs,
                  'runtime.decisionMs': { unavailableReason: 'notApplicable' },
                },
                evidence: emitEvidence
                  ? {
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
                      ...(OUTLIER_CAPTURE_ENABLED ? { 'outlier.max': state.maxDetail ?? '' } : {}),
                    }
                  : undefined,
              }
            }

            if (!emitEvidence) {
              return {
                metrics: {
                  'runtime.txnCommitMs': txnCommitMs,
                  'runtime.decisionMs':
                    typeof decision?.decisionDurationMs === 'number'
                      ? decision.decisionDurationMs
                      : { unavailableReason: 'decisionMissing' },
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
                'runtime.txnCommitMs': txnCommitMs,
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
                ...(OUTLIER_CAPTURE_ENABLED ? { 'outlier.max': state.maxDetail ?? '' } : {}),
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
