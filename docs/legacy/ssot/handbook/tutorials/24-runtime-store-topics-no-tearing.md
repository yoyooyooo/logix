---
title: RuntimeStore / RuntimeExternalStore：no-tearing 的工程闭环教程 · 剧本集
status: draft
version: 1
---

# RuntimeStore / RuntimeExternalStore：no-tearing 的工程闭环教程 · 剧本集

> **定位**：这是 `docs/ssot/handbook/` 的“维护者教程/剧本集”（how-to），用于新成员上手、老成员回味：把 RuntimeStore（tickSeq + topicVersion）作为 React-facing 的唯一快照真理源讲清楚，并说明 TickScheduler 如何 commit+notify 保障 no-tearing，以及 React 侧 RuntimeExternalStore/useSelector 如何利用 **topic 分片** 做“跨模块不撕裂 + 细粒度通知 + 低优先级节流”。  
> **重要**：本文不是裁决来源；凡涉及 MUST/协议/边界的最终口径以 SSoT 为准（`docs/ssot/platform/**` 与 `docs/ssot/runtime/**`）。

---

## 0. 最短阅读路径（10–20 分钟先抓住“不变量”）

1. React no-tearing 的背景与动机（教程）：`docs/ssot/handbook/tutorials/11-react-runtime-store-no-tearing.md`
2. TickScheduler / RuntimeStore 的实现小抄（impl cheatsheet）：`docs/ssot/runtime/logix-core/impl/README.00-impl-cheatsheet.md`
3. RuntimeStore 核心实现：`packages/logix-core/src/internal/runtime/core/RuntimeStore.ts`
4. TickScheduler commit+notify 顺序（关键不变量）：`packages/logix-core/src/internal/runtime/core/TickScheduler.ts`
5. React topic 外部订阅实现：`packages/logix-react/src/internal/store/RuntimeExternalStore.ts`
6. selector-topic gate（静态 ReadQuery 才能走细分 topic）：`packages/logix-react/src/internal/hooks/useSelector.ts`
7. 最短实证（浏览器语义回归）：`packages/logix-react/test/browser/perf-boundaries/runtime-store-no-tearing.test.tsx`

---

## 1. 心智模型：React 只订阅“版本号”，不订阅“状态对象”

no-tearing 的核心不是“某个 hook 很聪明”，而是一条工程不变量：

> **对外只暴露一个同步快照真理源**：tick 结算后一次性 commit 快照，再通知订阅者。  
> 订阅者读到的永远是“同一 tickSeq 的快照视图”，而不是“多个 store 各自 notify 导致的时序撕裂”。

因此：

- RuntimeStore 提供的是 `getTickSeq()` + `getTopicVersion(topicKey)` + `subscribeTopic(topicKey)`；
- React 的外部订阅（useSyncExternalStore）订阅的是 “topicVersion 变化”，而不是订阅“状态对象引用”；
- 真正的状态读取发生在 `getSnapshot()`，它会用 topicVersion 做缓存命中判断（版本不变 → 直接返回旧 snapshot）。

这就是把 tearing 风险从“时序偶发”变成“结构上不可能”的关键。

---

## 2. 核心链路（从 0 到 1）：Module commit → TickScheduler → RuntimeStore → React store

### 2.1 RuntimeStore：topicVersion 的真理源

实现：`packages/logix-core/src/internal/runtime/core/RuntimeStore.ts`

核心数据面：

- `tickSeq`：本次 committed snapshot 的原子锚点
- `moduleStates[moduleInstanceKey]`：已提交的模块 state 快照（React 读它）
- `topicVersions[topicKey]`：每个 topic 的版本号（单调递增）
- `subscribeTopic(topicKey, listener)`：订阅 topic 的变化（listener 只做“通知”，不携带数据）

topicKey 的两种形态：

- **module topic**：`"${moduleId}::${instanceId}"`
- **readQuery topic**：`"${moduleInstanceKey}::rq:${selectorId}"`

RuntimeStore 不做“调度”，它只负责：

- `commitTick({ tickSeq, accepted })`：更新 moduleStates、bump dirtyTopics 的 topicVersion、并收集 listeners（用于后续 notify）

