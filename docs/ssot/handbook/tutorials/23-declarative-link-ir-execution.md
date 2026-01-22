---
title: DeclarativeLink：跨模块链路的 IR、执行与诊断教程 · 剧本集
status: draft
version: 1
---

# DeclarativeLink：跨模块链路的 IR、执行与诊断教程 · 剧本集

> **定位**：这是 `docs/ssot/handbook/` 的“维护者教程/剧本集”（how-to），用于新成员上手、老成员回味：把跨模块协作从“blackbox 链接（best-effort）”升级为 **DeclarativeLinkIR（ReadQuery → dispatch）** 的受控形态，并讲清楚它如何在 TickScheduler 的 fixpoint loop 中做到 **同 tick 强一致收敛**，以及如何导出 IR 与诊断链路。  
> **重要**：本文不是裁决来源；凡涉及 MUST/协议/边界的最终口径以 SSoT 为准（`docs/ssot/platform/**` 与 `docs/ssot/runtime/**`）。

---

## 0. 最短阅读路径（10–20 分钟先把“边界与收益”建立起来）

1. Link 的对外说明（两种形态）：`apps/docs/content/docs/api/core/link.cn.md`
2. 模块图谱与协作的总览（含 Link/DeclarativeLink 定位）：`docs/ssot/handbook/tutorials/07-module-graph-and-collaboration.md`
3. DeclarativeLinkIR 的合同口径（必须复用 ReadQueryStaticIr）：`specs/073-logix-external-store-tick/contracts/ir.md`
4. 代码入口（对外 API）：`packages/logix-core/src/Link.ts`、`packages/logix-core/src/Process.ts`
5. 执行内核（IR + runtime + tick settle）：`packages/logix-core/src/internal/runtime/core/DeclarativeLinkIR.ts`、`packages/logix-core/src/internal/runtime/core/DeclarativeLinkRuntime.ts`、`packages/logix-core/src/internal/runtime/core/TickScheduler.ts`
6. 最短实证（同 tick vs next tick）：`packages/logix-core/test/internal/Runtime/DeclarativeLinkIR.boundary.test.ts`

---

## 1. 心智模型：Link 是“跨模块协作资产”，declarative 形态把它变成 IR 可识别依赖

我们把 Link 分成两种形态（这不是“写法偏好”，而是“语义边界”）：

1. **Blackbox Link（best-effort）**：`Link.make` / `Process.link`
   - 你可以写任意 Stream/Effect 编排（甚至 setTimeout/Promise 链）。
   - 运行时不会承诺“同 tick 内强一致收敛”（因为任意 Effect 可能越过 tick/txn 边界、也可能在事务窗口里偷 IO）。
   - runtime 会发一条边界诊断提醒你这是 best-effort（避免把隐性不一致当成“偶尔灵验的魔法”）。

2. **Declarative Link（受控 IR，强一致）**：`Link.makeDeclarative` / `Process.linkDeclarative`
   - 你只能表达 **ReadQuery → dispatch** 的边列表。
   - 这套形态被 TickScheduler 识别，并在一次 tick 的 fixpoint loop 内尝试“读→写→再读→再写”直到稳定（或预算/循环降级）。
   - 你获得：强一致收敛 + 可序列化 IR + 更可解释的链路（平台/Devtools 可消费）。

一句话总结：**blackbox 是任意编排；declarative 是“可证明可解释”的跨模块依赖图。**

---

## 2. DeclarativeLinkIR：为什么必须“读侧复用 ReadQueryStaticIr，写侧只允许 dispatch”

实现类型定义：`packages/logix-core/src/internal/runtime/core/DeclarativeLinkIR.ts`

IR v1 只允许两类节点：

- `kind="readQuery"`：读侧节点（必须携带 `ReadQueryStaticIr`；禁止并行 selector-like IR）
- `kind="dispatch"`：写侧节点（只记录 actionTag；禁止 direct state write）

IR 的目标不是“携带执行闭包”，而是“携带可比较的结构事实源”：

- JSON 可序列化（可落 EvidencePackage / 可 diff）
- 可 gate：读侧必须可识别（static lane + readsDigest + fallbackReason=null）
- 写侧受限：统一走 dispatch（进入可追踪事务路径），拒绝 direct write 逃逸

IR digest：

- `getDeclarativeLinkIrDigest(ir)` 会生成 `dlink_ir_v1:<hash>`
- `exportDeclarativeLinkIr({ linkId, ir })` 会把它包装成 `ConvergeStaticIrCollector` 兼容的导出结构（`kind='declarativeLinkIr'`）

> 注意：IR digest 的稳定性直接影响“diff 稳定/证据对比”。因此读侧复用 ReadQueryStaticIr（含 readsDigest）是硬约束。

---

## 3. DSL → Program：Process.linkDeclarative 如何生成 IR 并注册到 runtime

