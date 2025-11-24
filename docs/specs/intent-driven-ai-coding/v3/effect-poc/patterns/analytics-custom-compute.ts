import { Effect, Schema } from "effect";
import { LogicDSL } from "../shared/dsl";
import { definePattern } from "../shared/pattern";

// 在 Pattern 内部混入原生 Effect 计算的黑盒代码块，
// 验证 Parser 未来的 Black Box 识别场景。

export interface AnalyticsConfig {
  sourceService: string;
  targetService: string;
}

export interface RawEvent {
  type: string;
  value: number;
}

export interface AggregatedMetric {
  type: string;
  total: number;
}

export const AnalyticsWithCustomComputePattern = definePattern<AnalyticsConfig>({
  id: "poc/analytics/custom-compute",
  version: "1.0.0",
  tags: ["analytics", "compute", "blackbox"],
  config: Schema.Struct({
    sourceService: Schema.String,
    targetService: Schema.String
  }),
  body: config =>
    Effect.gen(function*(_) {
      const dsl = yield* _(LogicDSL);

      yield* dsl.log(
        `analytics.start source=${config.sourceService} target=${config.targetService}`
      );

      const events = yield* dsl.call<ReadonlyArray<RawEvent>>(
        config.sourceService,
        "listEvents",
        {}
      );

      // Black Box：复杂的原生计算逻辑，不依赖 DSL。
      const metrics = yield* Effect.sync(() => {
        const byType = new Map<string, number>();
        for (const ev of events) {
          const prev = byType.get(ev.type) ?? 0;
          byType.set(ev.type, prev + ev.value);
        }
        const result: AggregatedMetric[] = [];
        for (const [type, total] of byType.entries()) {
          result.push({ type, total });
        }
        return result;
      });

      yield* dsl.call(
        config.targetService,
        "saveMetrics",
        { metrics }
      );

      yield* dsl.set("ui.analytics.lastMetrics", metrics);
      yield* dsl.log("analytics.done");
    })
});

