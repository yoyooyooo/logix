import { Config, Context, Effect, Layer, Option } from "effect"

export interface ReactRuntimeConfigShape {
  readonly gcTime: number
  readonly initTimeoutMs?: number
}

export interface ReactConfigSnapshot {
  readonly gcTime: number
  readonly initTimeoutMs: number | undefined
  readonly source: "runtime" | "config" | "default"
}

// Runtime-Grade Config Tag，用于通过 Layer 覆盖默认 React Runtime 行为。
export class ReactRuntimeConfigTag extends Context.Tag(
  "@logix/react/RuntimeConfig",
)<ReactRuntimeConfigTag, ReactRuntimeConfigShape>() {}

const DEFAULT_CONFIG: ReactRuntimeConfigShape = {
  gcTime: 500,
  initTimeoutMs: undefined,
}

export const DEFAULT_CONFIG_SNAPSHOT: ReactConfigSnapshot = {
  gcTime: DEFAULT_CONFIG.gcTime,
  initTimeoutMs: DEFAULT_CONFIG.initTimeoutMs,
  source: "default",
}

// Effect-Native 的配置 helper：调用方可以通过 RuntimeProvider.layer 注入覆盖配置。
export const ReactRuntimeConfig = {
  tag: ReactRuntimeConfigTag,

  /**
   * 在当前配置基础上叠加 partial，语义类似 Logger.replace：
   * - 若 Env 中已存在 ReactRuntimeConfigTag，则在其基础上合并 partial；
   * - 否则以 DEFAULT_CONFIG 作为基础。
   */
  replace(config: Partial<ReactRuntimeConfigShape>) {
    return Layer.effect(
      ReactRuntimeConfigTag,
      Effect.gen(function* () {
        const current = yield* Effect.serviceOption(ReactRuntimeConfigTag)
        const base = Option.isSome(current) ? current.value : DEFAULT_CONFIG
        return {
          ...base,
          ...config,
        }
      }),
    )
  },
}

const ReactModuleConfigFromEnv = {
  /**
   * 默认的 gcTime（毫秒），用于 ModuleCache 的闲置保活时间。
   * - 适用于未在 useModule(options.gcTime) 中显式指定的场景；
   * - 默认值：500ms（StrictMode 抖动保护）。
   */
  gcTime: Config.number("logix.react.gc_time").pipe(
    Config.withDefault(DEFAULT_CONFIG.gcTime),
  ),

  /**
   * 默认的初始化超时时间（毫秒），仅在 suspend:true 场景下生效。
   * - 使用 Option<number> 表达“可选配置”：缺省时视为未启用初始化超时；
   * - 调用方在使用时可将 Option.none 映射为 undefined。
   */
  initTimeoutMs: Config.option(
    Config.number("logix.react.init_timeout_ms"),
  ),
}

/**
 * React 模块运行时相关的配置键。
 *
 * - 仅供 @logix/react 内部使用，不作为公共 API 暴露；
 * - 调用方通过 ConfigProvider（fromEnv/fromMap 等）为这些键提供值；
 * - 未提供时使用这里定义的默认值或视为“未启用”。
 */
export const ReactModuleConfig = {
  gcTime: Effect.gen(function* () {
    // 1) 允许通过 ReactRuntimeConfigTag 覆盖默认配置（RuntimeProvider.layer 方式）。
    const override = yield* Effect.serviceOption(ReactRuntimeConfigTag)
    if (Option.isSome(override)) {
      return override.value.gcTime
    }
    // 2) 否则回退到 ConfigProvider（env/config）提供的值。
    const value = yield* ReactModuleConfigFromEnv.gcTime
    return value
  }),

  initTimeoutMs: Effect.gen(function* () {
    const override = yield* Effect.serviceOption(ReactRuntimeConfigTag)
    if (Option.isSome(override)) {
      const v = override.value.initTimeoutMs
      return v === undefined ? Option.none<number>() : Option.some(v)
    }
    const opt = yield* ReactModuleConfigFromEnv.initTimeoutMs
    return opt
  }),
}

export const ReactRuntimeConfigSnapshot = {
  load: Effect.gen(function* () {
    const runtimeOverride = yield* Effect.serviceOption(ReactRuntimeConfigTag)
    if (Option.isSome(runtimeOverride)) {
      return {
        gcTime: runtimeOverride.value.gcTime,
        initTimeoutMs: runtimeOverride.value.initTimeoutMs,
        source: "runtime",
      }
    }

    const envGcTime = yield* ReactModuleConfigFromEnv.gcTime
    const envInitTimeoutOpt = yield* ReactModuleConfigFromEnv.initTimeoutMs
    const envInitTimeout = Option.getOrUndefined(envInitTimeoutOpt)
    const fromConfig =
      envGcTime !== DEFAULT_CONFIG.gcTime || Option.isSome(envInitTimeoutOpt)

    if (fromConfig) {
      return {
        gcTime: envGcTime,
        initTimeoutMs: envInitTimeout,
        source: "config",
      }
    }

    return DEFAULT_CONFIG_SNAPSHOT
  }),
}
