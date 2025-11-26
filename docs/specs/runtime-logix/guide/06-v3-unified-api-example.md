# v3 Unified API 示例 (Unified API Example)

> **Status**: New  
> **Description**: 展示 v3 架构下，如何使用 Effect-Native Unified API 和 Pattern 编写业务逻辑。  
> **Note**: 本文示例基于 Store / Logic / Flow / Pattern 的 v3 抽象。

## 1. 定义 Pattern (The Asset)

首先，架构师定义一个可复用的“带重试的提交” Pattern Function，并由 Builder 包装为 Pattern Asset。

```typescript
// patterns/reliable-submit.ts
import { definePattern } from "@logix/pattern";
import { Effect, Schema } from "effect";
import { HttpClient } from "@effect/platform";

export interface ReliableSubmitConfig {
  service: string;
  method: string;
  retry: number;
}

// 1. Pattern Function：真正执行的逻辑，完全基于 Effect / Service
export const reliableSubmitImpl = (config: ReliableSubmitConfig) =>
  Effect.gen(function* (_) {
    const client = yield* HttpClient;

    const call = client.request({
      // 实际项目中可约定 service/method -> URL/HTTP 方法的映射关系
      service: config.service,
      method: config.method
    });

    // 使用 Effect-native 重试语义
    return yield* Effect.retry(call, { times: config.retry });
  });

// 2. Pattern Asset：Builder 侧为其补充元数据与配置 Schema
export const ReliableSubmit = definePattern({
  id: "std/reliable-submit",
  version: "1.0.0",
  configSchema: Schema.Struct({
    service: Schema.String,
    method: Schema.String,
    retry: Schema.Number.pipe(Schema.default(3))
  }),
  impl: reliableSubmitImpl
});
```

## 2. 消费 Pattern (The Usage)

开发者在 Logix Logic 中直接调用 Pattern Function（或通过 Asset 的 `impl` 属性）。

```typescript
// features/order/logic.ts
import { Effect } from "effect";
import { Logic, Store } from "@/logix-core"; // 概念性导入
import { ReliableSubmit } from "@/patterns/reliable-submit";

// 假设已经有 Order 场景的 State / Action Schema
type OrderShape = Store.Shape<typeof OrderStateSchema, typeof OrderActionSchema>;

export const OrderLogic = Logic.make<OrderShape>(({ flow, state, control }) =>
  Effect.gen(function* (_) {
    // 1. 从 Action 获取提交触发源
    const submit$ = flow.fromAction(
      (a): a is { type: "order/submit" } => a.type === "order/submit"
    );

    // 2. 提交逻辑：包含校验 + Pattern 调用
    const handleSubmit = Effect.gen(function* (_) {
      const current = yield* state.read;

      // 使用 Control / Effect-native 表达分支
      yield* control.branch({
        if: current.ui.formValid,
        then: ReliableSubmit.impl({
          service: "OrderService",
          method: "create",
          retry: 5
        }),
        else: Effect.sync(() => {
          // 这里可以调用 Toast Service，或通过 state.update 写入 UI 提示
          console.warn("Form Invalid");
        })
      });
    });

    // 3. 将 Effect 挂到 Action 流上
    yield* submit$.pipe(flow.run(handleSubmit));
  })
);
```

## 3. 混合原生代码 (Hybrid Mode)

处理复杂数据时，在 Logic 内部直接混入原生 Effect 代码，平台将其视为 Black-Box Block。

```typescript
// features/analytics/logic.ts
import { Logic, Store } from "@/logix-core";
import { Effect } from "effect";

type AnalyticsShape = Store.Shape<
  typeof AnalyticsStateSchema,
  typeof AnalyticsActionSchema
>;

export const AnalyticsLogic = Logic.make<AnalyticsShape>(({ flow }) =>
  Effect.gen(function* (_) {
    const analyze$ = flow.fromAction(
      (a): a is { type: "analytics/analyze" } => a.type === "analytics/analyze"
    );

    const analyzeEffect = Effect.gen(function* (_) {
      // [White Box] 获取数据（通过 Service Tag 或 HttpClient）
      const rawData = yield* DataService.getRaw();

      // [Black Box] 复杂计算（平台显示为代码块）
      const result = yield* Effect.sync(() => {
        return rawData
          .map((item) => complexMath(item))
          .filter((x) => x > 0);
      });

      // [White Box] 保存结果
      yield* DataService.save(result);
    });

    yield* analyze$.pipe(flow.run(analyzeEffect));
  })
);
```
