import * as CoreDebug from '@logixjs/core/repo-internal/debug-api'
import * as FieldContracts from '@logixjs/core/repo-internal/field-contracts'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '@logixjs/core'
import { makePerfKernelLayer, silentDebugLayer } from './harness.js'

export type DiagnosticsLevel = CoreDebug.DiagnosticsLevel

export type ConvergeControlPlane = {
  readonly fieldConvergeBudgetMs?: number
  readonly fieldConvergeDecisionBudgetMs?: number
  readonly tuningId?: string
}

const parsePositiveNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0 ? value : undefined
  }
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return undefined
    const n = Number(trimmed)
    return Number.isFinite(n) && n > 0 ? n : undefined
  }
  return undefined
}

export const readConvergeControlPlaneFromEnv = (): ConvergeControlPlane => ({
  fieldConvergeBudgetMs: parsePositiveNumber(import.meta.env.VITE_LOGIX_TRAIT_CONVERGE_BUDGET_MS),
  fieldConvergeDecisionBudgetMs: parsePositiveNumber(import.meta.env.VITE_LOGIX_TRAIT_CONVERGE_DECISION_BUDGET_MS),
  tuningId:
    typeof import.meta.env.VITE_LOGIX_PERF_TUNING_ID === 'string' &&
    import.meta.env.VITE_LOGIX_PERF_TUNING_ID.trim().length > 0
      ? import.meta.env.VITE_LOGIX_PERF_TUNING_ID.trim()
      : undefined,
})

export type ConvergeRuntime = {
  readonly module: any
  readonly runtime: ReturnType<typeof Logix.Runtime.make>
  readonly bumpReducer: (state: any, action: any) => any
  readonly bumpByIndices: (state: any, indices: ReadonlyArray<number>) => any
  readonly getLastConvergeDecision: () => unknown | undefined
  readonly clearLastConvergeDecision: () => void
}

export const makeConvergeRuntime = (
  steps: number,
  convergeMode: 'full' | 'dirty' | 'auto',
  options?: { readonly captureDecision?: boolean },
): ConvergeRuntime => {
  const fields: Record<string, unknown> = {}
  for (let i = 0; i < steps; i++) {
    fields[`b${i}`] = Schema.Number
    fields[`d${i}`] = Schema.Number
  }

  const State = Schema.Struct(fields as any)

  const Actions = {
    bump: Schema.Number,
  }

  const bumpReducer = Logix.Module.Reducer.mutate((draft, dirtyRoots: number) => {
    for (let i = 0; i < dirtyRoots; i++) {
      const k = `b${i}`
      ;(draft as any)[k] += 1
    }
  })

  const fieldDeclarations: Record<string, unknown> = {}
  for (let i = 0; i < steps; i++) {
    fieldDeclarations[`d${i}`] = FieldContracts.fieldComputed<any, any, any>({
      deps: [`b${i}`] as any,
      get: (value: any) => (value as number) + 1,
    }) as any
  }

  const M = FieldContracts.withModuleFieldDeclarations(Logix.Module.make(`PerfConvergeSteps${steps}`, {
  state: State as any,
  actions: Actions,
  reducers: { bump: bumpReducer } as any
}), FieldContracts.fieldFrom(State as any)(fieldDeclarations as any) as any)

  const initial: Record<string, number> = {}
  for (let i = 0; i < steps; i++) {
    initial[`b${i}`] = 0
    initial[`d${i}`] = 1
  }

  const program = Logix.Program.make(M, {
    initial: initial as any,
    logics: [],
  })

  const bumpByIndicesReducer = Logix.Module.Reducer.mutate((draft: any, indices: ReadonlyArray<number>) => {
    for (const idx of indices) {
      const k = `b${idx}`
      draft[k] = (draft[k] as number) + 1
    }
  })

  const bumpByIndices = (state: any, indices: ReadonlyArray<number>): any =>
    bumpByIndicesReducer(state, { _tag: 'bumpIndices', payload: indices } as any)

  let lastDecision: unknown | undefined
  const clearLastConvergeDecision = (): void => {
    lastDecision = undefined
  }
  const getLastConvergeDecision = (): unknown | undefined => lastDecision

  const captureSink: CoreDebug.Sink = {
    record: (event: CoreDebug.Event) => {
      if (event.type !== 'state:update') return Effect.void
      const decision = (event as any)?.fieldSummary?.converge
      if (decision != null) {
        lastDecision = decision
      }
      return Effect.void
    },
  }

  const debugLayer = options?.captureDecision
    ? (CoreDebug.replace([captureSink]) as Layer.Layer<any, never, never>)
    : (silentDebugLayer as Layer.Layer<any, never, never>)

  const perfKernelLayer = makePerfKernelLayer()
  const controlPlane = readConvergeControlPlaneFromEnv()

  const runtime = Logix.Runtime.make(program, {
    stateTransaction: {
      instrumentation: 'light',
      fieldConvergeMode: convergeMode,
      fieldConvergeBudgetMs: controlPlane.fieldConvergeBudgetMs,
      fieldConvergeDecisionBudgetMs: controlPlane.fieldConvergeDecisionBudgetMs,
    },
    layer: Layer.mergeAll(debugLayer, perfKernelLayer) as Layer.Layer<any, never, never>,
    label: [
      `perf:converge:${convergeMode}:${steps}`,
      controlPlane.tuningId ? `tuning:${controlPlane.tuningId}` : undefined,
    ]
      .filter(Boolean)
      .join(' '),
  })

  return {
    module: M as any,
    runtime,
    bumpReducer,
    bumpByIndices,
    getLastConvergeDecision,
    clearLastConvergeDecision,
  }
}

export const runConvergeTxnCommit = (rt: ConvergeRuntime, dirtyRoots: number): Effect.Effect<void, never, any> =>
  Effect.gen(function* () {
    const moduleScope = (yield* Effect.service(rt.module.tag).pipe(Effect.orDie)) as any
    yield* moduleScope.dispatch({ _tag: 'bump', payload: dirtyRoots } as any)
  }) as Effect.Effect<void, never, any>

export const runConvergeTxnCommitWithDiagnosticsLevel = (
  rt: ConvergeRuntime,
  dirtyRoots: number,
  diagnosticsLevel: DiagnosticsLevel,
): Effect.Effect<void, never, any> =>
  runConvergeTxnCommit(rt, dirtyRoots).pipe(
    (effect) => Effect.provideService(effect, CoreDebug.internal.currentDiagnosticsLevel, diagnosticsLevel),
  )
