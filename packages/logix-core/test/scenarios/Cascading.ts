import { Effect, Context } from "effect"

export interface LocationService {
  getProvinces: () => Effect.Effect<string[]>
  getCities: (province: string) => Effect.Effect<string[]>
  getDistricts: (city: string) => Effect.Effect<string[]>
}

export class LocationService extends Context.Tag("LocationService")<
  LocationService,
  LocationService
>() {}

export const loadProvinces = Effect.gen(function* (_) {
  const service = yield* LocationService
  return yield* service.getProvinces()
})

export const onProvinceChange = (province: string) =>
  Effect.gen(function* (_) {
    const service = yield* LocationService
    const cities = yield* service.getCities(province)
    // Return next state or actions to update state
    return { cities, districts: [] }
  })

export const onCityChange = (city: string) =>
  Effect.gen(function* (_) {
    const service = yield* LocationService
    const districts = yield* service.getDistricts(city)
    return { districts }
  })
