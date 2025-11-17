import fs from 'node:fs/promises'
import path from 'node:path'
import { performance } from 'node:perf_hooks'
import { Effect, Layer, Duration, Schema, Option } from 'effect'
import { QueryClient } from '@tanstack/query-core'
import * as Logix from '../../../../packages/logix-core/src/index.ts'
import * as Query from '../../../../packages/logix-query/src/index.ts'

type DiagnosticsLevel = Logix.Debug.DiagnosticsLevel

type EngineMode = 'passthrough' | 'tanstack'

type KeyMode = 'always' | 'toggle'

type ScenarioId =
  | 'switch/debounce0/keyAlways'
  | 'switch/debounce20/keyAlways'
  | 'switch/debounce0/keyToggle'
  | 'manual/refresh/keyFlipAB'

type ScenarioParams = Readonly<{
  readonly scenarioId: ScenarioId
  readonly concurrency: 'switch'
  readonly debounceMs: number
  readonly keyMode: KeyMode
}>

type SeriesStats = Readonly<{
  readonly n: number
  readonly p50: number
  readonly p95: number
}>

type CaseResult = Readonly<{
  readonly params: ScenarioParams & {
    readonly engine: EngineMode
    readonly middleware: 'off' | 'on'
    readonly diagnostics: DiagnosticsLevel
  }
  readonly samples: {
    readonly timeMs: ReadonlyArray<number>
    readonly heapDeltaBytes?: ReadonlyArray<number>
    readonly loadCalls: ReadonlyArray<number>
    readonly engineFetchCalls?: ReadonlyArray<number>
  }
  readonly stats: {
    readonly timeMs: SeriesStats
    readonly heapDeltaBytes?: SeriesStats
    readonly loadCalls: SeriesStats
    readonly engineFetchCalls?: SeriesStats
  }
}>

type Report = Readonly<{
  readonly meta: {
    readonly createdAt: string
    readonly node: string
    readonly platform: string
    readonly gc: boolean
    readonly runs: number
    readonly warmupDiscard: number
    readonly updatesPerRun: number
    readonly diagnostics: DiagnosticsLevel
    readonly engine: EngineMode
    readonly middleware: 'off' | 'on'
  }
  readonly cases: ReadonlyArray<CaseResult>
}>

type DiffCase = Readonly<{
  readonly scenarioId: ScenarioId
  readonly diagnostics: DiagnosticsLevel
  readonly before: {
    readonly p95Ms: number
    readonly p95HeapDeltaBytes?: number
    readonly p95LoadCalls: number
    readonly p95EngineFetchCalls?: number
  }
  readonly after: {
    readonly p95Ms: number
    readonly p95HeapDeltaBytes?: number
    readonly p95LoadCalls: number
    readonly p95EngineFetchCalls?: number
  }
  readonly deltaMs: number
  readonly ratio: number
  readonly deltaHeapDeltaBytes?: number
  readonly heapRatio?: number
}>

type DiffReport = Readonly<{
  readonly meta: {
    readonly createdAt: string
    readonly beforeFile: string
    readonly afterFile: string
  }
  readonly summary: {
    readonly regressions: number
    readonly improvements: number
  }
  readonly cases: ReadonlyArray<DiffCase>
}>

const now = () => performance.now()

const quantile = (sorted: ReadonlyArray<number>, q: number): number => {
  if (sorted.length === 0) return Number.NaN
  const clamped = Math.min(1, Math.max(0, q))
  const idx = Math.floor(clamped * (sorted.length - 1))
  return sorted[idx]!
}

const summarize = (samples: ReadonlyArray<number>): SeriesStats => {
  const sorted = samples.slice().sort((a, b) => a - b)
  return {
    n: sorted.length,
    p50: quantile(sorted, 0.5),
    p95: quantile(sorted, 0.95),
  }
}

const gcIfAvailable = (): void => {
  if (typeof (globalThis as any).gc === 'function') {
    ;(globalThis as any).gc()
  }
}

const heapUsed = (): number => process.memoryUsage().heapUsed

const readArg = (argv: ReadonlyArray<string>, name: string): string | undefined => {
  const idx = argv.lastIndexOf(name)
  if (idx < 0) return undefined
  const value = argv[idx + 1]
  if (!value || value.startsWith('--')) {
    throw new Error(`Missing value for ${name}`)
  }
  return value
}

const hasFlag = (argv: ReadonlyArray<string>, name: string): boolean => argv.includes(name)