对外入口：`packages/logix-core/src/Link.ts`（`Link.makeDeclarative`）最终委托到：`packages/logix-core/src/Process.ts`（`Process.linkDeclarative`）。

### 3.1 builder 约束：ReadQuery 必须是 static 且有 readsDigest（否则 fail-fast）

`Process.linkDeclarative` 给每个参与模块提供两个句柄：

- `read(selector)`：把 selector 编译为 ReadQuery，并 gate：`lane=static && readsDigest != null && fallbackReason == null`
- `dispatch(actionTag)`：只允许给出 actionTag（字符串）

这一步的目的很明确：**不允许把“依赖事实源”藏进闭包/动态路径**，否则 runtime 既无法做增量，也无法稳定导出 IR。

### 3.2 IR 生成与注册：这是一个“长期 process”，但执行发生在 TickScheduler

`Process.linkDeclarative` 返回的其实是一个 process effect（长期运行）：

- 在启动时解析 module tag → module runtime（拿到 moduleId/instanceId/dispatch/getState 等）
- 生成 IR（nodes/edges），并构造 runtime 侧的 registration（readNodes/dispatchNodes）
- 调用 `DeclarativeLinkRuntime.registerDeclarativeLink(...)`
- 将 IR 通过 `currentConvergeStaticIrCollectors` 导出（如果 collector 存在）
- 然后 `Effect.never` 常驻；卸载时 finalizer 负责 unregister

关键落点：

- builder/注册：`packages/logix-core/src/Process.ts`
- IR export bus：`packages/logix-core/src/internal/runtime/core/ConvergeStaticIrCollector.ts`

这里要抓住一个关键点：**declarative link 的“执行”不在 process fiber 中**；process fiber 只负责“注册 IR”。真正的“读→写”在 tick 里发生（下一节）。

---

## 4. runtime 执行：TickScheduler 的 fixpoint loop 如何让跨模块更新同 tick 收敛

tick 内核：`packages/logix-core/src/internal/runtime/core/TickScheduler.ts`

tick flush 的核心 loop（概念化）是：

1. drain queue（收集本轮 pending commits/topics）
2. merge 到 captured.accepted
3. 对 “本轮 changed moduleInstanceKeys” 执行 `DeclarativeLinkRuntime.applyForSources(...)`
4. 若 apply 导致新的 dispatch/写回 → 会产生新的 module commits 入队 → 回到 (1) 再 drain
5. 直到 queue 空（稳定）或超过 `maxDrainRounds`（cycle_detected）

源码里这段循环的注释非常直白：`Fixpoint capture: drain -> apply declarative links -> drain`.

### 4.1 applyForSources 的两类边：Module-as-Source 与 DeclarativeLinkIR

实现：`packages/logix-core/src/internal/runtime/core/DeclarativeLinkRuntime.ts`

applyForSources 会做两件事：

1. **Module-as-Source edges**：module readQuery → externalStore trait writeback  
   - 读的是 captured.accepted 的 commit.state（同 tick）
   - 写回走下游模块的 externalStore trait（external-owned + txn-window）

2. **DeclarativeLinkIR edges**：module readQuery → dispatch(payload)  
   - 读的是同 tick commit.state
   - 若读值 changed（内部按 Object.is 去重），则对目标 dispatch 节点执行 dispatch

dispatch 触发的事务提交会进入 tick 队列，从而被 fixpoint loop 继续 drain & apply，形成“跨模块收敛”。

### 4.2 为什么说 declarative link “强一致”？它强的是哪一层

强一致的意思不是“永不降级”，而是：

- 在 **预算允许** 且 **无循环** 的情况下，tick 会尝试把 declarative link 的跨模块影响在同一 tick 内 settle；
- 若无法 settle（循环/预算），tick 会显式降级（`stable=false` + degradeReason），并通过 trace 事件给出可解释证据。

这比 blackbox link 的“时序隐式漂移”强得多：至少你知道“什么时候没 settle、为什么没 settle、还剩多少 backlog”。

---

## 5. 约束与陷阱（你必须提前知道，否则会写出无法解释的链路）

### 5.1 dispatch 节点单入边：避免“payload 混合语义”

`DeclarativeLinkRuntime.registerDeclarativeLink` 会强制：

- 每个 dispatch node 只能有 **最多一条 incoming edge**（V1 解释为“payload flow”）

否则会抛错：

- `dispatch node has multiple incoming edges (linkId=..., nodeId=...)`

这条约束的本质：V1 不想引入“fan-in 合并算子”的语义歧义（谁覆盖谁？合并策略是什么？是否需要 deterministic ordering？）。

### 5.2 ReadQuery 必须可识别：unstableSelectorId 是硬红线

DeclarativeLinkIR 的 read side 不接受 dynamic lane，更不接受 `fallbackReason=unstableSelectorId`：

