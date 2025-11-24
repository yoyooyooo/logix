import { Effect, Schema } from "effect";
import { LogicDSL } from "../shared/dsl";
import { definePattern } from "../shared/pattern";
import { ResilientRemoteCallPattern } from "./resilient-remote-call";
import { ParallelLoadPattern } from "./parallel-load";

// Pattern 组合压力测试：在一个 Pattern 内部串联调用多个 Pattern，
// 验证 Pattern<C> 作为高阶积木的可组合性。

export interface CompositeFlowConfig {
  userId: string;
  service: string;
  method: string;
  retryTimes: number;
  timeoutMillis: number;
}

export const CompositeUserFlowPattern = definePattern<CompositeFlowConfig>({
  id: "poc/composite/user-flow",
  version: "1.0.0",
  tags: ["composed", "user-flow"],
  config: Schema.Struct({
    userId: Schema.String,
    service: Schema.String,
    method: Schema.String,
    retryTimes: Schema.Number,
    timeoutMillis: Schema.Number
  }),
  body: config =>
    Effect.gen(function*(_) {
      const dsl = yield* _(LogicDSL);

      yield* dsl.log(
        `compositeUserFlow.start userId=${config.userId}`
      );

      // 1) 并行加载用户相关数据
      yield* ParallelLoadPattern({
        userId: config.userId
      });

      // 2) 在加载完成后执行一次带重试的远程调用
      yield* ResilientRemoteCallPattern({
        service: config.service,
        method: config.method,
        retryTimes: config.retryTimes,
        timeoutMillis: config.timeoutMillis
      });

      yield* dsl.log("compositeUserFlow.done");
    })
});

