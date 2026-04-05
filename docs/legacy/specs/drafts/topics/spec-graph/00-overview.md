---
title: 00 · Spec Graph Overview
status: draft
version: 1
---

# 00 · Spec Graph Overview

## 0. 背景（草案体系 skill 的语境）

这不是一个“独立产品”的需求，而是 `drafts-tiered-system` 这套草案体系 skill 的能力演进背景：

- 该 skill 已提供 Drafts 的 Kanban 浏览、拖拽与 Graph（当前更像列表）等能力；
- 本 Topic 记录的是：在 **不破坏 Drafts 工作流** 的前提下，把 Graph 升级为“可视化依赖 + 生命周期流转 + 统一导航”的设计与落地路径。

## 1. 背景：两套体系割裂

当前仓库里存在两套“事实源”：

- **Drafts**：`docs/specs/drafts/**`（含 Topics 与 L1–L9），用于孵化与收敛方案。
- **Speckit specs**：`specs/<NNN-*>/**`，用于单个可交付特性的规范与工程落地（spec/plan/tasks/...）。

现实问题：同一个议题在 Drafts 与 specs 间往返演进，但缺少统一视图回答这些问题：

- “我要做 `025`，上游还缺哪些？关键路径在哪？”
- “我准备动 `104`，会影响哪些下游 spec/草案？”
- “哪些是硬依赖（阻塞），哪些只是相关（导航）？”
- “从一堆 L9/L8 材料，如何沉淀到 `specs/025-*` 的交付链路？”

## 2. 目标：把 Graph 做成「决策 + 导航」界面

Spec Graph 的默认定位不是“画图炫技”，而是：

1. **排期/决策**：找关键路径、识别阻塞、衡量影响面。
2. **导航/阅读**：点节点即可打开对应文档（Draft 或 spec）。
3. **演进可回放**：能看见“材料 → 收敛 → 交付”的流转轨迹。
4. **低噪音可扩展**：面对大量节点仍可用（过滤/聚焦/折叠）。

## 3. 关键约束：生命周期 ≠ 依赖关系

- “Draft 是 Spec 的上游”是**生命周期**描述：表示某个议题从草案逐步沉淀为可交付 spec。
- “depends_on”是**阻塞/前置**关系：表示做 A 之前必须先做 B（或至少先定裁决）。

因此 Graph 至少要同时表达两类边：

- **Depends/Related**：面向排期与影响分析。
- **Promotes/Derived-from**：面向沉淀路径（Draft→Spec），不参与阻塞计算。

## 4. 范围（Scope）与非目标（Non-goals）

### 4.1 第一优先级（必须）

- Spec-level（文档级）图：节点以 `NNN` Track 为主（详见 `01-domain-model.md`）。
- 视图最少包含：
  - 依赖视图（Dependency Graph）
  - 流转视图（Pipeline / Stage Lanes）
- 支持：搜索、聚焦上下游 N 跳、过滤（level/status/value/priority）、点击跳转打开文档。

### 4.2 第二优先级（可选）

- Item-level（条目级）图：US/FR/NFR/SC 节点与 Supports/Depends 等关系（默认折叠/按需展开）。
- 自动发现 broken refs、循环依赖、重复 id，并在 UI 中显式提示。

### 4.3 非目标

- 不追求“一次性把所有旧草案补齐元数据”才能用；Graph 应能在数据不完整时渐进工作。
- 不把 Graph 变成一套新的“真理源编辑器”；编辑仍以 Markdown/脚本为主。

## 5. 成功标准（Definition of Done）

- 输入 `025` 能定位到：
  - Draft（Topics/L*）侧的上游材料与当前成熟度；
  - specs 侧对应的交付 spec（若存在）；
  - 上游/下游依赖的 1–2 跳邻居；
  - 一键跳转打开目标文档。
- 能区分展示：
  - `depends_on`（强依赖）与 `related`（弱关联）
  - Draft→Spec 的流转边（promotes）
- 面对百级节点规模，仍能通过过滤/聚焦保持可读。
