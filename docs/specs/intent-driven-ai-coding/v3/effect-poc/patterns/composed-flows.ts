import { Effect, Schema } from "effect";
import { LogicDSL } from "../shared/dsl";
import { definePattern } from "../shared/pattern";

export interface ReliableSubmitConfig {
  service: string;
  method: string;
  retryTimes?: number;
  timeoutMs?: number;
}

const ReliableSubmitConfigSchema = Schema.Struct({
  service: Schema.String,
  method: Schema.String,
  retryTimes: Schema.optional(Schema.Number),
  timeoutMs: Schema.optional(Schema.Number)
});

// 带超时与重试的提交 Pattern：演示在 Pattern 内组合 Effect 高级 API
export const ReliableSubmitPattern = definePattern<ReliableSubmitConfig>({
  id: "poc/reliable-submit",
  version: "1.0.0",
  tags: ["retry", "submit"],
  config: ReliableSubmitConfigSchema,
  body: config =>
    Effect.gen(function*(_) {
      const dsl = yield* _(LogicDSL);

      const retryTimes = config.retryTimes ?? 3;
      const timeoutMs = config.timeoutMs ?? 5_000;

      const baseCall = Effect.gen(function*() {
        yield* dsl.log(
          `reliableSubmit.call service=${config.service} method=${config.method}`
        );
        return yield* dsl.call<unknown>(
          config.service,
          config.method,
          {}
        );
      });

      const withTimeout = baseCall.pipe(
        Effect.timeoutFail({
          duration: timeoutMs,
          onTimeout: () =>
            new Error(
              "reliableSubmit.timeout"
            )
        })
      );

      const retried = Effect.retry(withTimeout, {
        times: retryTimes
      });

      yield* retried;

      yield* dsl.log(
        `reliableSubmit.done service=${config.service} method=${config.method} retryTimes=${retryTimes}`
      );
    })
});

export interface GuardedReliableSubmitConfig {
  guardPath: string;
  expectedValue?: boolean;
  submit: ReliableSubmitConfig;
  invalidMessage?: string;
}

const GuardedReliableSubmitConfigSchema = Schema.Struct({
  guardPath: Schema.String,
  expectedValue: Schema.optional(Schema.Boolean),
  submit: ReliableSubmitConfigSchema,
  invalidMessage: Schema.optional(Schema.String)
});

// 组合 Pattern：先读取守卫状态，再在通过时调用子 Pattern
export const GuardedReliableSubmitPattern =
  definePattern<GuardedReliableSubmitConfig>({
    id: "poc/guarded-reliable-submit",
    version: "1.0.0",
    tags: ["guard", "submit", "retry"],
    config: GuardedReliableSubmitConfigSchema,
    body: config =>
      Effect.gen(function*(_) {
        const dsl = yield* _(LogicDSL);

        const expected = config.expectedValue ?? true;
        const current = yield* dsl.get<boolean>(
          config.guardPath
        );

        yield* dsl.log(
          `guardedReliableSubmit.check path=${config.guardPath} expected=${expected} actual=${String(
            current
          )}`
        );
        if (current === expected) {
          yield* ReliableSubmitPattern(config.submit);
        } else {
          yield* dsl.log("guardedReliableSubmit.blocked");
          const msg =
            config.invalidMessage ??
            "条件未满足，已阻止提交";
          yield* dsl.call(
            "NotificationService",
            "info",
            { message: msg }
          );
        }
      })
  });
