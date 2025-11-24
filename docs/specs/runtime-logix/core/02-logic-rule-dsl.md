# Logic Rule DSL 设计 (Logic Rule DSL Specification)

> **Status**: Definitive (v3 - Unified API)
> **Date**: 2025-11-24
> **Scope**: Logix Core Logic Primitives

## 1. 愿景：统一逻辑原语 (Unified Logic Primitives)

Logic Rule DSL 是 Logix 平台的**“逻辑原子”**。在 v3 架构中，我们采用 **Interpreter Pattern (解释器模式)** 来实现“编写”与“执行”的统一。

*   **Definition**: `LogicDSL` 接口定义了抽象的逻辑能力（Set, Call, Branch）。
*   **Runtime**: `RuntimeLayer` 提供了这些能力的真实副作用实现（修改 Store，发请求）。
*   **Builder**: `BuilderLayer` (在静态分析模式下主要作为类型定义) 提供了编写时的类型约束。

## 2. 核心 API: `LogicDSL`

这是用户编写逻辑时唯一需要交互的接口。

```typescript
import { Effect, Context } from "effect";

export interface LogicDSL {
  // 基础算子
  set: <T>(path: string | Ref<T>, value: T) => Effect.Effect<void>;
  get: <T>(path: string | Ref<T>) => Effect.Effect<T>;
  call: <T>(service: string, method: string, args: any) => Effect.Effect<T>;
  
  // 流程控制
  branch: (cond: boolean, then: Effect.Effect<void>, else_: Effect.Effect<void>) => Effect.Effect<void>;
  all: (effects: Effect.Effect<any>[]) => Effect.Effect<any[]>;
  
  // 高级算子
  debounce: (ms: number) => Effect.Effect<void>;
  retry: (policy: RetryPolicy) => Effect.Effect<void>;
}

export const LogicDSL = Context.Tag<LogicDSL>("@logix/dsl");
```

## 3. 编写逻辑 (Authoring Logic)

用户不再需要区分 `api.rule` 配置对象和 `Effect` 代码。现在，**一切皆 Effect**。

```typescript
import { Effect } from "effect";
import { LogicDSL } from "@logix/dsl";

export const myLogic = Effect.gen(function*(_) {
  const dsl = yield* _(LogicDSL);
  
  // 1. 监听 (通常由外层框架处理，这里只写处理逻辑)
  // ...
  
  // 2. 执行
  yield* dsl.set("ui.loading", true);
  
  yield* dsl.branch(
    isValid,
    dsl.call("Service", "submit"),
    dsl.emit("toast", "Invalid")
  );
});
```

## 4. 运行时实现 (Runtime Implementation)

在运行时，我们通过 Effect Layer 注入 `LogicDSL` 的具体实现。

```typescript
// packages/logix/core/runtime.ts
export const RuntimeLayer = Layer.effect(LogicDSL, Effect.gen(function*(_) {
  const store = yield* _(StoreContext);
  
  return {
    set: (path, value) => Effect.sync(() => store.setState(path, value)),
    call: (svc, method, args) => Effect.promise(() => store.services[svc][method](args)),
    branch: (cond, t, e) => cond ? t : e,
    // ...
  };
}));
```

## 5. 算子体系 (Operator Taxonomy)

### 5.1 State Ops (状态操作)

*   **`dsl.set(path, value)`**
    *   **行为**: 原子写入状态。
    *   **Output**: `void`。

*   **`dsl.update(path, updater)`**
    *   **行为**: 基于旧值的函数式更新。
    *   **Example**: `dsl.update(s => s.count, c => c + 1)`

*   **`dsl.get(path)`**
    *   **行为**: 获取当前状态快照。

### 5.2 Network Ops (网络操作)

*   **`dsl.call(service, method, args)`**
    *   **行为**: 调用注册的服务方法。支持类型推导。
    *   **Error**: 自动抛出 Effect Error。

*   **`dsl.poll(config)`**
    *   **行为**: 启动轮询任务。
    *   **Config**: `{ interval: number, task: Effect }`。

### 5.3 Flow Ops (流程控制)

*   **`dsl.branch(cond, then, else)`**
    *   **行为**: 条件分支。

*   **`dsl.delay(ms)`**
    *   **行为**: 暂停执行指定时间。

*   **`dsl.race(effects)`**
    *   **行为**: 并行竞态。取最先完成的结果，取消其他。

*   **`dsl.all(effects)`**
    *   **行为**: 并行执行。等待所有完成。

## 6. 扩展机制 (Extension)

DSL 支持通过 **Module Augmentation** 扩展自定义算子，允许领域层（如 Form）注入特定逻辑。

```typescript
// @logix/form/dsl.ts
declare module '@logix/dsl' {
  interface LogicDSL {
    validate(schema: Schema): Effect.Effect<ValidationResult>;
  }
}

// 实现并挂载
// 在 RuntimeLayer 中扩展实现
```
