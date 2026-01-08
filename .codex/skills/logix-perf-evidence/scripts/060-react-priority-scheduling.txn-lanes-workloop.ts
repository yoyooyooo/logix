import { Effect, Layer, Schema } from 'effect'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { performance } from 'node:perf_hooks'
import process from 'node:process'
import * as Logix from '@logixjs/core'
import * as CoreNg from '@logixjs/core-ng'

const nowMs = (): number => performance.now()

const readPerfKernelIdFromEnv = (): Logix.Kernel.KernelId | undefined => {
  const raw = process.env.LOGIX_PERF_KERNEL_ID ?? process.env.VITE_LOGIX_PERF_KERNEL_ID
  return raw === 'core-ng' ? 'core-ng' : undefined
}

const makePerfKernelLayer = (): Layer.Layer<any, never, never> => {
  const kernelId = readPerfKernelIdFromEnv()
  if (kernelId !== 'core-ng') return Layer.empty as Layer.Layer<any, never, never>

  return CoreNg.coreNgFullCutoverLayer({
    capabilities: ['perf:fullCutover'],
  }) as Layer.Layer<any, never, never>
}

type Summary = {
  readonly n: number
  readonly p50Ms: number
  readonly p95Ms: number
}

const quantile = (sorted: ReadonlyArray<number>, q: number): number => {
  if (sorted.length === 0) return Number.NaN
  const clamped = Math.min(1, Math.max(0, q))
  const idx = Math.floor(clamped * (sorted.length - 1))
  return sorted[idx]!
}

const summarize = (samples: ReadonlyArray<number>): Summary => {
  const sorted = samples.slice().sort((a, b) => a - b)
  return {
    n: sorted.length,
    p50Ms: quantile(sorted, 0.5),
    p95Ms: quantile(sorted, 0.95),
  }
}

const readPositiveInt = (key: string, fallback: number): number => {
  const raw = process.env[key]
  if (!raw) return fallback
  const n = Number.parseInt(raw, 10)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

const readNonNegativeNumber = (key: string, fallback: number): number => {
  const raw = process.env[key]
  if (!raw) return fallback
  const n = Number(raw)
  return Number.isFinite(n) && n >= 0 ? n : fallback
}

const sanitize = (raw: string): string =>
  raw
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9._-]+/g, '')

const computeValue = (iters: number, a: number, offset: number): number => {
  let x = (a + offset) | 0
  for (let i = 0; i < iters; i++) {
    x = (Math.imul(x, 1103515245) + 12345) | 0
  }
  return x
}

const waitUntil = (cond: Effect.Effect<boolean>): Effect.Effect<void> =>
  Effect.gen(function* () {
    while (!(yield* cond)) {
      yield* Effect.yieldNow()
    }
  })

const makeModule = (args: {
  readonly steps: number
  readonly iters: number
}): { readonly M: any; readonly impl: any } => {
  const fields: Record<string, any> = {
    a: Schema.Number,
    b: Schema.Number,
  }
  for (let i = 0; i < args.steps; i++) {
    fields[`d${i}`] = Schema.Number
  }

  const State = Schema.Struct(fields) as any
  const Actions = { noop: Schema.Void }

  const traits: Record<string, any> = {}
  for (let i = 0; i < args.steps; i++) {
    traits[`d${i}`] = Logix.StateTrait.computed({
      deps: ['a'] as any,
      get: (a: any) => computeValue(args.iters, a, i),
      scheduling: 'deferred',
    } as any)
  }

  const M = Logix.Module.make('Perf060TxnLanesWorkloop', {
    state: State,
    actions: Actions,
    reducers: { noop: (s: any) => s },
    traits: Logix.StateTrait.from(State as any)(traits as any),
  })

  const initial: Record<string, number> = {
    a: 0,
    b: 0,
  }
  for (let i = 0; i < args.steps; i++) {
    initial[`d${i}`] = computeValue(args.iters, 0, i)
  }

  const impl = M.implement({
    initial: initial as any,
    logics: [],
  })

  return { M, impl }
}