const parseCollectArgs = (
  argv: ReadonlyArray<string>,
): {
  readonly out?: string
  readonly diagnostics: DiagnosticsLevel
  readonly engine: EngineMode
  readonly middleware: 'off' | 'on'
} => {
  const out = readArg(argv, '--out')

  const diagnostics = (readArg(argv, '--diagnostics') ?? 'off') as DiagnosticsLevel
  if (diagnostics !== 'off' && diagnostics !== 'light' && diagnostics !== 'full') {
    throw new Error(`Invalid --diagnostics: ${diagnostics}`)
  }

  const engine = (readArg(argv, '--engine') ?? 'tanstack') as EngineMode
  if (engine !== 'passthrough' && engine !== 'tanstack') {
    throw new Error(`Invalid --engine: ${engine}`)
  }

  const middleware = (readArg(argv, '--middleware') ?? (engine === 'tanstack' ? 'on' : 'off')) as 'off' | 'on'
  if (middleware !== 'off' && middleware !== 'on') {
    throw new Error(`Invalid --middleware: ${middleware}`)
  }

  return { out, diagnostics, engine, middleware }
}

const parseDiffArgs = (
  argv: ReadonlyArray<string>,
): { readonly before: string; readonly after: string; readonly out?: string } => {
  const before = readArg(argv, '--before')
  const after = readArg(argv, '--after')
  const out = readArg(argv, '--out')
  if (!before || !after) {
    throw new Error(
      'Usage: pnpm perf bench:026:query-auto-trigger -- --diff --before <before.json> --after <after.json> [--out <diff.json>]',
    )
  }
  return { before, after, out }
}

const makeDebugLayer = (level: DiagnosticsLevel): Layer.Layer<any, never, never> => {
  if (level === 'off') {
    return Logix.Debug.noopLayer as unknown as Layer.Layer<any, never, never>
  }
  const BUFFER_SIZE = Number.parseInt(process.env.BUFFER_SIZE ?? '500', 10)
  return Logix.Debug.devtoolsHubLayer({
    bufferSize: BUFFER_SIZE,
    diagnosticsLevel: level,
  }) as unknown as Layer.Layer<any, never, never>
}

const waitUntil = <A>(
  read: Effect.Effect<A, never, any>,
  predicate: (value: A) => boolean,
  timeoutMs: number,
): Effect.Effect<A, Error, any> =>
  Effect.gen(function* () {
    const startedAt = now()
    while (true) {
      const value = yield* read
      if (predicate(value)) return value
      if (now() - startedAt > timeoutMs) {
        return yield* Effect.fail(new Error('timeout waiting for condition'))
      }
      yield* Effect.sleep(Duration.millis(1))
    }
  })

const defaultScenarios: ReadonlyArray<ScenarioParams> = [
  {
    scenarioId: 'switch/debounce0/keyAlways',
    concurrency: 'switch',
    debounceMs: 0,
    keyMode: 'always',
  },
  {
    scenarioId: 'switch/debounce20/keyAlways',
    concurrency: 'switch',
    debounceMs: 20,
    keyMode: 'always',
  },
  {
    scenarioId: 'switch/debounce0/keyToggle',
    concurrency: 'switch',
    debounceMs: 0,
    keyMode: 'toggle',
  },
]

const cacheHitScenario: ScenarioParams = {
  scenarioId: 'manual/refresh/keyFlipAB',
  concurrency: 'switch',
  debounceMs: 0,
  keyMode: 'always',
}

const getScenarios = (): ReadonlyArray<ScenarioParams> => {
  const mode = process.env.SCENARIOS
  if (mode === 'cachehit') return [cacheHitScenario]
  if (mode === 'default') return defaultScenarios
  if (mode === 'all') return [...defaultScenarios, cacheHitScenario]

  const includeCacheHit = process.env.INCLUDE_CACHEHIT === '1' || process.env.INCLUDE_CACHEHIT === 'true'
  return includeCacheHit ? [...defaultScenarios, cacheHitScenario] : defaultScenarios
}

