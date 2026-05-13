import { Effect } from 'effect'
import * as EffectOp from './effect-op.js'
import * as Debug from './debug-api.js'

export type Middleware = EffectOp.Middleware
export type MiddlewareStack = EffectOp.MiddlewareStack

export interface DebugLoggerConfig {
  readonly logger?: (op: EffectOp.EffectOp<any, any, any>) => void
}

export const makeDebugLogger =
  (config?: DebugLoggerConfig): Middleware =>
  <A, E, R>(op: EffectOp.EffectOp<A, E, R>): Effect.Effect<A, E, R> =>
    Effect.gen(function* () {
      if (op.meta?.policy?.disableObservers) {
        return yield* op.effect
      }
      if (config?.logger) {
        config.logger(op)
      } else {
        yield* Effect.logDebug(`[EffectOp] kind=${op.kind} name=${op.name}`)
      }
      return yield* op.effect
    })

export const applyDebug = (stack: MiddlewareStack, config?: DebugLoggerConfig): MiddlewareStack => [
  ...stack,
  makeDebugLogger(config),
]

export interface DebugObserverConfig {
  readonly filter?: (op: EffectOp.EffectOp<any, any, any>) => boolean
}

export const makeDebugObserver =
  (config?: DebugObserverConfig): Middleware =>
  <A, E, R>(op: EffectOp.EffectOp<A, E, R>): Effect.Effect<A, E, R> =>
    Effect.gen(function* () {
      if (op.meta?.policy?.disableObservers) {
        return yield* op.effect
      }
      if (!config?.filter || config.filter(op)) {
        const meta: any = op.meta ?? {}
        const slimOp = {
          id: op.id,
          kind: op.kind,
          name: op.name,
          payload: op.payload,
          meta: op.meta,
        }
        yield* Debug.record({
          type: 'trace:effectop',
          moduleId: typeof meta.moduleId === 'string' ? meta.moduleId : undefined,
          instanceId: typeof meta.instanceId === 'string' ? meta.instanceId : undefined,
          runtimeLabel: typeof meta.runtimeLabel === 'string' ? meta.runtimeLabel : undefined,
          txnSeq: typeof meta.txnSeq === 'number' && Number.isFinite(meta.txnSeq) ? Math.floor(meta.txnSeq) : undefined,
          data: slimOp,
        })
      }
      return yield* op.effect
    })

export const applyDebugObserver = (stack: MiddlewareStack, config?: DebugObserverConfig): MiddlewareStack => [
  ...stack,
  makeDebugObserver(config),
]

export interface WithDebugOptions {
  readonly logger?: DebugLoggerConfig['logger'] | false
  readonly observer?: DebugObserverConfig | false
}

export const withDebug = (stack: MiddlewareStack, options?: WithDebugOptions): MiddlewareStack => {
  let next = stack

  if (options?.logger !== false) {
    next = applyDebug(next, typeof options?.logger === 'function' ? { logger: options.logger } : undefined)
  }

  if (options?.observer !== false) {
    next = applyDebugObserver(next, options?.observer === undefined ? undefined : options.observer)
  }

  return next
}
