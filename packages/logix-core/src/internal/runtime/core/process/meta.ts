import type { Effect } from 'effect'
import type { ProcessDefinition, ProcessScope } from './protocol.js'

export type ProcessMeta = {
  readonly definition: ProcessDefinition
  /**
   * installationScope: part of Static IR.
   * - For instance-scope / subtree-scope scenarios, the runtime overwrites this field during installation with a derived effect.
   * - This field is for export/diagnostics only; it does not participate in stable identity derivation (see identity.ts).
   */
  readonly installationScope?: ProcessScope
  readonly kind?: 'process' | 'link'
}

export const PROCESS_META = Symbol.for('@logixjs/core/processMeta')

export type ProcessEffect<E = never, R = never> = Effect.Effect<void, E, R> & {
  readonly [PROCESS_META]?: ProcessMeta
}

const defineHidden = (target: object, key: symbol, value: unknown): void => {
  Object.defineProperty(target, key, {
    value,
    enumerable: false,
    configurable: true,
    writable: false,
  })
}

export const getMeta = (effect: Effect.Effect<void, any, any>): ProcessMeta | undefined =>
  (effect as ProcessEffect)[PROCESS_META]

export const getDefinition = (effect: Effect.Effect<void, any, any>): ProcessDefinition | undefined =>
  getMeta(effect)?.definition

export const attachMeta = <E, R>(effect: Effect.Effect<void, E, R>, meta: ProcessMeta): ProcessEffect<E, R> => {
  defineHidden(effect as any, PROCESS_META, meta)
  return effect as ProcessEffect<E, R>
}
