// Type-level regression (compile-time assertions; no runtime logic).
export {}

import type * as Logix from '@logixjs/core'
import type { QueryResourceKey, QuerySourceConfig } from '../../src/Traits.js'
import type { QueryState } from '../../src/Query.js'

type Spec = Logix.Resource.ResourceSpec<{ readonly q: string }, { readonly ok: true }, never, never>

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
