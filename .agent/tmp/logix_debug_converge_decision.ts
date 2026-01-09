import { Effect, Layer, Schema } from 'effect'
import * as Logix from '@logixjs/core'

process.env.NODE_ENV = 'production'

type ConvergeRuntime = {
  readonly module: any
  readonly runtime: ReturnType<typeof Logix.Runtime.make>
  readonly bumpReducer: (state: any, action: any) => any
}

const makeConvergeRuntime = (steps: number, convergeMode: 'full' | 'dirty' | 'auto'): ConvergeRuntime => {
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

  const captureSink: Logix.Debug.Sink = {
    record: (event: Logix.Debug.Event) =>
      Effect.sync(() => {
        if (event.type !== 'state:update') return
        const e: any = event
        const decision = e?.traitSummary?.converge
        if (!decision) return

        if (typeof e.txnSeq === 'number' && e.txnSeq >= 2) {
          const slim = {
            txnSeq: e.txnSeq,
            requestedMode: decision.requestedMode,
            executedMode: decision.executedMode,
            reasons: decision.reasons,
            stepStats: decision.stepStats,
            dirty: decision.dirty,
            decisionDurationMs: decision.decisionDurationMs,
          }
          // eslint-disable-next-line no-console
          console.log(JSON.stringify(slim, null, 2))
        }
      }),
  }

  const runtime = Logix.Runtime.make(impl, {
    stateTransaction: {
      instrumentation: 'light',
      traitConvergeMode: convergeMode,
      traitConvergeBudgetMs: 10_000,
      traitConvergeDecisionBudgetMs: 10_000,
    },
    layer: Layer.mergeAll(Logix.Debug.replace([captureSink]) as any) as any,
    label: `debug:${convergeMode}:${steps}`,
  })

  return { module: M as any, runtime, bumpReducer }
}

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

const main = async () => {
  const rt = makeConvergeRuntime(200, 'auto')

  // warmup (txnSeq=1)
  await rt.runtime.runPromise(
    runConvergeTxnCommit(rt, 1).pipe(Effect.locally(Logix.Debug.internal.currentDiagnosticsLevel, 'off')) as any,
  )

  // observe
  await rt.runtime.runPromise(
    runConvergeTxnCommit(rt, 1).pipe(Effect.locally(Logix.Debug.internal.currentDiagnosticsLevel, 'off')) as any,
  )
  await rt.runtime.runPromise(
    runConvergeTxnCommit(rt, 10).pipe(Effect.locally(Logix.Debug.internal.currentDiagnosticsLevel, 'off')) as any,
  )
  await rt.runtime.runPromise(
    runConvergeTxnCommit(rt, 50).pipe(Effect.locally(Logix.Debug.internal.currentDiagnosticsLevel, 'off')) as any,
  )
}

main().catch((e) => {
  console.error(e)
  process.exitCode = 1
})
