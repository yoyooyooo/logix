import { Effect } from "effect"

export const makeMatch = <V>(value: V) => {
  let result: Effect.Effect<any, any, any> | undefined

  const chain = {
    with: <A>(
      predicate: (value: V) => boolean,
      handler: (value: V) => A
    ) => {
      if (result) return chain
      if (predicate(value)) {
        result = handler(value) as any
      }
      return chain
    },
    otherwise: <A>(handler: (value: V) => A): A => {
      if (result) return result as A
      return handler(value)
    },
    exhaustive: () => {
      if (result) {
        return result
      }
      return Effect.dieMessage(
        "[FluentMatch] Non-exhaustive match: no pattern matched value"
      )
    },
  }

  return chain
}

export const makeMatchTag = <V extends { _tag: string }>(value: V) => {
  let result: Effect.Effect<any, any, any> | undefined

  const chain = {
    with: <K extends V["_tag"], A>(
      t: K,
      handler: (value: Extract<V, { _tag: K }>) => A
    ) => {
      if (result) return chain
      if (value._tag === t) {
        result = handler(value as Extract<V, { _tag: K }>) as any
      }
      return chain
    },
    otherwise: <A>(handler: (value: V) => A): A => {
      if (result) return result as A
      return handler(value)
    },
    exhaustive: () => {
      if (result) {
        return result
      }
      return Effect.dieMessage(
        "[FluentMatchTag] Non-exhaustive match: no tag handler matched value"
      )
    },
  }

  return chain
}
