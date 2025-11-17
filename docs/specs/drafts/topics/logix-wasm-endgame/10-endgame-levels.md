---
title: "10. Endgame Levels"
status: draft
version: 2025-12-29
value: vision
priority: next
---

# 10. Endgame Levels（极致分层：从纯 JS 到全 WASM）

这里给出一个“奔着终点走”的分层模型：每一层都明确 **前置条件 / 能吃到的收益上限 / 最常见失败模式 / 必须补齐的证据门禁**。

> 约定：所有层级都默认遵守 046 的硬约束：统一最小 IR、稳定锚点、事务窗口禁 IO、off 近零成本、禁止字符串往返与半成品态。

## 概览表

| Level | 形态概述 | 跨边界调用目标 | 主要收益上限 | 关键前置 |
| ----- | -------- | -------------- | ------------ | -------- |
| L0 | 纯 JS（现状）+ TypedArray/bitset | 0 | JS 极致化（不依赖 WASM） | 050/051/052/049 的 JS 形态先收口 |
| L1 | WASM 做“传播/调度”，JS 执行 user logic | ≤1 次 txnCommit | 在大图谱/大 bitset 上更稳（SIMD 潜力） | 一次 txn 一次调用 + 线性传输 |
| L2 | Hybrid Exec VM：WASM 执行 linear plan，JS 仅做少量回调 | ≤1 次 txnCommit + 少量回调 | 比 L1 更接近“执行后端化” | 把回调次数压到常数级，否则负优化 |
| L3 | 可编译逻辑（bytecode）落地：WASM 直接执行大部分 computed/reducer | 1 次 txnCommit | 真实“端到端收益”开始出现 | 提供可编译 DSL/bytecode（限制动态闭包） |
| L4 | AOT：Static IR + Bytecode + Data Layout 全静态化，JS 只做 Host/UI | 1 次 txnCommit | 极致：更像 Svelte 编译产物 | 模块定义/逻辑必须可静态分析与编译 |
| L5 | “全 WASM Kernel”默认路径（JS 只是 glue） | 1 次 txnCommit | 终点（但约束最强） | 允许 breaking：把不可编译特性移出默认路径 |

下面逐层解释。

## L0：纯 JS 极致化（WASM 之前必须先到达）

**定义**：所有热路径都已经是整型化 + typed buffers + linear plan，且 off/light 的分支形态与分配行为已收口到极致。

**为什么必须先做**：

- L0 本身可能已经足够快（JS 对 TypedArray/bitset 的优化很强）。
- L0 能把“动态垃圾”清空：如果 L0 还存在字符串往返、对象分配、per-step now()，那 WASM 只会更糟。

**必须满足的 Gate**：

- 050：禁止 id→string→split；mapping 只在边界 materialize。
- 051：`stateTransaction.instrumentation=light` 调用点零对象分配；txn 内 id-first dirty roots。
- 052：`diagnostics=off` 近零成本 Gate（strings/arrays/timing/mapping 全禁）。
- 049：Exec VM/Exec Plan 的 typed buffers + linear plan 形态可证据化。

## L1：WASM 做传播/调度（JS 执行 user logic）

**定义**：WASM Kernel 输入 dirty roots（整型），输出“需要执行的 steps/plan”（整型），JS 仍执行 reducers/computed/effects。

**跨边界调用**：

- 理想：txnCommit 时调用一次 `wasm.txnCommit(dirtyRoots)` 得到 `stepIds` 或 `bitset`。
- JS 在同一帧内按 `stepIds` 执行计算与写回。

**收益上限**：

- 图传播/bitset 扫描/拓扑遍历更稳、更可 SIMD；
- 但 user logic 仍在 JS，整体收益取决于“传播是否是主导成本”。

**最大风险**：

- 如果每个 step 都需要 WASM↔JS 往返，就会立刻退化为负优化（禁止）。

## L2：Hybrid Exec VM（WASM 执行 plan，JS 少量回调）

**定义**：WASM 负责按 linear plan 推进执行，但遇到“不可编译的 user logic”时，仍需要 JS 回调。

**关键约束**：

- 回调次数必须是 **常数级或极少**（例如只在少数 boundary 处），否则跨边界税击穿。

**现实判断**：

- 在“业务逻辑高度动态/闭包密集”的模块上，L2 很难成立；
- 更适合“plan 主要是运行时内核工作（图传播/selector/merge）”的场景。

## L3：可编译逻辑（bytecode）落地

**定义**：引入可编译的逻辑表示（bytecode/表达式 IR），让大量 computed/reducer 在 WASM 内直接执行，JS 闭包变成少数 escape hatch。

实现落点建议：先把 compiled-computed 跑在 JS interpreter（可证据化且更易调试），再逐步迁入 WASM VM。详见：

- `docs/specs/drafts/topics/logix-wasm-endgame/26-ast-lift-and-dsl-subset.md`

**核心变化**：

- 运行时从“执行闭包”转为“解释/执行 bytecode”；
- 这一步是从“WASM 有可能真赚”走向“WASM 大概率能赚”的分水岭。

**代价**：

- 需要限制/重塑 DSL：让逻辑可静态分析、可编译（类似 Svelte Runes 的编译产物模型）。

## L4：AOT（全静态：IR + Bytecode + Data Layout）

**定义**：编译阶段产出：

- Static IR tables（graph/topo/registries）
- Bytecode（可执行逻辑）
- Data Layout（线性内存中的 state 布局）

runtime 只做：加载静态产物 + txnCommit 驱动执行 + 产出 Dynamic Trace。

**收益上限**：

- 运行时路径更短、更确定；
- Devtools 解释链路更直（所有内容可回映到静态产物）。

## L5：全 WASM Kernel 默认路径（终点）

**定义**：默认内核运行在 WASM，JS 只是 Host/UI glue；不可编译能力要么：

- 被移出默认路径（显式 opt-in）
- 或者以“可解释的降级”进入 fallback 内核（但不能影响默认路径证据门禁）

**终点成功判据（强约束）**：

- Node + Browser 的 perf diff：`meta.comparability.comparable=true && summary.regressions==0`；
- 并且能展示至少一个“WASM 赚”的证据场景（例如大 steps / 大 dirtyRootsRatio 下稳定改善）。
