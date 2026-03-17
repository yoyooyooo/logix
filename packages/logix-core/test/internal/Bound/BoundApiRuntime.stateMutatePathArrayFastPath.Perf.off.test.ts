import { describe, it, expect } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Debug from '../../../src/Debug.js'
import * as Logix from '../../../src/index.js'
import { getBoundInternals } from '../../../src/internal/runtime/core/runtimeInternalsAccessor.js'
import { mutateWithPatchPaths } from '../../../src/internal/runtime/core/mutativePatches.js'
import * as StateTransaction from '../../../src/internal/runtime/core/StateTransaction.js'

type BenchCase = 'single-top' | 'eight-top' | 'nested' | 'noop'
type BenchSummary = {
  readonly p50: number
  readonly p95: number
  readonly avg: number
}

type BenchState = {
  readonly top: Record<string, number>
  readonly nested: {
    value: number
    other: number
  }
}

const now = (): number => {
  const perf = (globalThis as any).performance as { now?: () => number } | undefined
  if (perf && typeof perf.now === 'function') {
    return perf.now()
  }
  return Date.now()
}

const quantile = (samples: ReadonlyArray<number>, q: number): number => {
  if (samples.length === 0) return 0
  const sorted = Array.from(samples).sort((a, b) => a - b)
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil(q * samples.length) - 1))
  return sorted[idx]!
}

const average = (samples: ReadonlyArray<number>): number =>
  samples.length === 0 ? 0 : samples.reduce((sum, value) => sum + value, 0) / samples.length

const makeStateSchema = () => {
  const topFields: Record<string, Schema.Schema<number>> = {}
  for (let index = 0; index < 96; index += 1) {
    topFields[`k${index}`] = Schema.Number
  }

  return Schema.Struct({
    top: Schema.Struct(topFields),
    nested: Schema.Struct({
      value: Schema.Number,
      other: Schema.Number,
    }),
  })
}

const makeInitial = (): BenchState => {
  const top: Record<string, number> = {}
  for (let index = 0; index < 96; index += 1) {
    top[`k${index}`] = index
  }

  return {
    top,
    nested: {
      value: 0,
      other: 1,
    },
  }
}

const mutateCase =
  (benchCase: BenchCase) =>
  (draft: BenchState): void => {
    switch (benchCase) {
      case 'single-top':
        draft.top.k0 += 1
        return
      case 'eight-top':
        for (let index = 0; index < 8; index += 1) {
          draft.top[`k${index}`]! += 1
        }
        return
      case 'nested':
        draft.nested.value += 1
        return
      case 'noop':
        draft.top.k0 = draft.top.k0
    }
  }

const runBench = (args: {
  readonly mode: 'legacy' | 'current'
  readonly benchCase: BenchCase
  readonly iterations: number
  readonly warmup: number
}): Effect.Effect<BenchSummary> =>
  Effect.gen(function* () {
    const State = makeStateSchema()
    let currentMutate:
      | ((f: (draft: Logix.Logic.Draft<BenchState>) => void) => Effect.Effect<void, never, any>)
      | undefined = undefined
    let internalsRef: ReturnType<typeof getBoundInternals> | undefined = undefined

    const M = Logix.Module.make(`BoundApiMutateArrayFastPath.${args.mode}.${args.benchCase}`, {
      state: State,
      actions: {},
    })

    const exposeLogic = M.logic(($) =>
      Effect.sync(() => {
        currentMutate = $.state.mutate as any
        internalsRef = getBoundInternals($ as any)
      }),
    )

    const runtime = Logix.Runtime.make(
      M.implement({
        initial: makeInitial() as any,
        logics: [exposeLogic],
      }),
      {
        layer: Layer.mergeAll(Debug.replace([]), Debug.diagnosticsLevel('off')) as Layer.Layer<any, never, never>,
      },
    )

    const samples = (yield* Effect.promise(() =>
      runtime.runPromise(
        Effect.gen(function* () {
          const rt: any = yield* Effect.service(M.tag).pipe(Effect.orDie)
          yield* Effect.sleep('10 millis')
          expect(currentMutate).toBeDefined()
          expect(internalsRef).toBeDefined()

          const runLegacyOnce = () =>
            Logix.InternalContracts.runWithStateTransaction(
              rt as any,
              { kind: 'state', name: 'mutate' },
              () =>
                Effect.gen(function* () {
                  const prev = yield* rt.getState
                  const { nextState, patchPaths } = mutateWithPatchPaths(prev as BenchState, mutateCase(args.benchCase))

                  for (let index = 0; index < patchPaths.length; index += 1) {
                    const path = patchPaths[index]!
                    internalsRef!.txn.recordStatePatch(path, 'unknown')
                  }

                  internalsRef!.txn.updateDraft(nextState)
                }),
            )

          const runCurrentOnce = () => currentMutate!(mutateCase(args.benchCase) as any)

          const runOnce = args.mode === 'legacy' ? runLegacyOnce : runCurrentOnce

          for (let index = 0; index < args.warmup; index += 1) {
            yield* runOnce()
          }

          const durations: number[] = []
          for (let index = 0; index < args.iterations; index += 1) {
            const startedAtMs = now()
            yield* runOnce()
            durations.push(Math.max(0, now() - startedAtMs))
          }

          return durations
        }),
      ),
    )) as ReadonlyArray<number>

    yield* Effect.promise(() => runtime.dispose())

    return {
      p50: quantile(samples, 0.5),
      p95: quantile(samples, 0.95),
      avg: average(samples),
    }
  })

describe('BoundApiRuntime.state.mutate path array fast path · perf baseline (Diagnostics=off)', () => {
  it.effect('records reproducible evidence for array-path direct recording vs generic recordPatch', () =>
    Effect.gen(function* () {
      const iterations = Number(process.env.LOGIX_PERF_ITERS ?? 120)
      const warmup = Number(process.env.LOGIX_PERF_WARMUP ?? 20)
      const cases: ReadonlyArray<BenchCase> = ['single-top', 'eight-top', 'nested', 'noop']

      for (let index = 0; index < cases.length; index += 1) {
        const benchCase = cases[index]!
        const legacy = yield* runBench({ mode: 'legacy', benchCase, iterations, warmup })
        const current = yield* runBench({ mode: 'current', benchCase, iterations, warmup })

        console.log(
          `[perf] boundapi-mutate-array-fast case=${benchCase} ` +
            `legacy.p50=${legacy.p50.toFixed(3)}ms legacy.p95=${legacy.p95.toFixed(3)}ms legacy.avg=${legacy.avg.toFixed(3)}ms ` +
            `current.p50=${current.p50.toFixed(3)}ms current.p95=${current.p95.toFixed(3)}ms current.avg=${current.avg.toFixed(3)}ms`,
        )
      }
    }),
  )
})
