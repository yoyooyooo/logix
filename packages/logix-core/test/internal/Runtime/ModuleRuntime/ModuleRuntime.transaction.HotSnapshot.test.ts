import { describe } from '@effect/vitest'
import { it, expect } from '@effect/vitest'
import { Effect, Schema } from 'effect'
import * as Logix from '../../../../src/index.js'
import * as EffectOpCore from '../../../../src/internal/runtime/core/EffectOpCore.js'
import { RunSessionTag, makeRunSession } from '../../../../src/internal/observability/runSession.js'

const computeValue = (a: number, offset: number): number => {
  let x = (a + offset) | 0
  for (let i = 0; i < 4000; i++) {
    x = (Math.imul(x, 1103515245) + 12345) | 0
  }
  return x
}

const installServiceAccessProbe = (tag: any) => {
  const cachedEffect = tag.asEffect()
  const previousAsEffect = tag.asEffect
  const stacks: string[] = []

  tag.asEffect = function () {
    stacks.push(new Error('service-access').stack ?? '')
    return cachedEffect
  }

  return {
    countTxnAccesses: () => stacks.filter((stack) => stack.includes('ModuleRuntime.transaction.ts')).length,
    restore: () => {
      tag.asEffect = previousAsEffect
    },
  }
}

const makeDeferredModule = (args: { readonly deferred: number }) => {
  const fields: Record<string, Schema.Top> = {
    a: Schema.Number,
    b: Schema.Number,
  }
  for (let i = 0; i < args.deferred; i++) {
    fields[`d${i}`] = Schema.Number
  }

  const State = Schema.Struct(fields) as any
  const Actions = { noop: Schema.Void }

  const traits: Record<string, any> = {}
  for (let i = 0; i < args.deferred; i++) {
    const key = `d${i}`
    traits[key] = Logix.StateTrait.computed({
      deps: ['a'] as any,
      get: (a: any) => computeValue(a, i),
      scheduling: 'deferred',
    } as any)
  }

  const M = Logix.Module.make('ModuleRuntime_Transaction_HotSnapshot', {
    state: State as any,
    actions: Actions,
    reducers: { noop: (s: any) => s },
    traits: Logix.StateTrait.from(State as any)(traits as any),
  })

  const initial: Record<string, number> = {
    a: 0,
    b: 0,
  }
  for (let i = 0; i < args.deferred; i++) {
    initial[`d${i}`] = computeValue(0, i)
  }

  const impl = M.implement({
    initial: initial as any,
    logics: [],
  })

  return { M, impl }
}

describe('ModuleRuntime.transaction hot snapshot', () => {
  it.effect('reads hot debug/runtime services once before handing deferred backlog to worker', () =>
    Effect.gen(function* () {
      const { M, impl } = makeDeferredModule({ deferred: 16 })

      const runtime = Logix.Runtime.make(impl, {
        layer: Logix.Debug.noopLayer,
        stateTransaction: {
          traitConvergeMode: 'dirty',
          traitConvergeBudgetMs: 100_000,
          traitConvergeDecisionBudgetMs: 100_000,
          traitConvergeTimeSlicing: { enabled: true, debounceMs: 1_000, maxLagMs: 10_000 },
          txnLanes: { enabled: true, budgetMs: 0, debounceMs: 1_000, maxLagMs: 10_000, allowCoalesce: true },
        },
      })

      try {
        yield* Effect.promise(() =>
          runtime.runPromise(
            Effect.gen(function* () {
              const rt: any = yield* Effect.service(M.tag).pipe(Effect.orDie)

              const diagnosticsProbe = installServiceAccessProbe(Logix.Debug.internal.currentDiagnosticsLevel as any)
              const debugSinksProbe = installServiceAccessProbe(Logix.Debug.internal.currentDebugSinks as any)
              const runtimeLabelProbe = installServiceAccessProbe(Logix.Debug.internal.currentRuntimeLabel as any)

              try {
                yield* Logix.InternalContracts.runWithStateTransaction(rt, { kind: 'test', name: 't1' }, () =>
                  Effect.gen(function* () {
                    const prev = yield* rt.getState
                    yield* rt.setState({ ...prev, a: 1 })
                    Logix.InternalContracts.recordStatePatch(rt, 'a', 'unknown')
                  }),
                )

                expect(diagnosticsProbe.countTxnAccesses()).toBe(1)
                expect(debugSinksProbe.countTxnAccesses()).toBe(1)
                expect(runtimeLabelProbe.countTxnAccesses()).toBe(1)
              } finally {
                diagnosticsProbe.restore()
                debugSinksProbe.restore()
                runtimeLabelProbe.restore()
              }
            }),
          ),
        )
      } finally {
        yield* Effect.promise(() => runtime.dispose())
      }
    }),
  )

  it.effect('captures transaction-shared operation hot context for commit state:update after runtime warmup', () =>
    Effect.gen(function* () {
      const { M, impl } = makeDeferredModule({ deferred: 0 })

      const runtime = Logix.Runtime.make(impl, {
        layer: Logix.Debug.noopLayer,
      })

      const session = makeRunSession({
        runId: 'run-txn-op-hot',
        startedAt: 1,
      })
      const opSeqAllocations: Array<{ readonly namespace: string; readonly key: string }> = []
      const sessionLocal = session.local as {
        nextSeq: (namespace: string, key: string) => number
      }
      const previousNextSeq = sessionLocal.nextSeq
      sessionLocal.nextSeq = (namespace: string, key: string) => {
        opSeqAllocations.push({ namespace, key })
        return previousNextSeq(namespace, key)
      }

      try {
        yield* Effect.promise(() =>
          runtime.runPromise(
            Effect.gen(function* () {
              const rt: any = yield* Effect.service(M.tag).pipe(Effect.orDie)
              yield* rt.getState
            }),
          ),
        )
        opSeqAllocations.length = 0

        yield* Effect.promise(() =>
          runtime.runPromise(
            Effect.provideService(
              Effect.provideService(
                Effect.gen(function* () {
                  const rt: any = yield* Effect.service(M.tag).pipe(Effect.orDie)

                  yield* Logix.InternalContracts.runWithStateTransaction(rt, { kind: 'test', name: 't1' }, () =>
                    Effect.gen(function* () {
                      const prev = yield* rt.getState
                      yield* rt.setState({ ...prev, a: 1 })
                      Logix.InternalContracts.recordStatePatch(rt, 'a', 'unknown')
                    }),
                  )
                }),
                EffectOpCore.EffectOpMiddlewareTag,
                { stack: [] },
              ),
              RunSessionTag,
              session,
            ),
          ),
        )

        expect(opSeqAllocations.filter((entry) => entry.namespace === 'opSeq').length).toBe(1)
      } finally {
        sessionLocal.nextSeq = previousNextSeq
        yield* Effect.promise(() => runtime.dispose())
      }
    }),
  )
})
