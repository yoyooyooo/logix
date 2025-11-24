import { Effect, Schema } from "effect";
import { LogicDSL } from "../shared/dsl";
import { definePattern } from "../shared/pattern";

// 使用 Effect.retry + Effect.timeoutFail 包装一次远程调用，验证
// Pattern 内组合 Effect 高级 API 与 DSL 的边界。

export interface ResilientRemoteCallConfig {
  service: string;
  method: string;
  retryTimes: number;
  timeoutMillis: number;
}

class RemoteTimeoutError {
  readonly _tag = "RemoteTimeoutError";
}

export const ResilientRemoteCallPattern = definePattern<ResilientRemoteCallConfig>({
  id: "poc/resilient-remote-call",
  version: "1.0.0",
  tags: ["retry", "timeout", "remote-call"],
  config: Schema.Struct({
    service: Schema.String,
    method: Schema.String,
    retryTimes: Schema.Number,
    timeoutMillis: Schema.Number
  }),
  body: config =>
    Effect.gen(function*(_) {
      const dsl = yield* _(LogicDSL);

      yield* dsl.log(
        `resilientCall.start service=${config.service} method=${config.method} retry=${config.retryTimes} timeout=${config.timeoutMillis}ms`
      );

      const baseCall = dsl.call<unknown>(
        config.service,
        config.method,
        {}
      );

      const withTimeout = baseCall.pipe(
        Effect.timeoutFail({
          duration: config.timeoutMillis,
          onTimeout: () => new RemoteTimeoutError()
        })
      );

      const withRetry = Effect.retry(withTimeout, {
        times: config.retryTimes
      });

      const result = yield* withRetry;

      yield* dsl.set("ui.resilientRemoteCall.lastResult", result as unknown);
      yield* dsl.log("resilientCall.done");
    })
});

