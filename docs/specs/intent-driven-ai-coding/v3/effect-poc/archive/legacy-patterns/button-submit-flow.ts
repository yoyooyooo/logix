import { Effect, Schema } from "effect";
import { LogicDSL } from "../shared/dsl";
import { definePattern } from "../shared/pattern";

// UI 触发流程 PoC：将一次按钮点击事件映射为提交逻辑。
// 调用方负责在 UI 层选择事件名，在逻辑层用 emit/on 关联。

const ButtonSubmitFlowConfigSchema = Schema.Struct({
  event: Schema.String,
  service: Schema.String,
  method: Schema.String
});

export type ButtonSubmitFlowConfig = Schema.Schema.Type<typeof ButtonSubmitFlowConfigSchema>;

export const ButtonSubmitFlowPattern = definePattern<ButtonSubmitFlowConfig>({
  id: "poc/ui/button-submit-flow",
  version: "1.0.0",
  tags: ["ui", "button", "submit"],
  config: ButtonSubmitFlowConfigSchema,
  body: config =>
    Effect.gen(function*(_) {
      const dsl = yield* _(LogicDSL);

      yield* dsl.log(
        `buttonSubmitFlow.register event=${config.event} service=${config.service} method=${config.method}`
      );

      // 在 DSL 层声明“当某个 UI 事件触发时要执行的逻辑”
      yield* dsl.on(config.event, () =>
        Effect.gen(function*() {
          yield* dsl.log(
            `buttonSubmitFlow.handle event=${config.event}`
          );
          yield* dsl.set("ui.button.submitting", true);
          yield* dsl.call(
            config.service,
            config.method,
            {}
          );
          yield* dsl.set("ui.button.submitting", false);
          yield* dsl.emit("toast", {
            level: "success",
            message: "提交成功"
          });
        })
      );
    })
});
