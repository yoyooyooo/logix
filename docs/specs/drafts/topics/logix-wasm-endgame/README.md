---
title: Logix WASM Endgame (Topic)
status: draft
version: 2025-12-29
value: vision
priority: next
layer: Runtime
related:
  - docs/specs/drafts/topics/logix-ng-architecture/README.md
  - docs/specs/intent-driven-ai-coding/97-effect-runtime-and-flow-execution.md
  - docs/specs/intent-driven-ai-coding/99-glossary-and-ssot.md
  - specs/045-dual-kernel-contract/spec.md
  - specs/046-core-ng-roadmap/spec.md
  - specs/049-core-ng-linear-exec-vm/spec.md
  - specs/050-core-ng-integer-bridge/spec.md
  - specs/051-core-ng-txn-zero-alloc/spec.md
  - specs/052-core-ng-diagnostics-off-gate/spec.md
---

# Logix WASM Endgame

> 目标：以“WASM 不负优化”为硬门槛，倒推 Logix Runtime 的 **IR/表示/执行形态/编译链路** 能极致化到什么程度。

本 Topic 只做 **奔着终点的设计探索**（不是当下实现裁决）。任何会影响对外语义/诊断协议/证据口径的结论，必须回写到对应 SSoT 或 `specs/<NNN-*>/` 交付。

## 文档导航

| 编号   | 文档                                   | 状态    | 说明                                                                 |
| ------ | -------------------------------------- | ------- | -------------------------------------------------------------------- |
| 00     | [overview](./00-overview.md)           | ✅ 完整 | 终局目标、约束与“WASM 负优化”根因拆解                                 |
| **10** | [endgame-levels](./10-endgame-levels.md) | ✅ 完整 | 从“纯 JS”到“全 WASM”的极致分层（每层的前置、收益上限、失败模式与门禁） |
| 20     | [reactivity-graph-ir](./20-reactivity-graph-ir.md) | ⚡ 框架 | 从 Svelte Runes 吸收：细粒度 Reactivity Graph → Static IR → Exec Plan |
| 25     | [closure-taxonomy-and-compilation](./25-closure-taxonomy-and-compilation.md) | ✅ 完整 | 动态闭包税来源、C0/C1/C2 分类、B 极致 + A 走远（AST lift + Builder 合流） |
| 26     | [ast-lift-and-dsl-subset](./26-ast-lift-and-dsl-subset.md) | ✅ 完整 | C0 可编译子集：AST lift 规则、DSL 兜底、统一 bytecode/IR 产物与降级语义 |
| 30     | [kernel-abi](./30-kernel-abi.md)       | ⚡ 框架 | JS Host ↔ WASM Kernel 的最小 ABI、内存布局、一次 txn 一次调用的边界    |
| 40     | [perf-gate](./40-perf-gate.md)         | ⚡ 框架 | “WASM 不负优化”证据门禁：如何量化边界税、调用次数与收益曲线            |

## 核心原则（与宪法/046 对齐）

- **边界税是第一敌人**：WASM 的收益必须覆盖 JS↔WASM 往返、marshalling、内存拷贝、字符串编解码的税；否则终点不可达。
- **一次 txn 一次调用**：默认目标是“一次事务提交（txnCommit）仅跨边界一次”，否则在细粒度图谱下会被函数调用风暴淹没。
- **统一最小 IR + 稳定锚点**：Static IR + Dynamic Trace 必须同时可解释/可回放；锚点稳定（instanceId/txnSeq/opSeq + pathId/stepId）。
- **off 近零成本**：`diagnostics=off` 不得 materialize mapping/labels/arrays；light/full 的税不能泄漏到 off。
- **禁止半成品态**：禁止 id→string→split 的往返；禁止“整型化做到一半反而更慢”的默认路径。
