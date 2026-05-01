/**
 * @scenario Agent · Fluent + Control
 * @description
 *   作为 Agent 编排规划的配套示例，演示两类典型场景在 Fluent 子集中的推荐写法：
 *   1）搜索框输入 → 防抖 + latest 搜索（运行策略 + Service）；
 *   2）国家变化 → 重置城市 + 加载城市列表失败时弹 Toast（结构化控制流：Effect.catch* 等）。
 *
 *   代码遵守当前硬约束：
 *   - 使用 Bound API (`$`) 作为唯一入口；
 *   - Fluent 链写成单条 `yield* $.onState/$.onAction(...).debounce(...).runLatest(Effect.gen(...))`；
 *   - handler 内仅使用 Effect.gen + yield*，不使用 async/await。
 */

import { Effect, Schema, ServiceMap } from 'effect'
import * as Logix from '@logixjs/core'
import { programLayer } from '../runtime/programLayer.js'

// ---------------------------------------------------------------------------
// 场景一：搜索框输入 → 防抖 + latest 搜索（Fluent + Service）
// ---------------------------------------------------------------------------

const SearchStateSchema = Schema.Struct({
  keyword: Schema.String,
  results: Schema.Array(Schema.String),
})

const SearchActionMap = {
  // 本例中暂不使用 Action，保留一个占位变体
  noop: Schema.Void,
}

type SearchShape = Logix.Module.Shape<typeof SearchStateSchema, typeof SearchActionMap>

// Service Tag：由上层 Runtime 提供实现
export class SearchService extends ServiceMap.Service<SearchService, SearchService.Service>()('@poc/SearchService') {}

export namespace SearchService {
  export interface Service {
    search: (keyword: string) => Effect.Effect<ReadonlyArray<string>, never, never>
  }
}

export const Agent = Logix.Module.make('AgentModule', {
  state: SearchStateSchema,
  actions: SearchActionMap,
})

// 使用 Module.logic 注入 Bound API `$`，在 Fluent 子集中表达逻辑
export const SearchLogicAgent = Agent.logic<SearchService>('search-logic-agent', ($) =>
  Effect.gen(function* () {
    yield* $.onState((s) => s.keyword)
      .debounce(500)
      .runLatest(
        Effect.gen(function* () {
          const api = yield* $.use(SearchService)
          const { keyword } = yield* $.state.read
          const results = yield* api.search(keyword)
          yield* $.state.update((d) => ({ ...d, results }))
        }),
      )
  }),
)

export const SearchAgentProgram = Logix.Program.make(Agent, {
  initial: {
    keyword: '',
    results: [],
  },
  logics: [SearchLogicAgent],
})

export const SearchAgentLayer = programLayer(SearchAgentProgram)

// ---------------------------------------------------------------------------
// 场景二：国家变化 → 重置城市 + 加载城市列表失败时弹 Toast（Fluent + Control）
// ---------------------------------------------------------------------------

const ProfileStateSchema = Schema.Struct({
  country: Schema.String,
  city: Schema.String,
  cities: Schema.Array(Schema.String),
  toast: Schema.optional(Schema.String),
})

const ProfileActionMap = {
  // 本例只基于 State 变化，不定义额外 Action
  noop: Schema.Void,
}

type ProfileShape = Logix.Module.Shape<typeof ProfileStateSchema, typeof ProfileActionMap>

export class LocationService extends ServiceMap.Service<LocationService, LocationService.Service>()('@poc/LocationService') {}

export namespace LocationService {
  export interface Service {
    fetchCities: (country: string) => Effect.Effect<ReadonlyArray<string>, Error, never>
  }
}

export const Profile = Logix.Module.make('ProfileModule', {
  state: ProfileStateSchema,
  actions: ProfileActionMap,
})

export const ProfileLogicAgent = Profile.logic<LocationService>('profile-logic-agent', ($) =>
  Effect.gen(function* () {
    yield* $.onState((s) => s.country).run(
      Effect.gen(function* () {
        // 1. 国家变化时重置 city
        yield* $.state.update((d) => ({ ...d, city: '' }))

        // 2. 加载城市列表，并通过 Effect.catchAll 显式建模错误域
        const svc = yield* $.use(LocationService)

        const loadCities = Effect.gen(function* () {
          const { country } = yield* $.state.read
          const cities = yield* svc.fetchCities(country)
          yield* $.state.update((d) => ({ ...d, cities }))
        })

        yield* loadCities.pipe(Effect.catch(() => $.state.update((d) => ({ ...d, toast: '加载城市失败' }))))
      }),
    )
  }),
)

export const ProfileAgentProgram = Logix.Program.make(Profile, {
  initial: {
    country: '',
    city: '',
    cities: [],
    toast: undefined,
  },
  logics: [ProfileLogicAgent],
})

export const ProfileAgentLayer = programLayer(ProfileAgentProgram)
