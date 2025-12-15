// 类型级回归（编译期断言，不参与运行时逻辑）
export {}

import type * as Logix from "@logix/core"
import type { QueryResourceKey, QuerySourceConfig } from "./traits.js"
import type { QueryState } from "./query.js"

type Spec = Logix.Resource.ResourceSpec<
  { readonly q: string },
  { readonly ok: true },
  never,
  never
>

type SearchConfig = QuerySourceConfig<{ readonly q: string }, unknown, Spec>

type _AssertKeyReturn = ReturnType<SearchConfig["key"]> extends QueryResourceKey<Spec> | undefined
  ? true
  : never

type State = QueryState<
  { readonly q: string },
  unknown,
  {
    readonly search: SearchConfig
  }
>

type SearchSnapshot = State["search"]
type _AssertData = SearchSnapshot["data"] extends { readonly ok: true } | undefined ? true : never

