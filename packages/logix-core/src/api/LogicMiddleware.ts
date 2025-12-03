import { Effect } from "effect"
import type * as Logic from "./Logic.js"
import type * as Logix from "./Logix.js"

export interface LogicMeta {
  readonly name: string
  readonly storeId?: string
  readonly action?: unknown
  readonly tags?: string[]
  readonly [key: string]: unknown
}

export type Middleware<Sh extends Logix.AnyModuleShape, R, A, E> = (
  effect: Effect.Effect<A, E, Logic.Env<Sh, R>>,
  meta: LogicMeta
) => Effect.Effect<A, E, Logic.Env<Sh, R>>

declare const Secured: unique symbol

export type Secured<Sh extends Logix.AnyModuleShape, R, A, E> = Effect.Effect<A, E, Logic.Env<Sh, R>> & {
  readonly [Secured]: true
}

export const secure = <Sh extends Logix.AnyModuleShape, R, A, E>(
  effect: Effect.Effect<A, E, Logic.Env<Sh, R>>,
  meta: LogicMeta,
  ...middlewares: Middleware<Sh, R, A, E>[]
): Secured<Sh, R, A, E> => {
  const composed = middlewares.reduceRight((acc, mw) => mw(acc, meta), effect)
  return composed as Secured<Sh, R, A, E>
}
