import { Effect, Schema } from 'effect'
import * as Module from '@logix/core/Module'

// ============================================================================
// Schema 定义
// ============================================================================

/** 地区选项 Schema */
const RegionOptionSchema = Schema.Struct({
  code: Schema.String,
  name: Schema.String,
})

/** 省市区选择器状态 Schema */
const RegionSelectorStateSchema = Schema.Struct({
  // 当前选中值
  province: Schema.NullOr(Schema.String),
  city: Schema.NullOr(Schema.String),
  district: Schema.NullOr(Schema.String),
  // 下拉选项
  provinceOptions: Schema.Array(RegionOptionSchema),
  cityOptions: Schema.Array(RegionOptionSchema),
  districtOptions: Schema.Array(RegionOptionSchema),
  // 加载状态
  loading: Schema.Struct({
    provinces: Schema.Boolean,
    cities: Schema.Boolean,
    districts: Schema.Boolean,
  }),
})

/** Actions Map */
const RegionSelectorActionMap = {
  loadProvinces: Schema.Void,
  provincesLoaded: Schema.Struct({ options: Schema.Array(RegionOptionSchema) }),
  selectProvince: Schema.Struct({ code: Schema.String }),
  citiesLoaded: Schema.Struct({ options: Schema.Array(RegionOptionSchema) }),
  selectCity: Schema.Struct({ code: Schema.String }),
  districtsLoaded: Schema.Struct({ options: Schema.Array(RegionOptionSchema) }),
  selectDistrict: Schema.Struct({ code: Schema.String }),
}

// ============================================================================
// 类型导出
// ============================================================================

export type RegionOption = Schema.Schema.Type<typeof RegionOptionSchema>
export type RegionSelectorState = Schema.Schema.Type<typeof RegionSelectorStateSchema>

// ============================================================================
// Module 定义（含 Reducers）
// ============================================================================

export const RegionSelectorModule = Module.make('RegionSelector', {
  state: RegionSelectorStateSchema,
  actions: RegionSelectorActionMap,
  reducers: {
    loadProvinces: (s) => ({
      ...s,
      loading: { ...s.loading, provinces: true },
    }),
    provincesLoaded: (s, action) => ({
      ...s,
      provinceOptions: action.payload.options,
      loading: { ...s.loading, provinces: false },
    }),
    selectProvince: (s, action) => ({
      ...s,
      province: action.payload.code,
      city: null,
      district: null,
      cityOptions: [],
      districtOptions: [],
      loading: { ...s.loading, cities: true },
    }),
    citiesLoaded: (s, action) => ({
      ...s,
      cityOptions: action.payload.options,
      loading: { ...s.loading, cities: false },
    }),
    selectCity: (s, action) => ({
      ...s,
      city: action.payload.code,
      district: null,
      districtOptions: [],
      loading: { ...s.loading, districts: true },
    }),
    districtsLoaded: (s, action) => ({
      ...s,
      districtOptions: action.payload.options,
      loading: { ...s.loading, districts: false },
    }),
    selectDistrict: (s, action) => ({
      ...s,
      district: action.payload.code,
    }),
  },
})

// ============================================================================
// Logic 定义
// ============================================================================

export const RegionSelectorLogic = RegionSelectorModule.logic(($) => ({
  setup: Effect.void,
  run: Effect.gen(function* () {
    // 监听省份选择 → 加载城市
    yield* $.onAction('selectProvince').runParallelFork((action) =>
      Effect.gen(function* () {
        yield* Effect.log(`选择省份: ${action.payload.code}`)
        const cities = yield* mockLoadCities(action.payload.code)
        yield* $.actions.dispatch({
          _tag: 'citiesLoaded',
          payload: { options: cities },
        })
      }),
    )

    // 监听城市选择 → 加载区县
    yield* $.onAction('selectCity').runParallelFork((action) =>
      Effect.gen(function* () {
        yield* Effect.log(`选择城市: ${action.payload.code}`)
        const districts = yield* mockLoadDistricts(action.payload.code)
        yield* $.actions.dispatch({
          _tag: 'districtsLoaded',
          payload: { options: districts },
        })
      }),
    )

    // 初始加载省份列表
    yield* $.actions.dispatch({ _tag: 'loadProvinces', payload: undefined })
    const provinces = yield* mockLoadProvinces()
    yield* $.actions.dispatch({
      _tag: 'provincesLoaded',
      payload: { options: provinces },
    })
  }),
}))

// ============================================================================
// ModuleImpl
// ============================================================================

export const RegionSelectorImpl = RegionSelectorModule.implement({
  initial: {
    province: null,
    city: null,
    district: null,
    provinceOptions: [],
    cityOptions: [],
    districtOptions: [],
    loading: {
      provinces: false,
      cities: false,
      districts: false,
    },
  },
  logics: [RegionSelectorLogic],
})

// ============================================================================
// Mock API (临时实现，后续由 Layer 注入)
// ============================================================================

function mockLoadProvinces(): Effect.Effect<RegionOption[]> {
  return Effect.succeed([
    { code: '44', name: '广东' },
    { code: '33', name: '浙江' },
    { code: '32', name: '江苏' },
  ]).pipe(Effect.delay('100 millis'))
}

function mockLoadCities(provinceCode: string): Effect.Effect<RegionOption[]> {
  const cityMap: Record<string, RegionOption[]> = {
    '44': [
      { code: '4401', name: '广州' },
      { code: '4403', name: '深圳' },
      { code: '4419', name: '东莞' },
    ],
    '33': [
      { code: '3301', name: '杭州' },
      { code: '3302', name: '宁波' },
    ],
    '32': [
      { code: '3201', name: '南京' },
      { code: '3202', name: '苏州' },
    ],
  }
  return Effect.succeed(cityMap[provinceCode] ?? []).pipe(Effect.delay('100 millis'))
}

function mockLoadDistricts(cityCode: string): Effect.Effect<RegionOption[]> {
  const districtMap: Record<string, RegionOption[]> = {
    '4401': [
      { code: '440103', name: '荔湾区' },
      { code: '440104', name: '越秀区' },
      { code: '440105', name: '海珠区' },
    ],
    '4403': [
      { code: '440303', name: '罗湖区' },
      { code: '440304', name: '福田区' },
      { code: '440305', name: '南山区' },
    ],
  }
  return Effect.succeed(districtMap[cityCode] ?? []).pipe(Effect.delay('100 millis'))
}
