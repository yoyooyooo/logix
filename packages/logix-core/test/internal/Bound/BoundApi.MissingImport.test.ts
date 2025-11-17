import { describe, it, expect } from 'vitest'
import { Effect, Layer, ManagedRuntime, Schema } from 'effect'
import * as Logix from '../../../src/index.js'
import * as BoundApiRuntime from '../../../src/internal/runtime/BoundApiRuntime.js'

describe('BoundApi $.use missing import', () => {
  it('throws a readable dev error when sub-module is not provided', async () => {
    const Child = Logix.Module.make('BoundApiMissingImportChild', {
      state: Schema.Struct({ ok: Schema.Boolean }),
      actions: { noop: Schema.Void },
    })

    const Parent = Logix.Module.make('BoundApiMissingImportParent', {
      state: Schema.Struct({ ok: Schema.Boolean }),
      actions: { noop: Schema.Void },
    })

    const app = ManagedRuntime.make(Parent.live({ ok: true }).pipe(Layer.mergeAll))
    const parentRuntime = app.runSync(Parent.tag) as Logix.ModuleRuntime<any, any>

    const $ = BoundApiRuntime.make(Parent.shape as any, parentRuntime as any, {
      moduleId: Parent.id,
      getPhase: () => 'run',
    }) as any

    const exit = await Effect.runPromiseExit($.use(Child))

    expect(exit._tag).toBe('Failure')
    if (exit._tag !== 'Failure') return

    // 这里只断言关键内容，避免依赖 effect 的 Cause 展示细节。
    const pretty = String((exit.cause as any)?.pretty ?? exit.cause)
    expect(pretty).toContain('MissingModuleRuntimeError')
    expect(pretty).toContain('tokenId: BoundApiMissingImportChild')
    expect(pretty).toContain('entrypoint: logic.$.use')
    expect(pretty).toContain('mode: strict')
    expect(pretty).toContain('from: BoundApiMissingImportParent')
    expect(pretty).toContain('fix:')
    expect(pretty).toContain('imports: [BoundApiMissingImportChild.impl]')
  })
})
