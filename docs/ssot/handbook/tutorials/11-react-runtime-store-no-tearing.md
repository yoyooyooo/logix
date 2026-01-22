---
title: React 集成：RuntimeStore / tickSeq / no-tearing 教程 · 剧本集（topic facade + 订阅分片）
status: draft
version: 1
---

# React 集成：RuntimeStore / tickSeq / no-tearing 教程 · 剧本集（topic facade + 订阅分片）

> **定位**：这是 `docs/ssot/handbook/` 的“维护者教程/剧本集”（how-to），用于新成员上手、老成员回味：把 React 集成中的“单一快照真相源（RuntimeStore）+ tickSeq 无 tearing + 订阅分片（topic facade）”讲清楚，并给出可运行证据与性能门禁入口。  
> **重要**：本文不是裁决来源；凡涉及 MUST/协议/边界的最终口径以 SSoT 为准（`docs/ssot/platform/**` 与 `docs/ssot/runtime/**`）。

---

## 0. 最短阅读路径（10–20 分钟先建立正确心智）

建议按这个顺序：

1. tick 参考系教程（先对齐术语与必要性）：`docs/ssot/handbook/tutorials/03-transactions-and-tick-reference-frame.md`
2. React SSoT 导航：`docs/ssot/runtime/logix-react/01-react-integration.md`
3. RuntimeStore 关键实现小抄（实现视角）：`docs/ssot/runtime/logix-core/impl/README.00-impl-cheatsheet.md`（4.*）
4. RuntimeStore 真相源：`packages/logix-core/src/internal/runtime/core/RuntimeStore.ts`
5. React 外部订阅适配：`packages/logix-react/src/internal/store/RuntimeExternalStore.ts`
6. “可运行证据”测试：
   - 无 tearing + selector 分片：`packages/logix-react/test/browser/perf-boundaries/runtime-store-no-tearing.test.tsx`
   - ingest→notify 基线 + retained heap 门禁：`packages/logix-react/test/browser/perf-boundaries/external-store-ingest.test.tsx`
   - diagnostics 端到端开销：`packages/logix-react/test/browser/perf-boundaries/diagnostics-overhead.test.tsx`
   - yield-to-host 退化路径观测：`packages/logix-react/test/browser/perf-boundaries/tick-yield-to-host.test.tsx`

---

## 1. 心智模型：我们在 React 集成里解决什么？

React 集成（多模块/多订阅）天然会遇到两个“看起来像随机 bug”的问题：

1. **tearing（撕裂）**：同一次 render/commit 里，组件读到的多个模块状态来自不同“快照轮次”。  
   结果：UI 出现短暂不一致（A 更新了，B 还没更新），且 Devtools 因果链难对齐。
2. **订阅风暴**：任何一个模块变化都导致大量 selector 重新计算/大量组件无谓重渲染。  
   结果：性能退化，尤其在外部源高频更新（ExternalStore）场景。

Logix 的裁决是：把 React 的“读快照”强制对齐到 runtime 的 tick 参考系：

- **单一快照真相源**：RuntimeStore（内部持有“已提交快照”）
- **唯一一致性锚点**：`tickSeq`（单调递增）
- **订阅分片**：按 topicKey（至少 ModuleInstanceKey；可选 ReadQueryTopicKey）进行 version bump 与 notify

> 经验直觉：React 侧不要再制造第二个“per-module store 真相源”。一旦出现双真相源，tearing 会以不可预测方式回归。

---

## 2. 核心链路（从 0 到 1：commit → tick → RuntimeStore → React）

### 2.1 运行时侧：TickScheduler 负责“合并、稳定化、提交、再通知”

关键实现：

- TickScheduler：`packages/logix-core/src/internal/runtime/core/TickScheduler.ts`
- JobQueue（pending drain）：`packages/logix-core/src/internal/runtime/core/JobQueue.ts`
- RuntimeStore：`packages/logix-core/src/internal/runtime/core/RuntimeStore.ts`

一个 tick 的核心不变量（no-tearing 的根）：

1. **先 commit**：`store.commitTick({ tickSeq, accepted })`
2. **再 notify**：对 `committed.changedTopics` 的 listeners 做 best-effort 通知

这条顺序是刻意的：订阅者被唤醒时，必须能读到“同一个 tickSeq 对应的已提交快照”。

### 2.2 ModuleRuntime：在事务提交点把“变化”汇报给 TickScheduler

入口：`packages/logix-core/src/internal/runtime/core/ModuleRuntime.impl.ts`

commit 时会做两类汇报：

1. **module topic**：`scheduler.onModuleCommit({ moduleInstanceKey, state, meta, opSeq })`  
   这会让 tick 队列把 `moduleInstanceKey` 标记为 dirty topic（用于模块级订阅）
