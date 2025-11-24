# POC: 智能防抖搜索 (Smart Debounced Search)

> **Scenario**: CRM 系统中的客户搜索功能。
> **Goal**: 验证 v3 架构下 "AI Copilot -> Pattern -> Hybrid Coding" 的全链路工作流。

## 1. 场景描述 (The Context)

*   **UI**: 包含 `SearchInput` (输入框) 和 `CustomerTable` (表格)。
*   **Requirement**: 
    1. 监听输入框变化。
    2. 防抖 500ms。
    3. 调用 `CustomerService.search`。
    4. 处理竞态 (SwitchMap)：新请求发出去时，取消旧请求。
    5. 自动管理 Loading 状态。
    6. **变更需求**: 在搜索前增加一个复杂的埋点逻辑。

## 2. 资产准备 (Architect View)

架构师预先定义好了 `DebouncedSearch` Pattern。这是一个标准的“黑盒积木”。

```typescript
// src/patterns/std/search.ts
import { definePattern } from "@logix/pattern";
import { Schema } from "@effect/schema";
import { LogicDSL } from "@logix/dsl";
import { Effect } from "effect";

export const DebouncedSearch = definePattern({
  id: "std/search/debounced",
  version: "1.0.0",
  icon: "search",
  
  // 配置契约：决定了 AI 如何填参，以及 Wizard 长什么样
  config: Schema.Struct({
    delay: Schema.Number.pipe(Schema.default(300)),
    service: Schema.String,
    method: Schema.String,
    bindTo: Schema.String, // 状态路径
    loadingPath: Schema.String.optional()
  }),

  // 逻辑实现：封装了复杂的并发控制
  body: (config) => Effect.gen(function*(_) {
    const dsl = yield* _(LogicDSL);
    
    // 1. 防抖
    yield* dsl.debounce(config.delay);
    
    // 2. 设置 Loading
    if (config.loadingPath) {
      yield* dsl.set(config.loadingPath, true);
    }
    
    // 3. 服务调用 (使用 switchMap 处理竞态)
    // 注意：这里简化了写法，实际 DSL 会处理 switchMap
    const result = yield* dsl.call(config.service, config.method, dsl.payload);
    
    // 4. 更新状态
    yield* dsl.set(config.bindTo, result);
    
    // 5. 关闭 Loading
    if (config.loadingPath) {
      yield* dsl.set(config.loadingPath, false);
    }
  })
});
```

## 3. 开发者实战 (Developer View)

### Phase 1: AI 辅助生成

开发者在画布上选中 `SearchInput.onChange`，告诉 AI：“我要搜索客户，加防抖”。
AI 推荐并配置了 `DebouncedSearch` Pattern，生成如下代码：

```typescript
// src/features/customer/logic.ts
import { Effect } from "effect";
import { LogicDSL } from "@logix/dsl";
import { DebouncedSearch } from "@/patterns/std/search";

export const handleSearch = Effect.gen(function*(_) {
  const dsl = yield* _(LogicDSL);

  // [L1 White Box] Pattern 节点
  // @intent-node: node-1 { type: "pattern-block", label: "Customer Search" }
  yield* DebouncedSearch({
    delay: 500,
    service: "CustomerService",
    method: "search",
    bindTo: "ui.customerList",
    loadingPath: "ui.isSearching"
  });
});
```

**画布表现**：
`Start` -> `[Block: Customer Search]`

---

### Phase 2: 混合编码 (Hybrid Coding)

需求变更：需要增加复杂的埋点逻辑。开发者直接在 IDE 中插入代码。

```typescript
export const handleSearch = Effect.gen(function*(_) {
  const dsl = yield* _(LogicDSL);

  // --- 手动插入的黑盒逻辑 ---
  // [L3 Black Box] 代码块节点
  // @intent-start: node-analytics { label: "Complex Analytics" }
  const keyword = yield* dsl.getPayload();
  if (keyword.length > 5 && keyword.includes("VIP")) {
     const encrypted = yield* Effect.sync(() => myComplexCrypto(keyword));
     yield* dsl.call("AnalyticsService", "track", { encrypted });
  }
  // @intent-end: node-analytics
  // -------------------------

  // [L1 White Box] Pattern 节点
  yield* DebouncedSearch({
    delay: 500,
    service: "CustomerService",
    method: "search",
    bindTo: "ui.customerList",
    loadingPath: "ui.isSearching"
  });
});
```

**画布表现**：
`Start` -> `[Code: Complex Analytics]` -> `[Block: Customer Search]`

## 4. 价值总结

1.  **Efficiency**: 核心业务逻辑由 AI + Pattern 秒级生成。
2.  **Quality**: 并发控制等复杂细节被封装在 Pattern 中，开发者无需操心。
3.  **Flexibility**: 遇到特殊需求，直接写 TypeScript，平台完美兼容黑盒代码。
