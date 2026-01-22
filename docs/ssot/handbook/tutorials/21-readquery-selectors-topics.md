---
title: ReadQuery / SelectorGraph / Topics：选择器的稳定性、成本与可解释性教程 · 剧本集
status: draft
version: 1
---

# ReadQuery / SelectorGraph / Topics：选择器的稳定性、成本与可解释性教程 · 剧本集

> **定位**：这是 `docs/ssot/handbook/` 的“维护者教程/剧本集”（how-to），用于新成员上手、老成员回味：把 ReadQuery 的编译（lane/producer/readsDigest）、SelectorGraph 的增量触发（dirty roots → selectorId）、以及 RuntimeStore topics（模块 topic / selector topic）如何共同支撑 **no-tearing、性能预算与可解释诊断** 讲清楚。  
> **重要**：本文不是裁决来源；凡涉及 MUST/协议/边界的最终口径以 SSoT 为准（`docs/ssot/platform/**` 与 `docs/ssot/runtime/**`）。

---

## 0. 最短阅读路径（10–20 分钟先抓住“红线”）

1. 已有长文（闭包/增量/IR 背景）：`docs/ssot/handbook/tutorials/09-state-trait-readquery-closure.md`
2. 代码入口（对外 API）：`packages/logix-core/src/ReadQuery.ts`
3. 核心实现（compile + strict gate）：`packages/logix-core/src/internal/runtime/core/ReadQuery.ts`
4. 增量触发（dirty roots → selector eval）：`packages/logix-core/src/internal/runtime/core/SelectorGraph.ts`
5. topic 真理源（tickSeq + topicVersion）：`packages/logix-core/src/internal/runtime/core/RuntimeStore.ts`
6. React 侧落点（selector-topic eligible gate）：`packages/logix-react/src/internal/hooks/useSelector.ts`

如果你只记住两条规则：

1. **跨模块/IR 承载/selector-topic 的前提是：static lane + readsDigest + fallbackReason=null**  
2. **fallbackReason=unstableSelectorId 是“硬红线”**（它意味着 selectorId 不是稳定资产，会把 diff/订阅/诊断全部打碎）

---

## 1. 心智模型：ReadQuery 是“稳定 selector 契约”，不是随手写个函数

Logix 把 selector 设计成“可推导、可诊断、可比较”的契约（ReadQuery），目的不是“强迫你写样板”，而是为了让 runtime 能做到：

- **增量触发**：dirty-set 能推导“哪些 selector 可能受影响”，避免模块内 O(N) 全量重算；
- **稳定订阅分片（topics）**：UI 只订阅 topicVersion（而不是订阅大量 stream），从而 no-tearing；
- **可解释诊断**：每次 selector eval 都能产出 slim trace（lane/producer/fallbackReason/readsDigest/cost）。

所以：selector 在这里不是“匿名函数”，而是一种资产（有 ID、有依赖、有可解释链路）。

---

## 2. ReadQuery.compile：lane / producer / readsDigest / fallbackReason 的由来

实现入口：`packages/logix-core/src/internal/runtime/core/ReadQuery.ts`

### 2.1 三种“走向 static lane”的方式（优先级从强到弱）

1. **显式 ReadQuery（最推荐）**：`ReadQuery.make({ selectorId, reads, select, equalsKind })`
   - `reads` 会被 normalize + 排序 + 去重，并计算 `readsDigest`（稳定哈希）。
   - `producer="manual"`，lane 固定 `"static"`。

2. **函数 selector + 显式 `fieldPaths` 注解（JIT 但稳定）**
   - 形如：`Object.assign((s) => s.count, { fieldPaths: ['count'] })`
   - compile 会用 `fieldPaths` 生成 readsDigest，并给出稳定 selectorId（基于 reads 计算）。

3. **函数源码解析（最脆弱，但能覆盖“最小子集”）**
   - 只覆盖非常小的一类子集：`s => s.a.b`、`s => ({ x: s.x, y: s.y })`、以及等价 function-return 形式。
   - 命中 struct 形态时，会把 `equalsKind` 自动提升为 `shallowStruct`（避免每次都 changed）。

这三条都能产出：lane=static 且 readsDigest 存在，从而具备 selector-topic 的资格。

### 2.2 dynamic lane：三类 fallbackReason

当 selector 无法推导 reads（或源码子集不支持）时，会退化为 lane=dynamic，并给出 `fallbackReason`：

