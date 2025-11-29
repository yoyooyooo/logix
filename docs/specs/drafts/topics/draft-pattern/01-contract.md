---
title: Draft Pattern Contract (Type Definitions & Runtime)
status: draft
version: 1.0
---

# Draft Pattern Contract

> **Status**: L3 (Proposed Contract)
> **Context**: `v3/effect-runtime`

本草稿旨在“钉死” Draft Pattern 的核心类型定义与运行时行为契约，为后续进入 `runtime-logix` 实现层做准备。

## 1. Core Type Definitions

### 1.1 `Draft.make` Signature

```typescript
export interface DraftDefinition<
  State,
  Context,
  Computed = {},
  Events = unknown
> {
  readonly id: string;
  readonly schema: {
    readonly state: Schema.Schema<State>;
    readonly context: Schema.Schema<Context>;
  };
  readonly initial: (ctx: Context) => State;
  readonly logic: (
    $: DraftRuntime<State, Context, Computed, Events>
  ) => Effect.Effect<void, never, Scope>;

  // Optional
  readonly computed?: (state: State) => Computed;
  readonly invariants?: ReadonlyArray<(state: State) => boolean>;
}

export declare const make: <S, C, Comp, E>(
  def: DraftDefinition<S, C, Comp, E>
) => Draft<S, C, Comp, E>;
```

### 1.2 Runtime Interface (`$.draft`)

```typescript
export interface DraftRuntime<S, C, Comp, E> {
  // State Access
  readonly state: SubscriptionRef<S>;
  readonly context: C;
  readonly computed: SubscriptionRef<Comp>;

  // Lifecycle Hooks
  readonly lifecycle: {
    readonly onStart: (cb: () => Effect.Effect<void>) => Effect.Effect<void>;
    readonly onCommit: (cb: (s: S) => Effect.Effect<void>) => Effect.Effect<void>;
    readonly onDestroy: (cb: () => Effect.Effect<void>) => Effect.Effect<void>;
  };
}
```

## 2. Runtime Behavior Contract

### 2.1 `start(Draft, Context)`

*   **Signature**: `start<S, C>(draft: Draft<S, C>, ctx: C): Effect.Effect<DraftHandle<S>, DraftAlreadyStartedError>`
*   **Concurrency**:
    *   **Singleton Mode (Default)**: 同一个 Draft ID 全局只能存在一个实例。
    *   **Behavior**: 如果尝试启动已存在的 Draft，默认抛出 `DraftAlreadyStartedError`。
    *   *Option*: 支持 `{ behavior: 'replace' }` 选项，自动销毁旧实例并启动新实例。
*   **Lifecycle**: 创建新的 `Effect.Scope`，初始化 State Ref，挂载 Logic Fiber。

### 2.2 `commit(Draft)`

*   **Signature**: `commit<S>(draft: Draft<S>): Effect.Effect<S, ValidationError | InvariantError>`
*   **Locking**: Commit 过程必须加锁，期间拒绝任何 State Update。
*   **Validation**:
    1.  Schema Validation (Type Check)
    2.  Invariant Validation (Logic Check)
*   **Result**: 成功则返回最终 State Snapshot，失败则通过 Error Channel 返回错误。
*   **Side Effects**: 触发 `onCommit` 钩子。

### 2.3 `destroy(Draft)`

*   **Signature**: `destroy(draft: Draft): Effect.Effect<void>`
*   **Behavior**: 关闭 Draft 关联的 `Scope`。
*   **Cleanup**: 自动取消所有 fork 的 Fiber，释放资源。

## 3. Error Boundaries

| Error Type | Source | Handling |
| :--- | :--- | :--- |
| **SchemaError** | `state` 不符合 Schema 定义 | 视为 Defect (开发时错误)，通常会导致 Crash |
| **ValidationError** | 用户输入不合法 (e.g. 必填项为空) | 视为 Expected Error，UI 应捕获并提示 |
| **InvariantError** | 违反业务不变量 (e.g. 余额不足) | 视为 Expected Error，UI 应捕获并提示 |
| **DraftAlreadyStarted** | 重复启动 Draft | 视为 Logic Error，开发者需检查流程 |

## 4. Implementation Notes

*   **Computed State**: 使用 `Effect.map(state$, computeFn)` 实现，并用 `SubscriptionRef` 包装以支持订阅。
*   **Scope Management**: 使用 `Effect.scope` 或 `Scope.make` 手动管理 Scope 的开启与关闭。
