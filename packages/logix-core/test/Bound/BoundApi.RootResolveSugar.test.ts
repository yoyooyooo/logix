import { describe, it, expect } from 'vitest'
import { Effect, Schema, ServiceMap } from 'effect'
import * as Logix from '../../src/index.js'

describe('BoundApi $.root.resolve', () => {
  it('keeps strict default; resolves from root provider; ignores override; isolates trees', async () => {
    const Global = Logix.Module.make('BoundApiRootResolveSugarGlobal', {
      state: Schema.Struct({ ok: Schema.Boolean }),
      actions: { noop: Schema.Void },
    })

    const GlobalProgram = Logix.Program.make(Global, { initial: { ok: true } })

    const AppB = Logix.Module.make('BoundApiRootResolveSugarAppB', {
      state: Schema.Struct({ ok: Schema.Boolean }),
      actions: { noop: Schema.Void },
    })
    const AppBProgram = Logix.Program.make(AppB, {
      initial: { ok: true },
      capabilities: { imports: [GlobalProgram] },
    })
    const runtimeB = Logix.Runtime.make(AppBProgram)
    const globalB = runtimeB.runSync(Effect.service(Global.tag).pipe(Effect.orDie)) as Logix.ModuleRuntime<any, any>

    class MissingTag extends ServiceMap.Service<MissingTag, { readonly ok: boolean }>()('@test/BoundApiRootResolveSugar/MissingTag') {}

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

    const parentLogic = Parent.logic('parent-logic', ($) =>
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

    const ParentProgram = Logix.Program.make(Parent, { initial: { ok: true }, logics: [parentLogic] })

    const AppA = Logix.Module.make('BoundApiRootResolveSugarAppA', {
      state: Schema.Struct({ ok: Schema.Boolean }),
      actions: { noop: Schema.Void },
    })
    const AppAProgram = Logix.Program.make(AppA, {
      initial: { ok: true },
      capabilities: { imports: [ParentProgram, GlobalProgram] },
    })
    const runtimeA = Logix.Runtime.make(AppAProgram)
    const globalA = runtimeA.runSync(Effect.service(Global.tag).pipe(Effect.orDie)) as Logix.ModuleRuntime<any, any>

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
