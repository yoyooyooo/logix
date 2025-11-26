import { Effect } from "effect";
import { LogicDSL } from "../shared/dsl";
import { ConsoleRuntime } from "../shared/runtime";
import {
  NotificationRulePattern,
  type NotificationRuleConfig
} from "../patterns/notification-rules";

// PoC：复杂配置 Schema 的 Pattern，验证 Wizard 场景。

const program = Effect.gen(function*(_) {
  const dsl = yield* _(LogicDSL);

  yield* dsl.log("poc.notificationRules.start");

  // 使用 advanced 模式示例
  const advancedRule: NotificationRuleConfig = {
    mode: "advanced",
    channels: ["email", "inapp"],
    threshold: 10,
    windowMinutes: 15
  };
  yield* dsl.run(NotificationRulePattern, advancedRule);

  yield* dsl.log("poc.notificationRules.done");
});

void Effect.runPromise(
  program.pipe(Effect.provide(ConsoleRuntime))
);
