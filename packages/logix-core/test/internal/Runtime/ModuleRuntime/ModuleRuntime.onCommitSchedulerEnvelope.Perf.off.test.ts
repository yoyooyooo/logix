import { describe, expect, it } from 'vitest'
import { Effect, Fiber, Layer, Schema, Stream } from 'effect'
import * as Debug from '../../../../src/Debug.js'
import * as Logix from '../../../../src/index.js'
import { RuntimeStoreTag } from '../../../../src/internal/runtime/core/env.js'
import { makeModuleInstanceKey } from '../../../../src/internal/runtime/core/RuntimeStore.js'
import { flushAllHostScheduler, makeTestHostScheduler, testHostSchedulerLayer } from '../../testkit/hostSchedulerTestKit.js'

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

type Scenario = 'module' | 'readQuery'

const runScenario = async (scenario: Scenario, iterations: number, warmup: number) => {
  const hostScheduler = makeTestHostScheduler()

  const Counter = Logix.Module.make(`ModuleRuntime.OnCommitSchedulerEnvelope.Perf.${scenario}`, {
    state: Schema.Struct({
      count: Schema.Number,
    }),
    actions: {
      bump: Schema.Void,
    },
    reducers: {
      bump: Logix.Module.Reducer.mutate((draft: { count: number }) => {
        draft.count += 1
      }),
    },
  })

  const runtime = Logix.Runtime.make(
    Counter.implement({
      initial: { count: 0 },
      logics: [],
    }),
    {
      layer: Layer.mergeAll(
        testHostSchedulerLayer(hostScheduler),
        Debug.diagnosticsLevel('off'),
        Debug.traceMode('off'),
        Debug.replace([]),
      ) as Layer.Layer<any, never, never>,
    },
  )

  try {
    return await runtime.runPromise(
      Effect.gen(function* () {
        const rt: any = yield* Effect.service(Counter.tag).pipe(Effect.orDie)
        const store = yield* Effect.service(RuntimeStoreTag).pipe(Effect.orDie)
        const moduleKey = makeModuleInstanceKey(rt.moduleId, rt.instanceId)

        let cleanup: (() => void) | undefined
        let fiber: Fiber.Fiber<any, any> | undefined

        if (scenario === 'module') {
          cleanup = store.subscribeTopic(moduleKey, () => {})
        } else {
          const readQuery = Logix.ReadQuery.make({
            selectorId: 'count',
            reads: ['count'],
            select: (state: { count: number }) => state.count,
            equalsKind: 'objectIs',
          })
          fiber = yield* Effect.forkChild(Stream.runForEach(rt.changesReadQueryWithMeta(readQuery), () => Effect.void))
          for (let i = 0; i < 32; i += 1) {
            yield* Effect.yieldNow
          }
        }

        try {
          for (let i = 0; i < warmup; i += 1) {
            yield* rt.dispatch({ _tag: 'bump' })
            yield* flushAllHostScheduler(hostScheduler)
          }

          const dispatchSamples: number[] = []
          const settleSamples: number[] = []
          for (let i = 0; i < iterations; i += 1) {
            const startedAtMs = now()
            yield* rt.dispatch({ _tag: 'bump' })
            const afterDispatchMs = now()
            yield* flushAllHostScheduler(hostScheduler)
            const afterSettleMs = now()
            dispatchSamples.push(afterDispatchMs - startedAtMs)
            settleSamples.push(afterSettleMs - startedAtMs)
          }

          return {
            dispatchSamples,
            settleSamples,
          }
        } finally {
          cleanup?.()
          if (fiber) {
            yield* Fiber.interrupt(fiber)
          }
        }
      }),
    )
  } finally {
    await runtime.dispose()
  }
}

describe('ModuleRuntime onCommit -> scheduler minimal envelope · perf', { timeout: 20_000 }, () => {
  it('records reproducible diagnostics=off evidence for module and readQuery subscribers', async () => {
    const prevNodeEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'

    try {
      const iterations = Number(process.env.LOGIX_PERF_ITERS ?? 120)
      const warmup = Number(process.env.LOGIX_PERF_WARMUP ?? 20)

      for (const scenario of ['module', 'readQuery'] as const) {
        const result = await runScenario(scenario, iterations, warmup)

        expect(result.dispatchSamples).toHaveLength(iterations)
        expect(result.settleSamples).toHaveLength(iterations)

        console.log(
          `[perf] oncommit-scheduler-envelope scenario=${scenario} ` +
            `iters=${iterations} warmup=${warmup} ` +
            `dispatchOnly.avg=${average(result.dispatchSamples).toFixed(3)}ms ` +
            `dispatchOnly.p50=${quantile(result.dispatchSamples, 0.5).toFixed(3)}ms ` +
            `dispatchOnly.p95=${quantile(result.dispatchSamples, 0.95).toFixed(3)}ms ` +
            `settle.avg=${average(result.settleSamples).toFixed(3)}ms ` +
            `settle.p50=${quantile(result.settleSamples, 0.5).toFixed(3)}ms ` +
            `settle.p95=${quantile(result.settleSamples, 0.95).toFixed(3)}ms`,
        )
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
