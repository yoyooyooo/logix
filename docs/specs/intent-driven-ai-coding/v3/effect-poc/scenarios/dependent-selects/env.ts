import type { BasePlatformEnv } from '../../effect-poc/shared/effect-types'

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

