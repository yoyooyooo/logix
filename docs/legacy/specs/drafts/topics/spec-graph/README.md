---
title: Spec Graph · Drafts × Speckit Unified Graph
status: draft
version: 2025-12-24
value: core
priority: next
related:
  - ../sdd-platform/README.md
  - ../devtools-and-studio/README.md
  - ../../index.md
  - ../../README.md
---

# Spec Graph · Drafts × Speckit Unified Graph

> 定位：把 `docs/specs/drafts/**`（Drafts/Topics/L1–L9）与 `specs/<NNN-*>/**`（Speckit specs）纳入同一张“可决策、可导航、可追踪”的图。
>
> 背景：本文档处在 **草案体系 skill** 的上下文中（`drafts-tiered-system`）。Graph 的实现与演进默认以该 skill 的现有脚本/UI 为载体，而不是另起一套平行系统。
>
> 核心结论：**Draft 可以视为 Spec 的上游**（生命周期/演进意义上的 upstream），但图里仍需区分两类关系：
>
> - **依赖（Depends/Related）**：决定“被什么阻塞、影响哪些下游”；
> - **流转（Promotes/Derived-from）**：决定“这份草案如何沉淀为 spec/交付物”（不参与阻塞计算）。

## 文档列表（建议顺序）

- [00-overview.md](./00-overview.md)：问题、目标、成功标准与范围边界。
- [01-domain-model.md](./01-domain-model.md)：统一领域模型（Track/Artifact/Stage/Relation）。
- [02-metadata-and-indexing.md](./02-metadata-and-indexing.md)：元数据约定、抽取规则、索引与一致性校验。
- [03-ux-and-interface.md](./03-ux-and-interface.md)：可视化与交互设计（追求“好看更好用”）。
- [04-implementation-plan.md](./04-implementation-plan.md)：分阶段落地计划（与现有 Drafts Kanban/Graph 对齐）。
