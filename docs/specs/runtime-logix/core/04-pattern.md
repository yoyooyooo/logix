# Pattern (Pattern-Style Logic & Assets)

> **Status**: Definitive (v3 Effect-Native)  
> **Date**: 2025-11-24  
> **Scope**: Logix Asset System (Platform View)

本节从“平台资产”的视角描述 Pattern 的角色。  
在 v3 运行时实现中，Logix 内核只有 **Store / Logic / Flow / Control** 等原语，  
Pattern 不再是运行时命名空间，而是一种围绕 `(input) => Effect` 的**模式化写法 + 资产包装约定**。

## 1. 定义（运行时视角）

在运行时（PoC）中，Pattern 只是一个普通的长逻辑封装函数：

```ts
// pattern-style: 封装好的长逻辑 Effect
export const runAutoSave = (input: { interval: number }) =>
  Effect.gen(function* (_) {
    // 方式一：直接使用 Logic.Api 提供的 flow 实例
    yield* flow.fromChanges(s => s.form).pipe(
      flow.debounce(input.interval),
      flow.runLatest(saveEffect),
    );

    // 方式二：使用 Intent.andUpdateOnChanges（依赖 Logic.Env 作为运行环境）
    // 更适合在完全独立于 Logic 的模块中复用
    yield* Intent.andUpdateOnChanges<MyShape>(
      s => s.form,
      (form, prev) => ({ ...prev, lastSavedAt: Date.now() }),
    );
  });

// 另一个典型模式：事件驱动的状态重排（使用 Intent.andUpdateOnAction）
export const runDirtyFlag = (_: { shape: "example" }) =>
  Intent.andUpdateOnAction<MyShape>(
    (a): a is { _tag: "input/change"; payload: string } => a._tag === "input/change",
    (action, prev) => ({
      ...prev,
      value: action.payload,
      isDirty: true,
    }),
  );
```

特点：

- 入口类型统一为 `(input: C) => Effect<A,E,R>`；  
- 内部使用 `Logic.Api` 的 `state/actions/flow/control`、`Effect.Service`、`Config` 等能力；  
- 或者使用 `Flow.*` / `Control.*` 命名空间级 DSL，在 `Logic.Env<Sh,R>` 上运行，而不直接依赖 `Logic.Api` 实例；  
- 逻辑本身与普通业务 Logic 完全同构，不需要额外 DSL。

## 2. 定义（平台资产视角）

平台在此基础上，可以将某个 pattern-style 函数包装为 Pattern 资产：

```ts
interface PatternAsset<C> {
  id: string;
  version: string;
  icon?: string;
  tags?: string[];
  configSchema: Schema<C, any, any>;
  impl: (input: C) => Effect.Effect<any, any, any>;
}
```

平台通过静态分析找到：

- 源码位置：`source: { file, exportName }`；  
- 配置 Schema：`configSchema`（来自 builder 工具或约定）；  
- 运行时实现：`impl` 指向具体的 `(input) => Effect` 函数。

Runtime Core 本身并不依赖 PatternAsset，只关心 `(input) => Effect`。

## 3. 状态借用 (State Borrowing)

按 v3 约定，pattern-style 函数不直接持有状态，而是通过 `SubscriptionRef` / Env “借用”：

```ts
export interface PaginationInput {
  pageRef: SubscriptionRef.SubscriptionRef<number>;
}

export const runPaginationEffect = (input: PaginationInput) =>
  Effect.gen(function* (_) {
    // 直接操作 Ref
    yield* SubscriptionRef.update(input.pageRef, p => p + 1);
  });

// 在 Logic 中使用
const PaginationLogic = Logic.make<Shape>(({ state, flow }) =>
  Effect.gen(function* (_) {
    const pageRef = state.ref(s => s.ui.currentPage);
    const next$ = flow.fromAction(a => a._tag === "nextPage");

    yield* next$.pipe(
      flow.run(runPaginationEffect({ pageRef })),
    );
  })
);
```

平台在资产层可以只关心 `PaginationInput` 里的 “契约字段”（例如 `pageRef`），而 runtime 只关心 Effect 执行。

## 4. Pattern 在图码中的角色

在图码同步视角下：

- pattern-style 函数对应 `effect-block` 节点（参见 `03-assets-and-schemas.md` 的 `LogicNode`）；  
- Flow / Control 调用 (`flow.run*` / `control.tryCatch` 等) 对应骨架节点；  
- 平台可以根据 PatternAsset 的 `id` / `configSchema` 将某些 `effect-block` 渲染为“命名积木”（palette 中的 Pattern），但这不改变运行时行为。

总结：

- 运行时核心只知道 `(input) => Effect` 与 Store / Logic / Flow / Control；  
- Pattern 是围绕这类函数的写法惯例与资产包装协议；  
- 平台可选择性地将某些 pattern-style 函数注册为 Pattern 资产，用于可视化、复用与配置化，而无需 runtime 提供特殊支持。
