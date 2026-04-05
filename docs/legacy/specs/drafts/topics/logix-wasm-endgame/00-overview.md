---
title: "00. Overview"
status: draft
version: 2025-12-29
value: vision
priority: next
---

# 00. Overview

本草案回答一个问题：**如果我们真的要让 WASM 成为 Logix Runtime 的终点形态（或至少成为一条可选内核），必须把哪些东西静态化/整型化/编译化？极限能到哪？**

## 0) 先把“WASM 没戏”的根因讲清楚

WASM 之所以经常“集成后更慢”，通常不是因为 WASM 慢，而是因为：

1. **跨边界调用次数太多**：细粒度响应式图谱（节点/边很多）如果每个 node 都跨一次 JS↔WASM，会被调用/桥接税击穿。
2. **数据桥接形态不对**：对象/字符串在边界上反复 materialize（含 JSON、join/split、对象分配），会把收益吃光。
3. **热路径仍然动态**：依赖图、路径归一化、reason 文本、diagnostics 采样仍在 txn 内做，WASM 只能接到一堆“动态垃圾”。

所以：想让 WASM 有戏，必须倒推 **两条硬约束**：

- **A. 一次 txn 一次调用**（或常数级极少调用）。
- **B. 传输的只能是整型/TypedArray/线性内存视图**（禁止对象、禁止字符串往返、禁止 per-step materialize）。

## 1) 我们要跑的“WASM Kernel”到底是什么？

以 046 的 NG 需求为基线，WASM Kernel 的理想职责是 **纯数值、纯图算法**：

- dirty roots → 影响传播（bitset / sparse set）
- topo order 扫描 + 最小受影响集合
- Exec Plan 的线性调度（049 的方向：typed buffers / linear plan）
-（可选）可编译的纯表达式 bytecode 执行（只在更高等级的终点层才成立）

它不应该做：

- 事务窗口内的 IO/await/跨线程消息
- per-step 的字符串拼接与 mapping materialize
- 运行时构建依赖图/做 path normalize（这些应该在编译/装配阶段完成）

## 2) WASM 终点的“可行边界”

现实里有两类“动态”，决定了 WASM 的上限：

### 动态 A：数据/依赖的动态（可被静态化）

- 依赖图（Reactivity Graph）
- topo order/执行计划（Exec Plan）
- FieldPath 表示/归一化/registry

这类动态可以通过“编译/装配时完成”变成静态表，从而让 runtime 热路径只消费 `id + typed buffers`。

### 动态 B：用户逻辑的动态（很难被 WASM 化）

例如 reducers、computed/get、业务校验、Effect 逻辑都是任意 JS 闭包。它们若依然作为闭包存在：

- 让 WASM 执行这些闭包会产生 **大量跨边界调用**（负优化风险极高）
- 或者只能留在 JS 执行，WASM 只能做调度/传播（收益上限受限）

因此，“全 WASM”不是免费午餐：它要求我们提供一种 **可编译的逻辑表示**（DSL/bytecode），让关键热路径的计算也能落在 WASM 内完成。

## 3) 当前路线的对号入座（我们已经在做的）

- **050 Integer Bridge**：稳定 id + 禁止字符串往返，为“线性内存传输”铺路。
- **051 Txn Zero-Alloc**：调用点零对象分配 + txn 内 id-first dirty roots，避免把“对象税”带进任何后端（JS/WASM）。
- **052 diagnostics=off gate**：off 近零成本是 WASM 的必要条件（否则 off 也要背诊断税）。
- **049 Linear Exec VM**：把执行形态压成 typed buffers + linear plan，是“可搬到 WASM”的形态前置。
- **045 Dual Kernel Contract**：WASM Kernel 必须是一条可注入/可对照/可回退的内核实现，而不是拍脑袋替换。

## 4) 终点判断（最小可行的 WASM 终点）

一个“有戏”的终点（不负优化）至少满足：

- **边界调用数是常数级**：理想是一笔 txnCommit 一次调用（输入 dirty roots，输出 step plan/bitset 或执行结果）。
- **数据传输是线性且可复用**：dirty roots、step ids、bitsets、trace anchors 都是 `Uint32Array/Uint8Array` 等视图；不传对象，不传字符串。
- **off 真正近零成本**：off 下不分配 steps/hotspots，不计时，不拼接 label，不 materialize mapping。
- **证据门禁可复现**：Node + Browser 的 before/after/diff 能证明“没变慢”，并能解释边界税与收益曲线。

