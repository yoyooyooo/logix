import type { FluentMatch, FluentMatchTag } from './Logic.js'
import * as Internal from './internal/MatchBuilder.js'

// MatchBuilder: public Fluent Match DSL; implementation delegates to internal/MatchBuilder.

export const makeMatch: <V>(value: V) => FluentMatch<V> = Internal.makeMatch

export const makeMatchTag: <V extends { _tag: string }>(value: V) => FluentMatchTag<V> = Internal.makeMatchTag
