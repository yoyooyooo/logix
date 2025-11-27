# Pattern (Pattern-Style Logic & Assets)

> **Status**: Definitive (v3 Effect-Native)  
> **Date**: 2025-11-26  
> **Scope**: Logix Asset System (Platform View)

本节从“平台资产”的视角描述 Pattern 的角色。  
在 v3 运行时实现中，Logix 内核只有 **Store / Logic / Flow / Control** 等原语，  
Pattern 是围绕这些原语构建的可复用长逻辑封装 + 资产包装约定。

## 1. 形态与定义（Runtime 视角）

v3 将 Pattern 严格区分为两种形态：

| 形态     | 定义方式               | 依赖注入           | 适用场景                    |
| :------- | :--------------------- | :----------------- | :-------------------------- |
| Functional | `runXxx(input)`      | 显式参数 + `Effect.service` | 工具型：纯计算、HTTP 请求等 |
| Namespace | `Xxx.run(config)`     | 隐式环境（`Logic.Env`）     | 寄生型：依赖 Store 状态/生命周期 |

### 1.1 Functional Pattern

Functional Pattern 是完全与 Store 解耦的 `(input) => Effect` 函数，  
通常通过 Service / Config 获取依赖，用于跨场景复用：

```ts
export interface BulkOperationConfig {
  operation: string;
  emptyMessage?: string;
}

export const runBulkOperation = (config: BulkOperationConfig) =>
  Effect.gen(function* (_) {
    const selection   = yield* SelectionService;
    const bulk        = yield* BulkOperationService;
    const notification = yield* NotificationService;

    const ids = yield* selection.getSelectedIds();

    if (ids.length === 0) {
      yield* notification.info(config.emptyMessage ?? "请先选择记录");
      return 0;
    }

    yield* bulk.applyToMany({ ids, operation: config.operation });
    return ids.length;
  });
```

特点：

- 入口类型统一为 `(config: C) => Effect<A, E, R>`；  
- 不依赖具体 Store 形状，可以在多个 Store / Runtime 中复用；  
- 常用于抽象 HTTP 调用、通知逻辑、批量操作等“工具型”模式。

### 1.2 Namespace Pattern（标准范式）

Namespace Pattern 用于表达依赖 Store 状态或生命周期的“寄生型”逻辑。  
它必须返回 `Logic.Fx<Sh,R>`，以声明其对 `Store.Runtime` 的上下文依赖：

```ts
export interface AutoSaveConfig<Sh extends Store.Shape<any, any>, V, R = never> {
  selector: (s: Store.StateOf<Sh>) => V;
  saveEffect: (value: V) => Effect.Effect<void, any, R>;
  interval?: number;
}

export namespace AutoSave {
  // 柯里化签名：Config => Logic.Fx
  export const run = <Sh extends Store.Shape<any, any>, R = never, V = any>(
    config: AutoSaveConfig<Sh, V, R>,
  ): Logic.Fx<Sh, R, void, never> =>
    Effect.gen(function* (_) {
      // 通过 Logic.RuntimeTag 隐式获取当前 Store Runtime
      const runtime = yield* Logic.RuntimeTag;
      const typed   = runtime as Store.Runtime<Store.StateOf<Sh>, Store.ActionOf<Sh>>;

      const changes$ = typed.changes$(config.selector);
      const interval = config.interval ?? 1000;

      yield* changes$.pipe(
        Stream.debounce(`${interval} millis`),
        Stream.runForEach(value => config.saveEffect(value)),
      );
    });
}
```

特点：

- 入口为 `run(config)`，返回值类型为 `Logic.Fx<Sh,R>`；  
- 通过 `Logic.RuntimeTag` / `Store.Runtime` “借用”当前 Store 的状态与流能力；  
- 适合表达自动保存、乐观更新、长任务进度同步等“状态感知型 Pattern”。

> 约定  
> - Namespace Pattern 不直接导出 `Logic.Api`，而是依赖 `Logic.Env<Sh,R>`；  
> - 业务 Logic 通过 `yield* AutoSave.run({ ... })` 使用 Pattern，而不是把 `state` / `flow` 显式传入。

## 2. 平台解析契约（Parser Contract）

在全双工引擎中，Pattern 被视为 **Gray Box（灰盒）** 资产：

- **调用层（White Box）**：  
  - Parser 识别 `yield* AutoSave.run(config)` / `runBulkOperation(config)` 这类调用；  
  - 提取 `config` 参数（或其 Schema），在画布上渲染为一个命名的 Effect Block 节点。

- **实现层（Gray Box）**：  
  - Parser 不深入解析 Pattern 内部的 `Effect.gen` 实现；  
  - Pattern 内部可以自由使用任意 `Effect` / `Stream` 组合与 Service 调用。

这一契约保证：

- Pattern 开发者拥有足够的实现自由度；  
- 平台仍然可以在 Logic 图上以“命名积木”的方式呈现 Pattern 使用情况。

## 3. 状态借用（State Borrowing）

按 v3 约定，Pattern 不直接持有状态，而是通过以下两种方式“借用”：

- **Namespace Pattern**：通过 `Logic.RuntimeTag` 获取当前 `Store.Runtime`，再使用 `changes$ / ref / getState` 等能力；  
- **Functional Pattern**：通过显式注入的 `SubscriptionRef` / 值参数操作状态。

示例：

```ts
// Namespace Pattern 中借用当前 Store 的变化流
const runtime  = yield* Logic.RuntimeTag;
const changes$ = runtime.changes$(config.selector);

// Functional Pattern 中通过 Ref 借用局部状态
export interface PaginationInput {
  pageRef: SubscriptionRef.SubscriptionRef<number>;
}

export const runPaginationEffect = (input: PaginationInput) =>
  Effect.gen(function* (_) {
    yield* SubscriptionRef.update(input.pageRef, p => p + 1);
  });
```

平台在资产层只关心 Pattern 的 **配置契约（Config / 输入参数）**，  
而运行时只关心 Pattern 的返回 Effect 如何执行。

## 4. Pattern 在图码中的角色

在图码同步视角下：

- Functional / Namespace Pattern 对应 `effect-block` 节点（参见 `03-assets-and-schemas.md` 的 `LogicNode`）；  
- `$.flow.run*` / `$.control.tryCatch` 等调用对应骨架节点；  
- 平台可以根据 Pattern 资产的 `id` / `configSchema` 将某些 Effect Block 渲染为“命名积木”（palette 中的 Pattern），但这不改变运行时行为。

总结：

- 运行时核心只知道 `Effect` 与 `Store / Logic / Flow / Control`；  
- Pattern 是围绕这些 Effect 函数的写法惯例与资产包装协议；  
- 平台可选择性地将某些 Pattern 注册为资产，用于可视化、复用与配置化，而无需 runtime 提供特殊支持。
