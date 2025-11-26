/**
 * @scenario 搜索与详情分离 (Coordinated Search & Detail)
 * @description 演示两个独立的 Store（SearchStore 和 DetailStore）如何通过一个上层的“协调逻辑”进行通信。
 * @requirement
 *   1. SearchStore: 位于全局 Layout，负责根据用户点击按钮触发搜索，并存储结果列表。
 *   2. DetailStore: 位于某个业务模块，负责展示单个选中项的详情。
 *   3. Coordinator: 监听 SearchStore 的结果变化，自动提取第一条结果，并用其初始化 DetailStore。
 * @architecture_pattern Decoupled Stores with Coordinator Logic
 */

import { Effect, Schema, Context, Stream } from 'effect'
import { Store, Logic, Intent } from '../shared/logix-v3-core'

// ---------------------------------------------------------------------------
// 模块一：全局搜索 (Search Module)
// ---------------------------------------------------------------------------

// 1.1. 服务契约
interface SearchResult {
  id: string
  name: string
}
class SearchApi extends Context.Tag('SearchApi')<SearchApi, {
  readonly search: (keyword: string) => Effect.Effect<SearchResult[], Error>
}>() {}

// 1.2. Schema 定义
const SearchStateSchema = Schema.Struct({
  keyword: Schema.String,
  results: Schema.Array(Schema.Struct({ id: Schema.String, name: Schema.String })),
  isSearching: Schema.Boolean,
})

const SearchActionSchema = Schema.Union(
  Schema.Struct({ _tag: Schema.Literal('search/trigger') })
)

// 1.3. Store Shape
type SearchShape = Store.Shape<typeof SearchStateSchema, typeof SearchActionSchema>

// 1.4. 搜索逻辑 (只关心自身)
const SearchLogic = Logic.make<SearchShape, SearchApi>(({ flow, state }) =>
  Effect.gen(function* (_) {
    const { read, update } = state
    const search$ = flow.fromAction((a): a is { _tag: 'search/trigger' } => a._tag === 'search/trigger')

    const searchEffect = Effect.gen(function* (_) {
      const api = yield* SearchApi
      const { keyword } = yield* read

      yield* update((prev) => ({ ...prev, isSearching: true }))
      const result = yield* Effect.either(api.search(keyword))

      if (result._tag === 'Left') {
        yield* update((prev) => ({ ...prev, isSearching: false }))
      } else {
        yield* update((prev) => ({
          ...prev,
          isSearching: false,
          results: result.right,
        }))
      }
    })

    yield* search$.pipe(flow.runExhaust(searchEffect))
  }),
)

// ---------------------------------------------------------------------------
// 模块二：详情展示 (Detail Module)
// ---------------------------------------------------------------------------

// 2.1. Schema 定义
const DetailStateSchema = Schema.Struct({
  selectedItem: Schema.optional(Schema.Struct({ 
    id: Schema.String, 
    name: Schema.String,
    // 假设详情有更多字段
    description: Schema.optional(Schema.String),
  })),
  isLoading: Schema.Boolean,
})

const DetailActionSchema = Schema.Union(
  Schema.Struct({ _tag: Schema.Literal('detail/initialize'), payload: Schema.Struct({ id: Schema.String, name: Schema.String }) })
)

// 2.2. Store Shape
type DetailShape = Store.Shape<typeof DetailStateSchema, typeof DetailActionSchema>

// 2.3. 详情逻辑 (只关心自身)
const DetailLogic = Logic.make<DetailShape>(({ flow, state }) =>
  Effect.gen(function* (_) {
    const { update } = state
    const init$ = flow.fromAction(
      (a): a is {
        _tag: 'detail/initialize'
        payload: { id: string; name: string }
      } => a._tag === 'detail/initialize',
    )

    // 监听到初始化动作，就更新自己的状态
    yield* init$.pipe(
      Stream.runForEach((action) =>
        update((prev) => ({
          ...prev,
          selectedItem: {
            ...action.payload,
          },
        })),
      ),
    )
  }),
)

// ---------------------------------------------------------------------------
// 模块三：应用层协调逻辑 (Coordinator Logic)
// ---------------------------------------------------------------------------

// 3.1. 定义协调逻辑所需的环境：两个 Store 的运行时实例
class SearchStoreTag extends Context.Tag('SearchStore')<SearchStoreTag, Store.Runtime<Store.StateOf<SearchShape>, Store.ActionOf<SearchShape>>>() {}
class DetailStoreTag extends Context.Tag('DetailStore')<DetailStoreTag, Store.Runtime<Store.StateOf<DetailShape>, Store.ActionOf<DetailShape>>>() {}

// 3.2. 协调逻辑：监听 SearchStore，操作 DetailStore
//
// 这里演示两种等价写法：
// - 写法一（推荐）：使用 Intent.Coordinate 作为跨 Store 协作的语义原语；
// - 写法二：直接手写 Effect.gen + Tag 取 Runtime（见上一个版本）。
//
// 为了保持示例简洁，这里采用 Intent.Coordinate 的对象参数形式。

const CoordinatorLogic = Intent.Coordinate.onChangesDispatch<SearchShape, DetailShape>(
  (s) => s.results,
  (results) =>
    results.length === 0
      ? []
      : [
          {
            _tag: 'detail/initialize' as const,
            payload: {
              id: results[0]!.id,
              name: results[0]!.name,
            },
          },
        ] as const,
)

// ---------------------------------------------------------------------------
// 组装与说明 (Assembly & Explanation)
// ---------------------------------------------------------------------------

// 在真实应用中，你会这样组装它们：

// 1. 创建各自的 Store 实例
// const searchStore = Store.make(SearchStateLayer, SearchActionLayer, SearchLogic)
// const detailStore = Store.make(DetailStateLayer, DetailActionLayer, DetailLogic)

// 2. 创建一个包含这两个 Store 实例的 Layer
// const StoresLayer = Layer.merge(
//   Layer.succeed(SearchStoreTag, searchStore),
//   Layer.succeed(DetailStoreTag, detailStore)
// )

// 3. 运行所有逻辑，并为协调逻辑提供 StoresLayer
// const AppLogic = Effect.all([
//   searchStore.run, 
//   detailStore.run, 
//   CoordinatorLogic.pipe(Effect.provide(StoresLayer))
// ], { discard: true })

// Effect.runFork(AppLogic.pipe(Effect.provide(ApiServicesLayer)))
