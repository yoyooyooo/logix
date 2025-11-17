import { Effect, Schema } from 'effect'
import fs from 'node:fs'
import { performance } from 'node:perf_hooks'
import * as Logix from '@logix/core'

const now = () => performance.now()

const quantile = (sorted: ReadonlyArray<number>, q: number): number => {
  if (sorted.length === 0) return Number.NaN
  const clamped = Math.min(1, Math.max(0, q))
  const idx = Math.floor(clamped * (sorted.length - 1))
  return sorted[idx]!
}

const summarize = (
  samples: ReadonlyArray<number>,
): { readonly n: number; readonly medianMs: number; readonly p95Ms: number } => {
  const sorted = samples.slice().sort((a, b) => a - b)
  return {
    n: sorted.length,
    medianMs: quantile(sorted, 0.5),
    p95Ms: quantile(sorted, 0.95),
  }
}

const makeModule = (steps: number) => {
  const fields: Record<string, any> = {}
  for (let i = 0; i < steps; i++) {
    fields[`v${i}`] = Schema.Number
    fields[`d${i}`] = Schema.Number
  }

  const State = Schema.Struct(fields)
  const Actions = { noop: Schema.Void }

  const traits: Record<string, any> = {}
  for (let i = 0; i < steps; i++) {
    const v = `v${i}`
    const d = `d${i}`
    traits[d] = Logix.StateTrait.computed({
      deps: [v],
      get: (s: any) => (s?.[v] ?? 0) + 1,
    })
  }

  const M = Logix.Module.make('Perf009TxnDirtySet', {
    state: State,
    actions: Actions,
    reducers: { noop: (s: any) => s },
    traits: Logix.StateTrait.from(State)(traits as any),
  })

  const initial: Record<string, number> = {}
  for (let i = 0; i < steps; i++) {
    initial[`v${i}`] = 0
    initial[`d${i}`] = 1
  }

  const impl = M.implement({
    initial: initial as any,
    logics: [],
  })

  return { M, impl }
}

const main = async (): Promise<void> => {
  const RUNS = Number.parseInt(process.env.RUNS ?? '30', 10)
  const WARMUP_DISCARD = Number.parseInt(process.env.WARMUP_DISCARD ?? '5', 10)
  const STEPS = Number.parseInt(process.env.STEPS ?? '200', 10)
  const EXTREME_DIRTY_ROOTS = Number.parseInt(process.env.EXTREME_DIRTY_ROOTS ?? '40', 10)
  const INSTRUMENTATION = process.env.INSTRUMENTATION ?? 'off'
  const CONVERGE_MODE = process.env.CONVERGE_MODE ?? 'dirty'

  const { M, impl } = makeModule(STEPS)

  const runtime = Logix.Runtime.make(impl, {
    layer: Logix.Debug.noopLayer,
    stateTransaction: {
      traitConvergeMode: CONVERGE_MODE as any,
      instrumentation: INSTRUMENTATION as any,
    },
  })

  const moduleRuntime = await runtime.runPromise(
    Effect.gen(function* () {
      return yield* M.tag
    }),
  )
  const $ = Logix.Bound.make(M.shape as any, moduleRuntime as any)

  const program = (name: string, dirtyRoots: number, mode: 'patches' | 'dirtyAll'): Effect.Effect<void, never, any> => {
    const count = Math.min(Math.max(0, dirtyRoots), STEPS)
    return Effect.suspend(() => {
      if (mode === 'dirtyAll') {
        return Effect.gen(function* () {
          const prev = (yield* moduleRuntime.getState) as any
          const next: any = { ...prev }

          for (let i = 0; i < count; i++) {
            const key = `v${i}`
            next[key] = next[key] === 0 ? 1 : 0
          }

          yield* moduleRuntime.setState(next)
        })
      }

      return $.state.mutate((draft: any) => {
        for (let i = 0; i < count; i++) {
          const key = `v${i}`
          draft[key] = draft[key] === 0 ? 1 : 0
        }
      }) as any
    }).pipe(Effect.annotateLogs('perf.scenario', name))
  }

  const runScenario = async (
    name: string,
    dirtyRoots: number,
    mode: 'patches' | 'dirtyAll',
  ): Promise<{
    readonly dirtyRoots: number
    readonly runs: number
    readonly warmupDiscard: number
    readonly mode: 'patches' | 'dirtyAll'
    readonly samplesMs: ReadonlyArray<number>
    readonly stats: { readonly n: number; readonly medianMs: number; readonly p95Ms: number }
  }> => {
    const samples: number[] = []
    for (let i = 0; i < RUNS; i++) {
      const start = now()
      await runtime.runPromise(program(name, dirtyRoots, mode) as any)
      const end = now()
      samples.push(end - start)
    }

    const trimmed = samples.slice(Math.min(WARMUP_DISCARD, samples.length))
    return {
      dirtyRoots,
      runs: RUNS,
      warmupDiscard: WARMUP_DISCARD,
      mode,
      samplesMs: trimmed,
      stats: summarize(trimmed),
    }
  }

  const typical = await runScenario('typical.single-root', 1, 'patches')
  const extreme = await runScenario('extreme.many-roots', EXTREME_DIRTY_ROOTS, 'dirtyAll')

  const result = {
    meta: {
      node: process.version,
      platform: `${process.platform}/${process.arch}`,
      runs: RUNS,
      warmupDiscard: WARMUP_DISCARD,
      steps: STEPS,
      convergeMode: CONVERGE_MODE,
      instrumentation: INSTRUMENTATION,
    },
    scenarios: {
      typical,
      extreme,
    },
  } as const

  const json = JSON.stringify(result, null, 2)
  const outFile = process.env.OUT_FILE
  if (typeof outFile === 'string' && outFile.trim().length > 0) {
    fs.writeFileSync(outFile, json, 'utf8')
    // eslint-disable-next-line no-console
    console.error(`[logix-perf] wrote ${outFile}`)
    return
  }

  // eslint-disable-next-line no-console
  console.log(json)
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err)
  process.exitCode = 1
})
