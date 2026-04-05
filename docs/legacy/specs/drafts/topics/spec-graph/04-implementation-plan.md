---
title: 04 · Implementation Plan (Incremental, But Excellent)
status: draft
version: 1
---

# 04 · Implementation Plan (Incremental, But Excellent)

## 0. 现状（起点）

仓库内已有一个 Drafts 侧的“浏览/拖拽/Graph（列表）”能力（见 `.codex/skills/drafts-tiered-system/`）。

但它目前的 Graph 主要聚焦 `docs/specs/drafts/**`，且呈现形态仍偏“列表”，没有：

- Track 聚合（一个议题一个节点）
- Draft + specs 的统一视图
- DAG 布局与上下游聚焦（关键可读性能力）

## 1. Phase A：统一数据层（最先做）

### A1. 扩展扫描范围

- 继续扫描 `docs/specs/drafts/**`
- 新增扫描 `specs/<NNN-*>/**`

### A2. 输出统一 schema

- 新增 `GET /api/unified-graph`
- 最小输出：`tracks + edges`
- 可选输出：`issues`（broken refs / cycles / duplicates）

### A3. 证据链

每条边都要可追溯（`source path`），否则 UI 无法解释“为什么有这条边”。

## 2. Phase B：Track Graph 可视化（把体验做对）

### B1. 选择图引擎 + 自动布局

- 渲染：React Flow（缩放/拖拽/hover/selection）
- 布局：dagre（DAG）作为第一版，后续可选 ELK

### B2. 必做交互

- 搜索（TrackID/标题/路径）
- 聚焦 upstream/downstream N hops
- 过滤（stage/status/value/priority）
- 点击节点打开主文档（Draft 或 spec）
- related 默认局部显示

## 3. Phase C：Pipeline 视图（让“Draft 是 Spec 上游”真正可见）

- 泳道：`L9..L1/Topics/Spec`
- promotes：默认展示
- 依赖：开关叠加

## 4. Phase D：可选增强（追求“更完美”）

- Item-level 子图（US/FR/NFR/SC），默认折叠、按需展开
- Issues 面板：broken refs / cycles 可视化定位
- Board 联动：从 Graph 定位到 Kanban 的对应卡片
- 打开文件能力：实现 `/api/open` 或改为复制路径（看安全策略）

## 5. 验收清单（最少但硬）

- 输入 `025` 能定位并打开：
  - Draft（若存在）
  - `specs/025-*`（若存在）
- 能一键聚焦：
  - 上游 2 跳 / 下游 2 跳
- 能明确区分：
  - depends vs related vs promotes
- 能提示：
  - broken refs（并提供证据来源）

