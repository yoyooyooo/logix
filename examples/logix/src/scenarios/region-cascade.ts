/**
 * @scenario 省市区三级联动 (Region Cascade)
 * @description
 *   演示典型的字段联动逻辑，并对比「直接实现」与「Pattern 封装」两种模式：
 *   - 场景：监听上级字段变化，并发加载数据，同时级联重置下级字段；
 *   - 实现：使用 `runCascadePattern` 封装通用流程（监听 -> 重置 -> 并发控制 -> 加载 -> 更新）；
 *   - 价值：通过结构化配置消除样板代码，统一处理 Loading 与竞态问题。
 */

import { Effect, Schema, Context } from 'effect'
import { Logix } from '@logix/core'

// ---------------------------------------------------------------------------
// 1. Schema Definition
// ---------------------------------------------------------------------------

const OptionSchema = Schema.Struct({
  code: Schema.String,
  name: Schema.String,
})

const RegionStateSchema = Schema.Struct({
  // 选中值
  province: Schema.optional(Schema.String),
  city: Schema.optional(Schema.String),
  district: Schema.optional(Schema.String),

  // 选项列表
  provinceOptions: Schema.Array(OptionSchema),
  cityOptions: Schema.Array(OptionSchema),
  districtOptions: Schema.Array(OptionSchema),

  // Loading 状态
  isLoading: Schema.Boolean,
})

const RegionActionMap = {
  'region/init': Schema.Void,
}

type RegionShape = Logix.Shape<typeof RegionStateSchema, typeof RegionActionMap>

// ---------------------------------------------------------------------------
// 2. Service Definition (Mock)
// ---------------------------------------------------------------------------

export class RegionService extends Context.Tag('RegionService')<
  RegionService,
  {
    getProvinces: () => Effect.Effect<Array<{ code: string; name: string }>>
    getCities: (provinceCode: string) => Effect.Effect<Array<{ code: string; name: string }>>
    getDistricts: (cityCode: string) => Effect.Effect<Array<{ code: string; name: string }>>
  }
>() { }

// ---------------------------------------------------------------------------
// 3. Module Definition
// ---------------------------------------------------------------------------

export const RegionModule = Logix.Module('RegionModule', {
  state: RegionStateSchema,
  actions: RegionActionMap,
})

// ---------------------------------------------------------------------------
// 4. Logic Implementation
// ---------------------------------------------------------------------------

import { runCascadePattern } from '../patterns/cascade.js'

export const RegionLogic = RegionModule.logic<RegionService>(($) =>
  Effect.gen(function* () {
    // -----------------------------------------------------------------------
    // 联动逻辑 1：省份变化 -> 重置市/区 -> 加载城市 (使用 Pattern)
    // -----------------------------------------------------------------------
    yield* runCascadePattern($, {
      source: (s) => s.province,
      onReset: (prev) => ({
        ...prev,
        city: undefined,
        district: undefined,
        cityOptions: [],
        districtOptions: [],
      }),
      loader: (province) => Effect.gen(function* () {
        const svc = yield* $.use(RegionService)
        return yield* svc.getCities(province)
      }),
      onSuccess: (prev, cities) => ({
        ...prev,
        cityOptions: cities,
      }),
      onLoading: (prev, isLoading) => ({ ...prev, isLoading }),
    })

    // -----------------------------------------------------------------------
    // 联动逻辑 2：城市变化 -> 重置区 -> 加载区县 (使用 Pattern)
    // -----------------------------------------------------------------------
    yield* runCascadePattern($, {
      source: (s) => s.city,
      onReset: (prev) => ({
        ...prev,
        district: undefined,
        districtOptions: [],
      }),
      loader: (city) => Effect.gen(function* () {
        const svc = yield* $.use(RegionService)
        return yield* svc.getDistricts(city)
      }),
      onSuccess: (prev, districts) => ({
        ...prev,
        districtOptions: districts,
      }),
      onLoading: (prev, isLoading) => ({ ...prev, isLoading }),
    })

    // -----------------------------------------------------------------------
    // 初始化逻辑
    // -----------------------------------------------------------------------
    yield* $.onAction('region/init').run(
      Effect.gen(function* () {
        const svc = yield* $.use(RegionService)
        const provinces = yield* svc.getProvinces()
        yield* $.state.update((prev) => ({ ...prev, provinceOptions: provinces }))
      }),
    )
  }),
)

// ---------------------------------------------------------------------------
// 5. Live Layer
// ---------------------------------------------------------------------------

export const RegionImpl = RegionModule.make({
  initial: {
    province: undefined,
    city: undefined,
    district: undefined,
    provinceOptions: [],
    cityOptions: [],
    districtOptions: [],
    isLoading: false,
  },
  logics: [RegionLogic],
})