- `missingDeps`：缺少可推导依赖（典型：你没提供 fieldPaths，源码也无法识别 reads）
- `unsupportedSyntax`：源码看起来是函数，但包含条件/复杂表达式，超出子集（典型：`s.count > 0 ? s.count : 0`）
- `unstableSelectorId`：最危险；发生在 **debugKey 不存在** 或 **函数源码不可区分（如 native code）** 时
  - selectorId 会变成 `rq_u<N>`（WeakMap + 自增序号），只在“当前进程生命周期”内稳定，跨运行/跨 diff 都不稳定。

结论：dynamic lane 不是“不能用”，但它不是稳定资产；它的默认语义就是“正确优先，成本兜底”。

### 2.3 strict gate：把 dynamic lane 当成可控风险，而不是隐性退化

`ReadQueryStrictGateConfig` 允许你把“dynamic selector”变成：

- `mode="warn"`：发出 `diagnostic code=read_query::strict_gate`，但继续运行；
- `mode="error"`：fail-fast（抛 `ReadQueryStrictGateError`）。

典型用法：在 dev/test 环境用 strict gate 提前抓出 `unstableSelectorId`（否则你会在“性能抖动/订阅漂移/回放不可比”里慢慢中毒）。

回归用例：

- `packages/logix-core/test/ReadQuery/ReadQuery.strictGate.test.ts`

---

## 3. SelectorGraph：dirty roots → selector eval → selector-topic dirty

实现入口：`packages/logix-core/src/internal/runtime/core/SelectorGraph.ts`

SelectorGraph 的关键设计点是：**只为“有订阅者”的 selector 做增量维护**（demand-driven），并把每次 eval 的成本/退化记录出来。

### 3.1 增量触发的基本策略

onCommit 输入包括：`state/meta/dirtySet/diagnosticsLevel`，内部策略是：

- `dirtyAll=true` → 重算所有“有订阅者”的 selector（保守但慢）
- `dirtyAll=false` 且 **缺少 FieldPathIdRegistry** → 退化为全量（避免错误增量）
- `dirtyAll=false` 且 registry 可用 → 用 `dirtySet.rootIds` 定位 dirty roots，再用 `indexByReadRoot` 做候选集收缩，最后用 `overlaps` 精确判断

对应回归用例：

- `packages/logix-core/test/Runtime/ModuleRuntime/SelectorGraph.test.ts`

### 3.2 什么时候会触发 `onSelectorChanged(selectorId)`？

当 selector eval 后发现值 changed（按 equalsKind/equals 判断）时，会：

1. 更新缓存值与 `cachedAtTxnSeq`
2. publish 到 selector 的 PubSub（`changesReadQueryWithMeta` 的数据源）
3. 调用 `onSelectorChanged?.(selectorId)`（这是进入 selector-topic 的关键桥）
4. 在 diagnostics=light/full/sampled 时记录 `trace:selector:eval`（Slim 证据）

这意味着：selector-topic 的 dirty **不是由 React 计算出来的**，而是由 runtime 在提交路径上产出（避免第二真相源）。

---

## 4. RuntimeStore topics：把“变化”变成 UI 可订阅的稳定版本号

实现入口：`packages/logix-core/src/internal/runtime/core/RuntimeStore.ts`

RuntimeStore 是“React-facing sync snapshot”的真理源，它维护：

- `tickSeq`：对外原子锚点（同一次 render 读取到的必须来自同一 tick）
- `topicVersion(topicKey)`：按 topic 分片的版本号（单调递增）
- `subscribeTopic(topicKey, listener)`：订阅某个 topic 的版本变化

topicKey 规则：

- 模块 topic：`ModuleInstanceKey = "${moduleId}::${instanceId}"`
- selector topic：`"${moduleInstanceKey}::rq:${selectorId}"`

注意：RuntimeStore 不关心“为何变了”；它只在 tick commit 时 bump `dirtyTopics` 中的 topicVersion，并汇总 listeners 做 notify。

---

## 5. TickScheduler：把 selector changed 转换成“topic 变更”，并在 tick 边界统一 flush

关键桥接发生在 `ModuleRuntime.onCommit`：

- selectorGraph 发现 selector changed → 调用 `scheduler.onSelectorChanged({ moduleInstanceKey, selectorId, priority })`
- TickScheduler 把它转成 `queue.markTopicDirty(makeReadQueryTopicKey(...), priority)`
- tick flush 时，RuntimeStore.commitTick bump 这些 topicVersion，并在最后 notify（避免 tearing）

代码锚点：

- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.impl.ts`（selectorGraph.onCommit + scheduler.onSelectorChanged）
- `packages/logix-core/src/internal/runtime/core/TickScheduler.ts`（onSelectorChanged + flush）

---

## 6. React 落点：selector-topic eligible gate（否则回退到 module-topic + selector）

核心落点：`packages/logix-react/src/internal/hooks/useSelector.ts`

`useSelector` 做了一个非常重要的 gate：

- 只有当 selector 满足：
  - `lane === "static"`
  - `readsDigest != null`
  - `fallbackReason == null`
  才使用 **selector-topic**（`getRuntimeReadQueryExternalStore`）。
- 否则统一回退到 **module-topic**（`getRuntimeModuleExternalStore`）+ `useSyncExternalStoreWithSelector` 的 equality 兜底。

这条 gate 是你理解“为什么要 readsDigest/diff 稳定”的关键：  
selector-topic 是性能与 no-tearing 的正道；dynamic lane 仍能正确，但它的成本与漂移风险必须被显式化。

---

## 7. 剧本集（用例驱动）

### 7.1 新成员最常见的坑：把 selector 写成每次 render 都新建的匿名函数

**症状**：`useSelector(handle, (s) => s.count)` 写在组件里，且 selector 没有 fieldPaths/debugKey。

**后果**：

- compile 可能退化为 dynamic lane（甚至 unstableSelectorId）；
- 每个函数实例都对应一个新 selectorId（或新 template cache miss），订阅/缓存/证据全漂移；
- 最后你会在“为什么 trace:react-selector 里 selectorId 一直变”上浪费一整天。

**修复**：

- 把 selector 提升成 module 级常量；
- 或直接用 `ReadQuery.make`（最稳定）。

### 7.2 Module-as-Source 的红线：unstableSelectorId 必须 fail-fast

Module-as-Source 不是“随便拿函数当 selector”，它要求 selector 是稳定资产。

证据用例：

- `packages/logix-core/test/internal/Runtime/ModuleAsSource.recognizability.test.ts`

其中包含两类关键场景：

- 传入 ModuleHandle（无法解析 moduleId）会 fail-fast；
- selector fallbackReason=unstableSelectorId 会 fail-fast；
- dynamic selector（无 readsDigest）会降级并发出 `external_store::module_source_degraded` 诊断（性能风险显式化）。

### 7.3 排障：如何看懂 trace:selector:eval

当你怀疑“selector 评估太频繁/成本过高”时，先看 `trace:selector:eval`：

- `lane/producer/fallbackReason/readsDigest`：判断是否在走退化路径
- `changed`：是否大量“评估但没变化”（可能是 dirtySet 太粗或 reads 声明过粗）
- `evalMs`：成本，配合 txnSeq/trigger 追上游

回归用例：`packages/logix-core/test/Runtime/ModuleRuntime/SelectorGraph.test.ts`（diagnostics=light 下产出 slim 事件）

---

## 8. 代码锚点（Code Anchors）

- `packages/logix-core/src/ReadQuery.ts`（对外 API）
- `packages/logix-core/src/internal/runtime/core/ReadQuery.ts`（compile + strict gate）
- `packages/logix-core/src/internal/runtime/core/SelectorGraph.ts`（增量触发 + trace:selector:eval）
- `packages/logix-core/src/internal/runtime/core/RuntimeStore.ts`（topicVersion 真理源）
- `packages/logix-core/src/internal/runtime/core/TickScheduler.ts`（selector-topic dirty + tick flush）
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.impl.ts`（selectorGraph.onCommit → TickScheduler.onSelectorChanged）
- `packages/logix-react/src/internal/hooks/useSelector.ts`（selector-topic eligible gate）
- `packages/logix-react/src/internal/store/RuntimeExternalStore.ts`（topic 外部订阅与通知节流）

回归测试：

- `packages/logix-core/test/ReadQuery/ReadQuery.compile.test.ts`
- `packages/logix-core/test/ReadQuery/ReadQuery.strictGate.test.ts`
- `packages/logix-core/test/Runtime/ModuleRuntime/SelectorGraph.test.ts`

---

## 9. 常见坑（Anti-patterns）

1. **把 dynamic selector 当成稳定资产复用**：尤其是 `unstableSelectorId`，必须尽早 gate 掉。
2. **不声明 reads 还指望系统增量**：没有 readsDigest/registry 就只能退化全量，正确但可能 O(N)。
3. **在 selector 里做 IO / 抛错 / 隐式随机**：selector 必须纯、稳定、可诊断；抛错会进 `read_query::eval_error`。
4. **绕过 selector-topic gate**：React 侧 selector-topic 是有资格门槛的，不要强行让 dynamic lane 走 selector-topic（不会稳定、也不该稳定）。

