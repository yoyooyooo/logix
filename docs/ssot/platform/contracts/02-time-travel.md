---
title: contracts/02 · 时间旅行调试器 (Time Travel Debugger)
status: living
---

> **核心目标**：在 Logix 体系内引入“可回放磁带（Tape）”与可控时间线的执行模式：不仅能“看到”过去，还能“回到”过去、快进/倒退、甚至分叉（Fork）验证假设。
>
> 本文是 **愿景 + 交互** 的 SSoT 入口；形式化模型与符号表见 `docs/ssot/platform/foundation/01-the-one.md`（含 “3.1 $\Sigma_t=(S_t,I_t)$” 与 Tape 口径）。

## 1. 架构原理：开放系统的“客观磁带”（Tape）

传统 Redux DevTools 主要记录 $S_t$（state）。但 Logix runtime 是开放系统：外部输入/IO/定时器会引入不确定性。要做到真正的时间旅行，必须把不确定性交换 **事件化并记录**，使回放时环境退化为确定性的 oracle。

因此我们需要区分三类产物（它们不能混用）：

- **Static IR（结构）**：描述“可能发生什么”（节点/边/策略），用于可视化与 diff。
- **Tape（回放）**：描述“实际发生了什么”且足以 deterministic replay（快进/倒退/分叉的基础）。
- **Trace（解释）**：Slim 的诊断事件流（可采样/可丢弃），回答“为什么”，但不保证可回放完整性。

本仓库的长期公式把系统状态扩展为 $\Sigma_t=(S_t, I_t)$，其中 $I_t$ 是 timers/fibers/backlog/cancel… 等在途态。时间旅行的关键结论是：

- 仅记录 $S_t$ 不够；必须让 $E_t$（Action/ExternalStore/timer fire/IO outcome）与 $I_t$ 的关键锚点进入 Tape；
- “时间”必须以 **tickSeq（逻辑时间）** 为参考系锚点；wall-clock 只能以可观测事件的形式进入 tape；
- 禁止影子时间线：`setTimeout/Promise` 链绕开 tick/record 会让回放天然不确定。

> Tape 的最小口径（program 侧）见：`specs/075-workflow-codegen-ir/contracts/tape.md`。

## 2. 可视化交互 (Visual Interaction)

### 2.1 多轨道时间轴 (Multi-Track Timeline)

UI 底部展示一个类似视频剪辑软件的时间轴：

*   **Tick Track (主轴)**: 以 `tickSeq` 为离散帧的主时间线（同时性/一致性参考系）。
*   **Event Track**: $E_t$（Action、ExternalStore、timer fire、IO outcome…）进入系统的事件流。
*   **Program/Flow Tracks**: 每个 Program 触发的 run 占据一行（并发/取消可视化）。
    *   **并发可视化**: 你可以直观地看到多个 Flow 是如何并行执行、竞态取消 (Cancellation) 的。
    *   **因果连线**: 点击一个 event，高亮它触发的 run 与后续 `txn.commit`（$\Delta$）的因果链。

### 2.2 状态透视 (State Inspection)

点击时间轴上的任意 Span，右侧面板显示：
*   **Input/Outcome**: 该节点的输入与结果（例如 call 的 outcome、timer 的 schedule/cancel/fired）。
*   **State Patch ($\Delta$)**: 该 tick/txn 的 patch（以及 dirtyPaths 摘要）。
*   **Code Link**: 点击直接跳转到对应的源码位置。

## 3. 时间旅行 (Time Travel)

### 3.1 回滚 (Rollback)

拖动时间轴滑块（选择目标 `tickSeq`），Runtime 执行以下操作：
1.  **Suspend**: 暂停当前所有正在运行的 Fiber。
2.  **Restore**: 将 Store 的状态恢复到目标 tick 的一致快照（通过 checkpoint + replay patch 或直接快照）。
3.  **Freeze**: 进入“暂停模式”（只读），防止产生新的外部输入污染 tape。

### 3.2 重放 (Replay)

在暂停模式下，可以选择“重放后续操作”。Runtime 会按 `tickSeq` 顺序回放 tape：

- 所有 `timer.fire`/`io.outcome`/`externalStore.snapshot` 由 tape 驱动（环境=oracle），禁止真实 IO；
- 允许以步进方式（step）慢动作观察：每步一个 tick / 一个 txn / 一个 program node。

## 4. 逻辑分叉 (Logic Forking) —— The Killer Feature

这是 Logix Debugger 最强大的功能。它允许你在不修改代码的情况下，**动态验证假设**。

**场景**：
你怀疑某个 API 返回错误导致了 Bug，但很难复现 API 错误。

**操作流程**：
1.  在时间轴上找到那个 API 调用节点。
2.  右键点击 -> **"Fork & Mock"**。
3.  在弹出的面板中，手动修改该节点的输出（例如：强制返回 500 Error）。
4.  点击 **"Run Fork"**。

**系统行为**：
*   Runtime 克隆当前的 Fiber 上下文（Sandbox）。
*   从该节点/该 `tickSeq` 开始执行，使用你 Mock 的 tape event（例如替换 `io.outcome`）。
*   后续流程在新的沙箱中跑完，并产出一条新的 tape 分支（主时间轴不受影响）。
*   **主时间轴不受影响**。

## 5. 集成计划

*   **Phase 0**: 统一锚点与参考系（tickSeq/txnSeq/opSeq + programId/nodeId/runId/timerId/callId）与 “无影子时间线” 约束。
*   **Phase 1**: 引入 Tape 记录模式（最小：$E_t + txn.commit(\Delta) + tick.settled$），并提供 ring buffer/预算策略。
*   **Phase 2**: 引入 Replay 模式（环境=oracle）：Timer/IO/ExternalStore 必须可注入并可按 tape 驱动。
*   **Phase 3**: Fork 模式：允许替换部分 tape event 并在新 Scope 中重放分支。
