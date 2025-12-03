import { describe, it, expect } from "vitest"
import { Context, Effect, Layer, Schema } from "effect"
import * as Logix from "../src/index.js"
import * as AppRuntime from "../src/runtime/AppRuntime.js"

describe("AppRuntime.makeApp · TagIndex & module config", () => {
  const ServiceTag = Context.GenericTag<"Service", { readonly id: string }>("Service")

  const makeTestModule = (id: string) =>
    Logix.Logix.Module(id, {
      state: Schema.Struct({ value: Schema.Number }),
      actions: {
        inc: Schema.Void,
      },
    })

  it("fails when two AppModuleEntry share the same Module id", () => {
    const Mod = makeTestModule("Dup")

    const live = Mod.live({ value: 0 })

    const config: AppRuntime.LogixAppConfig<never> = {
      layer: Layer.empty as Layer.Layer<never, never, never>,
      modules: [
        AppRuntime.provide(Mod, live),
        AppRuntime.provide(Mod, live),
      ],
      processes: [],
    }

    expect(() => AppRuntime.makeApp(config)).toThrowError(
      /\[Logix\] Duplicate Module ID\/Tag detected: "Dup"/,
    )
  })

  it("fails fast on Tag collision when the same ServiceTag is owned by multiple modules", () => {
    const ModA = makeTestModule("A")
    const ModB = makeTestModule("B")

    const liveA = ModA.live({ value: 1 })
    const liveB = ModB.live({ value: 2 })

    const config: AppRuntime.LogixAppConfig<never> = {
      layer: Layer.empty as Layer.Layer<never, never, never>,
      modules: [
        AppRuntime.provideWithTags(ModA, liveA, [ServiceTag]),
        AppRuntime.provideWithTags(ModB, liveB, [ServiceTag]),
      ],
      processes: [],
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      AppRuntime.makeApp(config)
      throw new Error("expected TagCollisionError, but makeApp succeeded")
    } catch (error: any) {
      expect(error).toBeInstanceOf(Error)
      expect(error.message).toMatch(/Tag collision detected/)
      // 自定义错误标记与 payload，方便 DevTools / 调试使用
      expect(error._tag).toBe("TagCollisionError")
      expect(Array.isArray(error.collisions)).toBe(true)
      const owners = new Set(
        error.collisions.flatMap((c: any) =>
          c.conflicts.map((i: any) => i.ownerModuleId),
        ),
      )
      expect(owners.has("A")).toBe(true)
      expect(owners.has("B")).toBe(true)
    }
  })
})

