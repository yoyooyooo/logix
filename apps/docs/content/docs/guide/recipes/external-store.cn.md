---
title: ExternalStore：减少 useEffect 数据胶水
description: 用 ExternalStore + StateTrait.externalStore 把外部推送源/跨模块依赖声明式接入状态图，减少手写订阅胶水并避免 tearing。
---

ExternalStore 的目标是把“外部输入（push）→ 状态写回 → 下游派生/渲染”的链路，从手写 `useEffect + useState`/watcher 胶水升级为 **声明式 trait**，让依赖关系更可维护、更可解释。

## 1) 什么时候需要它？

典型场景：

- **外部推送源**：路由 location、登录态/session、feature flags、websocket 消息、宿主事件等（值会变，但不适合放在 reducer 手动写回）。
- **跨模块读一致性**：组件同时读多个模块，希望同一次渲染观察到的快照来自同一“观察窗口”（避免“模块 A 新/模块 B 旧”的 tearing 组合）。

## 2) 基本用法：StateTrait.externalStore

你把某个字段声明为“外部拥有（external-owned）”，由外部源写回：

```ts
import * as Logix from '@logixjs/core'
import { Schema } from 'effect'

const State = Schema.Struct({
  location: Schema.String,
  // 其它业务字段...
})

export const AppDef = Logix.Module.make('App', {
  state: State,
  actions: {},
  traits: Logix.StateTrait.from(State)({
    location: Logix.StateTrait.externalStore({
      store: Logix.ExternalStore.fromService(LocationService, (svc) => svc.locationStore),
      // 可选：把 snapshot 映射到字段类型
      select: (loc) => String(loc),
      // 可选：合并抖动（例如高频事件）
      coalesceWindowMs: 16,
    }),
  }),
})
```

关键约束：

- `getSnapshot()` 必须是同步、纯读（不要把 IO/Promise 藏进去）。
- `subscribe(listener)` 必须在值变化时触发 listener（不要漏通知）。
- 被 `externalStore` 拥有的字段不要再在 reducer/computed/link/source 里写入；需要派生请用其它字段 + `computed/link` 生成。

## 3) Module-as-Source：从另一个模块“读出来”当作外部源

当你确实需要“模块 B 的字段由模块 A 的某个 selector 驱动”，推荐用 Module-as-Source：

```ts
traits: Logix.StateTrait.from(BState)({
  aView: Logix.StateTrait.externalStore({
    store: Logix.ExternalStore.fromModule(AModule, (s) => s.value),
  }),
})
```

注意：

- `fromModule` 需要能解析到稳定的 `moduleId`（不要传只读的 ModuleHandle）。
- selector 需要稳定的 selectorId（不稳定会 fail-fast）。

## 4) 决策指南：ReadQuery vs fromModule vs externalStore vs link

- `ReadQuery`：**读**。给 UI/逻辑提供稳定的 selector（细粒度订阅/性能优化）。
- `StateTrait.link`：**模块内联动**。字段 B 由字段 A 推导/搬运（同一模块内）。
- `StateTrait.externalStore`：**外部推送写回**。字段值来自模块外部（service/ref/stream/模块 selector）。
- `ExternalStore.fromModule`：**跨模块依赖**。把另一个模块的 selector 作为外部源写回（用于跨模块强一致/避免 tearing 的关键链路；能不用就不用，优先考虑把状态/派生收敛到同一模块）。

## 可运行示例

- 索引：[可运行示例索引](./runnable-examples)
- 代码：`examples/logix/src/scenarios/external-store-tick.ts`
