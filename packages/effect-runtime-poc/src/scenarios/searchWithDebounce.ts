import * as Effect from 'effect/Effect'
import type { BasePlatformEnv, Fx } from '../shared/base'

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

// 单次搜索调用：防抖/取消由 UI/调用方控制，本 Flow 只负责一次请求。
export const searchOnceFlow =
  (keyword: string): Fx<SearchEnv, never, SearchResult[]> =>
  Effect.gen(function* () {
    const env = yield* Effect.context<SearchEnv>()
    env.logger.info('search.start', { keyword })
    if (!keyword.trim()) {
      return []
    }
    const results = yield* Effect.promise(() => env.SearchService.search(keyword))
    env.logger.info('search.done', { keyword, count: results.length })
    return results
  })

