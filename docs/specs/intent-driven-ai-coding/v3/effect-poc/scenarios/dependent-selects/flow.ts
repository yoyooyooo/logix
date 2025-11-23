import type { Effect } from '../../effect-poc/shared/effect-types'
import type {
  City,
  DependentSelectEnv,
  District,
  Province,
} from './env'

// 加载省份列表
export const loadProvincesFlow: Effect<DependentSelectEnv, never, Province[]> = async env => {
  env.logger.info('location.loadProvinces.start')
  const provinces = await env.LocationService.listProvinces()
  env.logger.info('location.loadProvinces.done', { count: provinces.length })
  return provinces
}

// 省份变更时：根据省份加载城市，并清空区县
export const onProvinceChangeFlow =
  (provinceCode: string): Effect<DependentSelectEnv, never, { cities: City[]; districts: District[] }> =>
  async env => {
    env.logger.info('location.onProvinceChange', { provinceCode })
    const cities = await env.LocationService.listCities(provinceCode)
    // 省份变更时，区县选项应清空，由 UI 层重置 district 字段
    const districts: District[] = []
    return { cities, districts }
  }

// 城市变更时：根据城市加载区县
export const onCityChangeFlow =
  (cityCode: string): Effect<DependentSelectEnv, never, District[]> =>
  async env => {
    env.logger.info('location.onCityChange', { cityCode })
    const districts = await env.LocationService.listDistricts(cityCode)
    env.logger.info('location.loadDistricts.done', { count: districts.length })
    return districts
  }