const benchOnce = (args: {
  readonly mode: 'off' | 'on'
  readonly runs: number
  readonly warmupDiscard: number
  readonly delayMs: number
  readonly steps: number
  readonly iters: number
  readonly debounceMs: number
  readonly maxLagMs: number
  readonly budgetMs: number
}): Promise<{
  readonly mode: 'off' | 'on'
  readonly samples: {
    readonly urgentMs: ReadonlyArray<number>
    readonly catchUpMs: ReadonlyArray<number>
  }
  readonly stats: {
    readonly urgentMs: Summary
    readonly catchUpMs: Summary
  }
}> => {
  const { M, impl } = makeModule({ steps: args.steps, iters: args.iters })

  const perfKernelLayer = makePerfKernelLayer()

  const runtime = Logix.Runtime.make(impl, {
    layer: Layer.mergeAll(Logix.Debug.noopLayer, perfKernelLayer) as Layer.Layer<any, never, never>,
    stateTransaction: {
      traitConvergeMode: 'dirty',
      traitConvergeBudgetMs: 100_000,
      traitConvergeDecisionBudgetMs: 100_000,
      traitConvergeTimeSlicing: { enabled: true, debounceMs: 1, maxLagMs: 200 },
      txnLanes:
        args.mode === 'on'
          ? {
              enabled: true,
              budgetMs: args.budgetMs,
              debounceMs: args.debounceMs,
              maxLagMs: args.maxLagMs,
              allowCoalesce: true,
            }
          : { enabled: false },
    },
  })

  const totalRuns = args.runs + args.warmupDiscard
  const lastKey = `d${Math.max(0, args.steps - 1)}`

  return runtime.runPromise(
    Effect.gen(function* () {
      const rt: any = yield* M.tag

      const urgentSamples: number[] = []
      const catchUpSamples: number[] = []

      for (let i = 0; i < totalRuns; i++) {
        const nextA = i % 2 === 0 ? 1 : 0
        const expectedD0 = computeValue(args.iters, nextA, 0)
        const expectedLast = computeValue(args.iters, nextA, args.steps - 1)

        const t1Start = nowMs()
        yield* Logix.InternalContracts.runWithStateTransaction(rt, { kind: 'perf', name: `t1.${args.mode}` }, () =>
          Effect.gen(function* () {
            const prev = yield* rt.getState
            Logix.InternalContracts.recordStatePatch(rt, 'a', 'perf', (prev as any).a, nextA)
            yield* rt.setState({ ...prev, a: nextA })
          }),
        )

        if (args.delayMs > 0) {
          yield* Effect.sleep(`${args.delayMs} millis`)
        } else {
          yield* Effect.yieldNow()
        }

        const urgentStart = nowMs()
        yield* Logix.InternalContracts.runWithStateTransaction(rt, { kind: 'perf', name: `urgent.${args.mode}` }, () =>
          Effect.gen(function* () {
            const prev = yield* rt.getState
            const nextB = ((prev as any).b ?? 0) + 1
            Logix.InternalContracts.recordStatePatch(rt, 'b', 'perf', (prev as any).b, nextB)
            yield* rt.setState({ ...prev, b: nextB })
          }),
        )
        const urgentEnd = nowMs()

        if (args.mode === 'on') {
          yield* waitUntil(
            rt.getState.pipe(
              Effect.map((s: any) => s.d0 === expectedD0 || s[lastKey] === expectedLast),
            ),
          )
        }

        yield* waitUntil(
          rt.getState.pipe(
            Effect.map((s: any) => s[lastKey] === expectedLast),
          ),
        )
        const tEnd = nowMs()

        urgentSamples.push(Math.max(0, urgentEnd - urgentStart))
        catchUpSamples.push(Math.max(0, tEnd - t1Start))
      }

      const trimmedUrgent = urgentSamples.slice(Math.min(args.warmupDiscard, urgentSamples.length))
      const trimmedCatchUp = catchUpSamples.slice(Math.min(args.warmupDiscard, catchUpSamples.length))

      return {
        mode: args.mode,
        samples: {
          urgentMs: trimmedUrgent,
          catchUpMs: trimmedCatchUp,
        },
        stats: {
          urgentMs: summarize(trimmedUrgent),
          catchUpMs: summarize(trimmedCatchUp),
        },
      } as const
    }) as any,
  )
}

