import { Effect } from "effect"
import type { FluentMatch, FluentMatchTag } from "../api/Logic.js"

/**
 * 基于值构造 FluentMatch 分支 DSL。
 */
export const makeMatch = <V>(value: V): FluentMatch<V> => {
  let result: Effect.Effect<any, any, any> | undefined

  const chain: FluentMatch<V> = {
    when: (valueOrPredicate, handler) => {
      if (result) return chain
      const isMatch =
        typeof valueOrPredicate === "function"
          ? (valueOrPredicate as (v: V) => boolean)(value)
          : valueOrPredicate === value
      if (isMatch) {
        result = handler(value)
      }
      return chain
    },
    otherwise: (handler) => {
      if (result) return result
      return handler(value)
    },
    exhaustive: () => {
      if (result) return result
      return Effect.die("Non-exhaustive match")
    },
  }

  return chain
}

/**
 * 基于 `_tag` 字段构造 FluentMatchTag 分支 DSL。
 */
export const makeMatchTag = <V extends { _tag: string }>(
  value: V
): FluentMatchTag<V> => {
  let result: Effect.Effect<any, any, any> | undefined

  const chain: FluentMatchTag<V> = {
    tag: (t, handler) => {
      if (result) return chain
      if (value._tag === t) {
        result = handler(value as Extract<V, { _tag: typeof t }>)
      }
      return chain
    },
    exhaustive: () => {
      if (result) return result
      return Effect.die("Non-exhaustive match")
    },
  }

  return chain
}

