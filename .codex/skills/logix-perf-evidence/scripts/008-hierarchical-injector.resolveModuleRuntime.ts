import { Effect, Layer, Schema } from 'effect'
import { performance } from 'node:perf_hooks'
import * as Logix from '@logix/core'

type BenchResult =
  | {
      readonly ok: true
      readonly iterations: number
      readonly totalMs: number
      readonly nsPerOp: number
    }
  | {
      readonly ok: false
      readonly error: string
    }

const now = () => performance.now()

const runBench = <R, E, A>(
  name: string,
  iterations: number,
  eff: Effect.Effect<A, E, R>,
): Effect.Effect<readonly [string, BenchResult], never, R> =>
  Effect.gen(function* () {
    // Warmup
    for (let i = 0; i < Math.min(1_000, iterations); i++) {
      yield* eff
    }

    const start = now()
    for (let i = 0; i < iterations; i++) {
      yield* eff
    }
    const end = now()

    const totalMs = end - start
    const nsPerOp = (totalMs * 1_000_000) / iterations
    return [
      name,
      {
        ok: true,
        iterations,
        totalMs,
        nsPerOp,
      },
    ] as const
  }).pipe(
    Effect.catchAllCause((cause) =>
      Effect.succeed([
        name,
        {
          ok: false,
          error: String(cause),
        },
      ] as const),
    ),
  )

const main = Effect.scoped(
  Effect.gen(function* () {
    const ITERS = Number.parseInt(process.env.ITERS ?? '20000', 10)

    const Self = Logix.Module.make('PerfSelf', {
      state: Schema.Struct({ value: Schema.Number }),
      actions: { noop: Schema.Void },
    })

    const Target = Logix.Module.make('PerfTarget', {
      state: Schema.Struct({ value: Schema.Number }),
      actions: { noop: Schema.Void },
    })

    const selfRuntime = yield* Self.tag.pipe(Effect.provide(Self.live({ value: 0 }) as Layer.Layer<any, any, any>))

    const targetRuntime = yield* Target.tag.pipe(
      Effect.provide(Target.live({ value: 0 }) as Layer.Layer<any, any, any>),
    )

    const $ = Logix.Bound.make(Self.shape, selfRuntime)

    const serviceOption = Effect.serviceOption(Target.tag as any) as Effect.Effect<unknown, never, unknown>

    const useTarget = ($.use(Target) as Effect.Effect<unknown, never, unknown>).pipe(Effect.asVoid)

    const cases = yield* Effect.all([
      runBench('effect.serviceOption (hit)', ITERS, serviceOption).pipe(
        Effect.provideService(Target.tag as any, targetRuntime),
      ),
      runBench('$.use(ModuleTag) (hit)', ITERS, useTarget).pipe(
        Effect.provideService(Target.tag as any, targetRuntime),
      ),
      // 现状（变更前）：该 case 会因全局 registry fallback 而“看似能跑”；
      // 008 变更后：该 case 应稳定失败（strict 默认不允许 fallback）。
      runBench('$.use(ModuleTag) (no provider)', Math.min(2_000, ITERS), useTarget),
    ])

    return {
      meta: {
        node: process.version,
        platform: `${process.platform}/${process.arch}`,
        iters: ITERS,
      },
      results: Object.fromEntries(cases),
    }
  }),
)

Effect.runPromise(main)
  .then((json) => {
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(json, null, 2))
  })
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err)
    process.exitCode = 1
  })
