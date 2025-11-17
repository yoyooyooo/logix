import { Context, Effect, Layer, Schema } from 'effect'

import { TooManyRequestsError } from './auth.contract.js'

export type TooManyRequestsErrorDto = Schema.Schema.Type<typeof TooManyRequestsError>

export interface AuthRateLimitKey {
  readonly identifier?: string | undefined
  readonly ip?: string | undefined
}

export interface AuthRateLimitService {
  readonly check: (key: AuthRateLimitKey) => Effect.Effect<void, TooManyRequestsErrorDto>
  readonly recordFailure: (key: AuthRateLimitKey) => Effect.Effect<void>
  readonly recordSuccess: (key: AuthRateLimitKey) => Effect.Effect<void>
}

export class AuthRateLimit extends Context.Tag('AuthRateLimit')<AuthRateLimit, AuthRateLimitService>() {}

const readInt = (name: string, fallback: number): number => {
  const raw = process.env[name]
  if (!raw) return fallback
  const n = Number.parseInt(raw, 10)
  return Number.isFinite(n) ? n : fallback
}

const makeTooManyRequests = (): TooManyRequestsErrorDto => ({
  _tag: 'TooManyRequestsError',
  message: 'Too many login attempts, please try again later',
})

interface Counter {
  failures: number
  windowStartMs: number
  lockedUntilMs: number
}

export const AuthRateLimitLive: Layer.Layer<AuthRateLimit> = Layer.effect(
  AuthRateLimit,
  Effect.sync(() => {
    const windowMs = readInt('AUTH_LOGIN_RATE_WINDOW_MS', 60_000)
    const maxFailures = readInt('AUTH_LOGIN_RATE_MAX_FAILURES', 5)
    const lockMs = readInt('AUTH_LOGIN_RATE_LOCK_MS', 60_000)

    const counters = new Map<string, Counter>()

    const nowMs = (): number => Date.now()

    const mkKeys = (key: AuthRateLimitKey): ReadonlyArray<string> => {
      const keys: Array<string> = []
      if (key.identifier) keys.push(`ident:${key.identifier}`)
      if (key.ip) keys.push(`ip:${key.ip}`)
      return keys
    }

    const normalize = (counter: Counter, now: number): Counter => {
      if (counter.lockedUntilMs > now) return counter
      if (now - counter.windowStartMs <= windowMs) return counter
      return { failures: 0, windowStartMs: now, lockedUntilMs: 0 }
    }

    const check: AuthRateLimitService['check'] = (key) =>
      Effect.gen(function* () {
        const now = nowMs()
        for (const k of mkKeys(key)) {
          const counter = counters.get(k)
          if (!counter) continue
          const normalized = normalize(counter, now)
          counters.set(k, normalized)
          if (normalized.lockedUntilMs > now) {
            return yield* Effect.fail(makeTooManyRequests())
          }
        }
      })

    const recordFailure: AuthRateLimitService['recordFailure'] = (key) =>
      Effect.sync(() => {
        const now = nowMs()
        for (const k of mkKeys(key)) {
          const current = counters.get(k)
          const base: Counter = current
            ? normalize(current, now)
            : { failures: 0, windowStartMs: now, lockedUntilMs: 0 }
          const failures = base.failures + 1
          const lockedUntilMs = failures >= maxFailures ? now + lockMs : base.lockedUntilMs
          counters.set(k, { failures, windowStartMs: base.windowStartMs, lockedUntilMs })
        }
      })

    const recordSuccess: AuthRateLimitService['recordSuccess'] = (key) =>
      Effect.sync(() => {
        for (const k of mkKeys(key)) {
          counters.delete(k)
        }
      })

    return { check, recordFailure, recordSuccess } satisfies AuthRateLimitService
  }),
)
