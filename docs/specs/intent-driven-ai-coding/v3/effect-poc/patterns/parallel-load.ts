import { Effect, Schema } from "effect";
import { LogicDSL } from "../shared/dsl";
import { definePattern } from "../shared/pattern";

// 并行读取多个服务的数据，并一次性写入状态。
// 验证 Pattern 内使用 Effect.all 聚合多个 DSL 调用的写法。

export interface ParallelLoadConfig {
  userId: string;
}

export const ParallelLoadPattern = definePattern<ParallelLoadConfig>({
  id: "poc/parallel-load",
  version: "1.0.0",
  tags: ["parallel", "load"],
  config: Schema.Struct({
    userId: Schema.String
  }),
  body: config =>
    Effect.gen(function*(_) {
      const dsl = yield* _(LogicDSL);

      yield* dsl.log(
        `parallelLoad.start userId=${config.userId}`
      );

      const [profile, preferences] = yield* Effect.all([
        dsl.call<Record<string, unknown>>(
          "UserService",
          "getProfile",
          { userId: config.userId }
        ),
        dsl.call<Record<string, unknown>>(
          "PreferenceService",
          "getPreferences",
          { userId: config.userId }
        )
      ]);

      yield* dsl.set("ui.user.profile", profile);
      yield* dsl.set("ui.user.preferences", preferences);

      yield* dsl.log("parallelLoad.done");
    })
});

