import * as Effect from 'effect/Effect'
import type { BasePlatformEnv, Fx } from '../shared/base'

export interface Province {
  code: string
  name: string
}

export interface City {
  code: string
  name: string
  provinceCode: string
}

export interface District {
  code: string
  name: string
  cityCode: string
}

export interface LocationService {
  listProvinces: () => Promise<Province[]>
  listCities: (provinceCode: string) => Promise<City[]>
  listDistricts: (cityCode: string) => Promise<District[]>
}

export interface DependentSelectEnv extends BasePlatformEnv {
  LocationService: LocationService
}

export const loadProvincesFlow: Fx<DependentSelectEnv, never, Province[]> = Effect.gen(
  function* () {
    const env = yield* Effect.context<DependentSelectEnv>()
    env.logger.info('location.loadProvinces.start')
    const provinces = yield* Effect.promise(() => env.LocationService.listProvinces())
    env.logger.info('location.loadProvinces.done', { count: provinces.length })
    return provinces
  },
)

export const onProvinceChangeFlow =
  (provinceCode: string): Fx<
    DependentSelectEnv,
    never,
    { cities: City[]; districts: District[] }
  > =>
  Effect.gen(function* () {
    const env = yield* Effect.context<DependentSelectEnv>()
    env.logger.info('location.onProvinceChange', { provinceCode })
    const cities = yield* Effect.promise(() =>
      env.LocationService.listCities(provinceCode),
    )
    const districts: District[] = []
    return { cities, districts }
  })

export const onCityChangeFlow =
  (cityCode: string): Fx<DependentSelectEnv, never, District[]> =>
  Effect.gen(function* () {
    const env = yield* Effect.context<DependentSelectEnv>()
    env.logger.info('location.onCityChange', { cityCode })
    const districts = yield* Effect.promise(() =>
      env.LocationService.listDistricts(cityCode),
    )
    env.logger.info('location.loadDistricts.done', { count: districts.length })
    return districts
  })