- 这会直接破坏 IR/diff 的稳定性（selectorId 在不同 run 中不一致）
- 同时破坏增量（readsDigest 缺失 → 只能退化为粗粒度）

修复方式只有两类：

- 用 `ReadQuery.make({ selectorId, reads, select, ... })` 显式建模；
- 或给 selector 标注 `fieldPaths`，让 compile 走 static lane（但仍建议把 selector 提升为 module 级常量，避免函数实例漂移）。

### 5.3 不要在 declarative link 里期待“任意 effect 的同 tick 强一致”

DeclarativeLink 的受控形态只承诺 IR 的 `ReadQuery → dispatch`；你想做更复杂的编排（重试/延迟/并发）：

- 要么回到 blackbox link（承认 best-effort）
- 要么把“复杂编排”下沉为模块内的流程/状态机，由 declarative link 只负责触发一个可追踪 action

---

## 6. 诊断与证据：如何排障与如何给平台导出 IR

### 6.1 blackbox 边界诊断：别把 best-effort 当成强一致

blackbox link 会发出诊断提示（info）：

- `code=process_link::blackbox_best_effort`

实证用例：`packages/logix-core/test/internal/Runtime/DeclarativeLinkIR.boundary.test.ts`（第二个用例）。

### 6.2 tick 级证据：同 tick 是否 settle、为何降级

DeclarativeLink 本身目前不额外发专属 trace（执行发生在 tick loop），但你可以通过这些事件判断是否收敛/降级：

- `trace:tick`（stable / degradeReason / backlog）
- `trace:selector:eval`（模块内 SelectorGraph 的增量评估；用于判断读侧是否走了退化路径、cost 是否异常）

如果你看到 `stable=false` 且 `degradeReason=cycle_detected`，优先怀疑：

- declarative link 产生循环（A → B → A），或
- budget/round cap 太小导致无法完成 fixpoint

### 6.3 IR 导出：DeclarativeLinkIR 走 ConvergeStaticIrCollector 总线

DeclarativeLinkIR export 结构定义在：`packages/logix-core/src/internal/runtime/core/DeclarativeLinkIR.ts`

- `kind='declarativeLinkIr'`
- `staticIrDigest='dlink_ir_v1:<hash>'`

它复用 `ConvergeStaticIrCollector` 接口（同 converge static IR 一条总线）：

- `packages/logix-core/src/internal/runtime/core/ConvergeStaticIrCollector.ts`

平台/Devtools/EvidenceCollector 可以只依赖这条总线收集“跨模块依赖图形状”，无需解析运行时闭包。

---

## 7. 剧本集（用例驱动）

### 7.1 从 0 到 1：同 tick settle 的最短回归

参考：`packages/logix-core/test/internal/Runtime/DeclarativeLinkIR.boundary.test.ts`

它验证：

- declarative link：源模块 dispatch 后，同一次 `scheduler.flushNow` 内目标模块 mirror 已更新（tickSeq=1 时已收敛）
- blackbox link：需要等到异步 effect 完成后，下一个 tick 才能收敛（tickSeq=2 才更新）

这两个用例就是“强一致 vs best-effort”的最短证据。

### 7.2 从链接到 IR：如何确认 ReadQueryStaticIr 被正确复用

做法：

- 用 `ReadQuery.make` 明确给出 selectorId/reads；
- 运行时会把 `readQuery.staticIr` 放进 DeclarativeLinkIR 的 read 节点（见 `Process.linkDeclarative` 实现）。

如果你误用动态 selector，会在 build 阶段直接 fail-fast（这是故意的：宁可早失败也不留隐性退化）。

---

## 8. 代码锚点（Code Anchors）

- 对外 API：`packages/logix-core/src/Link.ts`、`packages/logix-core/src/Process.ts`
- IR：`packages/logix-core/src/internal/runtime/core/DeclarativeLinkIR.ts`
- runtime：`packages/logix-core/src/internal/runtime/core/DeclarativeLinkRuntime.ts`
- tick settle：`packages/logix-core/src/internal/runtime/core/TickScheduler.ts`
- ReadQuery gate：`packages/logix-core/src/internal/runtime/core/ReadQuery.ts`
- 回归测试：`packages/logix-core/test/internal/Runtime/DeclarativeLinkIR.boundary.test.ts`

---

## 9. 常见坑（Anti-patterns）

1. **把 blackbox link 当成同 tick 强一致**：它不是；看到 `process_link::blackbox_best_effort` 就应该迁移或重构边界。
2. **读侧用 dynamic selector**：declarative builder 会 fail-fast；不要试图绕过 gate，否则 IR/diff 立刻失真。
3. **期待 fan-in 合并语义**：V1 dispatch 单入边；需要 fan-in 请显式建一个“合并模块/合并 action”。
4. **在 declarative link 里塞复杂编排**：复杂编排应该在模块内（可追踪、可回放、可诊断），link 只负责触发。

