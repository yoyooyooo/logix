// 简化版 Effect 类型与 Env/Layer 抽象，用于 PoC。
// 实际项目中可以替换为 effect-ts 的 Effect/Layer。

export type Effect<R, E, A> = (env: R) => Promise<A>

export type Layer<R> = () => Promise<R>

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

