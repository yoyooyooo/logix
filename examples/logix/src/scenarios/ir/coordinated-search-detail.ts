/**
 * @scenario 搜索与详情分离 (Coordinated Search & Detail)
 * @description
 *   演示两个独立的 Store（SearchStore 和 DetailStore）如何通过一个上层的“协调逻辑”进行通信。
 *   当前示例使用 Fluent DSL（`$.use + $.onAction(...).run* / .update/.mutate`）表达跨 Store 协作，
 *   主要用于说明平台 IR / Parser 与代码之间的映射关系。
 *
 *   在当前口径下，业务代码更推荐使用 Fluent DSL：
 *     - 通过 `$.use(Search)` / `$.use(Detail)` 获取 Store 句柄；
 *     - 使用 `$.on($Search.changes(...)).run((results) => $Detail.dispatch(...))` 编排跨 Store 联动；
 *   本文件保留作为跨 Store Fluent Intent 的 IR 级示例，而非推荐业务写法。
 * @requirement
 *   1. SearchStore: 位于全局 Layout，负责根据用户点击按钮触发搜索，并存储结果列表。
 *   2. DetailStore: 位于某个业务模块，负责展示单个选中项的详情。
 *   3. Coordinator: 监听 SearchStore 的结果变化，自动提取第一条结果，并用其初始化 DetailStore。
 * @architecture_pattern Decoupled Stores with Coordinator Logic
 */

import { Effect, Schema, ServiceMap, Stream } from 'effect'
import * as Logix from '@logixjs/core'
import { programLayer } from '../../runtime/programLayer.js'

// ---------------------------------------------------------------------------
// 模块一：全局搜索 (Search Module)
// ---------------------------------------------------------------------------

// 1.1. 服务契约
interface SearchResult {
  id: string
  name: string
}
class SearchApi extends ServiceMap.Service<SearchApi, {
  readonly search: (keyword: string) => Effect.Effect<SearchResult[], Error>
}>()('SearchApi') { }

// 1.2. Schema 定义
const SearchStateSchema = Schema.Struct({
  keyword: Schema.String,
  results: Schema.Array(Schema.Struct({ id: Schema.String, name: Schema.String })),
  isSearching: Schema.Boolean,
})

const SearchActionMap = {
  'search/trigger': Schema.Void,
}

// 1.3. Store Shape
type SearchShape = Logix.Module.Shape<typeof SearchStateSchema, typeof SearchActionMap>

// 1.4. 搜索模块 Module + Logic (只关心自身)
export const Search = Logix.Module.make('SearchModule', {
  state: SearchStateSchema,
  actions: SearchActionMap,
})

const SearchLogic = Search.logic<SearchApi>('search-logic', ($Search) =>
  Effect.gen(function* () {
    const searchEffect = Effect.gen(function* () {
      const api = yield* $Search.use(SearchApi)
      const { keyword } = yield* $Search.state.read

      yield* $Search.state.update((prev) => ({ ...prev, isSearching: true }))
      const result = yield* Effect.exit(api.search(keyword))

      if (result._tag === 'Failure') {
        yield* $Search.state.update((prev) => ({ ...prev, isSearching: false }))
      } else {
        yield* $Search.state.update((prev) => ({
          ...prev,
          isSearching: false,
          results: result.value,
        }))
      }
    })

    yield* $Search.onAction('search/trigger').runExhaust(searchEffect)
  }).pipe(
    // 收敛错误通道，方便作为 ModuleLogic 使用
    Effect.catch(() => Effect.void),
  ),
)

// ---------------------------------------------------------------------------
// 模块二：详情展示 (Detail Module)
// ---------------------------------------------------------------------------

// 2.1. Schema 定义
const DetailStateSchema = Schema.Struct({
  selectedItem: Schema.optional(
    Schema.Struct({
      id: Schema.String,
      name: Schema.String,
      // 假设详情有更多字段
      description: Schema.optional(Schema.String),
    }),
  ),
  isLoading: Schema.Boolean,
})

const DetailActionMap = {
  'detail/initialize': Schema.Struct({ id: Schema.String, name: Schema.String }),
}

// 2.2. Store Shape
type DetailShape = Logix.Module.Shape<typeof DetailStateSchema, typeof DetailActionMap>

// 2.3. 详情模块 Module + Logic (只关心自身)
export const Detail = Logix.Module.make('DetailModule', {
  state: DetailStateSchema,
  actions: DetailActionMap,
})

const DetailLogic = Detail.logic('detail-logic', ($Detail) =>
  Effect.gen(function* () {
    // 监听到初始化动作，就更新自己的状态
    yield* $Detail.onAction('detail/initialize').run((action) =>
      $Detail.state.update((prev) => ({
        ...prev,
        selectedItem: {
          ...action.payload,
        },
      })),
    )
  }),
)

// ---------------------------------------------------------------------------
// 模块三：应用层协调逻辑 (Coordinator Logic)
// ---------------------------------------------------------------------------

// 3.1. 协调逻辑：监听 Search，操作 Detail（Fluent DSL 写法）
//
// 这里使用上层 Logic + $.use + $.onAction 组合表达跨 Module 协作：
// - 通过 $.use(Search) / $.use(Detail) 获取只读句柄；
// - 监听 $Search.changes(results)；
// - 在 then 中向 DetailStore 派发初始化 Action。

const CoordinatorStateSchema = Schema.Struct({})
const CoordinatorActionMap = {
  noop: Schema.Void,
}
type CoordinatorShape = Logix.Module.Shape<typeof CoordinatorStateSchema, typeof CoordinatorActionMap>

export const Coordinator = Logix.Module.make('SearchDetailCoordinator', {
  state: CoordinatorStateSchema,
  actions: CoordinatorActionMap,
})

export const CoordinatorLogic = Coordinator.logic('coordinator-logic', ($) =>
  Effect.gen(function* () {
    const $SearchHandle = yield* $.use(Search)
    const $DetailHandle = yield* $.use(Detail)

    const results$ = $SearchHandle.changes((s) => s.results) as Stream.Stream<
      readonly { id: string; name: string }[],
      never,
      never
    >

    yield* $.on(results$)
      .filter((results: readonly { id: string; name: string }[]) => results.length > 0)
      .run((results: readonly { id: string; name: string }[]) =>
        $DetailHandle.dispatch({
          _tag: 'detail/initialize',
          payload: {
            id: results[0]!.id,
            name: results[0]!.name,
          },
        }),
      )
  }),
)

// ---------------------------------------------------------------------------
// 组装：导出可供 UI / Runtime 使用的 Program 与协调程序
// ---------------------------------------------------------------------------

export const SearchProgram = Logix.Program.make(Search, {
  initial: {
    keyword: '',
    results: [],
    isSearching: false,
  },
  logics: [SearchLogic],
})

export const DetailProgram = Logix.Program.make(Detail, {
  initial: {
    selectedItem: undefined,
    isLoading: false,
  },
  logics: [DetailLogic],
})

export const CoordinatorProgram = Logix.Program.make(Coordinator, {
  initial: {},
  logics: [CoordinatorLogic],
})

export const SearchLayer = programLayer(SearchProgram)
export const DetailLayer = programLayer(DetailProgram)
export const CoordinatorLayer = programLayer(CoordinatorProgram)
