import { Effect, Layer, Schema } from 'effect'
import * as Logix from '@logixjs/core'
import { makePerfKernelLayer, silentDebugLayer } from './harness.js'

export type DispatchShellEntrypointMode = 'reuseScope' | 'resolveEach'

export type DispatchShellControlPlane = {
  readonly tuningId?: string
}

const readDispatchShellControlPlaneFromEnv = (): DispatchShellControlPlane => ({
  tuningId:
    typeof import.meta.env.VITE_LOGIX_PERF_TUNING_ID === 'string' &&
    import.meta.env.VITE_LOGIX_PERF_TUNING_ID.trim().length > 0
      ? import.meta.env.VITE_LOGIX_PERF_TUNING_ID.trim()
      : undefined,
})

export type DispatchShellRuntime = {
  readonly module: any
  readonly runtime: ReturnType<typeof Logix.Runtime.make>
}

export const makeDispatchShellRuntime = (stateWidth: number): DispatchShellRuntime => {
  const fields: Record<string, unknown> = {}
  for (let i = 0; i < stateWidth; i++) {
    fields[`f${i}`] = Schema.Number
  }

  const State = Schema.Struct(fields as any)
  const Actions = {
    bump: Schema.Void,
  }

  const bumpReducer = Logix.Module.Reducer.mutate((draft: any) => {
    draft.f0 = (draft.f0 as number) + 1
  })

  const M = Logix.Module.make(`PerfDispatchShell${stateWidth}`, {
    state: State as any,
    actions: Actions,
    reducers: { bump: bumpReducer } as any,
  })

  const initial: Record<string, number> = {}
  for (let i = 0; i < stateWidth; i++) {
    initial[`f${i}`] = 0
  }

  const impl = M.implement({
    initial: initial as any,
    logics: [],
  })

  const controlPlane = readDispatchShellControlPlaneFromEnv()

  const runtime = Logix.Runtime.make(impl, {
    stateTransaction: {
      instrumentation: 'light',
    },
    layer: Layer.mergeAll(silentDebugLayer, makePerfKernelLayer()) as Layer.Layer<any, never, never>,
    label: [
      `perf:dispatch-shell:${stateWidth}`,
      controlPlane.tuningId ? `tuning:${controlPlane.tuningId}` : undefined,
    ]
      .filter(Boolean)
      .join(' '),
  })

  return {
    module: M as any,
    runtime,
  }
}

export const runDispatchShellSample = (
  rt: DispatchShellRuntime,
  entrypointMode: DispatchShellEntrypointMode,
  iterations: number,
): Effect.Effect<void, never, any> =>
  Effect.gen(function* () {
    if (entrypointMode === 'reuseScope') {
      const moduleScope = (yield* Effect.service(rt.module.tag).pipe(Effect.orDie)) as any
      for (let i = 0; i < iterations; i++) {
        yield* moduleScope.dispatch({ _tag: 'bump' } as any)
      }
      return
    }

    for (let i = 0; i < iterations; i++) {
      const moduleScope = (yield* Effect.service(rt.module.tag).pipe(Effect.orDie)) as any
      yield* moduleScope.dispatch({ _tag: 'bump' } as any)
    }
  }) as Effect.Effect<void, never, any>
