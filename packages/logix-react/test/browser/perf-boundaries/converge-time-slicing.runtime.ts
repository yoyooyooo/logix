import { Effect, Layer, Schema } from 'effect'
import * as Logix from '@logix/core'
import { readConvergeControlPlaneFromEnv } from './converge-runtime.js'
import { makePerfKernelLayer, silentDebugLayer } from './harness.js'

export type DiagnosticsLevel = Logix.Debug.DiagnosticsLevel

export type ConvergeTimeSlicingRuntime = {
  readonly module: any
  readonly runtime: ReturnType<typeof Logix.Runtime.make>
  readonly bumpReducer: (state: any, action: any) => any
  readonly getLastConvergeDecision: () => unknown | undefined
  readonly clearLastConvergeDecision: () => void
}

export const makeConvergeTimeSlicingRuntime = (
  steps: number,
  immediateSteps: number,
  convergeMode: 'full' | 'dirty' | 'auto',
  timeSlicing: 'off' | 'on',
  options?: {
    readonly captureDecision?: boolean
    readonly timeSlicingDebounceMs?: number
    readonly timeSlicingMaxLagMs?: number
  },
): ConvergeTimeSlicingRuntime => {
  const safeSteps = Math.max(0, Math.floor(steps))
  const safeImmediateSteps = Math.max(0, Math.min(safeSteps, Math.floor(immediateSteps)))

  const deriveImmediate = (value: number): number => value + 1
  const deriveDeferred = (value: number, salt: number): number => {
    let x = value | 0
    for (let i = 0; i < 1024; i++) {
      x = (x * 1664525 + 1013904223 + salt) | 0
    }
    return x
  }

  const fields: Record<string, unknown> = {}
  for (let i = 0; i < safeSteps; i++) {
    fields[`b${i}`] = Schema.Number
    fields[`d${i}`] = Schema.Number
  }

  const State = Schema.Struct(fields as any)

  const Actions = {
    bump: Schema.Number,
  }

  const traits: Record<string, unknown> = {}
  for (let i = 0; i < safeSteps; i++) {
    traits[`d${i}`] = Logix.StateTrait.computed<any, any, any>({
      deps: [`b${i}`] as any,
      scheduling: i < safeImmediateSteps ? 'immediate' : 'deferred',
      get: (value: any) =>
        i < safeImmediateSteps ? deriveImmediate(value as number) : deriveDeferred(value as number, i),
    }) as any
  }

  const M = Logix.Module.make(`PerfConvergeTimeSlicing${safeSteps}`, {
    state: State as any,
    actions: Actions,
    traits: Logix.StateTrait.from(State as any)(traits as any) as any,
  })

  const initial: Record<string, number> = {}
  for (let i = 0; i < safeSteps; i++) {
    initial[`b${i}`] = 0
    initial[`d${i}`] = i < safeImmediateSteps ? deriveImmediate(0) : deriveDeferred(0, i)
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

  let lastDecision: unknown | undefined
  const clearLastConvergeDecision = (): void => {
    lastDecision = undefined
  }
  const getLastConvergeDecision = (): unknown | undefined => lastDecision

  const captureSink: Logix.Debug.Sink = {
    record: (event: Logix.Debug.Event) => {
      if (event.type !== 'state:update') return Effect.void
      const decision = (event as any)?.traitSummary?.converge
      if (decision != null) {
        lastDecision = decision
      }
      return Effect.void
    },
  }

  const debugLayer = options?.captureDecision
    ? (Logix.Debug.replace([captureSink]) as Layer.Layer<any, never, never>)
    : (silentDebugLayer as Layer.Layer<any, never, never>)

  const perfKernelLayer = makePerfKernelLayer()
  const controlPlane = readConvergeControlPlaneFromEnv()

  const runtime = Logix.Runtime.make(impl, {
    stateTransaction: {
      traitConvergeMode: convergeMode,
      traitConvergeBudgetMs: controlPlane.traitConvergeBudgetMs,
      traitConvergeDecisionBudgetMs: controlPlane.traitConvergeDecisionBudgetMs,
      ...(timeSlicing === 'on'
        ? {
            traitConvergeTimeSlicing: {
              enabled: true,
              debounceMs: options?.timeSlicingDebounceMs ?? 10_000,
              maxLagMs: options?.timeSlicingMaxLagMs ?? 60_000,
            },
          }
        : null),
    },
    layer: Layer.mergeAll(debugLayer, perfKernelLayer) as Layer.Layer<any, never, never>,
    label: [
      `perf:converge:timeSlicing:${timeSlicing}:${convergeMode}:${safeSteps}`,
      controlPlane.tuningId ? `tuning:${controlPlane.tuningId}` : undefined,
    ]
      .filter(Boolean)
      .join(' '),
  })

  return {
    module: M as any,
    runtime,
    bumpReducer,
    getLastConvergeDecision,
    clearLastConvergeDecision,
  }
}

export const runConvergeTimeSlicingTxnCommit = (
  rt: ConvergeTimeSlicingRuntime,
  dirtyRoots: number,
): Effect.Effect<void, never, any> =>
  Effect.gen(function* () {
    const moduleScope = (yield* rt.module.tag) as any
    yield* Logix.InternalContracts.runWithStateTransaction(
      moduleScope,
      { kind: 'perf', name: 'converge:txnCommit:timeSlicing' },
      () =>
        Effect.gen(function* () {
          const prev = yield* moduleScope.getState
          const next = rt.bumpReducer(prev, { _tag: 'bump', payload: dirtyRoots } as any)
          yield* moduleScope.setState(next)

          for (let i = 0; i < dirtyRoots; i++) {
            Logix.InternalContracts.recordStatePatch(moduleScope, `b${i}`, 'perf')
          }
        }),
    )
  }) as Effect.Effect<void, never, any>

export const runConvergeTimeSlicingTxnCommitWithDiagnosticsLevel = (
  rt: ConvergeTimeSlicingRuntime,
  dirtyRoots: number,
  diagnosticsLevel: DiagnosticsLevel,
): Effect.Effect<void, never, any> =>
  runConvergeTimeSlicingTxnCommit(rt, dirtyRoots).pipe(
    Effect.locally(Logix.Debug.internal.currentDiagnosticsLevel, diagnosticsLevel),
  )

export const runConvergeTimeSlicingTxnCommitDirtyAll = (
  rt: ConvergeTimeSlicingRuntime,
  mutateRoots: number,
): Effect.Effect<void, never, any> =>
  Effect.gen(function* () {
    const moduleScope = (yield* rt.module.tag) as any
    yield* Logix.InternalContracts.runWithStateTransaction(
      moduleScope,
      { kind: 'perf', name: 'converge:txnCommit:timeSlicing:dirtyAll' },
      () =>
        Effect.gen(function* () {
          const prev = yield* moduleScope.getState
          const next = rt.bumpReducer(prev, { _tag: 'bump', payload: mutateRoots } as any)
          yield* moduleScope.setState(next)

          // Force full scheduling via dirtyAll to compare per-txn converge cost with time-slicing on/off.
          Logix.InternalContracts.recordStatePatch(moduleScope, '*', 'perf')
        }),
    )
  }) as Effect.Effect<void, never, any>

export const runConvergeTimeSlicingTxnCommitDirtyAllWithDiagnosticsLevel = (
  rt: ConvergeTimeSlicingRuntime,
  mutateRoots: number,
  diagnosticsLevel: DiagnosticsLevel,
): Effect.Effect<void, never, any> =>
  runConvergeTimeSlicingTxnCommitDirtyAll(rt, mutateRoots).pipe(
    Effect.locally(Logix.Debug.internal.currentDiagnosticsLevel, diagnosticsLevel),
  )
