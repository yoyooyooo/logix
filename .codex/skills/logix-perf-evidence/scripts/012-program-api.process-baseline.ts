import { Effect, Layer, Schema, Stream } from 'effect'
import { mkdir, writeFile } from 'node:fs/promises'
import { performance } from 'node:perf_hooks'
import { dirname } from 'node:path'
import * as Logix from '@logix/core'

const nowMs = (): number => performance.now()

const quantile = (sorted: ReadonlyArray<number>, q: number): number => {
  if (sorted.length === 0) return Number.NaN
  const clamped = Math.min(1, Math.max(0, q))
  const idx = Math.floor(clamped * (sorted.length - 1))
  return sorted[idx]!
}

type Summary = {
  readonly n: number
  readonly p50Ms: number
  readonly p95Ms: number
}

const summarize = (samples: ReadonlyArray<number>): Summary => {
  const sorted = samples.slice().sort((a, b) => a - b)
  return {
    n: sorted.length,
    p50Ms: quantile(sorted, 0.5),
    p95Ms: quantile(sorted, 0.95),
  }
}

const gcIfAvailable = (): void => {
  if (typeof (globalThis as any).gc === 'function') {
    ;(globalThis as any).gc()
  }
}

const heapUsed = (): number => process.memoryUsage().heapUsed

type DiagnosticsLevel = 'off' | 'light' | 'full'

const Source = Logix.Module.make('Perf012ProcessSource', {
  state: Schema.Struct({ n: Schema.Number }),
  actions: { ping: Schema.Void },
  reducers: {
    ping: Logix.Module.Reducer.mutate((draft) => {
      draft.n += 1
    }),
  },
})

const Root = Logix.Module.make('Perf012ProcessRoot', {
  state: Schema.Void,
  actions: {},
})

const PING_ACTION = { _tag: 'ping', payload: undefined } as const

const makeLegacyProcesses = (count: number) =>
  Array.from({ length: count }, (_, idx) =>
    Effect.gen(function* () {
      const source: any = yield* Source.tag

      // legacy baseline：以 actions$ 订阅模拟“旧写法的长期监听”，触发时不做额外工作。
      yield* source.actions$.pipe(
        Stream.runForEach((action: any) => {
          if (action?._tag === 'ping') {
            return Effect.void
          }
          return Effect.void
        }),
      )
    }).pipe(
      Effect.catchAll(() => Effect.void),
      Effect.annotateLogs('processId', `Perf012Legacy:${idx + 1}`),
    ),
  )

const makeProcesses = (args: { readonly count: number; readonly diagnosticsLevel: DiagnosticsLevel }) =>
  Array.from({ length: args.count }, (_, idx) =>
    Logix.Process.make(
      {
        processId: `Perf012Process:${args.diagnosticsLevel}:${idx + 1}`,
        requires: [Source.id],
        triggers: [{ kind: 'moduleAction', moduleId: Source.id, actionId: 'ping' }],
        concurrency: { mode: 'latest' },
        errorPolicy: { mode: 'failStop' },
        diagnosticsLevel: args.diagnosticsLevel,
      },
      Effect.void,
    ),
  )

type RunMode = 'none' | 'legacy' | 'process'

const makeRuntime = (args: {
  readonly mode: RunMode
  readonly processCount: number
  readonly diagnosticsLevel: DiagnosticsLevel
}) => {
  const processes =
    args.mode === 'process'
      ? makeProcesses({ count: args.processCount, diagnosticsLevel: args.diagnosticsLevel })
      : args.mode === 'legacy'
        ? makeLegacyProcesses(args.processCount)
        : []

  const rootImpl = Root.implement({
    initial: undefined,
    imports: [Source.implement({ initial: { n: 0 } }).impl],
    processes,
  })

  return Logix.Runtime.make(rootImpl, {
    label: `Perf012Process:${args.mode}:${args.processCount}:${args.diagnosticsLevel}`,
    layer: Logix.Debug.noopLayer as Layer.Layer<any, never, never>,
  })
}

