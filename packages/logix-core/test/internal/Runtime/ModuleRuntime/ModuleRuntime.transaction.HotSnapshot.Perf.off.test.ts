import { describe, expect, it } from 'vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Debug from '../../../../src/Debug.js'
import * as Logix from '../../../../src/index.js'

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
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil(q * sorted.length) - 1))
  return sorted[idx]!
}

const average = (samples: ReadonlyArray<number>): number =>
  samples.length === 0 ? 0 : samples.reduce((sum, value) => sum + value, 0) / samples.length

const computeValue = (a: number, offset: number): number => {
  let x = (a + offset) | 0
  for (let i = 0; i < 4000; i++) {
    x = (Math.imul(x, 1103515245) + 12345) | 0
  }
  return x
}

const waitUntil = (cond: Effect.Effect<boolean>): Effect.Effect<void> =>
  Effect.gen(function* () {
    while (!(yield* cond)) {
      yield* Effect.yieldNow
    }
  })

const makeDeferredModule = (args: { readonly deferred: number }) => {
  const fields: Record<string, Schema.Top> = {
    a: Schema.Number,
    b: Schema.Number,
  }
  for (let i = 0; i < args.deferred; i++) {
    fields[`d${i}`] = Schema.Number
  }

  const State = Schema.Struct(fields) as any
  const Actions = { noop: Schema.Void }

  const traits: Record<string, any> = {}
  for (let i = 0; i < args.deferred; i++) {
    const key = `d${i}`
    traits[key] = Logix.StateTrait.computed({
      deps: ['a'] as any,
      get: (a: any) => computeValue(a, i),
      scheduling: 'deferred',
    } as any)
  }

  const M = Logix.Module.make('ModuleRuntime_Transaction_HotSnapshot_Perf', {
    state: State as any,
    actions: Actions,
    reducers: { noop: (s: any) => s },
    traits: Logix.StateTrait.from(State as any)(traits as any),
  })

  const initial: Record<string, number> = {
    a: 0,
    b: 0,
  }
  for (let i = 0; i < args.deferred; i++) {
    initial[`d${i}`] = computeValue(0, i)
  }

  const impl = M.implement({
    initial: initial as any,
    logics: [],
  })

  return { M, impl }
}

describe('ModuleRuntime.transaction hot snapshot · perf baseline (diagnostics=off)', () => {
  it('records reproducible txn-return evidence for deferred backlog scheduling', async () => {
    const prevNodeEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'

    try {
      const iterations = Number(process.env.LOGIX_PERF_ITERS ?? 120)
      const warmup = Number(process.env.LOGIX_PERF_WARMUP ?? 20)
      const deferred = Number(process.env.LOGIX_PERF_DEFERRED ?? 128)
      const { M, impl } = makeDeferredModule({ deferred })
      const lastKey = `d${deferred - 1}`

      const runtime = Logix.Runtime.make(impl, {
        layer: Layer.mergeAll(
          Debug.diagnosticsLevel('off'),
          Debug.traceMode('off'),
          Debug.replace([]),
        ) as Layer.Layer<any, never, never>,
        stateTransaction: {
          traitConvergeMode: 'dirty',
          traitConvergeBudgetMs: 100_000,
          traitConvergeDecisionBudgetMs: 100_000,
          traitConvergeTimeSlicing: { enabled: true, debounceMs: 0, maxLagMs: 50 },
          txnLanes: { enabled: true, budgetMs: 0, debounceMs: 0, maxLagMs: 50, allowCoalesce: true },
        },
      })

      try {
        const result = await runtime.runPromise(
          Effect.gen(function* () {
            const rt: any = yield* Effect.service(M.tag).pipe(Effect.orDie)

            const returnSamples: number[] = []
            const settleSamples: number[] = []

            for (let i = 0; i < warmup + iterations; i += 1) {
              const nextA = i + 1
              const expectedLast = computeValue(nextA, deferred - 1)

              const startedAtMs = now()
              yield* Logix.InternalContracts.runWithStateTransaction(rt, { kind: 'perf', name: 'txn-return' }, () =>
                Effect.gen(function* () {
                  const prev = yield* rt.getState
                  yield* rt.setState({ ...prev, a: nextA })
                  Logix.InternalContracts.recordStatePatch(rt, 'a', 'unknown')
                }),
              )
              const returnedAtMs = now()

              yield* waitUntil(rt.getState.pipe(Effect.map((state: any) => state[lastKey] === expectedLast)))
              const settledAtMs = now()

              if (i >= warmup) {
                returnSamples.push(returnedAtMs - startedAtMs)
                settleSamples.push(settledAtMs - startedAtMs)
              }
            }

            const finalState = yield* rt.getState

            return {
              returnSamples,
              settleSamples,
              finalState,
            }
          }),
        )

        expect(result.returnSamples).toHaveLength(iterations)
        expect(result.settleSamples).toHaveLength(iterations)
        expect(result.finalState[lastKey]).toBe(computeValue(warmup + iterations, deferred - 1))

        console.log(
          `[perf] txn-hot-snapshot diagnostics=off deferred=${deferred} ` +
            `iters=${iterations} warmup=${warmup} ` +
            `return.avg=${average(result.returnSamples).toFixed(3)}ms ` +
            `return.p50=${quantile(result.returnSamples, 0.5).toFixed(3)}ms ` +
            `return.p95=${quantile(result.returnSamples, 0.95).toFixed(3)}ms ` +
            `settle.avg=${average(result.settleSamples).toFixed(3)}ms ` +
            `settle.p50=${quantile(result.settleSamples, 0.5).toFixed(3)}ms ` +
            `settle.p95=${quantile(result.settleSamples, 0.95).toFixed(3)}ms`,
        )
      } finally {
        await runtime.dispose()
      }
    } finally {
      if (prevNodeEnv == null) {
        delete process.env.NODE_ENV
      } else {
        process.env.NODE_ENV = prevNodeEnv
      }
    }
  })
})
