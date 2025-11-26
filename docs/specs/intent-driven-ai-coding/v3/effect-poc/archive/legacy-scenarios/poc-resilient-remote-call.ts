import { Effect } from "effect";
import { LogicDSL } from "../shared/dsl";
import { ConsoleRuntime } from "../shared/runtime";
import {
  ResilientRemoteCallPattern,
  type ResilientRemoteCallConfig
} from "../patterns/resilient-remote-call";

// PoC：带重试与超时语义的远程调用 Pattern。

const program = Effect.gen(function*(_) {
  const dsl = yield* _(LogicDSL);

  yield* dsl.log("poc.resilientRemoteCall.start");

  // 在 ConsoleRuntime 中不会真正超时或重试失败，但能验证类型与调用链。
  const callConfig: ResilientRemoteCallConfig = {
    service: "OrderService",
    method: "syncStatus",
    retryTimes: 3,
    timeoutMillis: 1_000
  };
  yield* dsl.run(ResilientRemoteCallPattern, callConfig);

  yield* dsl.log("poc.resilientRemoteCall.done");
});

void Effect.runPromise(
  program.pipe(Effect.provide(ConsoleRuntime))
);
