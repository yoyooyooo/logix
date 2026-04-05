---
title: foundation/01 · 最小系统方程与符号表（The One）
status: living
---

> 目的：提供一套**可长期引用**的“运行时物理口径”，把 Many（写法/场景/胶水/约定）压缩为 One（可推演的系统方程）。
>
> 约束：这是一套**工作模型**，允许迭代；但任何迭代都必须保持符号表自洽，并能映射回 `RunResult / Trace / Tape` 的工程产物。

## 1) 最小系统方程（闭系统）

$$
\begin{aligned}
Ops_t &= \Pi(E_t, S_t, t) \\
S_{t+1} &= \operatorname{Close}_{C_T}(S_t \oplus \Delta(Ops_t))
\end{aligned}
$$

等价写法（把闭包写成约束零点）：

$$
S_{t+1} = S_t \oplus \Delta(Ops_t) \quad\text{with}\quad C_T(S_{t+1}) = 0
$$

一句话裁决：

- **Traits 只负责 $C_T$（静态约束闭包）**
- **Program 只负责 $\Pi$（动态控制律）**
- **Runtime 只负责执行与产证据（RunResult）**，不再“从静态里推断动态”

## 2) 符号表（必须完整解释）

### 2.1 状态、事件、时间

- $S_t$：时刻 $t$ 的系统状态（模块 state 的一致快照）。
  - 口径：同一 `tickSeq` 内对外暴露的状态必须一致（no-tearing 观测语义）。
- $E_t$：进入系统的事件流（Action、Lifecycle、外部信号、timer fire、service outcome 等）。
  - 口径：一切不确定性要么显式进入 $E_t$，要么不可回放。
- $t$：时间变量（使 `delay/debounce/retry/timeout` 成为一等公民）。
  - **逻辑时间（推荐）**：`tickSeq`（离散序列，定义“同时性/一致性”的参考系）。
  - **物理时间（仅展示）**：wall-clock，不作为因果与回放依据；必须以可观测事件/证据的形式进入 RunResult。

### 2.2 控制律、操作与事务

- $\Pi$：控制律 / Program（可编译产物）。
  - 输入：$E_t, S_t, t$；输出：$Ops_t$。
  - 硬约束：必须可导出 IR，且其时间算子必须进入同一证据链（禁止影子时间线）。
- $Ops_t$：Program 产出的操作序列（“要做什么”）。
  - 典型包括：dispatch Action、enqueue timer、request service call、navigate、request source refresh、emit diagnostics 等。
- $\Delta$：把 $Ops_t$ 解释为对状态的增量（纯解释，不做 IO）。
- $\oplus$：把增量事务化应用到 state（聚合 patch，避免 tearing，形成可回放的 state 演进证据）。
- 事务窗口约束：事务窗口内禁止 IO/等待；IO 只能作为 $Ops$ 的“请求”存在，并在窗口外执行与回填结果。

### 2.3 Traits 闭包（静态结构）

- $C_T$：来自 State Traits 的静态约束/派生闭包（computed/validation/binding/source 写回等）。
- $\operatorname{Close}_{C_T}$：在约束下求收敛（closure / fixpoint）。
  - 现实裁决：允许**预算与软降级**（例如 partial fixpoint、分帧、优先级），但必须可解释、可诊断、可回放（口径见 `docs/ssot/platform/contracts/00-execution-model.md` 与 `docs/ssot/platform/contracts/01-runresult-trace-tape.md`）。

## 3) 开放系统（现实世界）与 Tape

闭系统方程并不足以描述真实世界：网络 IO、外部推送、用户输入、计时器都属于“环境”。

工程口径：把环境的不确定性显式建模为“可注入事件”，并在需要可回放时由 Tape 驱动。

$$
E_t = E^{(user)}_t \;\cup\; \iota(W_t, Tape_t)
$$

- $W_t$：环境状态（网络/外部源/宿主计时器等；不可控）。
- $\iota$：注入算子（把环境观测/回填转为 $E_t$）。
- $Tape_t$：磁带前缀（tape 在逻辑时间 $t$ 之前/之内的记录片段）。
  - 直觉：`Tape` 不是“更详细的 Trace”，而是**回放所需的最小确定性输入流**。
  - 现实裁决：生产环境通常只收 Trace；Tape 通常只在 Sandbox/Test 等受控环境开启（IO 结果、timer fire、external snapshot 以事件形式记录/回放）。

### 3.1 $\Sigma_t = (S_t, I_t)$：把“在途态”纳入模型（可选但强推荐）

仅用 $S_t$ 无法完整刻画开放系统：并发执行、定时器、背压队列、取消原因等都属于“在途态”，它们会影响后续行为与可解释性。

因此把状态空间扩展为：

$$
\Sigma_t = (S_t, I_t)
$$

- $I_t$：in-flight state（timers/fibers/backlog/cancel 等），不一定对业务可见，但必须能被证据链锚定（`programId/runId/timerId/callId/...`）。
- 工程裁决：是否把 $I_t$ 以“完整快照”写入 Tape 可以按预算裁剪；但至少要把影响因果的关键锚点事件化（schedule/cancel/fired/outcome）。

## 4) RunResult（平台 Grounding）

平台只消费 RunResult，而不是运行时内部对象：

- Trace：回答 “why”（允许采样/丢弃/合并）。
- Tape：回答 “how”（用于 deterministic replay/fork）。
- Anchors：把 Trace/Tape/Snapshot 锚定回静态结构（$C_T$ / $\Pi$）与稳定身份（`instanceId/txnSeq/opSeq/...`）。

对应单一事实源：

- 运行时物理模型：`docs/ssot/platform/contracts/00-execution-model.md`
- RunResult 契约：`docs/ssot/platform/contracts/01-runresult-trace-tape.md`