const main = async (): Promise<void> => {
  const RUNS = readPositiveInt('RUNS', 30)
  const WARMUP_DISCARD = readPositiveInt('WARMUP_DISCARD', 5)
  const STEPS = readPositiveInt('STEPS', 1024)
  const ITERS = readPositiveInt('COMPUTE_ITERS', 4000)
  const DELAY_MS = readNonNegativeNumber('DELAY_MS', 1)
  const LANE_DEBOUNCE_MS = readNonNegativeNumber('LANE_DEBOUNCE_MS', 0)
  const LANE_MAX_LAG_MS = readNonNegativeNumber('LANE_MAX_LAG_MS', 50)
  const LANE_BUDGET_MS = readNonNegativeNumber('LANE_BUDGET_MS', 0)

  const OUT_DIR = process.env.OUT_DIR ?? 'specs/060-react-priority-scheduling/perf'
  const envId = sanitize(`${process.platform}-${process.arch}.node${process.version}`)
  const kernelId = readPerfKernelIdFromEnv()
  const kernelLabel = kernelId === 'core-ng' ? 'core-ng.' : ''
  const runLabelRaw = typeof process.env.RUN_LABEL === 'string' ? process.env.RUN_LABEL.trim() : ''
  const runLabel = runLabelRaw ? `${sanitize(runLabelRaw)}.` : ''

  const before = await benchOnce({
    mode: 'off',
    runs: RUNS,
    warmupDiscard: WARMUP_DISCARD,
    delayMs: DELAY_MS,
    steps: STEPS,
    iters: ITERS,
    debounceMs: LANE_DEBOUNCE_MS,
    maxLagMs: LANE_MAX_LAG_MS,
    budgetMs: LANE_BUDGET_MS,
  })

  const after = await benchOnce({
    mode: 'on',
    runs: RUNS,
    warmupDiscard: WARMUP_DISCARD,
    delayMs: DELAY_MS,
    steps: STEPS,
    iters: ITERS,
    debounceMs: LANE_DEBOUNCE_MS,
    maxLagMs: LANE_MAX_LAG_MS,
    budgetMs: LANE_BUDGET_MS,
  })

  const diff = {
    meta: {
      createdAt: new Date().toISOString(),
      generator: '.codex/skills/logix-perf-evidence/scripts/060-react-priority-scheduling.txn-lanes-workloop.ts',
      envId,
      config: {
        runs: RUNS,
        warmupDiscard: WARMUP_DISCARD,
        steps: STEPS,
        computeIters: ITERS,
        delayMs: DELAY_MS,
        lanePolicy: {
          debounceMs: LANE_DEBOUNCE_MS,
          maxLagMs: LANE_MAX_LAG_MS,
          budgetMs: LANE_BUDGET_MS,
        },
      },
    },
    before: before.stats,
    after: after.stats,
    deltas: {
      urgentP95Ratio: after.stats.urgentMs.p95Ms / Math.max(0.000001, before.stats.urgentMs.p95Ms),
      catchUpP95Ratio: after.stats.catchUpMs.p95Ms / Math.max(0.000001, before.stats.catchUpMs.p95Ms),
    },
  } as const

  const beforeFile = `${OUT_DIR}/before.node.${kernelLabel}txnLanes.off.${runLabel}${envId}.default.json`
  const afterFile = `${OUT_DIR}/after.node.${kernelLabel}txnLanes.on.${runLabel}${envId}.default.json`
  const diffFile = `${OUT_DIR}/diff.node.${kernelLabel}txnLanes.off__on.${runLabel}${envId}.default.json`

  await mkdir(dirname(beforeFile), { recursive: true })
  await writeFile(beforeFile, `${JSON.stringify(before, null, 2)}\n`, 'utf8')
  await writeFile(afterFile, `${JSON.stringify(after, null, 2)}\n`, 'utf8')
  await writeFile(diffFile, `${JSON.stringify(diff, null, 2)}\n`, 'utf8')

  // eslint-disable-next-line no-console
  console.log(`[logix-perf] wrote ${beforeFile}`)
  // eslint-disable-next-line no-console
  console.log(`[logix-perf] wrote ${afterFile}`)
  // eslint-disable-next-line no-console
  console.log(`[logix-perf] wrote ${diffFile}`)
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err)
  process.exitCode = 1
})
