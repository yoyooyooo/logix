# POC: 智能防抖搜索 (Smart Debounced Search)

> **Scenario**: CRM 系统中的客户搜索功能。
> **Goal**: 验证架构下 "AI Copilot -> Pattern -> Hybrid Coding" 的全链路工作流。
> **Status**: PoC。
> **Note**: 本 PoC 已更新为 v3 Effect-Native 标准范式，展示了如何使用 Bound API (`$`) 和 `flow` API 结合 `Effect.Service` 来实现一个包含防抖、竞态处理和状态管理的复杂搜索功能。

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
import { Effect, Schema, Context } from 'effect';
import { Store, Logic } from '~/logix-v3-core'; // 概念性路径

// 1. 定义服务与 Schema
class CustomerApi extends Context.Tag('CustomerApi')<CustomerApi, {
  readonly search: (keyword: string) => Effect.Effect<Customer[], Error>;
}>() {}

const SearchStateSchema = Schema.Struct({
  keyword: Schema.String,
  results: Schema.Array(Schema.Any), // 应替换为 Customer Schema
  isSearching: Schema.Boolean
});

const SearchActionSchema = Schema.Never;

type SearchShape = Logix.ModuleShape<typeof SearchStateSchema, typeof SearchActionSchema>;
```

## 3. 开发者实战 (Developer View)

### Phase 1: AI 辅助生成

开发者在画布上选中 `SearchInput.onChange`，告诉 AI：“我要搜索客户，加防抖”。
AI 推荐并配置了 `DebouncedSearch` Pattern，生成如下代码：

```typescript
// src/features/customer/logic.ts


// 2. Logic 实现
export const SearchLogic: Logic.Of<SearchShape, CustomerApi> = Effect.gen(function* () {
  Effect.gen(function*(_) {
    const keyword$ = flow.fromChanges(s => s.keyword);

    const searchEffect = Effect.gen(function*(_) {
      const api = yield* CustomerApi;
      const { keyword } = yield* state.read;

      yield* state.mutate(draft => { draft.isSearching = true; });
      const result = yield* Effect.either(api.search(keyword));

      if (result._tag === 'Left') {
        // 错误处理
        yield* state.mutate(draft => { draft.isSearching = false; });
      } else {
        yield* state.mutate(draft => {
          draft.isSearching = false;
          draft.results = result.right;
        });
      }
    });

    yield* keyword$.pipe(
      flow.debounce(500),
      flow.filter(kw => kw.length > 2),
      flow.runLatest(searchEffect)
    );
  })
);
```

**画布表现**：
`Start` -> `[Block: Customer Search]`

---

### Phase 2: 混合编码 (Hybrid Coding)

需求变更：需要增加复杂的埋点逻辑。开发者直接在 IDE 中插入代码。

```typescript
// 3. 混合编码 (Hybrid Coding)
// 需求变更：增加一个复杂的埋点逻辑
export const SearchLogicWithAnalytics: Logic.Of<SearchShape, CustomerApi | AnalyticsApi> = Effect.gen(function* () {
  ({ flow, state }) =>
    Effect.gen(function*(_) {
      const keyword$ = flow.fromChanges(s => s.keyword);

      // 埋点逻辑 (Black Box)
      const analyticsEffect = Effect.gen(function*(_) {
        const analyticsApi = yield* AnalyticsApi;
        const { keyword } = yield* state.read;
        if (keyword.length > 5 && keyword.includes("VIP")) {
          const encrypted = myComplexCrypto(keyword);
          yield* analyticsApi.track({ encrypted });
        }
      });

      // 将埋点逻辑和搜索逻辑组合
      const combinedEffect = Effect.all([analyticsEffect, searchEffect], { discard: true });

      yield* keyword$.pipe(
        flow.debounce(500),
        flow.filter(kw => kw.length > 2),
        flow.runLatest(combinedEffect)
      );
    })
);
```

**画布表现**：
`Start` -> `[Code: Complex Analytics]` -> `[Block: Customer Search]`

## 4. 价值总结

1.  **Efficiency**: 核心业务逻辑由 AI + Pattern 秒级生成。
2.  **Quality**: 并发控制等复杂细节被封装在 Pattern 中，开发者无需操心。
3.  **Flexibility**: 遇到特殊需求，直接写 TypeScript，平台完美兼容黑盒代码。
