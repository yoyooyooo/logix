import { describe, it, expect } from "vitest"
import { ConfigProvider, Effect, Layer, Option } from "effect"
import { ReactModuleConfig, ReactRuntimeConfig } from "../../src/internal/config.js"

describe("ReactModuleConfig (defaults)", () => {
  it("gcTime should default to 500ms when not configured", () => {
    const value = Effect.runSync(ReactModuleConfig.gcTime)
    expect(value).toBe(500)
  })

  it("initTimeoutMs should default to None (disabled) when not configured", () => {
    const opt = Effect.runSync(ReactModuleConfig.initTimeoutMs)
    expect(Option.isNone(opt)).toBe(true)
  })

  it("gcTime should respect ConfigProvider override", () => {
    const layer = Layer.setConfigProvider(
      ConfigProvider.fromMap(
        new Map<string, string>([["logix.react.gc_time", "1000"]]),
      ),
    )

    const value = Effect.runSync(
      ReactModuleConfig.gcTime.pipe(Effect.provide(layer)),
    )

    expect(value).toBe(1000)
  })

  it("initTimeoutMs should expose overridden timeout as Some(value)", () => {
    const layer = Layer.setConfigProvider(
      ConfigProvider.fromMap(
        new Map<string, string>([["logix.react.init_timeout_ms", "30000"]]),
      ),
    )

    const opt = Effect.runSync(
      ReactModuleConfig.initTimeoutMs.pipe(Effect.provide(layer)),
    )

    expect(Option.isSome(opt)).toBe(true)
    if (Option.isSome(opt)) {
      expect(opt.value).toBe(30000)
    }
  })

  it("ReactRuntimeConfig.replace should override existing config based on current value", () => {
    // 先通过 ConfigProvider 提供 gc_time = 800
    const envLayer = Layer.setConfigProvider(
      ConfigProvider.fromMap(
        new Map<string, string>([["logix.react.gc_time", "800"]]),
      ),
    )

    // replace 应在现有配置基础上覆盖 gcTime = 1200
    const overrideLayer = ReactRuntimeConfig.replace({ gcTime: 1200 })

    const value = Effect.runSync(
      ReactModuleConfig.gcTime.pipe(
        Effect.provide(Layer.mergeAll(envLayer, overrideLayer)),
      ),
    )

    expect(value).toBe(1200)
  })
})
