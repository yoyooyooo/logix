import type { Effect } from 'effect'
import type * as Logic from './LogicMiddleware.js'
import type { AnyModuleShape, StateOf } from './module.js'

const DIRECT_STATE_WRITE_EFFECT = Symbol.for('logix.directStateWriteEffect')

export type DirectStateWriteMetadata<Sh extends AnyModuleShape> =
  | { readonly kind: 'update'; readonly run: (prev: StateOf<Sh>) => StateOf<Sh> }
  | { readonly kind: 'mutate'; readonly run: (draft: Logic.Draft<StateOf<Sh>>) => void }

export type DirectStateWriteEffect<Sh extends AnyModuleShape> = Effect.Effect<void, never, any> & {
  [DIRECT_STATE_WRITE_EFFECT]?: DirectStateWriteMetadata<Sh>
}

export const markDirectStateWriteEffect = <Sh extends AnyModuleShape, A extends Effect.Effect<void, never, any>>(
  effect: A,
  metadata: DirectStateWriteMetadata<Sh>,
): A => {
  ;(effect as DirectStateWriteEffect<Sh>)[DIRECT_STATE_WRITE_EFFECT] = metadata
  return effect
}

export const getDirectStateWriteMetadata = <Sh extends AnyModuleShape>(
  value: unknown,
): DirectStateWriteMetadata<Sh> | undefined => {
  if (!value || (typeof value !== 'object' && typeof value !== 'function')) return undefined
  return (value as DirectStateWriteEffect<Sh>)[DIRECT_STATE_WRITE_EFFECT]
}
