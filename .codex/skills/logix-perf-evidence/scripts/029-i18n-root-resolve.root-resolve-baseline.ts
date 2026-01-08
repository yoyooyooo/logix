import { Context, Effect, Layer, Schema } from 'effect'
import { performance } from 'node:perf_hooks'
import * as Logix from '@logixjs/core'

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
  }).pipe(Effect.catchAllCause((cause) => Effect.succeed([name, { ok: false, error: String(cause) }] as const)))

interface TestService {
  readonly value: number
}

class TestServiceTag extends Context.Tag('@logixjs/perf/029-i18n-root-resolve/TestService')<
  TestServiceTag,
  TestService
>() {}

const main = Effect.scoped(
  Effect.gen(function* () {
    const ITERS = Number.parseInt(process.env.ITERS ?? '20000', 10)

    const Target = Logix.Module.make('Perf029RootResolveTarget', {
      state: Schema.Struct({ ok: Schema.Boolean }),
      actions: { noop: Schema.Void },
    })

    const targetRuntime = yield* Target.tag.pipe(
      Effect.provide(Target.live({ ok: true }) as Layer.Layer<any, any, any>),
    )

    const rootContext = Context.add(
      Context.add(Context.empty(), TestServiceTag, { value: 1 }),
      Target.tag as any,
      targetRuntime as any,
    )

    const rootResolveService = Logix.Root.resolve(TestServiceTag)
    const rootResolveModule = Logix.Root.resolve(Target.tag as any)
    const rootLayer = Logix.Root.layerFromContext(rootContext)
    const serviceOptionHit = Effect.serviceOption(TestServiceTag) as Effect.Effect<unknown, never, unknown>

    const Self = Logix.Module.make('Perf029RootResolveSelf', {
      state: Schema.Struct({ ok: Schema.Boolean }),
      actions: { noop: Schema.Void },
    })

    const selfRuntime = yield* Self.tag.pipe(Effect.provide(Self.live({ ok: true }) as Layer.Layer<any, any, any>))
    const $ = Logix.Bound.make(Self.shape, selfRuntime) as any

    const rootResolveFrom$ =
      typeof $.root?.resolve === 'function'
        ? ($.root.resolve(TestServiceTag) as Effect.Effect<any, any, any>).pipe(Effect.asVoid)
        : (Effect.die(new Error('[MissingApi] $.root.resolve is not implemented')) as Effect.Effect<void, any, any>)

    const cases = yield* Effect.all([
      runBench('effect.serviceOption (hit)', ITERS, serviceOptionHit).pipe(
        Effect.provideService(TestServiceTag, { value: 1 }),
      ),
      runBench('Root.resolve(ServiceTag) (hit)', ITERS, rootResolveService).pipe(Effect.provide(rootLayer)),
      runBench('Root.resolve(ModuleTag) (hit)', ITERS, rootResolveModule).pipe(Effect.provide(rootLayer)),
      runBench('$.root.resolve(ServiceTag) (hit)', ITERS, rootResolveFrom$).pipe(Effect.provide(rootLayer)),
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
