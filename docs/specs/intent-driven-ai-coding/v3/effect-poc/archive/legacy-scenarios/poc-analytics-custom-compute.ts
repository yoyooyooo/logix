import { Effect } from "effect";
import { LogicDSL } from "../shared/dsl";
import { ConsoleRuntime } from "../shared/runtime";
import {
  AnalyticsWithCustomComputePattern,
  type AnalyticsConfig
} from "../patterns/analytics-custom-compute";

// PoC：包含黑盒计算逻辑的统计 Pattern。

const program = Effect.gen(function*(_) {
  const dsl = yield* _(LogicDSL);

  yield* dsl.log("poc.analyticsCustomCompute.start");

  const analyticsConfig: AnalyticsConfig = {
    sourceService: "AnalyticsEventService",
    targetService: "AnalyticsMetricService"
  };
  yield* dsl.run(AnalyticsWithCustomComputePattern, analyticsConfig);

  yield* dsl.log("poc.analyticsCustomCompute.done");
});

void Effect.runPromise(
  program.pipe(Effect.provide(ConsoleRuntime))
);
