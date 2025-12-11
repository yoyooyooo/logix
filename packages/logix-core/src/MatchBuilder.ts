import type { FluentMatch, FluentMatchTag } from "./Logic.js"
import * as Internal from "./internal/MatchBuilder.js"

// MatchBuilder：对外暴露 Fluent Match DSL，内部实现复用 internal/MatchBuilder。

export const makeMatch: <V>(value: V) => FluentMatch<V> = Internal.makeMatch

export const makeMatchTag: <V extends { _tag: string }>(
  value: V
) => FluentMatchTag<V> = Internal.makeMatchTag
