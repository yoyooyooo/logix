import { Effect, Schema } from "effect";
import { LogicDSL } from "../shared/dsl";
import { definePattern } from "../shared/pattern";

export interface SearchResult {
  id: string;
  label: string;
}

// 单次搜索调用：防抖 / 取消由调用方控制，本 Pattern 只负责一次请求与结果落盘
export const SearchOncePattern = definePattern<{
  keyword: string;
  bindTo?: string;
}>({
  id: "poc/search-with-debounce/once",
  version: "1.0.0",
  tags: ["search"],
  config: Schema.Struct({
    keyword: Schema.String,
    bindTo: Schema.optional(Schema.String)
  }),
  body: ({ keyword, bindTo }) =>
    Effect.gen(function*(_) {
      const dsl = yield* _(LogicDSL);

      yield* dsl.log(
        `search.start keyword=${keyword}`
      );

      const trimmed = keyword.trim();
      if (trimmed.length === 0) {
        if (bindTo) {
          yield* dsl.set(bindTo, [] as SearchResult[]);
        }
        return;
      }

      const results = yield* dsl.call<SearchResult[]>(
        "SearchService",
        "search",
        { keyword: trimmed }
      );

      yield* dsl.log(
        `search.done keyword=${keyword} count=${results.length}`
      );

      if (bindTo) {
        yield* dsl.set(bindTo, results);
      }
    })
});

