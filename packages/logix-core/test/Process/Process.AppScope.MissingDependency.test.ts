import { describe, it, expect } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '../../src/index.js'

describe('process: app-scope missing dependency', () => {
  it.scoped('should fail with actionable error when dependency is missing in scope', () =>
    Effect.gen(function* () {
      const SourceModule = Logix.Module.make('ProcessMissingDepSource', {
        state: Schema.Void,
        actions: {},
      })

      const TargetModule = Logix.Module.make('ProcessMissingDepTarget', {
        state: Schema.Void,
        actions: {},
      })

      const processId = [SourceModule.id, TargetModule.id].sort().join('~')
      const Proc = Logix.Process.link({ modules: [SourceModule, TargetModule] as const }, () => Effect.void)

      const RootModule = Logix.Module.make('ProcessMissingDepRoot', {
        state: Schema.Void,
        actions: {},
      })

      // 故意只装配 SourceModule，不装配 TargetModule，验证 strict scope 缺失依赖报错。
      const RootImpl = RootModule.implement({
        initial: undefined,
        imports: [SourceModule.implement({ initial: undefined }).impl],
        processes: [Proc],
      })

      const runtime = Logix.Runtime.make(RootImpl, {
        layer: Layer.empty as Layer.Layer<any, never, never>,
      })

      const events = (yield* Effect.promise(() =>
        runtime.runPromise(Logix.InternalContracts.getProcessEvents() as any),
      )) as ReadonlyArray<Logix.Process.ProcessEvent>

      const errorEvent = events.find((e) => e.type === 'process:error')
      expect(errorEvent).toBeTruthy()
      expect(errorEvent?.identity.identity.processId).toBe(processId)
      expect(errorEvent?.error?.code).toBe('process::missing_dependency')
      expect(errorEvent?.error?.message).toContain(TargetModule.id)
      expect(errorEvent?.error?.hint).toContain('Strict scope')
    }),
  )
})
