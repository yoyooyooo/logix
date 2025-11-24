# v3 Unified API 示例 (Unified API Example)

> **Status**: New
> **Description**: 展示 v3 架构下，如何使用 Unified API 和 Pattern 编写业务逻辑。

## 1. 定义 Pattern (The Asset)

首先，架构师定义一个可复用的“带重试的提交” Pattern。

```typescript
// patterns/reliable-submit.ts
import { definePattern } from "@logix/pattern";
import { LogicDSL } from "@logix/dsl";
import { Schema } from "@effect/schema";
import { Effect } from "effect";

export const ReliableSubmit = definePattern({
  id: "std/reliable-submit",
  version: "1.0.0",
  config: Schema.Struct({
    service: Schema.String,
    method: Schema.String,
    retry: Schema.Number.pipe(Schema.default(3))
  }),
  body: (config) => Effect.gen(function*(_) {
    const dsl = yield* _(LogicDSL);
    
    // 1. 设置 Loading
    yield* dsl.set("ui.submitting", true);
    
    // 2. 执行带重试的调用
    yield* dsl.retry(
      { times: config.retry },
      dsl.call(config.service, config.method, {})
    );
    
    // 3. 成功提示
    yield* dsl.emit("toast", "Success");
    
    // 4. 关闭 Loading
    yield* dsl.set("ui.submitting", false);
  })
});
```

## 2. 消费 Pattern (The Usage)

开发者在业务逻辑中直接调用这个 Pattern。

```typescript
// features/order/logic.ts
import { Effect } from "effect";
import { LogicDSL } from "@logix/dsl";
import { ReliableSubmit } from "@/patterns/reliable-submit";

export const createOrderFlow = Effect.gen(function*(_) {
  const dsl = yield* _(LogicDSL);
  
  // 1. 校验 (使用 DSL)
  const isValid = yield* dsl.get("ui.formValid");
  
  // 2. 分支
  yield* dsl.branch(
    isValid,
    // Then: 使用 Pattern
    ReliableSubmit({
      service: "OrderService",
      method: "create",
      retry: 5
    }),
    // Else: 简单提示
    dsl.emit("toast", "Form Invalid")
  );
});
```

## 3. 混合原生代码 (Hybrid Mode)

处理复杂数据时，直接混入原生 Effect 代码。

```typescript
// features/analytics/logic.ts
export const analyzeData = Effect.gen(function*(_) {
  const dsl = yield* _(LogicDSL);
  
  // [White Box] 获取数据
  const rawData = yield* dsl.call("DataService", "getRaw");
  
  // [Black Box] 复杂计算 (平台显示为代码块)
  const result = yield* Effect.sync(() => {
    return rawData.map(item => complexMath(item)).filter(x => x > 0);
  });
  
  // [White Box] 保存结果
  yield* dsl.call("DataService", "save", result);
});
```
