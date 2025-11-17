---
title: 01 · Unified Domain Model (Track / Artifact / Stage)
status: draft
version: 1
---

# 01 · Unified Domain Model (Track / Artifact / Stage)

本 Topic 的核心，是把 Drafts 与 Speckit specs 统一到同一套可计算模型上。

## 1. 核心概念

### 1.1 Track（议题主键）

- **Track**：用 `3 位数字`（例如 `025`）作为“议题/特性/主题”的稳定主键。
- Track 不是某一个文件；它是“同一个问题空间”的容器，用来聚合多个文档产物（Artifacts）。
- Track 的目的：让“文件被移动/拆分/合并”时，引用仍稳定。

### 1.2 Artifact（具体产物）

**Artifact** 是 Track 的一个具体载体，常见两类：

- Draft artifact：`docs/specs/drafts/**` 下的某个 Markdown 文档（或 Topic 内多文档集合）。
- Spec artifact：`specs/<NNN-*>/**` 下的 spec 目录及其关键文件（`spec.md`/`plan.md`/`tasks.md`...）。

Artifact 应当带有以下可用于 UI 的属性：

- `title`、`path`、`kind`（draft/spec）、`stage`（见下）、`status/value/priority`（如有）。

### 1.3 Stage（生命周期阶段）

Stage 是**生命周期/成熟度**视角的分类，用于“泳道/管道”展示。

- Draft stages：`L9 → ... → L1`，以及 `Topics`（收编）。
- Spec stage：`Spec`（正式交付链路，位于 `specs/`）。

> 关键点：Stage 不表达阻塞关系；它只表达“当前处在演进的哪个阶段”。

### 1.4 Relation（关系类型）

统一图里至少需要两套关系：

1. **阻塞/关联关系（用于排期与影响分析）**
   - `depends`（强依赖，有方向）
   - `related`（弱关联，可开关/局部显示）
2. **流转关系（用于演进轨迹）**
   - `promotes` / `derived_from`：Draft → Spec 的沉淀路径（不参与阻塞计算）

可选（条目级）：

- `supports`：FR/SC 之间的“支撑”关系，或跨条目的覆盖关系。

## 2. 视图模型：用 Track 节点做默认图

为了可读性，默认以 Track 为节点，而不是每个文件都画一个节点：

- Track node：`025`（显示摘要信息 + badges）
- Side panel：列出该 Track 的 artifacts（Draft + Spec）与关键链接

这能同时满足：

- 上层决策（依赖/影响）关注 Track 粗粒度关系；
- 下钻阅读时仍能打开具体文档。

## 3. 建议的最小数据结构（用于 `/api/unified-graph`）

```ts
type Stage = "L1" | "L2" | "L3" | "L4" | "L5" | "L6" | "L7" | "L8" | "L9" | "Topics" | "Spec"

type Artifact = {
  kind: "draft" | "spec"
  title: string
  path: string
  stage: Stage
  status?: string
  value?: string
  priority?: string | number
}

type Track = {
  id: string // "025"
  title?: string // 可从“主 artifact”继承
  artifacts: Artifact[]
}

type EdgeKind = "depends" | "related" | "promotes"

type Edge = {
  kind: EdgeKind
  from: string // TrackID
  to: string   // TrackID
  source?: string // 证据来源（path）
}

type UnifiedGraph = {
  generated_at: string
  tracks: Track[]
  edges: Edge[]
  issues: {
    broken_refs: { from: string; to: string; source: string }[]
    cycles: string[][] // TrackID cycles
    duplicate_track_ids: { id: string; sources: string[] }[]
  }
}
```

> 注：第一版可以先不输出 `issues`，但 UI 应预留位置承接这些诊断信息。

## 4. 裁决：生命周期边不参与阻塞计算

- `depends`：用于算关键路径、上游缺口、影响面。
- `promotes`：只用于展示“从草案到 spec”的沉淀轨迹。

否则用户会在图里误以为“L9 必然依赖 L8、L8 依赖 L7”，导致图意义崩塌。