const makeRuntimeAndCounters = (params: {
  readonly scenario: ScenarioParams
  readonly diagnostics: DiagnosticsLevel
  readonly engine: EngineMode
  readonly middleware: 'off' | 'on'
}) => {
  const ParamsSchema = Schema.Struct({ q: Schema.String })

  let loadCalls = 0
  const manualRefreshLoadDelayMs = Number.parseInt(process.env.MANUAL_REFRESH_LOAD_DELAY_MS ?? '1', 10)
  const loadDelayMs =
    params.scenario.scenarioId === 'manual/refresh/keyFlipAB' ? Math.max(0, manualRefreshLoadDelayMs) : 0
  const Spec = Logix.Resource.make({
    id: 'perf/026-query-auto-trigger/search',
    keySchema: Schema.Struct({ q: Schema.String }),
    load: (key: { readonly q: string }) =>
      Effect.sync(() => {
        loadCalls += 1
        return { q: key.q }
      }).pipe(loadDelayMs > 0 ? Effect.delay(Duration.millis(loadDelayMs)) : Effect.identity),
  })

  const module = Query.make('Perf026QueryAutoTrigger', {
    params: ParamsSchema,
    initialParams: { q: '' },
    queries: {
      search: {
        resource: Spec,
        deps: ['params.q'],
        triggers: params.scenario.scenarioId === 'manual/refresh/keyFlipAB' ? ['manual'] : ['onValueChange'],
        concurrency: params.scenario.concurrency,
        debounceMs: params.scenario.debounceMs,
        key: ({ params: p }: { readonly params: { readonly q: string } }) => {
          if (params.scenario.keyMode === 'toggle') {
            return p.q ? { q: p.q } : undefined
          }
          return { q: p.q }
        },
      },
    },
  })

  let queryClient: QueryClient | undefined
  let engineFetchCalls = 0

  const layers: Array<Layer.Layer<any, any, any>> = [makeDebugLayer(params.diagnostics), Logix.Resource.layer([Spec])]

  if (params.middleware === 'on') {
    const baseEngine =
      params.engine === 'tanstack'
        ? (() => {
            queryClient = new QueryClient()
            return Query.TanStack.engine(queryClient)
          })()
        : ({
            fetch: ({ effect }) => effect,
            fetchFast: (_resourceId, _keyHash, effect) => effect,
            invalidate: () => Effect.succeed(undefined).pipe(Effect.asVoid),
            peekFresh: () => Effect.succeed(Option.none()),
          } satisfies Query.Engine)

    layers.push(
      Query.Engine.layer({
        ...baseEngine,
        fetch: (args) =>
          Effect.sync(() => {
            engineFetchCalls += 1
          }).pipe(Effect.zipRight(baseEngine.fetch(args))),
        fetchFast: baseEngine.fetchFast
          ? (resourceId, keyHash, effect, meta) =>
              Effect.sync(() => {
                engineFetchCalls += 1
              }).pipe(Effect.zipRight(baseEngine.fetchFast!(resourceId, keyHash, effect, meta)))
          : undefined,
      }),
    )
  }

  const runtime = Logix.Runtime.make(module.impl, {
    layer: Layer.mergeAll(...layers) as any,
    middleware: params.middleware === 'on' ? [Query.Engine.middleware()] : [],
  })

  const clearCaches = (): void => {
    if (!queryClient) return
    const cache = queryClient.getQueryCache?.()
    if (cache && typeof (cache as any).clear === 'function') {
      ;(cache as any).clear()
    }
  }

  const resetCounters = (): void => {
    loadCalls = 0
    engineFetchCalls = 0
  }

  const readCounters = (): { readonly loadCalls: number; readonly engineFetchCalls?: number } => ({
    loadCalls,
    ...(params.middleware === 'on' ? { engineFetchCalls } : null),
  })

  return { module, runtime, clearCaches, resetCounters, readCounters }
}

