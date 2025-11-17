---
title: 02 · Metadata & Indexing (Drafts + Specs)
status: draft
version: 1
---

# 02 · Metadata & Indexing (Drafts + Specs)

目标：在不引入新数据库的前提下，靠目录约定 + frontmatter + 轻量脚本，把 Drafts 与 specs 纳入同一张可视化图。

## 1. 数据源与扫描范围

### 1.1 Drafts（上游材料）

- 根目录：`docs/specs/drafts`
- 扫描：`topics/**.md` + `L*/**.md`

### 1.2 Specs（下游交付）

- 根目录：`specs/`
- 目录约定：`specs/<NNN-*>/`（以 3 位数字开头）
- 关键文件（如存在）：`spec.md`、`plan.md`、`tasks.md`、`data-model.md`

## 2. Drafts 的元数据约定（frontmatter）

Drafts 推荐使用 YAML frontmatter 提供可计算字段（已有 Topic 可渐进补齐）：

- `id`: `"025"`（强烈建议；用于 Track 主键）
- `title`: 文档标题（或从 H1 继承）
- `status`: `draft/active/superseded/merged/...`
- `version`: 任意有意义版本号或日期
- `value`: `core/vision/extension/...`（用于过滤）
- `priority`: `now/next/later` 或数字（用于排序）
- `depends_on`: `["104", "117"]`（文档级强依赖，推荐写 TrackID）
- `related`: `["205", "./00-overview.md"]`（软关联，可写 TrackID 或相对路径）

> 依赖与关联：优先写 TrackID（避免文件移动造成断链）；确需路径时写 repo 相对路径或 topic 内相对路径。

## 3. Specs 的元数据抽取（从目录名推断）

最小可行策略（无需修改 spec 内容）：

1. 从目录名抽取 TrackID：`specs/025-xxx` → `025`
2. 标题抽取（优先级从高到低）：
   - `spec.md` 的 H1
   - `plan.md` 的 H1
   - 目录名去掉前缀后的 slug
3. 将 spec artifact 的 stage 视为 `Spec`

可选增强（让 UI 更“完美”）：

- 在 `spec.md` 增加 frontmatter（或增加 `meta.json`）提供 `status/priority/value`，用于更强的过滤与视图一致性。

## 4. Linking 规则：如何把两套体系连成一张图

### 4.1 依赖边（depends / related）

- Draft：来自 `depends_on` / `related`
- Spec：第一版可以不强行解析（避免从正文猜测），后续可选：
  - 从 `plan.md` 的 “Dependencies / Prerequisites” 段落结构化抽取
  - 或在 `meta.json` 显式声明

### 4.2 流转边（promotes）

默认规则：若存在 Draft TrackID 与 Spec TrackID 相同，则创建：

- `draft(025) -promotes-> spec(025)`（或把 promotes 视为 Track 内部关系，不画边）

更精细的沉淀关系（当不是一对一时）：

- 多 Draft 汇聚到一个 Spec：在 spec 侧显式声明 `upstream: ["101", "205"]`
- 一个 Draft 拆到多个 Spec：在 draft 侧显式声明 `targets: ["025", "026"]`

> 裁决：沉淀关系不用于关键路径/阻塞计算，只用于演进轨迹与导航。

## 5. 一致性校验（Graph 应主动提示）

Graph 构建时建议输出 `issues`，UI 用统一面板呈现：

- Broken refs：引用了不存在的 TrackID / 路径
- Duplicate ids：多个 Draft 文档声明同一个 `id`（除非显式允许）
- Cycles：`depends_on` 构成环（对排期不友好，必须提示）

## 6. 统一 API（建议）

在现有 `/api/graph` 基础上新增：

- `GET /api/unified-graph`：返回 Track-level `tracks + edges + issues`
- `GET /api/unified-graph/raw`：返回 Artifact-level 明细（便于调试/演进）

