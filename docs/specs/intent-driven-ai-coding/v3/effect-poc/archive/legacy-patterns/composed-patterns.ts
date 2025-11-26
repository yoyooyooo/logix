import { Effect, Schema } from "effect";
import { LogicDSL } from "../shared/dsl";
import { definePattern } from "../shared/pattern";
import { ResilientRemoteCallPattern, ResilientRemoteCallConfig } from "./resilient-remote-call";
import { ParallelLoadPattern, ParallelLoadConfig } from "./parallel-load";

// Pattern 组合压力测试：在一个 Pattern 内部串联调用多个 Pattern，
// 验证 Pattern<C> 作为高阶积木的可组合性。

const CompositeFlowConfigSchema = Schema.Struct({
  user: Schema.Struct({
    userId: Schema.String
  }),
  remoteCall: Schema.Struct({
    service: Schema.String,
    method: Schema.String,
    retryTimes: Schema.Number,
    timeoutMillis: Schema.Number
  })
});

export type CompositeFlowConfig = Schema.Schema.Type<typeof CompositeFlowConfigSchema>;

export const CompositeUserFlowPattern = definePattern<CompositeFlowConfig>({
  id: "poc/composite/user-flow",
  version: "1.0.0",
  tags: ["composed", "user-flow"],
  config: CompositeFlowConfigSchema,
  body: config =>
    Effect.gen(function*(_) {
      const dsl = yield* _(LogicDSL);

      yield* dsl.log(
        `compositeUserFlow.start userId=${config.user.userId}`
      );

      // 1) 并行加载用户相关数据
      const parallelConfig: ParallelLoadConfig = {
        userId: config.user.userId
      };
      yield* dsl.run(ParallelLoadPattern, parallelConfig);

      // 2) 在加载完成后执行一次带重试的远程调用
      const remoteConfig: ResilientRemoteCallConfig = {
        service: config.remoteCall.service,
        method: config.remoteCall.method,
        retryTimes: config.remoteCall.retryTimes,
        timeoutMillis: config.remoteCall.timeoutMillis
      };
      yield* dsl.run(ResilientRemoteCallPattern, remoteConfig);

      yield* dsl.log("compositeUserFlow.done");
    })
});
