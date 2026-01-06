# Implementation Notes（开发者小抄）

> **定位**：本目录用于沉淀「实现视角」的推导、导航与经验总结，帮助维护者/LLM **快速建立广度脉络** 并知道去哪里深挖源码细节；**不作为 SSoT**。

## SSoT 在哪（冲突裁决）

如 `docs/impl-notes` 与规范/类型不一致，按以下顺序裁决：

1. 概念/术语/平台定位：`docs/specs/sdd-platform/ssot`
2. Runtime 契约/语义/诊断口径：`.codex/skills/project-guide/references/runtime-logix`
3. 代码类型与真实导出：`packages/logix-core/src/index.ts`（以及实际实现）

## 10 分钟快速建立脉络（推荐顺序）

1. 长链路地图（入口 → 关键不变量 → 深挖落点）：`docs/impl-notes/05-runtime-long-chain-map.md`
2. 运行时架构与生命周期（现状全景图）：`docs/impl-notes/03-logix-runtime-architecture.md`
3. 性能演进导航（优化抓手与对应 specs）：`docs/impl-notes/00-performance-moc.md`

## 目录索引

- `.codex/skills/project-guide/references/runtime-logix/logix-core/concepts/02-long-chain-tour.md`：**SSoT 侧的高层长链路导览**（更短、更“规范视角”）。
- `docs/impl-notes/05-runtime-long-chain-map.md`：**LLM/维护者首读**，把“从哪进、往哪挖”说清楚。
- `docs/impl-notes/03-logix-runtime-architecture.md`：全链路架构图 + 事务窗口机制（实现现状）。
- `docs/impl-notes/00-performance-moc.md`：性能/优化的 Map of Content（长链路组合型优化导航）。
- `docs/impl-notes/08-concurrency-and-batching.md`：实例级串行队列 + `dispatchBatch`/`dispatchLowPriority` 的实现小抄（并发/批处理/通知调度）。
- `docs/impl-notes/01-micro-optimizations.md`：偏工程细节的微优化记录（GC/热路径/结构化 ID 等）。
- `docs/impl-notes/02-auto-converge-pre-impl-analysis.md`：Auto Converge/Planner 的预研与落地风险。
- `specs/030-packages-public-submodules/spec.md`：`packages/*` 对外子模块/概念裁决与结构治理（SSoT）。

## 写作约束（保持可维护）

- **只写“实现视角”**：说明“为什么现在是这样/风险在哪里/下一跳看哪里”，不要试图替代 SSoT。
- **给出可跳转的落点**：每条结论至少能定位到 1 个文件路径（必要时写关键符号名）。
- **保持更新半衰期可控**：遇到会频繁漂移的细节，优先写“如何自证/如何定位”，而不是硬编码结论。
