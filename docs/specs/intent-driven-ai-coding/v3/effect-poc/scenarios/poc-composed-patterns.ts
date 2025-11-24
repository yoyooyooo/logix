import { Effect } from "effect";
import { LogicDSL } from "../shared/dsl";
import { ConsoleRuntime } from "../shared/runtime";
import {
  GuardedReliableSubmitPattern,
  ReliableSubmitPattern
} from "../patterns/composed-flows";

// 场景：组合 Pattern 的使用 —— 直接调用 ReliableSubmitPattern 以及 GuardedReliableSubmitPattern
const program = Effect.gen(function*(_) {
  const dsl = yield* _(LogicDSL);

  // 场景一：简单的可重试提交
  yield* dsl.log("poc.composed.simple.start");
  yield* ReliableSubmitPattern({
    service: "PaymentService",
    method: "charge",
    retryTimes: 3,
    timeoutMs: 2_000
  });
  yield* dsl.log("poc.composed.simple.done");

  // 场景二：带守卫的重试提交 —— 只有在 ui.canSubmit === true 时才真正触发
  yield* dsl.set("ui.canSubmit", true);
  yield* GuardedReliableSubmitPattern({
    guardPath: "ui.canSubmit",
    submit: {
      service: "OrderService",
      method: "create",
      retryTimes: 5,
      timeoutMs: 3_000
    },
    invalidMessage: "当前状态不允许提交订单"
  });

  // 再次调用，但守卫失败时应被拦截
  yield* dsl.set("ui.canSubmit", false);
  yield* GuardedReliableSubmitPattern({
    guardPath: "ui.canSubmit",
    submit: {
      service: "OrderService",
      method: "create",
      retryTimes: 1
    },
    invalidMessage: "守卫未通过，提交已取消"
  });
});

void Effect.runPromise(
  program.pipe(Effect.provide(ConsoleRuntime))
);

