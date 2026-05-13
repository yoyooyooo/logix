// Type-level regression (compile-time assertions; no runtime logic).
export {}

import type { ResourceSpec } from '../../src/Engine.js'
import type { QueryResourceKey, QuerySourceConfig } from '../../src/internal/query-declarations.js'
import type { QueryState } from '../../src/Query.js'

type Spec = ResourceSpec<{ readonly q: string }, { readonly ok: true }, never, never>

type SearchConfig = QuerySourceConfig<{ readonly q: string }, unknown, Spec>

type _AssertKeyReturn = ReturnType<SearchConfig['key']> extends QueryResourceKey<Spec> | undefined ? true : never

type State = QueryState<
  { readonly q: string },
  unknown,
  {
    readonly search: SearchConfig
  }
>

type SearchSnapshot = State['queries']['search']
type _AssertData = SearchSnapshot['data'] extends { readonly ok: true } | undefined ? true : never
