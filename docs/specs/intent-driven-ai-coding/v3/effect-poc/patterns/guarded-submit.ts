import { Effect, Schema } from "effect";
import { LogicDSL } from "../shared/dsl";
import { definePattern } from "../shared/pattern";

// 使用 DSL.get + DSL.branch 的守卫式提交 Pattern。
// 典型场景：表单是否通过校验，由某个 state path 决定。

export interface GuardedSubmitConfig {
  guardStatePath: string;
  service: string;
  method: string;
  fallbackMessage?: string;
}

export const GuardedSubmitPattern = definePattern<GuardedSubmitConfig>({
  id: "poc/guarded-submit",
  version: "1.0.0",
  tags: ["guard", "submit"],
  config: Schema.Struct({
    guardStatePath: Schema.String,
    service: Schema.String,
    method: Schema.String,
    fallbackMessage: Schema.optional(Schema.String)
  }),
  body: config =>
    Effect.gen(function*(_) {
      const dsl = yield* _(LogicDSL);

      const allowed = (yield* dsl.get<boolean>(
        config.guardStatePath
      )) ?? false;

      yield* dsl.log(
        `guardedSubmit.check path=${config.guardStatePath} allowed=${allowed}`
      );

      yield* dsl.branch(
        !!allowed,
        dsl
          .call(
            config.service,
            config.method,
            {}
          )
          .pipe(Effect.asVoid),
        dsl
          .call(
            "NotificationService",
            "info",
            {
              message:
                config.fallbackMessage ??
                "当前条件未满足，已拦截提交"
            }
          )
          .pipe(Effect.asVoid)
      );
    })
});

