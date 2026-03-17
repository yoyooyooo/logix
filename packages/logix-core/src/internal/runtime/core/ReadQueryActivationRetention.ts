import type { Effect } from 'effect'
import type { ReadQueryCompiled } from './ReadQuery.js'

export const readQueryActivationRetainSymbol = Symbol.for('logix.internal.readQueryActivationRetain')

export type ReadQueryActivationRetainFn<S> = <V>(
  readQuery: ReadQueryCompiled<S, V>,
) => Effect.Effect<() => void, never, never>

export interface ReadQueryActivationRetainer<S> {
  readonly [readQueryActivationRetainSymbol]: ReadQueryActivationRetainFn<S>
}

export const hasReadQueryActivationRetainer = <S>(candidate: unknown): candidate is ReadQueryActivationRetainer<S> =>
  (typeof candidate === 'object' || typeof candidate === 'function') &&
  candidate !== null &&
  typeof (candidate as ReadQueryActivationRetainer<S>)[readQueryActivationRetainSymbol] === 'function'
