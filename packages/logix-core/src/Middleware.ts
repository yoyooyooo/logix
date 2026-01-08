// Middleware namespace entry (@logixjs/core/Middleware).
// - Helpers for EffectOp-based debugging/observation middleware.
// - Query / DebugObserver capabilities extend from this namespace.

import { Effect } from 'effect'
import * as EffectOp from './EffectOp.js'
import * as Debug from './Debug.js'

export type Middleware = EffectOp.Middleware
export type MiddlewareStack = EffectOp.MiddlewareStack

export interface DebugLoggerConfig {
  /**
   * Optional: custom logger function (useful for capturing calls in tests).
   *
   * - When omitted, defaults to Effect.logDebug.
   */
  readonly logger?: (op: EffectOp.EffectOp<any, any, any>) => void
}

/**
 * Creates a simple debug logger middleware.
 *
 * - Logs once before executing the Effect.
 * - Does not change success/error semantics.
 */
export const makeDebugLogger =
  (config?: DebugLoggerConfig): Middleware =>
  <A, E, R>(op: EffectOp.EffectOp<A, E, R>): Effect.Effect<A, E, R> =>
    Effect.gen(function* () {
      // Observation-only capability: can be locally disabled by policy.
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

/**
 * applyDebug：
 * - Appends a DebugLogger middleware to the end of an existing MiddlewareStack.
 * - Returns a new stack; does not mutate the input array.
 */
export const applyDebug = (stack: MiddlewareStack, config?: DebugLoggerConfig): MiddlewareStack => [
  ...stack,
  makeDebugLogger(config),
]

/**
 * DebugObserverConfig：
 * - Optional filter: select which EffectOps to observe (by module / kind / name, etc.).
 */
export interface DebugObserverConfig {
  readonly filter?: (op: EffectOp.EffectOp<any, any, any>) => boolean
}

/**
 * makeDebugObserver：
 * - Funnels EffectOp events into DebugSink (EffectOp → Debug.Event).
 * - Uses `trace:*` events to forward a slim view of EffectOp into the Debug stream (must not carry effect closures):
 *   - type: 'trace:effectop'
 *   - moduleId: from op.meta?.moduleId (when present)
 *   - data: { id, kind, name, payload, meta }
 *
 * Notes:
 * - Does not change the underlying Effect behavior; only adds Debug-side observation.
 * - Devtools / Timeline UIs can rebuild an EffectOp timeline from `trace:effectop` events.
 */
export const makeDebugObserver =
  (config?: DebugObserverConfig): Middleware =>
  <A, E, R>(op: EffectOp.EffectOp<A, E, R>): Effect.Effect<A, E, R> =>
    Effect.gen(function* () {
      // Observation-only capability: can be locally disabled by policy.
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

/**
 * applyDebugObserver：
 * - Appends a DebugObserver middleware to the end of an existing MiddlewareStack.
 * - Returns a new stack; does not mutate the input array.
 */
export const applyDebugObserver = (stack: MiddlewareStack, config?: DebugObserverConfig): MiddlewareStack => [
  ...stack,
  makeDebugObserver(config),
]

/**
 * WithDebugOptions：
 * - High-level composition options for adding Debug capabilities onto an existing MiddlewareStack.
 *
 * Conventions:
 * - logger:
 *   - undefined: enable the default DebugLogger (Effect.logDebug).
 *   - function: use a custom logger(op) instead of the default.
 *   - false: do not add DebugLogger middleware.
 * - observer:
 *   - undefined: enable DebugObserver with default config.
 *   - DebugObserverConfig: enable DebugObserver with the given config.
 *   - false: do not add DebugObserver middleware.
 */
export interface WithDebugOptions {
  readonly logger?: DebugLoggerConfig['logger'] | false
  readonly observer?: DebugObserverConfig | false
}

/**
 * withDebug：
 * - Appends DebugLogger + DebugObserver presets onto an existing MiddlewareStack.
 * - Allows enabling/disabling logger/observer and configuring them via options.
 * - Returns a new stack; does not mutate the input array.
 *
 * @example
 *
 *   let stack: MiddlewareStack = [metrics, timing]
 *   stack = Middleware.withDebug(stack, {
 *     logger: (op) => console.log(op.kind, op.name),
 *     observer: { filter: (op) => op.kind !== 'service' },
 *   })
 */
export const withDebug = (stack: MiddlewareStack, options?: WithDebugOptions): MiddlewareStack => {
  let next = stack

  // DebugLogger: enabled by default unless logger === false.
  if (options?.logger !== false) {
    const loggerConfig: DebugLoggerConfig | undefined =
      typeof options?.logger === 'function' ? { logger: options.logger } : undefined
    next = applyDebug(next, loggerConfig)
  }

  // DebugObserver: enabled by default unless observer === false.
  if (options?.observer !== false) {
    // observer === false has been filtered out; pass through the config object when provided.
    // undefined means using DebugObserver default behavior.
    const observerOption = options?.observer
    const observerConfig: DebugObserverConfig | undefined = observerOption === undefined ? undefined : observerOption
    next = applyDebugObserver(next, observerConfig)
  }

  return next
}
