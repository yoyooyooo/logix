import { describe, it, expect } from 'vitest'
import { Context, Effect, Schema } from 'effect'
import * as Logix from '../../src/index.js'

describe('BoundApi $.root.resolve', () => {
  it('keeps strict default; resolves from root provider; ignores override; isolates trees', async () => {
    const Global = Logix.Module.make('BoundApiRootResolveSugarGlobal', {
      state: Schema.Struct({ ok: Schema.Boolean }),
      actions: { noop: Schema.Void },
    })

    const GlobalImpl = Global.implement({ initial: { ok: true } }).impl

    const AppB = Logix.Module.make('BoundApiRootResolveSugarAppB', {
      state: Schema.Struct({ ok: Schema.Boolean }),
      actions: { noop: Schema.Void },
    })
    const AppBImpl = AppB.implement({
      initial: { ok: true },
      imports: [GlobalImpl],
    }).impl

    const runtimeB = Logix.Runtime.make(AppBImpl)
    const globalB = runtimeB.runSync(Global.tag) as Logix.ModuleRuntime<any, any>

    class MissingTag extends Context.Tag('@test/BoundApiRootResolveSugar/MissingTag')<
      MissingTag,
      { readonly ok: boolean }
    >() {}

    type Result = {
      readonly strictPretty: string
      readonly missingPretty: string
      readonly resolved: Logix.ModuleRuntime<any, any>
      readonly resolvedWithOverride: Logix.ModuleRuntime<any, any>
    }

    let resolveResult!: (r: Result) => void
    const resultP = new Promise<Result>((resolve) => {
      resolveResult = resolve
    })

    const Parent = Logix.Module.make('BoundApiRootResolveSugarParent', {
      state: Schema.Struct({ ok: Schema.Boolean }),
      actions: { noop: Schema.Void },
    })

    const parentLogic = Parent.logic(($) => {
      $.lifecycle.onStart(
        Effect.gen(function* () {
          const strictExit = yield* Effect.exit($.use(Global))
          const strictPretty =
            strictExit._tag === 'Failure'
              ? String(((strictExit as any).cause as any)?.pretty ?? (strictExit as any).cause)
              : 'Success'

          const resolved = yield* $.root.resolve(Global.tag)
          const resolvedWithOverride = yield* $.root
            .resolve(Global.tag)
            .pipe(Effect.provideService(Global.tag, globalB as any))

          const missingExit = yield* Effect.exit($.root.resolve(MissingTag))
          const missingPretty =
            missingExit._tag === 'Failure'
              ? String(((missingExit as any).cause as any)?.pretty ?? (missingExit as any).cause)
              : 'Success'

          yield* Effect.sync(() => {
            resolveResult({
              strictPretty,
              missingPretty,
              resolved,
              resolvedWithOverride,
            })
          })
        }),
      )

      return Effect.void
    })

    const ParentImpl = Parent.implement({ initial: { ok: true }, logics: [parentLogic] }).impl

    const AppA = Logix.Module.make('BoundApiRootResolveSugarAppA', {
      state: Schema.Struct({ ok: Schema.Boolean }),
      actions: { noop: Schema.Void },
    })
    const AppAImpl = AppA.implement({
      initial: { ok: true },
      imports: [ParentImpl, GlobalImpl],
    }).impl

    const runtimeA = Logix.Runtime.make(AppAImpl)
    const globalA = runtimeA.runSync(Global.tag) as Logix.ModuleRuntime<any, any>

    try {
      const result = await resultP

      expect(result.strictPretty).toContain('MissingModuleRuntimeError')
      expect(result.resolved).toBe(globalA)
      expect(result.resolvedWithOverride).toBe(globalA)
      expect(result.resolvedWithOverride).not.toBe(globalB)

      expect(result.missingPretty).toContain('MissingRootProviderError')
      expect(result.missingPretty).toContain('entrypoint: logic.$.root.resolve')
    } finally {
      await runtimeA.dispose()
      await runtimeB.dispose()
    }
  })
})
