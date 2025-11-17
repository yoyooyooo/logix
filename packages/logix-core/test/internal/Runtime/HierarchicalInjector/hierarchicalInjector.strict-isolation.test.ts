import { describe, it, expect } from 'vitest'
import { Effect, Layer, ManagedRuntime, Schema } from 'effect'
import * as Logix from '../../../../src/index.js'
import * as BoundApiRuntime from '../../../../src/internal/runtime/BoundApiRuntime.js'

describe('HierarchicalInjector strict isolation', () => {
  it('does not fall back to process-level runtimeRegistry from other roots', async () => {
    const Child = Logix.Module.make('HierStrictChild', {
      state: Schema.Struct({ ok: Schema.Boolean }),
      actions: { noop: Schema.Void },
    })

    const Parent = Logix.Module.make('HierStrictParent', {
      state: Schema.Struct({ ok: Schema.Boolean }),
      actions: { noop: Schema.Void },
    })

    const otherRoot = ManagedRuntime.make(Child.live({ ok: true }).pipe(Layer.mergeAll))
    const parentRoot = ManagedRuntime.make(Parent.live({ ok: true }).pipe(Layer.mergeAll))

    try {
      // 在“另一个 root”里先构造一次 Child runtime，让其进入进程级 registry。
      // 现状：BoundApi $.use(Child) 可能会回退到这里，导致跨 root 串实例。
      otherRoot.runSync(Child.tag)

      const parentRuntime = parentRoot.runSync(Parent.tag) as Logix.ModuleRuntime<any, any>

      const $ = BoundApiRuntime.make(Parent.shape as any, parentRuntime as any, {
        moduleId: Parent.id,
        getPhase: () => 'run',
      }) as any

      const exit = await Effect.runPromiseExit($.use(Child))

      // 008 期望：strict 默认下，缺失提供者必须失败，不得回退到进程级 registry。
      expect(exit._tag).toBe('Failure')
      if (exit._tag !== 'Failure') return

      const pretty = String((exit.cause as any)?.pretty ?? exit.cause)
      expect(pretty).toContain('MissingModuleRuntimeError')
      expect(pretty).toContain('tokenId: HierStrictChild')
      expect(pretty).toContain('from: HierStrictParent')
      expect(pretty).toContain('fix:')
      expect(pretty).toContain('imports: [HierStrictChild.impl]')
    } finally {
      await otherRoot.dispose()
      await parentRoot.dispose()
    }
  })
})
