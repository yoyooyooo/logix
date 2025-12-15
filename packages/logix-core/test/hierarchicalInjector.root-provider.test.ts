import { describe, it, expect } from "vitest"
import { Context, Effect, Layer, Schema } from "effect"
import * as Logix from "../src/index.js"

describe("HierarchicalInjector root provider", () => {
  it("Root.resolve(ServiceTag) ignores local overrides", async () => {
    interface TestService {
      readonly value: string
    }

    class TestServiceTag extends Context.Tag(
      "@test/HierarchicalInjectorRootProvider/Service",
    )<TestServiceTag, TestService>() {}

    const RootModule = Logix.Module.make("HierRootProviderModule", {
      state: Schema.Struct({ ok: Schema.Boolean }),
      actions: { noop: Schema.Void },
    })

    const RootImpl = RootModule.implement({ initial: { ok: true } })

    const runtime = Logix.Runtime.make(RootImpl, {
      layer: Layer.succeed(TestServiceTag, { value: "root" }),
    })

    try {
      const value = runtime.runSync(
        Logix.Root.resolve(TestServiceTag).pipe(
          Effect.provideService(TestServiceTag, { value: "override" }),
        ),
      )
      expect(value.value).toBe("root")
    } finally {
      await runtime.dispose()
    }
  })

  it("Root.resolve(ModuleTag) ignores local overrides", async () => {
    const M = Logix.Module.make("HierRootProviderModuleTag", {
      state: Schema.Struct({ ok: Schema.Boolean }),
      actions: { noop: Schema.Void },
    })

    const Impl = M.implement({ initial: { ok: true } })
    const rootRuntime = Logix.Runtime.make(Impl)
    const otherTree = Logix.Runtime.make(Impl)

    try {
      const rootSingleton = rootRuntime.runSync(M as any) as Logix.ModuleRuntime<
        any,
        any
      >
      const otherSingleton = otherTree.runSync(M as any) as Logix.ModuleRuntime<
        any,
        any
      >

      const resolved = rootRuntime.runSync(
        Logix.Root.resolve(M as any).pipe(
          Effect.provideService(M as any, otherSingleton as any),
        ),
      ) as Logix.ModuleRuntime<any, any>

      expect(resolved).toBe(rootSingleton)
      expect(resolved).not.toBe(otherSingleton)
    } finally {
      await otherTree.dispose()
      await rootRuntime.dispose()
    }
  })
})

