import * as Effect from "effect/Effect";
import * as Context from "effect/Context";
import { LoggerTag } from "../runtime/tags";

export interface SearchResult {
  id: string;
  label: string;
}

export interface SearchService {
  search: (keyword: string) => Promise<SearchResult[]>;
}

export class SearchServiceTag extends Context.Tag("SearchService")<
  SearchServiceTag,
  SearchService
>() {}

export type SearchEnv = LoggerTag | SearchServiceTag;

// 单次搜索调用：防抖/取消由 UI/调用方控制，本 Flow 只负责一次请求。
export const searchOnceFlow = (
  keyword: string,
): Effect.Effect<SearchResult[], never, SearchEnv> =>
  Effect.gen(function* () {
    const logger = yield* LoggerTag;
    const searchService = yield* SearchServiceTag;

    logger.info("search.start", { keyword });
    if (!keyword.trim()) {
      return [];
    }
    const results = yield* Effect.promise(() =>
      searchService.search(keyword),
    );
    logger.info("search.done", { keyword, count: results.length });
    return results;
  });
