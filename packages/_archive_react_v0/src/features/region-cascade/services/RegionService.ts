import { Context, Effect, Layer, Schedule, Config, Schema } from "effect"
import { HttpClient, HttpClientRequest, HttpClientResponse } from "@effect/platform"
import { RegionSchema, ApiError } from "../types/region"
import type { Region } from "../types/region"

const provincesData: Array<Region> = [
  { id: "p1", name: "北京市", code: "110000" },
  { id: "p2", name: "浙江省", code: "330000" },
  { id: "p3", name: "广东省", code: "440000" }
]

const citiesByProvince: Record<string, Array<Region>> = {
  p1: [
    { id: "c101", name: "北京城区", code: "110100" },
    { id: "c102", name: "北京近郊", code: "110200" }
  ],
  p2: [
    { id: "c201", name: "杭州市", code: "330100" },
    { id: "c202", name: "宁波市", code: "330200" }
  ],
  p3: [
    { id: "c301", name: "广州市", code: "440100" },
    { id: "c302", name: "深圳市", code: "440300" }
  ]
}

const districtsByCity: Record<string, Array<Region>> = {
  c101: [
    { id: "d1011", name: "东城区", code: "110101" },
    { id: "d1012", name: "朝阳区", code: "110105" }
  ],
  c102: [
    { id: "d1021", name: "昌平区", code: "110114" },
    { id: "d1022", name: "顺义区", code: "110113" }
  ],
  c201: [
    { id: "d2011", name: "西湖区", code: "330106" },
    { id: "d2012", name: "余杭区", code: "330110" }
  ],
  c202: [
    { id: "d2021", name: "鄞州区", code: "330212" },
    { id: "d2022", name: "北仑区", code: "330206" }
  ],
  c301: [
    { id: "d3011", name: "天河区", code: "440106" },
    { id: "d3012", name: "越秀区", code: "440104" }
  ],
  c302: [
    { id: "d3021", name: "南山区", code: "440305" },
    { id: "d3022", name: "福田区", code: "440304" }
  ]
}

// 导出 mockApi 以避免未使用警告
export const mockApi = {
  provinces: (): Promise<Array<Region>> => Promise.resolve(provincesData),

  cities: (provinceId: string): Promise<Array<Region>> =>
    Promise.resolve(citiesByProvince[provinceId] ?? []),

  districts: (cityId: string): Promise<Array<Region>> =>
    Promise.resolve(districtsByCity[cityId] ?? [])
}

export class RegionService extends Context.Tag("RegionService")<
  RegionService,
  {
    readonly fetchProvinces: Effect.Effect<Array<Region>, ApiError>
    readonly fetchCities: (provinceId: string) => Effect.Effect<Array<Region>, ApiError>
    readonly fetchDistricts: (cityId: string) => Effect.Effect<Array<Region>, ApiError>
  }
>() {}

const retryPolicy = Schedule.exponential("100 millis").pipe(
  Schedule.intersect(Schedule.recurs(3))
)

// 真实 HTTP 服务实现
export const RegionServiceHttpLive = Layer.effect(
  RegionService,
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient
    const baseUrl = yield* Config.string("VITE_API_BASE_URL").pipe(
      Config.withDefault("/api")
    )

    const request = (path: string) =>
      HttpClientRequest.get(`${baseUrl}${path}`).pipe(
        client.execute,
        // 使用 schemaBodyJson 进行类型安全的解析
        Effect.flatMap(
          HttpClientResponse.schemaBodyJson(Schema.Array(RegionSchema))
        ),
        Effect.map((regions): Array<Region> => Array.from(regions)),
        Effect.mapError((error) => {
          // 区分 ParseError 和其他错误
          if ((error as { _tag?: string })._tag === "ParseError") {
            return new ApiError(
              500,
              `Data Validation Error: ${String(error)}`
            )
          }

          if (
            typeof error === "object" &&
            error !== null &&
            "message" in error &&
            typeof (error as { message: unknown }).message === "string"
          ) {
            return new ApiError(500, (error as { message: string }).message)
          }

          return new ApiError(500, "Network Error")
        }),
        Effect.retry(retryPolicy)
      )

    return {
      fetchProvinces: request("/provinces"),
      fetchCities: (provinceId) => request(`/cities?provinceId=${provinceId}`),
      fetchDistricts: (cityId) => request(`/districts?cityId=${cityId}`)
    }
  })
)

export const RegionServiceMockLive = Layer.succeed(RegionService, {
  fetchProvinces: Effect.succeed(provincesData).pipe(
    Effect.delay("1 seconds")
  ),

  fetchCities: (provinceId: string) =>
    Effect.succeed(citiesByProvince[provinceId] ?? []).pipe(
      Effect.delay("1 seconds")
    ),

  fetchDistricts: (cityId: string) =>
    Effect.succeed(districtsByCity[cityId] ?? []).pipe(
      Effect.delay("1 seconds")
    )
})
