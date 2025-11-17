import type { Effect } from '../../effect-poc/shared/effect-types'
import type { SearchEnv, SearchResult } from './env'

// 单次搜索调用：防抖/取消由 UI/调用方控制，本 Flow 只负责一次请求。
export const searchOnceFlow =
  (keyword: string): Effect<SearchEnv, never, SearchResult[]> =>
  async env => {
    env.logger.info('search.start', { keyword })
    if (!keyword.trim()) {
      return []
    }
    const results = await env.SearchService.search(keyword)
    env.logger.info('search.done', { keyword, count: results.length })
    return results
  }

