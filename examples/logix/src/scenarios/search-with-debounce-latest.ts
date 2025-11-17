import { Context, Effect, Schema } from 'effect'
import * as Logix from '@logix/core'

// Note: 本示例中的 `Logic.forShape` 写法仅作为“针对 SearchShape + SearchApi 预绑定的 Bound API `$`”
// 的概念性缩写；当前 PoC 实现中，真实代码应在对应 Module 上通过 `Module.logic(($)=>...)` 注入 `$`。

// ---------------------------------------------------------------------------
// Schema → Shape：搜索场景的 State / Action
// ---------------------------------------------------------------------------

const SearchStateSchema = Schema.Struct({
  keyword: Schema.String,
  results: Schema.Array(Schema.String),
  isLoading: Schema.Boolean,
})

const SearchActionMap = {
  // 这里保留一个占位 Action 变体，实际逻辑通过 fromState 监听 keyword 变化
  noop: Schema.Void,
}

export type SearchShape = Logix.Shape<typeof SearchStateSchema, typeof SearchActionMap>
export type SearchState = Logix.StateOf<SearchShape>
export type SearchAction = Logix.ActionOf<SearchShape>

// ---------------------------------------------------------------------------
// DI 示例：SearchApi 作为 Tag 注入的服务
// ---------------------------------------------------------------------------

export class SearchApi extends Context.Tag('@demo/SearchApi')<SearchApi, SearchApi.Service>() {}

export namespace SearchApi {
  export interface Service {
    search: (keyword: string) => Effect.Effect<ReadonlyArray<string>, never, never>
  }
}

// ---------------------------------------------------------------------------
// Module / Live：组合 State / Action / Logic 成为一棵领域模块（示例代码）
// ---------------------------------------------------------------------------

export const SearchDef = Logix.Module.make('SearchModule', {
  state: SearchStateSchema,
  actions: SearchActionMap,
})

// ---------------------------------------------------------------------------
// Logic：基于 Flow 的控制流编排（fromState + debounce + filter + runLatest）
// ---------------------------------------------------------------------------

export const SearchLogic = SearchDef.logic<SearchApi>(($) =>
  Effect.gen(function* () {
    // 1. 从 State.keyword 构造变化流
    const keywordChanges$ = $.flow.fromState((s) => s.keyword)

    // 2. 防抖 + 非空过滤：只有稳定下来的非空关键字才触发搜索
    const debouncedValidKeyword$ = keywordChanges$.pipe(
      $.flow.debounce(300),
      $.flow.filter((keyword) => keyword.trim().length > 0),
    )

    // 3. 构造一次「读取当前关键字并执行搜索」的 Effect
    const runSearch = Effect.gen(function* () {
      const state = yield* $.state.read
      const keyword = state.keyword

      // 通过 Tag 从 Env 中获取 SearchApi 服务
      const api = yield* $.use(SearchApi)

      yield* $.state.update((prev) => ({ ...prev, isLoading: true }))
      const results = yield* api.search(keyword)
      yield* $.state.update((prev) => ({ ...prev, results, isLoading: false }))
    })

    // 4. 将控制流与 Effect 绑定：
    //    - 源：来自 keyword 的变化（fromState）
    //    - 时间：通过 debounce 限制频率
    //    - 过滤：只放过非空关键字
    //    - 并发语义：runLatest，始终只保留最新一次搜索
    yield* debouncedValidKeyword$.pipe($.flow.runLatest(runSearch))
  }),
)

export const SearchModule = SearchDef.implement<SearchApi>({
  initial: {
    keyword: '',
    results: [],
    isLoading: false,
  },
  logics: [SearchLogic],
})

export const SearchImpl = SearchModule.impl
export const SearchLive = SearchImpl.layer
