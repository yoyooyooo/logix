import * as Effect from 'effect/Effect'

export type Fx<R, E, A> = Effect.Effect<R, E, A>

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

