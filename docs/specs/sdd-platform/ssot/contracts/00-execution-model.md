---
title: contracts/00 · 执行模型（控制律 Π / 事务 Δ⊕ / 逻辑时间 tickSeq）
status: living
---

# 执行模型（控制律 Π / 事务 Δ⊕ / 逻辑时间 tickSeq）

本文定义 Logix 体系在平台侧可被引用的 **执行口径**：它不是 API 教程，而是把 “行为如何发生、如何被记录、如何被解释” 固化成可验证契约。

上游符号表（The One）：

- `docs/specs/sdd-platform/ssot/foundation/01-the-one.md`

## 1) 时间：从 wall-clock 到 tick 参考系

裁决：

- 系统的因果主时间轴是 **逻辑时间** `tickSeq`（离散序列），用于定义“同时性/一致快照”与回放顺序。
- wall-clock 只用于 UI 展示与统计，**不**作为因果与回放依据；必须以可观测事件进入 Trace/Tape。

工程含义：

- `delay(1000ms)` 不是“等待真实 1000ms”，而是一个 **可记录的调度操作**：它预订一个未来事件 `E_{t+k}`（timer fire）。
- 回放/快进的本质不是“等待”，而是把 `timer.fire` 视为 tape 驱动的输入事件（环境=oracle）。

## 2) 事务：Δ/⊕ 与 “事务窗禁止 IO”

裁决：

- $Ops_t$ 先被解释为纯增量 $\Delta(Ops_t)$，再用 $\oplus$ 事务化提交到状态。
- **事务窗口内禁止 IO/等待**：IO 只能以 $Ops$ 的“请求”存在，并在窗口外执行；结果以事件形式回填进入 $E_t$。

工程含义：

- “无撕裂/no-tearing”不是 UI 优化术语，而是 **观测语义**：同一 `tickSeq` 对外暴露的 state 必须一致。
- 入口级事务（logical entry）是证据链的基本粒度：`tickSeq → txnSeq → opSeq` 形成稳定锚点。

## 3) Traits：$C_T$ 是静态约束闭包（不是行为编排）

裁决：

- Traits 只负责 $C_T$：computed/validation/binding/source 写回等 **静态约束闭包**。
- Traits **不得**承载“触发策略/时间语义/并发策略”等自由控制律（这些属于 $\Pi$）。

现实主义条款（必须可诊断）：

- `Close_{C_T}` 允许预算与软降级（partial fixpoint、分帧、优先级、循环保护），但必须产出解释事件（budget/downgrade）。

## 4) Program：$\Pi$ 是显式控制律（可编译、可 IR 化）

裁决：

- $\Pi$ 负责把 $E_t,S_t,t$ 映射为 $Ops_t$（动态律/自由编排）。
- $\Pi$ 必须 **可导出 IR**（Static IR + Dynamic Trace 的锚点可对齐），禁止“影子时间线”绕开 tick/证据链。

工程含义：

- 你可以在代码里写 `$.onAction`/`flow.debounce`/`Effect.*`，但平台侧最终必须能把“可解析子集”还原为 $\Pi$ 的 IR，才能：
  - 做可视化（为什么触发、触发了什么）；
  - 做对齐（Spec/Scenario vs RunResult）；
  - 做回放（Tape 驱动的 deterministic replay/fork）。

## 5) 诊断：Diagnostics=Off 不是零成本

裁决：

- 诊断必须分层：业务必达通道（lossless）与诊断可降级通道（lossy）物理隔离。
- Diagnostics=Off 的目标是“可控/可忽略”，而不是绝对 0；任何宣称 0 的实现最终都会把成本转移到不可控的对象分配与图结构维护上。

工程含义：

- 证据链的最小形态是 Slim 且可序列化的事件壳（RunResult 的 evidence），并通过稳定锚点与 Static IR 对齐。

## 6) 开放系统：IO、外部源与 Tape

裁决：

- 真实世界不可逆：Live 运行无法时间旅行（例如真实 `POST /pay`）。
- 时间旅行的可实现形态是：**在受控环境中**（Sandbox/Test），用 Tape 把不确定性事件化并注入 $E_t$，让环境退化为 oracle。

对应契约：

- RunResult / Trace / Tape：`docs/specs/sdd-platform/ssot/contracts/01-runresult-trace-tape.md`
- Tape 最小口径（program 侧）：`specs/075-logix-flow-program-ir/contracts/tape.md`

## 7) 与 073/075/076 的关系（主线落点）

- `specs/073-logix-external-store-tick/`：建立 `tickSeq` 参考系与 no-tearing 观测语义（$S_t$ 的一致快照）。
- `specs/075-logix-flow-program-ir/`：把 $\Pi$ 落成可编译的 FlowProgram IR（时间算子进入证据链）。
- `specs/076-logix-source-auto-trigger-kernel/`：把 source 的自动触发从 trait meta 移出，作为受限 $\Pi_{source}$ 内核化，消灭 Query/Form 胶水。

