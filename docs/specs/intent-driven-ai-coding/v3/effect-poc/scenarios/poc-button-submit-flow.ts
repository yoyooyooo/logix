import { Effect } from "effect";
import { LogicDSL } from "../shared/dsl";
import { ConsoleRuntime } from "../shared/runtime";
import { ButtonSubmitFlowPattern } from "../patterns/button-submit-flow";

// PoC：带 emit/on 的 UI 触发流程。
// 1. 使用 Pattern 注册一个按钮点击的提交逻辑。
// 2. 通过 emit 模拟 UI 层的点击事件，观察 Runtime 日志与状态变化。

const program = Effect.gen(function*(_) {
  const dsl = yield* _(LogicDSL);

  // 注册：当 "button:submit" 事件触发时执行提交逻辑
  yield* ButtonSubmitFlowPattern({
    event: "button:submit",
    service: "OrderService",
    method: "submit"
  });

  // 模拟 UI 层发出的事件
  yield* dsl.emit("button:submit", { source: "poc" });
});

void Effect.runPromise(
  program.pipe(Effect.provide(ConsoleRuntime))
);

