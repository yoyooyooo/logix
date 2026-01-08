import { test } from 'vitest'
import { Effect } from 'effect'
import * as Logix from '@logixjs/core'
import matrix from '@logixjs/perf-evidence/assets/matrix.json'
import { emitPerfReport, type PerfReport } from './protocol.js'
import { getProfileConfig, runMatrixSuite, withNodeEnv } from './harness.js'
import { makeConvergeRuntime, type ConvergeRuntime, readConvergeControlPlaneFromEnv } from './converge-runtime.js'

const suite = (matrix.suites as any[]).find((s) => s.id === 'negativeBoundaries.dirtyPattern') as any

const { runs, warmupDiscard, timeoutMs } = getProfileConfig(matrix)

const TEST_TIMEOUT_MS = Math.max(30_000, timeoutMs * 2)

type PatternKind = (typeof suite.axes.patternKind)[number]

type PatternState = {
  readonly iteration: number
}

const stateByKey = new Map<string, PatternState>()

const stableParamsKey = (params: Record<string, unknown>): string => {
  const keys = Object.keys(params).sort()
  return keys.map((k) => `${k}=${String((params as any)[k])}`).join('&')
}

const pickPatternIndex = (uniquePatternPoolSize: number, iteration: number): number => {
  if (uniquePatternPoolSize <= 0) return 0
  return Math.abs(iteration) % uniquePatternPoolSize
}

const makeIndicesForPattern = (steps: number, dirtyRoots: number, patternIndex: number): ReadonlyArray<number> => {
  const out: number[] = []
  const stride = Math.max(1, Math.floor(steps / Math.max(1, dirtyRoots)))
  const start = (patternIndex * stride) % steps
  for (let i = 0; i < dirtyRoots; i++) {
    out.push((start + i) % steps)
  }
  return out
}

const chooseDirtyIndices = (
  params: Record<string, unknown>,
  patternKind: PatternKind,
): { readonly indices: ReadonlyArray<number>; readonly iteration: number } => {
  const steps = params.steps as number
  const dirtyRootsRatio = params.dirtyRootsRatio as number
  const uniquePatternPoolSize = params.uniquePatternPoolSize as number
  const seed = params.seed as number

  const maxDirtyRoots = Math.max(1, Math.ceil(steps * dirtyRootsRatio))
  const key = stableParamsKey({
    steps,
    dirtyRootsRatio,
    uniquePatternPoolSize,
    patternKind,
    seed,
  })

  const prev = stateByKey.get(key) ?? { iteration: 0 }
  const iteration = prev.iteration
  stateByKey.set(key, { iteration: iteration + 1 })

  const baseIndex = pickPatternIndex(uniquePatternPoolSize, iteration + seed)

  switch (patternKind) {
    case 'repeatedStable': {
      return { indices: makeIndicesForPattern(steps, maxDirtyRoots, 0), iteration }
    }
    case 'alternatingTwoStable': {
      const idx = iteration % 2 === 0 ? 0 : 1
      return { indices: makeIndicesForPattern(steps, maxDirtyRoots, idx), iteration }
    }
    case 'mostlyStableWithNoise': {
      const noiseEvery = 5
      if (iteration > 0 && iteration % noiseEvery === 0) {
        return { indices: makeIndicesForPattern(steps, maxDirtyRoots, baseIndex), iteration }
      }
      return { indices: makeIndicesForPattern(steps, maxDirtyRoots, 0), iteration }
    }
    case 'warmupPhaseShift': {
      const warmupRuns = Math.max(2, Math.min(10, runs))
      const idx = iteration < warmupRuns ? 0 : 1
      return { indices: makeIndicesForPattern(steps, maxDirtyRoots, idx), iteration }
    }
    case 'slidingWindowOverlap': {
      const idx = iteration
      return { indices: makeIndicesForPattern(steps, maxDirtyRoots, idx), iteration }
    }
    case 'sawtoothCardinality': {
      const cycle = Math.max(1, maxDirtyRoots)
      const level = (iteration % cycle) + 1
      const used = Math.min(maxDirtyRoots, level)
      return { indices: makeIndicesForPattern(steps, used, baseIndex), iteration }
    }
    case 'randomHighCardinality': {
      // Pseudo-random but reproducible: use seed + iteration as a simple hash.
      const pseudo = (seed * 1_664_525 + iteration * 1_013_904_223) >>> 0
      const idx = pseudo % Math.max(1, uniquePatternPoolSize)
      return { indices: makeIndicesForPattern(steps, maxDirtyRoots, idx), iteration }
    }
    case 'graphChangeInvalidation': {
      // Shift a bit on each iteration from baseIndex to simulate invalidation caused by dependency graph changes.
      const idx = baseIndex + iteration
      return { indices: makeIndicesForPattern(steps, maxDirtyRoots, idx), iteration }
    }
    case 'listIndexExplosion': {
      // Use sawtooth growth of dirtyRoots to simulate expanding list cardinality.
      const cycle = Math.max(1, uniquePatternPoolSize)
      const level = (iteration % cycle) + 1
      const used = Math.min(maxDirtyRoots, level)
      return { indices: makeIndicesForPattern(steps, used, baseIndex), iteration }
    }
    default: {
      return { indices: makeIndicesForPattern(steps, maxDirtyRoots, baseIndex), iteration }
    }
  }
}

