---
title: "40. Perf Gate"
status: draft
version: 2025-12-29
value: vision
priority: next
---

# 40. Perf Gate（“WASM 不负优化”证据门禁）

> 目标：把 “WASM 方案是否值得” 变成可复现证据，而不是主观判断。

## 1) 必须新增的指标（除了现有 time/alloc）

- **跨边界调用次数**：每 txnCommit 的 JS↔WASM 调用计数（目标：常数级，理想为 1）。
- **边界传输字节数**：dirty roots / plan / trace 的 bytes（用于解释“为何赚/为何亏”）。
- **off 税泄漏检测**：off 下 steps/hotspots/labels/mapping/timing 是否被触发（应为 0）。

## 2) Gate 形态（建议）

- 复用 `$logix-perf-evidence` 的 Node + Browser before/after/diff；
- 在矩阵里新增一个轴：`kernelBackend=js|wasm`（或等价），并强制输出边界税指标；
- 结论门槛：`meta.comparability.comparable=true && summary.regressions==0`，且必须能解释边界税与收益曲线。

补充：Gate 的“可比性”应以 `force-js` vs `force-wasm` 为准：

- `auto` 的阈值表来自离线 perf matrix，不应参与 before/after/diff（否则不可比，且容易引入抖动）。
- `auto` 的验收口径应转为：阈值表与白名单条件在 Gate 下持续扩张，但任何时刻都不允许出现回归（仍由 `force-js/force-wasm` 的可比 diff 拦截）。

## 2.1 与 051/052 的当前门禁口径对齐（事实源）

- Gate 判据：`meta.comparability.comparable=true && summary.regressions==0`
- Node Gate：以 `converge.txnCommit`（`pnpm perf bench:traitConverge:node`）为准
- Browser Gate：以 perf matrix P1（`pnpm perf collect`）为准
- baseline config 固定：`diagnostics=off + stateTransaction.instrumentation=light`
- P1 覆盖场景若触发 `dirtyAll=true`：视为 FAIL（说明出现 C2/不可分析闭包泄漏）

## 3) Open Questions

- “边界调用次数/字节数”应作为 perf report 的哪个字段/证据类型输出？
- Browser 的 WASM 线程/SharedArrayBuffer 约束如何纳入 Gate（同环境可比性）？