2. **readQuery topics（可选）**：在 selectorGraph 增量评估阶段，对“发生变化的 selectorId”调用  
   `scheduler.onSelectorChanged({ moduleInstanceKey, selectorId, priority })`  
   这会让 tick 队列把 `makeReadQueryTopicKey(moduleInstanceKey, selectorId)` 标记为 dirty topic（用于 selector 分片订阅）

如果 TickScheduler 服务不可见，会在 dev + diagnostics!=off 时发出明确诊断：

- code：`tick_scheduler::missing_service`（提示 tickSeq 不会推进、RuntimeStore 订阅不会 flush）

### 2.3 RuntimeStore：TopicKey + Version bump 是 React 的“最小协议”

实现：`packages/logix-core/src/internal/runtime/core/RuntimeStore.ts`

核心概念：

- `ModuleInstanceKey = ${moduleId}::${instanceId}`（多实例隔离的最小边界）
- `ReadQueryTopicKey = ${moduleInstanceKey}::rq:${selectorId}`（selector 分片）
- 每个 topicKey 有一个 `version`（整数递增）
- 每次 tick commit 会对 dirty topics 做 `version++` 并记录 priority（`normal|low`）

React 侧不读内部对象图，它只需要：

- `getModuleState(moduleInstanceKey)`（已提交快照）
- `getTopicVersion(topicKey)`（是否需要刷新）
- `subscribeTopic(topicKey, listener)`（变更通知）

### 2.4 React 侧：useSyncExternalStore + RuntimeExternalStore（缓存 + 分片）

关键实现：

- Hook：`packages/logix-react/src/internal/hooks/useSelector.ts`（`useSyncExternalStoreWithSelector`）
- 外部订阅适配：`packages/logix-react/src/internal/store/RuntimeExternalStore.ts`

#### A) 模块级订阅（module topic）

`getRuntimeModuleExternalStore(runtime, moduleRuntime, options)`：

- topicKey = `moduleInstanceKey`
- snapshot 来源：优先读 `runtimeStore.getModuleState(moduleInstanceKey)`（已提交快照）
- `getSnapshot()` 用 `topicVersion` 做缓存命中（版本不变则直接返回 cachedSnapshot）

#### B) selector 分片订阅（readQuery topic）

`useSelector` 会把 `selector` 编译成 ReadQuery，并判断是否“topic eligible”：

- `lane === 'static'`
- `readsDigest != null`
- `fallbackReason == null`

满足时走 `getRuntimeReadQueryExternalStore`：

- topicKey = `moduleInstanceKey::rq:${selectorId}`
- snapshot 直接是 selector 的输出值（`select(currentState)`）
- 第一个订阅者出现时，会启动一个 runtime fiber 去 drain：
  - `Stream.runDrain(moduleRuntime.changesReadQueryWithMeta(selectorReadQuery))`
  - 目的：让 selectorGraph 在 commit 时能增量评估该 selector，并在值变化时触发 `onSelectorChanged` → topic version bump

> 直觉：selector 分片订阅的目标不是“让 selector 更快”，而是让 **不相关变化不会触发重渲染**（减少 notify 与 render 压力）。

### 2.5 RuntimeProvider：确保 tick services 在 React 子树可用

入口：`packages/logix-react/src/internal/provider/RuntimeProvider.tsx`

关键点：

- Provider 会探测 baseRuntime 是否已有 RuntimeStore：`Logix.InternalContracts.getRuntimeStore(baseRuntime)`
- 若缺失，会在 React 子树上补齐 `Logix.InternalContracts.tickServicesLayer`
- 这是为了解决“你把一个不含 tick services 的 runtime 交给 React”导致的订阅不可用问题

---

## 3. 剧本集（你会遇到的所有高频场景）

### A. 无 tearing：跨模块同时读取的正确性

**目标**：同一次 render/commit 中读多个模块状态，必须来自同一个 tickSeq 的快照。

**证据用例**：

- `packages/logix-react/test/browser/perf-boundaries/runtime-store-no-tearing.test.tsx`
  - 断言不会出现 `{a=1,b=0}` 或 `{a=0,b=1}` 这类中间态
  - 通过 `runtimeStore.getTickSeq()` 记录历史，确保最终一致的 tickSeq 对齐

**常用写法**：用 `Logix.Runtime.batch(() => { ... })` 显式建立更强 tick 边界（微任务边界的“同步加强版”）。

### B. 订阅分片：为什么我更新 B，不应该让 A 的 selector 重新跑？

**目标**：

- cross-module sharding：更新模块 B，不影响模块 A 的 selector（A 没订阅 B）
- intra-module sharding：更新 A 的无关字段（例如 `b`），不应触发只读 `a` 的 selector

**证据用例**：

- 同上测试 `runtime-store-no-tearing.test.tsx`：用 `selector.fieldPaths=['a']` 让 ReadQuery 进入 static lane 并生成 readsDigest

**修复准则**：

