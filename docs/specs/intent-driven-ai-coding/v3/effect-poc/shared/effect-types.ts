// Effect v3 类型别名与 Env 抽象。
// 泛型顺序与 effect-ts v3 保持一致：Effect<A, E, R>。
// 同时保留一个 Reader 风格的 EnvEffect，方便逐步迁移旧代码。

import { Effect as EffectNS, Layer as LayerNS } from 'effect'

// 真实 Effect 类型（A / E / R）
export type Effect<A, E = never, R = never> = EffectNS.Effect<A, E, R>

// 真实 Layer 类型：Layer<ROut, E, RIn>
export type Layer<ROut, E = never, RIn = never> = LayerNS.Layer<ROut, E, RIn>

// 仅用于 PoC 的 Reader 风格 Effect：(env: R) => Promise<A>
export type EnvEffect<A, E = never, R = never> = (env: R) => Promise<A>

export interface Logger {
  info: (msg: string, meta?: Record<string, unknown>) => void
  error: (msg: string, meta?: Record<string, unknown>) => void
}

export interface Clock {
  now: () => Date
}

export interface BasePlatformEnv {
  logger: Logger
  clock: Clock
}
