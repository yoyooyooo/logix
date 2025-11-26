import { Effect, Schema } from "effect";
import { LogicDSL } from "../shared/dsl";
import { definePattern } from "../shared/pattern";

// 复杂配置 Schema 压力测试：通知规则
// - 覆盖嵌套 Struct、数组、字面量联合、可选字段等典型前端表单场景。

const ChannelSchema = Schema.Union(
  Schema.Literal("email" as const),
  Schema.Literal("sms" as const),
  Schema.Literal("inapp" as const)
);

const ChannelsSchema = Schema.Array(ChannelSchema);

const SimpleRuleSchema = Schema.Struct({
  mode: Schema.Literal("simple" as const),
  channels: ChannelsSchema,
  enabled: Schema.Boolean
});

const AdvancedRuleSchema = Schema.Struct({
  mode: Schema.Literal("advanced" as const),
  channels: ChannelsSchema,
  threshold: Schema.Number,
  windowMinutes: Schema.Number
});

const NotificationRuleSchema = Schema.Union(SimpleRuleSchema, AdvancedRuleSchema);

export type SimpleNotificationRule = Schema.Schema.Type<typeof SimpleRuleSchema>;
export type AdvancedNotificationRule = Schema.Schema.Type<typeof AdvancedRuleSchema>;
export type NotificationRuleConfig = Schema.Schema.Type<typeof NotificationRuleSchema>;

export const NotificationRulePattern = definePattern<NotificationRuleConfig>({
  id: "poc/notification/rule",
  version: "1.0.0",
  tags: ["notification", "rules"],
  config: NotificationRuleSchema,
  body: config =>
    Effect.gen(function*(_) {
      const dsl = yield* _(LogicDSL);

      yield* dsl.log(
        `notificationRule.apply mode=${config.mode} channels=${JSON.stringify(
          config.channels
        )}`
      );

      // 将规则写入状态，供 UI 层直接消费
      yield* dsl.set("ui.notification.rule", config);

      // 通知后端服务保存 / 校验规则
      yield* dsl.call(
        "NotificationRuleService",
        "applyRule",
        config
      );
    })
});
