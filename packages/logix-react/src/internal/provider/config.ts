import { Config, Context, Effect, Layer, Option } from 'effect'

export interface ReactRuntimeConfigShape {
  readonly gcTime: number
  readonly initTimeoutMs?: number
  readonly lowPriorityDelayMs?: number
  readonly lowPriorityMaxDelayMs?: number
}

export interface ReactConfigSnapshot {
  readonly gcTime: number
  readonly initTimeoutMs: number | undefined
  readonly lowPriorityDelayMs: number
  readonly lowPriorityMaxDelayMs: number
  readonly source: 'runtime' | 'config' | 'default'
}

// Runtime-grade Config Tag for overriding default React runtime behavior via Layer.
export class ReactRuntimeConfigTag extends Context.Tag('@logix/react/RuntimeConfig')<
  ReactRuntimeConfigTag,
  ReactRuntimeConfigShape
>() {}

const DEFAULT_CONFIG: ReactRuntimeConfigShape = {
  gcTime: 500,
  initTimeoutMs: undefined,
  lowPriorityDelayMs: 16,
  lowPriorityMaxDelayMs: 50,
}

export const DEFAULT_CONFIG_SNAPSHOT: ReactConfigSnapshot = {
  gcTime: DEFAULT_CONFIG.gcTime,
  initTimeoutMs: DEFAULT_CONFIG.initTimeoutMs,
  lowPriorityDelayMs: DEFAULT_CONFIG.lowPriorityDelayMs ?? 16,
  lowPriorityMaxDelayMs: DEFAULT_CONFIG.lowPriorityMaxDelayMs ?? 50,
  source: 'default',
}

// Effect-native config helper: callers can inject override config via RuntimeProvider.layer.
export const ReactRuntimeConfig = {
  tag: ReactRuntimeConfigTag,

  /**
   * Overlays a partial config on top of the current config, similar to Logger.replace:
   * - If Env already contains ReactRuntimeConfigTag, merge partial on top of it.
   * - Otherwise, use DEFAULT_CONFIG as the base.
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
   * Default gcTime (ms) used as the idle keep-alive time for ModuleCache.
   * - Applies when not explicitly specified in useModule(options.gcTime).
   * - Default: 500ms (StrictMode jitter protection).
   */
  gcTime: Config.number('logix.react.gc_time').pipe(Config.withDefault(DEFAULT_CONFIG.gcTime)),

  /**
   * Default init timeout (ms), only effective when suspend:true.
   * - Uses Option<number> to represent "optional config": missing means init timeout is disabled.
   * - Callers can map Option.none to undefined.
   */
  initTimeoutMs: Config.option(Config.number('logix.react.init_timeout_ms')),

  /**
   * Delay (ms) for low-priority notification scheduling.
   * - Roughly "defer to the next frame" cadence (default 16ms).
   */
  lowPriorityDelayMs: Config.number('logix.react.low_priority_delay_ms').pipe(
    Config.withDefault(DEFAULT_CONFIG.lowPriorityDelayMs ?? 16),
  ),

  /**
   * Maximum delay upper bound (ms) for low-priority notification scheduling.
   * - Ensures eventual delivery, avoiding indefinite coalescing under extreme high-frequency scenarios.
   * - Default 50ms.
   */
  lowPriorityMaxDelayMs: Config.number('logix.react.low_priority_max_delay_ms').pipe(
    Config.withDefault(DEFAULT_CONFIG.lowPriorityMaxDelayMs ?? 50),
  ),
}

/**
 * React module-runtime-related config keys.
 *
 * - Internal to @logix/react; not exposed as public API.
 * - Callers provide values via ConfigProvider (fromEnv/fromMap, etc.).
 * - If missing, use defaults defined here or treat as "disabled".
 */
export const ReactModuleConfig = {
  gcTime: Effect.gen(function* () {
    // 1) Allow overriding defaults via ReactRuntimeConfigTag (RuntimeProvider.layer approach).
    const override = yield* Effect.serviceOption(ReactRuntimeConfigTag)
    if (Option.isSome(override)) {
      return override.value.gcTime
    }
    // 2) Otherwise, fall back to values provided by ConfigProvider (env/config).
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

  lowPriorityDelayMs: Effect.gen(function* () {
    const override = yield* Effect.serviceOption(ReactRuntimeConfigTag)
    if (Option.isSome(override)) {
      return override.value.lowPriorityDelayMs ?? DEFAULT_CONFIG.lowPriorityDelayMs ?? 16
    }
    const value = yield* ReactModuleConfigFromEnv.lowPriorityDelayMs
    return value
  }),

  lowPriorityMaxDelayMs: Effect.gen(function* () {
    const override = yield* Effect.serviceOption(ReactRuntimeConfigTag)
    if (Option.isSome(override)) {
      return override.value.lowPriorityMaxDelayMs ?? DEFAULT_CONFIG.lowPriorityMaxDelayMs ?? 50
    }
    const value = yield* ReactModuleConfigFromEnv.lowPriorityMaxDelayMs
    return value
  }),
}

export const ReactRuntimeConfigSnapshot = {
  load: Effect.gen(function* () {
    const runtimeOverride = yield* Effect.serviceOption(ReactRuntimeConfigTag)
    if (Option.isSome(runtimeOverride)) {
      return {
        gcTime: runtimeOverride.value.gcTime,
        initTimeoutMs: runtimeOverride.value.initTimeoutMs,
        lowPriorityDelayMs: runtimeOverride.value.lowPriorityDelayMs ?? DEFAULT_CONFIG.lowPriorityDelayMs ?? 16,
        lowPriorityMaxDelayMs:
          runtimeOverride.value.lowPriorityMaxDelayMs ?? DEFAULT_CONFIG.lowPriorityMaxDelayMs ?? 50,
        source: 'runtime',
      }
    }

    const envGcTime = yield* ReactModuleConfigFromEnv.gcTime
    const envInitTimeoutOpt = yield* ReactModuleConfigFromEnv.initTimeoutMs
    const envInitTimeout = Option.getOrUndefined(envInitTimeoutOpt)
    const envLowPriorityDelayMs = yield* ReactModuleConfigFromEnv.lowPriorityDelayMs
    const envLowPriorityMaxDelayMs = yield* ReactModuleConfigFromEnv.lowPriorityMaxDelayMs
    const fromConfig =
      envGcTime !== DEFAULT_CONFIG.gcTime ||
      Option.isSome(envInitTimeoutOpt) ||
      envLowPriorityDelayMs !== (DEFAULT_CONFIG.lowPriorityDelayMs ?? 16) ||
      envLowPriorityMaxDelayMs !== (DEFAULT_CONFIG.lowPriorityMaxDelayMs ?? 50)

    if (fromConfig) {
      return {
        gcTime: envGcTime,
        initTimeoutMs: envInitTimeout,
        lowPriorityDelayMs: envLowPriorityDelayMs,
        lowPriorityMaxDelayMs: envLowPriorityMaxDelayMs,
        source: 'config',
      }
    }

    return DEFAULT_CONFIG_SNAPSHOT
  }),
}
