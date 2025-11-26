import { Effect, Schema } from "effect";
import { LogicDSL } from "../shared/dsl";
import { definePattern } from "../shared/pattern";

export interface OptimisticToggleConfig {
  id: string;
  nextValue: boolean;
}

// 乐观切换开关：调用方在 UI 层先更新本地 state，再调用此 Pattern
export const OptimisticTogglePattern = definePattern<OptimisticToggleConfig>({
  id: "poc/optimistic-toggle",
  version: "1.0.0",
  tags: ["toggle", "optimistic"],
  config: Schema.Struct({
    id: Schema.String,
    nextValue: Schema.Boolean
  }),
  body: ({ id, nextValue }) =>
    Effect.gen(function*(_) {
      const dsl = yield* _(LogicDSL);

      yield* dsl.log(
        `toggleFlag.start id=${id} nextValue=${nextValue}`
      );

      try {
        yield* dsl.call(
          "ToggleService",
          "toggleFlag",
          { id, nextValue }
        );

        yield* dsl.log(
          `toggleFlag.done id=${id} nextValue=${nextValue}`
        );
      } catch (error) {
        // 在 PoC 中简单记录错误；真实实现中可结合领域错误类型
        yield* dsl.log(
          `toggleFlag.failed id=${id} nextValue=${nextValue} error=${String(
            error
          )}`
        );
        // 将错误重新抛出交给上层处理
        throw error;
      }
    })
});

