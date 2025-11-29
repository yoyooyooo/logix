import { Context, Effect, Schema } from 'effect'
import { Logic, Logix } from '../shared/logix-v3-core'

// ---------------------------------------------------------------------------
// Schema → Shape：搜索场景的 State / Action
// ---------------------------------------------------------------------------

const SearchStateSchema = Schema.Struct({
  keyword: Schema.String,
  results: Schema.Array(Schema.String),
  isLoading: Schema.Boolean,
})

const SearchActionMap = {
  // 这里保留一个占位 Action 变体，实际逻辑通过 fromChanges 监听 keyword 变化
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
// Logic：基于 Flow 的控制流编排（fromChanges + debounce + filter + runLatest）
// ---------------------------------------------------------------------------

const $ = Logic.forShape<SearchShape, SearchApi>()

export const SearchLogic: Logic.Of<SearchShape, SearchApi> = Effect.gen(function* () {
  // 1. 从 State.keyword 构造变化流
  const keywordChanges$ = $.flow.fromChanges((s) => s.keyword)

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
  //    - 源：来自 keyword 的变化（fromChanges）
  //    - 时间：通过 debounce 限制频率
  //    - 过滤：只放过非空关键字
  //    - 并发语义：runLatest，始终只保留最新一次搜索
  yield* debouncedValidKeyword$.pipe($.flow.runLatest(runSearch))
})

// ---------------------------------------------------------------------------
// Module / Live：组合 State / Action / Logic 成为一棵领域模块（示例代码）
// ---------------------------------------------------------------------------

export const SearchModule = Logix.Module('SearchModule', {
  state: SearchStateSchema,
  actions: SearchActionMap,
})

export const SearchLive = SearchModule.live(
  {
    keyword: '',
    results: [],
    isLoading: false,
  },
  SearchLogic,
)
