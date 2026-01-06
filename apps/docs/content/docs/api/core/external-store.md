---
title: ExternalStore
description: ExternalStore 是一个最小的“同步快照 + 变更通知”契约，用于把外部推送源（或模块 selector）声明式接入 StateTrait.externalStore。
---

`ExternalStore<T>` 是一个最小契约：

```ts
export type ExternalStore<T> = {
  getSnapshot: () => T
  getServerSnapshot?: () => T
  subscribe: (listener: () => void) => () => void
}
```

它的设计重点是 **同步快照** 与 **显式变更通知**：

- `getSnapshot()`：同步返回“当前值”（不要做 IO/Promise，不要产生副作用）。
- `subscribe(listener)`：当值发生变化时触发 `listener()`；返回取消订阅函数。
- `getServerSnapshot?()`：SSR 场景可选；缺省时会回退到 `getSnapshot()`。

## 与 StateTrait.externalStore 配合使用

推荐把 ExternalStore 作为 `StateTrait.externalStore({ store })` 的输入（由 trait 安装/运行期负责解析与写回），而不是直接在 React 里手写订阅胶水。

```ts
traits: Logix.StateTrait.from(StateSchema)({
  value: Logix.StateTrait.externalStore({
    store: Logix.ExternalStore.fromSubscriptionRef(ref),
  }),
})
```

## 内置构造器（sugars）

### 1) `ExternalStore.fromService(tag, map)`

从 Effect Context 里解析 service，再映射成 ExternalStore。常用于把“宿主/基础设施的订阅源”注入到模块里。

约束：这个 store 会在 install/runtime 阶段解析；不要在 install 之外直接调用它的 `getSnapshot/subscribe`。

### 2) `ExternalStore.fromSubscriptionRef(ref)`

从 `SubscriptionRef` 创建 ExternalStore：

- `getSnapshot()` 通过 `SubscriptionRef.get(ref)` 同步读（要求是纯读）。
- `subscribe()` 订阅 `ref.changes`，并用 microtask 合并通知（同一 microtask 多次更新只触发一次 notify）。

### 3) `ExternalStore.fromStream(stream, { initial | current })`

Stream 没有“同步 current”，所以必须提供 `{ initial }` 或 `{ current }`，否则会 **fail-fast**。

适用：你能接受初始值可能是“启动时的近似值”；更可靠的“当前值”建议用 `fromService/fromSubscriptionRef`。

### 4) `ExternalStore.fromModule(module, selector)`

把“模块 selector”当作外部源（Module-as-Source），用于跨模块依赖链路：

- `moduleId` 必须可解析（不要传只读 ModuleHandle）。
- selectorId 必须稳定（不稳定会 fail-fast）。

