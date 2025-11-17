import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Context, Effect, Exit, Layer, Scope, Schema } from 'effect'
import * as Logix from '../../src/index.js'
import * as ProcessRuntime from '../../src/internal/runtime/core/process/ProcessRuntime.js'

describe('process: moduleInstance missing dependency', () => {
  it.scoped('should not fall back to outer scope dependencies', () =>
    Effect.gen(function* () {
      const Host = Logix.Module.make('ProcessModuleInstanceMissingDepHost', {
        state: Schema.Void,
        actions: {},
      })

      const Dep = Logix.Module.make('ProcessModuleInstanceMissingDepTarget', {
        state: Schema.Void,
        actions: {},
      })

      const processId = [Host.id, Dep.id].sort().join('~')

      const Proc = Logix.Process.link({ modules: [Host, Dep] as const }, () => Effect.void)

      const DepImpl = Dep.implement({ initial: undefined })
      const HostImpl = Host.implement({
        initial: undefined,
        processes: [Proc],
      })

      const outerScope = yield* Scope.make()
      try {
        const outerLayer = Layer.provideMerge(ProcessRuntime.layer())(DepImpl.impl.layer)
        const outerEnv = yield* Layer.buildWithScope(outerLayer, outerScope)

        const processRuntime = Context.get(
          outerEnv as Context.Context<any>,
          ProcessRuntime.ProcessRuntimeTag as any,
        ) as ProcessRuntime.ProcessRuntime

        const innerScope = yield* Scope.make()
        try {
          const sharedProcessRuntimeLayer = Layer.succeed(
            ProcessRuntime.ProcessRuntimeTag as any,
            processRuntime,
          ) as Layer.Layer<any, never, never>

          const innerLayer = Layer.provideMerge(sharedProcessRuntimeLayer)(HostImpl.impl.layer)
          yield* Layer.buildWithScope(innerLayer, innerScope)
        } finally {
          yield* Scope.close(innerScope, Exit.succeed(undefined))
        }

        const events = yield* processRuntime.getEventsSnapshot()
        const errorEvent = events.find((e) => e.type === 'process:error')

        expect(errorEvent).toBeTruthy()
        expect(errorEvent?.identity.identity.processId).toBe(processId)
        expect(errorEvent?.error?.code).toBe('process::missing_dependency')
        expect(errorEvent?.error?.message).toContain(Dep.id)
        expect(errorEvent?.error?.hint).toContain('Strict scope')
      } finally {
        yield* Scope.close(outerScope, Exit.succeed(undefined))
      }
    }),
  )
})