const runCollect = async (args: ReturnType<typeof parseCollectArgs>): Promise<Report> => {
  const RUNS = Number.parseInt(process.env.RUNS ?? '30', 10)
  const WARMUP_DISCARD = Number.parseInt(process.env.WARMUP_DISCARD ?? '5', 10)
  const UPDATES = Number.parseInt(process.env.UPDATES_PER_RUN ?? '40', 10)
  const TIMEOUT_MS = Number.parseInt(process.env.SETTLE_TIMEOUT_MS ?? '1000', 10)

  const gcAvailable = typeof (globalThis as any).gc === 'function'

  const cases: Array<CaseResult> = []

  for (const scenario of getScenarios()) {
    const { module, runtime, clearCaches, resetCounters, readCounters } = makeRuntimeAndCounters({
      scenario,
      diagnostics: args.diagnostics,
      engine: args.engine,
      middleware: args.middleware,
    })

    const timeSamples: number[] = []
    const heapDeltas: number[] = []
    const loadCallSamples: number[] = []
    const engineFetchCallSamples: number[] = []

    for (let i = 0; i < RUNS; i++) {
      clearCaches()
      resetCounters()

      if (gcAvailable) {
        gcIfAvailable()
      }
      const heapBefore = heapUsed()

      const startedAt = now()

      const program = Effect.gen(function* () {
        const rt = yield* module.tag
        const controller = module.controller.make(rt)

        if (scenario.scenarioId === 'manual/refresh/keyFlipAB') {
          // 手动 refresh：在 a/b 两个 key 之间切换，以制造“重复 key 的强 cache hit”。
          for (let k = 0; k < UPDATES; k++) {
            const q = k % 2 === 0 ? 'a' : 'b'
            yield* controller.controller.setParams({ q } as any)

            // 等待 params 写回后再 refresh，避免 setParams/refresh 同队列竞态导致 refresh 读到旧 key。
            yield* waitUntil(controller.getState as any, (s: any) => s.params?.q === q, TIMEOUT_MS)

            yield* controller.controller.refresh('search' as any)

            const expectedKeyHash = Logix.Resource.keyHash({ q })
            yield* waitUntil(
              controller.getState as any,
              (s: any) => s.queries.search.status === 'success' && s.queries.search.keyHash === expectedKeyHash,
              TIMEOUT_MS,
            )
          }
          return
        }

        let lastQ = ''
        for (let k = 0; k < UPDATES; k++) {
          const q = scenario.keyMode === 'toggle' ? (k % 2 === 0 ? '' : `q:${i}:${k}`) : `q:${i}:${k}`
          lastQ = q
          yield* controller.controller.setParams({ q } as any)
        }

        const expectedKey = scenario.keyMode === 'toggle' && !lastQ ? undefined : { q: lastQ }
        const expectedKeyHash = expectedKey !== undefined ? Logix.Resource.keyHash(expectedKey) : undefined

        yield* waitUntil(
          controller.getState as any,
          (s: any) =>
            expectedKeyHash !== undefined
              ? s.queries.search.status === 'success' && s.queries.search.keyHash === expectedKeyHash
              : s.queries.search.status === 'idle' && s.queries.search.keyHash === undefined,
          TIMEOUT_MS,
        )
      })

      await runtime.runPromise(program as any)

      const endedAt = now()

      if (gcAvailable) {
        gcIfAvailable()
      }
      const heapAfter = heapUsed()

      timeSamples.push(Math.max(0, endedAt - startedAt))
      heapDeltas.push(heapAfter - heapBefore)

      const counters = readCounters()
      loadCallSamples.push(counters.loadCalls)
      if (typeof counters.engineFetchCalls === 'number') {
        engineFetchCallSamples.push(counters.engineFetchCalls)
      }
    }

    const trimmedTime = timeSamples.slice(Math.min(WARMUP_DISCARD, timeSamples.length))
    const trimmedHeap = heapDeltas.slice(Math.min(WARMUP_DISCARD, heapDeltas.length))
    const trimmedLoad = loadCallSamples.slice(Math.min(WARMUP_DISCARD, loadCallSamples.length))
    const trimmedFetch =
      engineFetchCallSamples.length > 0
        ? engineFetchCallSamples.slice(Math.min(WARMUP_DISCARD, engineFetchCallSamples.length))
        : []

    cases.push({
      params: {
        ...scenario,
        engine: args.engine,
        middleware: args.middleware,
        diagnostics: args.diagnostics,
      },
      samples: {
        timeMs: trimmedTime,
        ...(gcAvailable ? { heapDeltaBytes: trimmedHeap } : null),
        loadCalls: trimmedLoad,
        ...(args.engine === 'tanstack' ? { engineFetchCalls: trimmedFetch } : null),
      },
      stats: {
        timeMs: summarize(trimmedTime),
        ...(gcAvailable ? { heapDeltaBytes: summarize(trimmedHeap) } : null),
        loadCalls: summarize(trimmedLoad),
        ...(args.engine === 'tanstack' ? { engineFetchCalls: summarize(trimmedFetch) } : null),
      },
    })
  }

  return {
    meta: {
      createdAt: new Date().toISOString(),
      node: process.version,
      platform: `${process.platform}/${process.arch}`,
      gc: gcAvailable,
      runs: RUNS,
      warmupDiscard: WARMUP_DISCARD,
      updatesPerRun: UPDATES,
      diagnostics: args.diagnostics,
      engine: args.engine,
      middleware: args.middleware,
    },
    cases,
  }
}

