import { Effect, Layer, Schema } from 'effect'
import { performance } from 'node:perf_hooks'
import * as Logix from '@logixjs/core'

process.env.NODE_ENV = 'production'

type ConvergeRuntime = {
  readonly module: any
  readonly runtime: ReturnType<typeof Logix.Runtime.make>
  readonly bumpReducer: (state: any, action: any) => any
}

const nowMs = (): number => performance.now()

const quantile = (sorted: ReadonlyArray<number>, q: number): number => {
  if (sorted.length === 0) return Number.NaN
  const clamped = Math.min(1, Math.max(0, q))
  const idx = Math.floor(clamped * (sorted.length - 1))
  return sorted[idx]!
}

const p95 = (samples: ReadonlyArray<number>): number => {
  const sorted = samples.slice().sort((a, b) => a - b)
  return quantile(sorted, 0.95)
}

const makeRuntime = (steps: number, convergeMode: 'auto' | 'dirty'): ConvergeRuntime => {
  const fields: Record<string, unknown> = {}
  for (let i = 0; i < steps; i++) {
    fields[`b${i}`] = Schema.Number
    fields[`d${i}`] = Schema.Number
  }

  const State = Schema.Struct(fields as any)
  const Actions = { bump: Schema.Number }

  const traits: Record<string, unknown> = {}
  for (let i = 0; i < steps; i++) {
    traits[`d${i}`] = Logix.StateTrait.computed<any, any, any>({
      deps: [`b${i}`] as any,
      get: (value: any) => (value as number) + 1,
    }) as any
  }

  const M = Logix.Module.make(`DbgConvergeSteps${steps}`, {
    state: State as any,
    actions: Actions,
    traits: Logix.StateTrait.from(State as any)(traits as any) as any,
  })

  const initial: Record<string, number> = {}
  for (let i = 0; i < steps; i++) {
    initial[`b${i}`] = 0
    initial[`d${i}`] = 1
  }

  const impl = M.implement({
    initial: initial as any,
    logics: [],
  })

  const bumpReducer = Logix.Module.Reducer.mutate((draft: any, action: { readonly payload: number }) => {
    const dirtyRoots = action.payload
    for (let i = 0; i < dirtyRoots; i++) {
      const k = `b${i}`
      draft[k] = (draft[k] as number) + 1
    }
  })

  const noopSink: Logix.Debug.Sink = { record: () => Effect.void }

  const runtime = Logix.Runtime.make(impl, {
    stateTransaction: {
      instrumentation: 'light',
      traitConvergeMode: convergeMode,
      traitConvergeBudgetMs: 10_000,
      traitConvergeDecisionBudgetMs: 10_000,
    },
    layer: Layer.mergeAll(Logix.Debug.replace([noopSink]) as any) as any,
    label: `debug:${convergeMode}:${steps}`,
  })

  return { module: M as any, runtime, bumpReducer }
}

const runTxn = (rt: ConvergeRuntime, dirtyRoots: number, level: 'off' | 'light' | 'full') =>
  runConvergeTxnCommit(rt, dirtyRoots).pipe(Effect.locally(Logix.Debug.internal.currentDiagnosticsLevel, level)) as any

const runConvergeTxnCommit = (rt: ConvergeRuntime, dirtyRoots: number) =>
  Effect.gen(function* () {
    const moduleScope = (yield* rt.module.tag) as any

    yield* Logix.InternalContracts.runWithStateTransaction(
      moduleScope,
      { kind: 'perf', name: 'debug:converge:txnCommit' },
      () =>
        Effect.gen(function* () {
          const prev = yield* moduleScope.getState
          const next = rt.bumpReducer(prev, { _tag: 'bump', payload: dirtyRoots } as any)
          yield* moduleScope.setState(next)

          for (let i = 0; i < dirtyRoots; i++) {
            Logix.InternalContracts.recordStatePatch(moduleScope, `b${i}`, 'perf:dirty-root')
          }
        }),
    )
  })

const measure = async (label: string, rt: ConvergeRuntime, dirtyRoots: number, interleave: boolean) => {
  const warmup = 10
  const runs = 40
  const offSamples: number[] = []

  for (let i = 0; i < runs; i++) {
    const t0 = nowMs()
    await rt.runtime.runPromise(runTxn(rt, dirtyRoots, 'off'))
    const t1 = nowMs()
    if (i >= warmup) offSamples.push(t1 - t0)

    if (interleave) {
      await rt.runtime.runPromise(runTxn(rt, dirtyRoots, 'light'))
      await rt.runtime.runPromise(runTxn(rt, dirtyRoots, 'full'))
    }
  }

  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ label, p95Ms: p95(offSamples) }, null, 2))
}

const main = async () => {
  const steps = 2000
  const dirtyRoots = 100

  const autoOnlyOff = makeRuntime(steps, 'auto')
  await measure('auto-only-off', autoOnlyOff, dirtyRoots, false)

  const autoInterleave = makeRuntime(steps, 'auto')
  await measure('auto-interleave', autoInterleave, dirtyRoots, true)

  const dirtyOnlyOff = makeRuntime(steps, 'dirty')
  await measure('dirty-only-off', dirtyOnlyOff, dirtyRoots, false)

  const dirtyInterleave = makeRuntime(steps, 'dirty')
  await measure('dirty-interleave', dirtyInterleave, dirtyRoots, true)
}

main().catch((e) => {
  console.error(e)
  process.exitCode = 1
})

