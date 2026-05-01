import { describe, it, expect } from 'vitest'
import {Effect, Layer, Schema, ServiceMap } from 'effect'
import * as Logix from '../../../src/index.js'
import * as Root from '../../../src/internal/root.js'

describe('HierarchicalInjector root provider', () => {
  it('Root.resolve(ServiceTag) ignores local overrides', async () => {
    interface TestService {
      readonly value: string
    }

    class TestServiceTag extends ServiceMap.Service<TestServiceTag, TestService>()('@test/HierarchicalInjectorRootProvider/Service') {}

    const RootModule = Logix.Module.make('HierRootProviderModule', {
      state: Schema.Struct({ ok: Schema.Boolean }),
      actions: { noop: Schema.Void },
    })

    const RootProgram = Logix.Program.make(RootModule, { initial: { ok: true } })

    const runtime = Logix.Runtime.make(RootProgram, {
      layer: Layer.succeed(TestServiceTag, { value: 'root' }),
    })

    try {
      const value = runtime.runSync(
        Root.resolve(TestServiceTag).pipe(Effect.provideService(TestServiceTag, { value: 'override' })),
      )
      expect(value.value).toBe('root')
    } finally {
      await runtime.dispose()
    }
  })

  it('Root.resolve(ModuleTag) ignores local overrides', async () => {
    const M = Logix.Module.make('HierRootProviderModuleTag', {
      state: Schema.Struct({ ok: Schema.Boolean }),
      actions: { noop: Schema.Void },
    })

    const Program = Logix.Program.make(M, { initial: { ok: true } })
    const rootRuntime = Logix.Runtime.make(Program)
    const otherTree = Logix.Runtime.make(Program)

    try {
      const rootSingleton = rootRuntime.runSync(Effect.service(M.tag).pipe(Effect.orDie)) as Logix.ModuleRuntime<any, any>
      const otherSingleton = otherTree.runSync(Effect.service(M.tag).pipe(Effect.orDie)) as Logix.ModuleRuntime<any, any>

      const resolved = rootRuntime.runSync(
        Root.resolve(M.tag).pipe(Effect.provideService(M.tag, otherSingleton as any)),
      ) as Logix.ModuleRuntime<any, any>

      expect(resolved).toBe(rootSingleton)
      expect(resolved).not.toBe(otherSingleton)
    } finally {
      await otherTree.dispose()
      await rootRuntime.dispose()
    }
  })
})