const runOnce = async (args: {
  readonly mode: RunMode
  readonly processCount: number
  readonly diagnosticsLevel: DiagnosticsLevel
  readonly iters: number
}): Promise<{
  readonly elapsedMs: number
  readonly heapDeltaBytes: number
  readonly processEventCount: number
  readonly processTriggerDispatchCount: number
}> => {
  const runtime = makeRuntime(args)

  try {
    // boot：触碰 root/module tag，确保 imports/processes 已就绪。
    await runtime.runPromise(
      Effect.gen(function* () {
        yield* Root.tag
        yield* Source.tag
        yield* Effect.yieldNow()
      }) as any,
    )

    gcIfAvailable()
    const heapBefore = heapUsed()

    const start = nowMs()
    await runtime.runPromise(
      Effect.gen(function* () {
        yield* Root.tag
        const source: any = yield* Source.tag

        for (let i = 0; i < args.iters; i++) {
          yield* source.dispatch(PING_ACTION as any)
        }

        // 给 trigger stream 一次调度机会，避免“只 enqueue 未处理”。
        yield* Effect.yieldNow()
      }) as any,
    )
    const end = nowMs()

    gcIfAvailable()
    const heapAfter = heapUsed()

    const events = (await runtime.runPromise(Logix.InternalContracts.getProcessEvents() as any)) as ReadonlyArray<any>
    const processEventCount = events.length
    const processTriggerDispatchCount = events.filter(
      (e) => e?.type === 'process:trigger' || e?.type === 'process:dispatch',
    ).length

    return {
      elapsedMs: end - start,
      heapDeltaBytes: heapAfter - heapBefore,
      processEventCount,
      processTriggerDispatchCount,
    }
  } finally {
    await runtime.dispose()
  }
}

const deltaPct = (before: number, after: number): number => {
  if (!Number.isFinite(before) || before <= 0) return Number.NaN
  return ((after - before) / before) * 100
}