### 2.2 TickScheduler：commit 后 notify（顺序是硬约束）

实现：`packages/logix-core/src/internal/runtime/core/TickScheduler.ts`

TickScheduler 在一次 tick settle 时会：

1. `store.commitTick({ tickSeq, accepted })`（先 commit 快照 + bump topicVersion）
2. 再遍历 `committed.changedTopics` 调用 listeners（后 notify）

这条顺序是 no-tearing 的底座：**通知永远发生在 committed snapshot 之后**，订阅者收到通知后再读快照不会读到“半成品”。

同时，TickScheduler 还负责：

- 把 module commit 与 selector changed 转成 dirtyTopics（module-topic / selector-topic）
- 在预算/循环下给出 `trace:tick`（stable/degradeReason/backlog），并在某些场景给出 `warn:priority-inversion` 等诊断

### 2.3 selector-topic 的来源：SelectorGraph → TickScheduler.onSelectorChanged

selector-topic 不会“凭空 bump”，它来自 runtime 对 selector 的增量评估：

- 模块提交时，`SelectorGraph.onCommit(...)` 只评估“有订阅者”的 selector；
- selector changed 时，`ModuleRuntime.onCommit` 会调用 `TickScheduler.onSelectorChanged({ moduleInstanceKey, selectorId, priority })`；
- TickScheduler 把它写入 `dirtyTopics`（topicKey = `makeReadQueryTopicKey(...)`）。

关键锚点：

- selector graph：`packages/logix-core/src/internal/runtime/core/SelectorGraph.ts`
- onCommit → onSelectorChanged：`packages/logix-core/src/internal/runtime/core/ModuleRuntime.impl.ts`

---

## 3. React 侧：RuntimeExternalStore 如何把 topicVersion 变成 useSyncExternalStore 可用的 ExternalStore

实现：`packages/logix-react/src/internal/store/RuntimeExternalStore.ts`

### 3.1 两类 store：module topic 与 readQuery topic

对 React 暴露两类 ExternalStore：

- `getRuntimeModuleExternalStore(runtime, moduleRuntime)`：订阅 module topic
- `getRuntimeReadQueryExternalStore(runtime, moduleRuntime, selectorReadQuery)`：订阅 readQuery topic

两者共同点：

- `subscribe` 只订阅 topic 的版本变化；
- `getSnapshot` 会读取 `runtimeStore.getTopicVersion(topicKey)` 并做缓存命中：
  - 版本不变 → 返回 cached snapshot
  - 版本变化 → 重新计算 snapshot，并更新 cachedVersion/cachedSnapshot

### 3.2 “低优先级通知节流”：priority=low 时延迟+raf，对齐渲染节奏

RuntimeStore 为每个 topic 维护 `priority`（normal/low），TickScheduler commitTick 会带上 priority。

React store 的 notify 策略是：

- `priority=normal`：microtask 通知（更快、更像“输入/交互”）
- `priority=low`：延迟窗口 + requestAnimationFrame + maxDelay cap（更像“后台/可合并更新”）

这条策略的目标是：**让 nonUrgent 的高频变更尽量与渲染节奏对齐，同时避免饿死**。

### 3.3 selector-topic 的一个“非直觉点”：需要一条 keepalive 来激活 SelectorGraph

`getRuntimeReadQueryExternalStore` 的 `getSnapshot` 会直接：

- 从 RuntimeStore 取模块快照（或 fallback 到 `moduleRuntime.getState`）
- 对该快照执行 `selectorReadQuery.select(current)`

但 selector-topic 的版本 bump 依赖 SelectorGraph（它只评估“有订阅者”的 selector）。因此 React 侧需要一个“激活”机制：

- onFirstListener：启动一个 fiber 去 `Stream.runDrain(moduleRuntime.changesReadQueryWithMeta(selectorReadQuery))`
  - 这条流的值对 React 不重要（React 订阅的是 topicVersion）
  - 但它会让 SelectorGraph entry 的 `subscriberCount += 1`，从而在 commit 时触发增量评估与 selector-topic bump
- onLastListener：interrupt 这个 fiber，释放 selector entry

