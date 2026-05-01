import { Effect } from 'effect'
import { performance } from 'node:perf_hooks'

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

type JsonPrimitive = null | boolean | number | string
type TokenOptions = Readonly<Record<string, JsonPrimitive | undefined>>

type Token = {
  readonly _tag: 'i18n'
  readonly key: string
  readonly options?: Readonly<Record<string, JsonPrimitive>>
}

const canonicalizeBaseline = (
  options: TokenOptions | undefined,
): Readonly<Record<string, JsonPrimitive>> | undefined => {
  if (!options) return undefined

  const entries = Object.entries(options).filter((p): p is readonly [string, JsonPrimitive] => p[1] !== undefined)
  if (entries.length === 0) return undefined

  entries.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))

  const out: Record<string, JsonPrimitive> = {}
  for (const [k, v] of entries) {
    out[k] = v
  }
  return out
}

const tokenBaseline = (key: string, options?: TokenOptions): Token => ({
  _tag: 'i18n',
  key,
  options: canonicalizeBaseline(options),
})

const main = Effect.gen(function* () {
  const ITERS = Number.parseInt(process.env.ITERS ?? '20000', 10)

  const key = 'form.required'
  const rawOptions: TokenOptions = {
    z: 1,
    a: 'name',
    field: 'name',
    defaultValue: 'Required',
    undef: undefined,
  }

  const baselineEff = Effect.sync(() => {
    tokenBaseline(key, rawOptions)
  })

  let i18nTokenEff: Effect.Effect<void> = Effect.die(new Error('[MissingApi] @logixjs/i18n is not available'))

  const mod: any = yield* Effect.tryPromise({
    try: async () => {
      return await import('@logixjs/i18n')
    },
    catch: () => undefined,
  }).pipe(Effect.catchAll(() => Effect.succeed(undefined)))

  const I18n = mod?.I18n
  const I18nTag = mod?.I18nTag
  const tokenFn = mod?.token
  const layer =
    typeof I18n?.layer === 'function'
      ? I18n.layer({
          language: 'en',
          isInitialized: true,
          t: (k: string, _o?: unknown) => k,
          changeLanguage: (_l: string) => undefined,
          on: () => undefined,
          off: () => undefined,
        })
      : undefined

  if (typeof tokenFn === 'function') {
    i18nTokenEff = Effect.sync(() => {
      tokenFn(key, rawOptions as any)
    })
  } else if (I18nTag && layer) {
    i18nTokenEff = Effect.gen(function* () {
      const svc = yield* I18nTag
      svc.token(key, rawOptions as any)
    }).pipe(Effect.provide(layer))
  }

  const cases = yield* Effect.all([
    runBench('baseline token (canonicalize)', ITERS, baselineEff),
    runBench('@logixjs/i18n token (canonicalize)', ITERS, i18nTokenEff),
  ])

  return {
    meta: {
      node: process.version,
      platform: `${process.platform}/${process.arch}`,
      iters: ITERS,
    },
    results: Object.fromEntries(cases),
  }
})

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