const main = async (): Promise<void> => {
  const RUNS = Number.parseInt(process.env.RUNS ?? '30', 10)
  const WARMUP_DISCARD = Number.parseInt(process.env.WARMUP_DISCARD ?? '5', 10)
  const ITERS = Number.parseInt(process.env.ITERS ?? '500', 10)
  const PROCESS_COUNT = Number.parseInt(process.env.PROCESS_COUNT ?? '5', 10)
  const OUT_FILE = process.env.OUT_FILE ?? 'specs/012-program-api/perf/after.local.json'

  const MAX_P95_OVERHEAD_OFF_PCT = Number.parseFloat(process.env.MAX_P95_OVERHEAD_OFF_PCT ?? '1')
  const MAX_P95_OVERHEAD_LIMIT_PCT = Number.parseFloat(process.env.MAX_P95_OVERHEAD_LIMIT_PCT ?? '5')

  const modes: ReadonlyArray<{
    readonly id: 'S0' | 'S1.legacy' | 'S1.off' | 'S1.light' | 'S1.full'
    readonly mode: RunMode
    readonly processCount: number
    readonly diagnosticsLevel: DiagnosticsLevel
  }> = [
    { id: 'S0', mode: 'none', processCount: 0, diagnosticsLevel: 'off' },
    { id: 'S1.legacy', mode: 'legacy', processCount: PROCESS_COUNT, diagnosticsLevel: 'off' },
    { id: 'S1.off', mode: 'process', processCount: PROCESS_COUNT, diagnosticsLevel: 'off' },
    { id: 'S1.light', mode: 'process', processCount: PROCESS_COUNT, diagnosticsLevel: 'light' },
    { id: 'S1.full', mode: 'process', processCount: PROCESS_COUNT, diagnosticsLevel: 'full' },
  ]

  const results: Array<{
    readonly id: string
    readonly processCount: number
    readonly diagnosticsLevel: DiagnosticsLevel
    readonly runs: number
    readonly warmupDiscard: number
    readonly iters: number
    readonly elapsedMs: { readonly samplesMs: ReadonlyArray<number>; readonly stats: Summary }
    readonly heapDeltaBytes: { readonly samples: ReadonlyArray<number>; readonly stats: Summary }
    readonly processEvents: {
      readonly total: { readonly samples: ReadonlyArray<number>; readonly max: number }
      readonly triggerDispatch: { readonly samples: ReadonlyArray<number>; readonly max: number }
    }
  }> = []

  for (const mode of modes) {
    const elapsedSamples: number[] = []
    const heapSamples: number[] = []
    const eventCountSamples: number[] = []
    const triggerDispatchSamples: number[] = []

    for (let i = 0; i < RUNS; i++) {
      const once = await runOnce({
        mode: mode.mode,
        processCount: mode.processCount,
        diagnosticsLevel: mode.diagnosticsLevel,
        iters: ITERS,
      })
      elapsedSamples.push(once.elapsedMs)
      heapSamples.push(once.heapDeltaBytes)
      eventCountSamples.push(once.processEventCount)
      triggerDispatchSamples.push(once.processTriggerDispatchCount)
    }

    const trimmedElapsed = elapsedSamples.slice(Math.min(WARMUP_DISCARD, elapsedSamples.length))
    const trimmedHeap = heapSamples.slice(Math.min(WARMUP_DISCARD, heapSamples.length))
    const trimmedEvents = eventCountSamples.slice(Math.min(WARMUP_DISCARD, eventCountSamples.length))
    const trimmedTriggerDispatch = triggerDispatchSamples.slice(Math.min(WARMUP_DISCARD, triggerDispatchSamples.length))

    results.push({
      id: mode.id,
      processCount: mode.processCount,
      diagnosticsLevel: mode.diagnosticsLevel,
      runs: RUNS,
      warmupDiscard: WARMUP_DISCARD,
      iters: ITERS,
      elapsedMs: { samplesMs: trimmedElapsed, stats: summarize(trimmedElapsed) },
      heapDeltaBytes: { samples: trimmedHeap, stats: summarize(trimmedHeap) },
      processEvents: {
        total: {
          samples: trimmedEvents,
          max: trimmedEvents.length > 0 ? Math.max(...trimmedEvents) : 0,
        },
        triggerDispatch: {
          samples: trimmedTriggerDispatch,
          max: trimmedTriggerDispatch.length > 0 ? Math.max(...trimmedTriggerDispatch) : 0,
        },
      },
    })
  }

  const s1Legacy = results.find((r) => r.id === 'S1.legacy')
  const s1Off = results.find((r) => r.id === 'S1.off')
  const s1Light = results.find((r) => r.id === 'S1.light')
  const s1Full = results.find((r) => r.id === 'S1.full')

  const overheadOffPct =
    s1Legacy && s1Off ? deltaPct(s1Legacy.elapsedMs.stats.p95Ms, s1Off.elapsedMs.stats.p95Ms) : Number.NaN

  const lightOverOffPct =
    s1Off && s1Light ? deltaPct(s1Off.elapsedMs.stats.p95Ms, s1Light.elapsedMs.stats.p95Ms) : Number.NaN

  const fullOverOffPct =
    s1Off && s1Full ? deltaPct(s1Off.elapsedMs.stats.p95Ms, s1Full.elapsedMs.stats.p95Ms) : Number.NaN

  const violations: Array<{ readonly id: string; readonly message: string }> = []

  if (!Number.isFinite(overheadOffPct)) {
    violations.push({
      id: 'missing',
      message: 'Missing S1.legacy/S1.off results for overhead calculation.',
    })
  } else {
    if (overheadOffPct > MAX_P95_OVERHEAD_OFF_PCT) {
      violations.push({
        id: 'p95.overhead.off',
        message: `S1.off p95 overhead (${overheadOffPct.toFixed(2)}%) exceeds MAX_P95_OVERHEAD_OFF_PCT=${MAX_P95_OVERHEAD_OFF_PCT}%`,
      })
    }
    if (overheadOffPct > MAX_P95_OVERHEAD_LIMIT_PCT) {
      violations.push({
        id: 'p95.overhead.limit',
        message: `S1.off p95 overhead (${overheadOffPct.toFixed(2)}%) exceeds MAX_P95_OVERHEAD_LIMIT_PCT=${MAX_P95_OVERHEAD_LIMIT_PCT}%`,
      })
    }
  }

  if (s1Off && s1Off.processEvents.triggerDispatch.max !== 0) {
    violations.push({
      id: 'sc-006.processEvents.off',
      message:
        'diagnostics=off should not store trigger/dispatch process events ' +
        `(max=${s1Off.processEvents.triggerDispatch.max}).`,
    })
  }

  const payload = {
    meta: {
      node: process.version,
      platform: `${process.platform}/${process.arch}`,
      runs: RUNS,
      warmupDiscard: WARMUP_DISCARD,
      iters: ITERS,
      processCount: PROCESS_COUNT,
      budgets: {
        maxP95OverheadOffPct: MAX_P95_OVERHEAD_OFF_PCT,
        maxP95OverheadLimitPct: MAX_P95_OVERHEAD_LIMIT_PCT,
      },
    },
    results,
    comparisons: {
      off: {
        baseline: 'S1.legacy',
        current: 'S1.off',
        p95OverheadPct: overheadOffPct,
      },
      diagnosticsOverhead: {
        lightOverOffPct,
        fullOverOffPct,
      },
    },
    gate: {
      ok: violations.length === 0,
      violations: violations.length > 0 ? violations : undefined,
    },
  } as const

  await mkdir(dirname(OUT_FILE), { recursive: true })
  await writeFile(OUT_FILE, `${JSON.stringify(payload, null, 2)}\n`)

  if (!payload.gate.ok) {
    throw new Error(`[perf][012-program-api] gate failed: ${violations.length} violations. See ${OUT_FILE}.`)
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err)
  process.exitCode = 1
})
