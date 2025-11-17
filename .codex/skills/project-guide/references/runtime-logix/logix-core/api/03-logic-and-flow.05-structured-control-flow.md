# 5. 结构化控制流 (The Structure Layer)

历史上我们用 “Control” 指代这层能力；当前主线 **不再提供** 专门的 `$.control` 命名空间。
当前实现以 **Effect 原生算子 + `$.match`/`$.matchTag` helper** 表达结构化逻辑，平台 Parser 将直接识别这些原生模式：

## 5.1 分支 (Branching)

使用 `$.match` / `$.matchTag` (Fluent Match)：

```ts
yield* $.match(isValid)
  .with((b) => b === true, () => doSomething)
  .otherwise(() => doSomethingElse);

yield* $.matchTag(action)
  .with("cancel", (a) => handleCancel(a))
  .exhaustive();
```

> **Best Practice**: 为了充分利用 `$.matchTag` 的类型收窄能力，推荐将 Action 定义为 **Tagged Union** (即包含 `_tag` 判别字段的联合类型)。这不仅符合 Effect 生态惯例，也能获得最佳的 IDE 补全体验。

平台会将上述 `$.match` 链式结构识别为 **Switch/Case 分支节点**。

## 5.2 错误边界 (Error Boundaries)

直接使用 `Effect.catch*` 系列算子：

```ts
yield* runApprovalFlow.pipe(
  Effect.catchTag("ApprovalError", (err) =>
    $.state.update(s => ({ ...s, error: err.message }))
  )
);
```

平台将识别 `Effect.catch*` 为 **Error Boundary 节点**。

## 5.3 并发 (Concurrency)

直接使用 `Effect.all`：

```ts
yield* Effect.all([taskA, taskB], { concurrency: "unbounded" });
```

平台将识别 `Effect.all` 为 **Parallel Group 节点**。
