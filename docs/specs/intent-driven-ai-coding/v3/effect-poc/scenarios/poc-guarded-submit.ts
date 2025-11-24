import { Effect } from "effect";
import { LogicDSL } from "../shared/dsl";
import { ConsoleRuntime } from "../shared/runtime";
import { GuardedSubmitPattern } from "../patterns/guarded-submit";

// PoC：使用 DSL.get + DSL.branch 的守卫式提交流程。

const program = Effect.gen(function*(_) {
  const dsl = yield* _(LogicDSL);

  // 场景 1：guard 为 false，触发拦截提示
  yield* dsl.set("ui.formValid", false);
  yield* GuardedSubmitPattern({
    guardStatePath: "ui.formValid",
    service: "OrderService",
    method: "submit",
    fallbackMessage: "表单未通过校验，已拦截提交"
  });

  // 场景 2：guard 为 true，允许提交
  yield* dsl.set("ui.formValid", true);
  yield* GuardedSubmitPattern({
    guardStatePath: "ui.formValid",
    service: "OrderService",
    method: "submit",
    fallbackMessage: "表单未通过校验，已拦截提交"
  });
});

void Effect.runPromise(
  program.pipe(Effect.provide(ConsoleRuntime))
);

