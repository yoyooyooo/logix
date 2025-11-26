import { Effect, Schema } from "effect";
import { LogicDSL } from "../shared/dsl";
import { definePattern } from "../shared/pattern";

// 使用 DSL.get 的守卫式提交 Pattern。
// 典型场景：表单是否通过校验，由某个 state path 决定。

const GuardedSubmitConfigSchema = Schema.Struct({
  guardStatePath: Schema.String,
  service: Schema.String,
  method: Schema.String,
  fallbackMessage: Schema.optional(Schema.String)
});

export type GuardedSubmitConfig = Schema.Schema.Type<typeof GuardedSubmitConfigSchema>;

export const GuardedSubmitPattern = definePattern<GuardedSubmitConfig>({
  id: "poc/guarded-submit",
  version: "1.0.0",
  tags: ["guard", "submit"],
  config: GuardedSubmitConfigSchema,
  body: config =>
    Effect.gen(function*(_) {
      const dsl = yield* _(LogicDSL);

      const allowed = (yield* dsl.get<boolean>(
        config.guardStatePath
      )) ?? false;

      yield* dsl.log(
        `guardedSubmit.check path=${config.guardStatePath} allowed=${allowed}`
      );

      if (allowed) {
        yield* dsl.call(
          config.service,
          config.method,
          {}
        ).pipe(Effect.asVoid);
      } else {
        const message =
          config.fallbackMessage ??
          "当前条件未满足，已拦截提交";
        yield* dsl.call(
          "NotificationService",
          "info",
          { message }
        ).pipe(Effect.asVoid);
      }
    })
});