这条 keepalive 的目的：**避免 React 侧自己“算哪些 selector 脏了”**（那会把真相源搬回 React，容易重回 tearing/双真相源）。

---

## 4. useSelector：selector-topic eligible gate（静态可识别才走细分 topic）

实现：`packages/logix-react/src/internal/hooks/useSelector.ts`

`useSelector` 的关键 gate：

- 只有当 selector 满足：
  - `ReadQuery.compile(selector).lane === 'static'`
  - `readsDigest != null`
  - `fallbackReason == null`
  才使用 readQuery topic（细分订阅、避免无关重算/重渲染）
- 否则回退到 module topic，并用 `useSyncExternalStoreWithSelector` + equalityFn 兜底正确性

这条 gate 的意义是：**“细分订阅”是可证明的优化，而不是靠魔法 heuristics**。

---

## 5. 剧本集（用例驱动）

### 5.1 no-tearing：跨模块同时更新，不出现 A 新/B 旧 的渲染撕裂

实证：`packages/logix-react/test/browser/perf-boundaries/runtime-store-no-tearing.test.tsx`

它验证：

- `Runtime.batch(() => { update A; update B })` 后，React 观察到的 UI 不会出现“只更新了一个模块”的中间态；
- 更新 B 不会触发 A 的 selector 重算（跨模块 sharding）；
- 更新 A 的无关字段也不触发 A 的 selector 重算（模块内 sharding）。

### 5.2 multi-instance isolation：同 moduleId 不同 instanceId 的隔离

同一文件也包含 multi-instance 场景，验证：

- topicKey 的 `moduleId::instanceId` 分片能隔离同名模块的不同实例；
- 避免“同模块多实例”下的订阅串扰（这类 bug 在 UI 上非常隐蔽，必须有回归）。

---

## 6. 诊断与排障入口（工程上最常见的坑）

1. **看到 tearing 症状（跨模块状态不同步）**：先确认 UI 订阅是不是绕开了 RuntimeStore（是否用了 per-module 独立 store / 直接订阅 changes$）。  
   - 正确姿势：订阅 topicVersion → 读快照（RuntimeStore）。

2. **selector-topic 没有 bump**：通常是 selector 不 eligible（dynamic lane/缺 readsDigest），或 keepalive 没启动（未走 `getRuntimeReadQueryExternalStore`）。  
   - 入口：`packages/logix-react/src/internal/hooks/useSelector.ts` 的 eligibility 条件与依赖。

3. **nonUrgent 更新“看起来延迟”**：先确认 priority（low）与延迟窗口配置；再看是否触发 `warn:priority-inversion`（tick backlog 推迟了外部输入相关模块）。  
   - 入口：`packages/logix-core/src/internal/runtime/core/TickScheduler.ts`

---

## 7. 代码锚点（Code Anchors）

- TickScheduler：`packages/logix-core/src/internal/runtime/core/TickScheduler.ts`
- RuntimeStore：`packages/logix-core/src/internal/runtime/core/RuntimeStore.ts`
- SelectorGraph：`packages/logix-core/src/internal/runtime/core/SelectorGraph.ts`
- InternalContracts（React 取 runtimeStore/hostScheduler 的入口）：`packages/logix-core/src/internal/InternalContracts.ts`
- React store：`packages/logix-react/src/internal/store/RuntimeExternalStore.ts`
- React hook：`packages/logix-react/src/internal/hooks/useSelector.ts`
- 浏览器回归：`packages/logix-react/test/browser/perf-boundaries/runtime-store-no-tearing.test.tsx`

---

## 8. 常见坑（Anti-patterns）

1. **引入第二真相源（per-module store / per-selector store 独立 notify）**：最容易把 tearing 带回系统；必须统一走 RuntimeStore/topicVersion。
2. **绕过 selector-topic gate**：dynamic selector 没有 readsDigest，强行细分只会产生不可解释的漂移与性能陷阱。
3. **把 changesReadQueryWithMeta 当成 UI 订阅主通道**：它在 React 侧应只作为 selectorGraph keepalive；UI 真正订阅的是 topicVersion。
4. **在 notify listener 里做重活**：TickScheduler 的 listener 必须 best-effort；任何异常都应被吞掉，避免破坏 tick。