test('browser negative boundaries: dirty-pattern adversarial scenarios', { timeout: TEST_TIMEOUT_MS }, async () => {
  await withNodeEnv('production', async () => {
    const controlPlane = readConvergeControlPlaneFromEnv()
    const runtimeByKey = new Map<string, ConvergeRuntime>()
    const lastEvictsByKey = new Map<string, number>()

    try {
      const { points, thresholds } = await runMatrixSuite(
        suite,
        { runs, warmupDiscard, timeoutMs },
        async (params) => {
          const convergeMode = params.convergeMode as 'full' | 'auto'
          const steps = params.steps as number
          const patternKind = params.patternKind as PatternKind

          const key = `${convergeMode}:${steps}`
          const cached = runtimeByKey.get(key) ?? makeConvergeRuntime(steps, convergeMode, { captureDecision: true })
          runtimeByKey.set(key, cached)

          const { indices, iteration } = chooseDirtyIndices(params as any, patternKind)
          cached.clearLastConvergeDecision()

          const program = Effect.gen(function* () {
            const moduleScope = (yield* cached.module.tag) as any

            if (patternKind === 'graphChangeInvalidation' && iteration > 0 && iteration % 10 === 0) {
              const program = Logix.Debug.getModuleTraits(cached.module as any).program
              if (program) {
                Logix.InternalContracts.registerStateTraitProgram(moduleScope, program, {
                  bumpReason: 'imports_changed',
                })
              }
            }

            yield* Logix.InternalContracts.runWithStateTransaction(
              moduleScope,
              { kind: 'perf', name: 'negativeBoundaries.dirtyPattern' },
              () =>
                Effect.gen(function* () {
                  const prev = yield* moduleScope.getState
                  const next = cached.bumpByIndices(prev, indices)
                  yield* moduleScope.setState(next)

                  for (const idx of indices) {
                    const path = patternKind === 'listIndexExplosion' ? `b${idx}[${iteration}]` : `b${idx}`
                    Logix.InternalContracts.recordStatePatch(moduleScope, path, 'perf')
                  }
                }),
            )
          })

          const start = performance.now()
          await cached.runtime.runPromise(program as Effect.Effect<void, never, any>)
          const end = performance.now()

          const decision = cached.getLastConvergeDecision() as any

          if (convergeMode !== 'auto') {
            return {
              metrics: {
                'runtime.txnCommitMs': end - start,
                'runtime.decisionMs': { unavailableReason: 'notApplicable' },
              },
              evidence: {
                'cache.size': { unavailableReason: 'notApplicable' },
                'cache.hit': { unavailableReason: 'notApplicable' },
                'cache.miss': { unavailableReason: 'notApplicable' },
                'cache.evict': { unavailableReason: 'notApplicable' },
                'cache.invalidate': { unavailableReason: 'notApplicable' },
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
              'cache.size': typeof cache?.size === 'number' ? cache.size : { unavailableReason: 'cacheMissing' },
              'cache.hit': cache ? (cacheHit ? 1 : 0) : { unavailableReason: 'cacheMissing' },
              'cache.miss': cache ? (cacheHit ? 0 : 1) : { unavailableReason: 'cacheMissing' },
              'cache.evict': cache ? evictDelta : { unavailableReason: 'cacheMissing' },
              'cache.invalidate': cache && cache.missReason === 'generation_bumped' ? 1 : 0,
            },
          }
        },
        {
          cutOffOn: ['timeout'],
        },
      )

      const report: PerfReport = {
        schemaVersion: 1,
        meta: {
          createdAt: new Date().toISOString(),
          generator: 'packages/logix-react/test/browser/perf-boundaries/negative-dirty-pattern.test.tsx',
          matrixId: matrix.id,
          config: {
            runs,
            warmupDiscard,
            timeoutMs,
            headless: matrix.defaults.browser.headless,
            profile: (import.meta.env.VITE_LOGIX_PERF_PROFILE as string | undefined) ?? 'matrix.defaults',
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
          },
        ],
      }

      emitPerfReport(report)
    } finally {
      await Promise.allSettled(Array.from(runtimeByKey.values()).map((rt) => rt.runtime.dispose()))
    }
  })
})