- 要想获得 selector 分片收益：让 selector “topic eligible”（见 2.4.B）
- 最推荐：显式 `ReadQuery.make(...)` 或给 selector 标注 `fieldPaths`（避免 dynamic lane）
- 深入原因见：`docs/ssot/handbook/tutorials/09-state-trait-readquery-closure.md`

### C. 多实例隔离：同 moduleId 不同 instanceId，必须互不影响

**目标**：`ModuleInstanceKey = moduleId::instanceId` 必须是隔离边界，避免跨实例误通知。

**证据用例**：

- `runtime-store-no-tearing.test.tsx` 的 multi-instance 用例：`useModule(MImpl,{ key:'i-1' })` 与 `key:'i-2'` 隔离

### D. priority（normal/low）与 flush 策略：为什么 low 会延迟到 raf？

**目标**：让 non-urgent 的更新在 React 侧更“平滑”，并避免 starvation。

**实现**：

- `RuntimeExternalStore.ts` 的 `scheduleNotify`：
  - `priority=low`：delay window → raf → maxDelay cap
  - `priority=normal`：microtask flush

**证据**：

- `external-store-ingest.test.tsx`、`tick-yield-to-host.test.tsx` 都会通过 store.subscribe 的等待逻辑间接覆盖 notify 策略

### E. yield-to-host 退化：预算触顶后如何保持可解释与可观测？

**现象**：为了避免主线程冻结，tick 可能需要让出主线程（macrotask continuation），并将 stable=false 的退化变成证据。

**证据用例**：

- `packages/logix-react/test/browser/perf-boundaries/tick-yield-to-host.test.tsx`
  - 通过 `tickSchedulerTestLayer({ maxSteps, telemetry })` 强制触发退化路径
  - 采集 `degradedTicks` / `forcedMacrotaskTicks` 与 catch-up 延迟指标

### F. perf 门禁：如何证明“默认 diagnostics=off 近零成本”？

**证据用例**：

- `packages/logix-react/test/browser/perf-boundaries/diagnostics-overhead.test.tsx`
  - 用 matrix suite 对比 `diagnosticsLevel=off/light/sampled/full` 的 click→paint 端到端开销

**落点建议**：

- 改动触及 tick/notify/React 订阅后，至少跑一条 perf suite（或复用现有 perf matrix diff），避免默默引入“常态开销税”

---

## 4. 代码锚点（Code Anchors）

### Runtime side（logix-core）

- RuntimeStore/topic keys/version：`packages/logix-core/src/internal/runtime/core/RuntimeStore.ts`
- TickScheduler（commit→notify 顺序、readQuery topic dirty）：`packages/logix-core/src/internal/runtime/core/TickScheduler.ts`
- JobQueue（modules/topics drain/coalesce）：`packages/logix-core/src/internal/runtime/core/JobQueue.ts`
- Module commit & selector change hook：`packages/logix-core/src/internal/runtime/core/ModuleRuntime.impl.ts`

### React side（logix-react）

- RuntimeProvider（补齐 tick services layer）：`packages/logix-react/src/internal/provider/RuntimeProvider.tsx`
- useSelector（topic eligible 判定 + useSyncExternalStore）：`packages/logix-react/src/internal/hooks/useSelector.ts`
- RuntimeExternalStore（topic facade + snapshot cache + low/normal notify）：`packages/logix-react/src/internal/store/RuntimeExternalStore.ts`

### Internal contract（core ↔ react）

- `Logix.InternalContracts.getRuntimeStore/getHostScheduler/tickServicesLayer`：`packages/logix-core/src/internal/InternalContracts.ts`

---

## 5. 验证方式（Evidence）

建议把测试当“可运行教程”读：

- 语义正确性（no-tearing + sharding）：`packages/logix-react/test/browser/perf-boundaries/runtime-store-no-tearing.test.tsx`
- 性能/内存门禁（ingest→notify + retained heap）：`packages/logix-react/test/browser/perf-boundaries/external-store-ingest.test.tsx`
- 端到端诊断开销：`packages/logix-react/test/browser/perf-boundaries/diagnostics-overhead.test.tsx`
- 退化路径观测（yield-to-host backlog）：`packages/logix-react/test/browser/perf-boundaries/tick-yield-to-host.test.tsx`

---

## 6. 常见坑（Anti-patterns）

1. 引入第二个 store 真相源（per-module store）并让组件同时读两套（tearing 必然回归）。
2. selector 没有静态 reads（dynamic lane）却期待“分片订阅收益”（会退化为模块级订阅 + render 内 selector 计算）。
3. 在 React 子树里忘了提供 tick services（最终表现为订阅不 flush；dev 下可能出现 `tick_scheduler::missing_service`）。
4. 只在最终 Env 上 merge HostScheduler override（忽略 build-time capture），导致 TickScheduler 仍使用旧 scheduler。
5. 把 low priority 当成“可以无限拖延”（需要 maxDelay cap，否则会 starvation）。

