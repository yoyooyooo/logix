import { Effect } from "effect";
import { LogicDSL } from "../shared/dsl";
import { ConsoleRuntime } from "../shared/runtime";
import {
  CompositeUserFlowPattern,
  type CompositeFlowConfig
} from "../patterns/composed-patterns";

// PoC：Pattern 组合场景，验证 Pattern 作为高阶积木的可组合性。

const program = Effect.gen(function*(_) {
  const dsl = yield* _(LogicDSL);

  yield* dsl.log("poc.compositeUserFlow.start");

  const compositeConfig: CompositeFlowConfig = {
    user: {
      userId: "user-123"
    },
    remoteCall: {
      service: "OrderService",
      method: "submitWithAudit",
      retryTimes: 3,
      timeoutMillis: 2_000
    }
  };
  yield* dsl.run(CompositeUserFlowPattern, compositeConfig);

  yield* dsl.log("poc.compositeUserFlow.done");
});

void Effect.runPromise(
  program.pipe(Effect.provide(ConsoleRuntime))
);
