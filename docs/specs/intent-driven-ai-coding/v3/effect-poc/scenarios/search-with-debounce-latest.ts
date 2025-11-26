import { Context, Effect, Schema } from 'effect'
import { Store, Logic, Flow } from '../shared/logix-v3-core'

// ---------------------------------------------------------------------------
// Schema → Shape：搜索场景的 State / Action
// ---------------------------------------------------------------------------

const SearchStateSchema = Schema.Struct({
  keyword: Schema.String,
  results: Schema.Array(Schema.String),
  isLoading: Schema.Boolean,
})

const SearchActionSchema = Schema.Union(
  // 这里保留一个占位 Action 变体，实际逻辑通过 fromChanges 监听 keyword 变化
  Schema.Struct({ _tag: Schema.Literal('noop') }),
)

export type SearchShape = Store.Shape<typeof SearchStateSchema, typeof SearchActionSchema>
export type SearchState = Store.StateOf<SearchShape>
export type SearchAction = Store.ActionOf<SearchShape>

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
// 搜索逻辑封装：封装「执行一次搜索」的长逻辑
// ---------------------------------------------------------------------------

interface SearchPatternInput {
  keyword: string
}

export const runSearchEffect = (input: SearchPatternInput) =>
  Effect.gen(function* (_) {
    // 这里用 log 代替真实的远程调用
    // 真正项目中可以在此调用 SearchService.search(input.keyword)
    console.log('[SearchEffect] search with keyword =', input.keyword)
  })

// ---------------------------------------------------------------------------
// Logic：基于 Flow 的控制流编排（fromChanges + debounce + filter + runLatest）
// ---------------------------------------------------------------------------

export const SearchLogic = Logic.make<SearchShape>(({ flow, state }) =>
  Effect.gen(function* (_) {
    const { read, update } = state
    // 1. 从 State.keyword 构造变化流
    const keywordChanges$ = flow.fromChanges((s) => s.keyword)

    // 2. 防抖 + 非空过滤：只有稳定下来的非空关键字才触发搜索
    const debouncedValidKeyword$ = keywordChanges$.pipe(
      flow.debounce(300),
      flow.filter((keyword) => keyword.trim().length > 0),
    )

    // 3. 构造一次「读取当前关键字并执行搜索」的 Effect
    const runSearch = Effect.gen(function* (_) {
      const state = yield* read
      const keyword = state.keyword

      // 通过 Tag 从 Env 中获取 SearchApi 服务
      const api = yield* SearchApi

      yield* update((prev) => ({ ...prev, isLoading: true }))
      const results = yield* api.search(keyword)
      yield* update((prev) => ({ ...prev, results, isLoading: false }))
    })

    // 4. 将控制流与 Effect 绑定：
    //    - 源：来自 keyword 的变化（fromChanges）
    //    - 时间：通过 debounce 限制频率
    //    - 过滤：只放过非空关键字
    //    - 并发语义：runLatest，始终只保留最新一次搜索
    yield* debouncedValidKeyword$.pipe(flow.runLatest(runSearch))
  }),
)

// ---------------------------------------------------------------------------
// Store：组合 State / Action / Logic 成为一棵 Store
// ---------------------------------------------------------------------------

const SearchStateLayer = Store.State.make(SearchStateSchema, {
  keyword: '',
  results: [],
  isLoading: false,
})

const SearchActionLayer = Store.Actions.make(SearchActionSchema)

export const SearchStore = Store.make<SearchShape>(SearchStateLayer, SearchActionLayer, SearchLogic)
