import type { BasePlatformEnv } from '../../effect-poc/shared/effect-types'

export interface SearchResult {
  id: string
  label: string
}

export interface SearchService {
  search: (keyword: string) => Promise<SearchResult[]>
}

export interface SearchEnv extends BasePlatformEnv {
  SearchService: SearchService
}