const readJson = async <T>(file: string): Promise<T> => {
  const text = await fs.readFile(file, 'utf8')
  return JSON.parse(text) as T
}

const diffReports = (
  before: Report,
  after: Report,
  params: { readonly beforeFile: string; readonly afterFile: string },
): DiffReport => {
  const beforeByScenario = new Map<string, CaseResult>()
  for (const c of before.cases) {
    beforeByScenario.set(c.params.scenarioId, c)
  }

  const cases: Array<DiffCase> = []
  for (const c of after.cases) {
    const b = beforeByScenario.get(c.params.scenarioId)
    if (!b) continue

    const beforeP95 = b.stats.timeMs.p95
    const afterP95 = c.stats.timeMs.p95
    const ratio = beforeP95 > 0 ? afterP95 / beforeP95 : Number.POSITIVE_INFINITY

    const beforeHeapP95 = b.stats.heapDeltaBytes?.p95
    const afterHeapP95 = c.stats.heapDeltaBytes?.p95
    const heapRatio =
      typeof beforeHeapP95 === 'number' && typeof afterHeapP95 === 'number' && beforeHeapP95 > 0
        ? afterHeapP95 / beforeHeapP95
        : undefined
    const deltaHeapDeltaBytes =
      typeof beforeHeapP95 === 'number' && typeof afterHeapP95 === 'number' ? afterHeapP95 - beforeHeapP95 : undefined

    const beforeLoadP95 = b.stats.loadCalls.p95
    const afterLoadP95 = c.stats.loadCalls.p95

    const beforeFetchP95 = b.stats.engineFetchCalls?.p95
    const afterFetchP95 = c.stats.engineFetchCalls?.p95

    cases.push({
      scenarioId: c.params.scenarioId,
      diagnostics: c.params.diagnostics,
      before: {
        p95Ms: beforeP95,
        ...(typeof beforeHeapP95 === 'number' ? { p95HeapDeltaBytes: beforeHeapP95 } : null),
        p95LoadCalls: beforeLoadP95,
        ...(typeof beforeFetchP95 === 'number' ? { p95EngineFetchCalls: beforeFetchP95 } : null),
      },
      after: {
        p95Ms: afterP95,
        ...(typeof afterHeapP95 === 'number' ? { p95HeapDeltaBytes: afterHeapP95 } : null),
        p95LoadCalls: afterLoadP95,
        ...(typeof afterFetchP95 === 'number' ? { p95EngineFetchCalls: afterFetchP95 } : null),
      },
      deltaMs: afterP95 - beforeP95,
      ratio,
      ...(typeof deltaHeapDeltaBytes === 'number' ? { deltaHeapDeltaBytes } : null),
      ...(typeof heapRatio === 'number' ? { heapRatio } : null),
    })
  }

  let regressions = 0
  let improvements = 0
  for (const c of cases) {
    if (c.ratio > 1.01) regressions += 1
    if (c.ratio < 0.99) improvements += 1
  }

  return {
    meta: {
      createdAt: new Date().toISOString(),
      beforeFile: params.beforeFile,
      afterFile: params.afterFile,
    },
    summary: { regressions, improvements },
    cases,
  }
}

const writeOrPrintJson = async (value: unknown, out?: string): Promise<void> => {
  const json = JSON.stringify(value, null, 2)
  if (out) {
    await fs.mkdir(path.dirname(out), { recursive: true })
    await fs.writeFile(out, json, 'utf8')
    return
  }
  // eslint-disable-next-line no-console
  console.log(json)
}

const main = async (): Promise<void> => {
  const argv = process.argv.slice(2)
  if (hasFlag(argv, '--diff')) {
    const { before, after, out } = parseDiffArgs(argv)
    const beforeReport = await readJson<Report>(before)
    const afterReport = await readJson<Report>(after)
    const diff = diffReports(beforeReport, afterReport, { beforeFile: before, afterFile: after })
    await writeOrPrintJson(diff, out)
    return
  }

  const args = parseCollectArgs(argv)
  const report = await runCollect(args)
  await writeOrPrintJson(report, args.out)
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err)
  process.exitCode = 1
})
