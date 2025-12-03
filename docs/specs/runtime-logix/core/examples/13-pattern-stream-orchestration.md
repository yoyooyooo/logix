# Pattern: Stream Orchestration & Flow Coordination (v3 Standard Paradigm)

> **Scenario**: 协同保存 (Auto Save vs Manual Save)  
> **Focus**: 流式编排、并发控制、声明式竞态解决  
> **Note**: 本文示例展示了 v3 Effect-Native 标准范式。通过组合 `flow.fromState` 和 `flow.fromAction`，并统一使用 `flow.runLatest`，可以优雅地、声明式地解决多源触发同一副作用的竞态问题。当前 PoC 中，实际代码应在对应 Module 上通过 `Module.logic(($)=>...)` 获取 `$`。

## 1. The Challenge (痛点)

在复杂表单中，“自动保存”与“手动保存”的协同是一个经典难题：
1.  **Auto Save**: 内容变化后，防抖 2 秒后触发。
2.  **Manual Save**: 用户点击按钮，立即触发。
3.  **Coordination**: 手动保存的优先级最高。当手动保存触发时，任何正在进行或等待中的自动保存都应被取消。

## 2. The Solution: Unified Flow with `runLatest`

v3 范式通过将不同的触发源（自动保存、手动保存）汇聚到同一个 `runLatest` 逻辑中来解决此问题。`runLatest` 确保任何时候只有一个保存任务在执行，新任务会取消旧任务。

### 2.1 Schema & Action Definition

```typescript
const EditorStateSchema = Schema.Struct({
  content: Schema.String,
  lastSavedAt: Schema.Number,
  isSaving: Schema.Boolean
});

const EditorActionSchema = Schema.Union(
  Schema.Struct({ _tag: Schema.Literal('manualSave') })
);

type EditorShape = Logix.ModuleShape<typeof EditorStateSchema, typeof EditorActionSchema>;
```

### 2.2 Logic Implementation

```typescript
// 概念上，这里的 `$Editor` 表示针对 EditorShape + EditorApi 预绑定的 Bound API。
const saveLogic: Logic.Of<EditorShape, EditorApi> =
  Effect.gen(function* (_) {
    // 1. 定义统一的保存 Effect
    const saveEffect = (type: 'auto' | 'manual') =>
      Effect.gen(function* (_) {
        const api = yield* $Editor.services(EditorApi);
        const { content } = yield* $Editor.state.read;

        if (type === 'manual') {
          yield* $Editor.state.mutate(draft => { draft.isSaving = true; });
        }

        const result = yield* Effect.either(api.save(content));

        if (result._tag === 'Left') {
          if (type === 'manual') {
            yield* $Editor.state.mutate(draft => {
              draft.isSaving = false;
              // draft.error = ...
            });
          }
        } else {
          yield* $Editor.state.mutate(draft => {
            draft.isSaving = false;
            draft.lastSavedAt = Date.now();
          });
        }
      });

    // 2. 定义自动保存流
    const autoSave$ = $Editor.flow.fromState(s => s.content).pipe(
      $Editor.flow.debounce(2000),
      $Editor.flow.runLatest(saveEffect('auto'))
    );

    // 3. 定义手动保存流
    const manualSave$ = $Editor.flow.fromAction(a => a._tag === 'manualSave').pipe(
      $Editor.flow.runLatest(saveEffect('manual'))
    );

    // 4. 并行启动两个流
    // 因为它们都使用 runLatest，Effect 运行时会自动处理并发：
    // 任何一个流的新事件都会取消另一个流正在执行的任务。
    yield* Effect.all([autoSave$, manualSave$], { discard: true });
  })
);
```

## 3. Design Rationale

- **Declarative Concurrency**: `flow.runLatest` 声明式地定义了“最新优先”的并发策略。开发者无需编写任何手动检查或取消逻辑，代码意图清晰，行为可预测。
- **Unified Logic**: 多个触发源 (`fromState`, `fromAction`) 都汇聚到同一个 `saveEffect` 核心逻辑，提高了代码的内聚性和复用性。
- **Automatic Resource Management**: 所有流的生命周期（包括 `debounce` 的定时器）都由 `Store` 的 `Scope` 自动管理，从根本上杜绝了内存泄漏的风险。
