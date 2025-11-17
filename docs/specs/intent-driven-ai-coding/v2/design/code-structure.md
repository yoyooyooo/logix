---
title: 工程结构意图（Code Structure Intent）
status: draft
version: 2
---

> 本文定义 Code Structure 意图：如何将前端意图映射到模块/目录/文件，并与 Template/Plan/best-practice 协同。

## 1. 定义

工程结构意图回答：

- “这个功能模块分成哪些文件/模块？”
- “这些模块的职责边界如何？”
- “目录结构如何映射到团队通用规范？”

这层意图决定了：

- Plan 会生成哪些文件；
- Template 中包含哪些骨架代码；
- best-practice 仓库中有哪些可复用基线。

## 2. CodeStructureIntent Schema 草图

```ts
interface ModuleFileIntent {
  kind: 'page' | 'component' | 'store' | 'service' | 'query' | 'hook' | 'flow'
  path: string
  templateId?: string
  patternId?: string
}

interface CodeStructureIntent {
  featureId: string
  files: ModuleFileIntent[]
}
```

在 PlanSpec v2 中：

```ts
interface PlanActionV2 {
  id: string
  type: 'create-file' | 'modify-file' | 'append-snippet'
  path: string
  templateId: string
  patternId?: string
  intentLayers?: IntentLayer[] // 通常包含 'code-structure'，也可能附带 'view'/'behavior'
  params: Record<string, unknown>
}

interface PlanSpecV2 {
  id: string
  intentId: string
  version: string
  actions: PlanActionV2[]
}
```

CodeStructureIntent 通常通过 Plan + Template 的组合来落地，不一定直接出现在 IntentSpec 中，但 IntentSpec 应保留对 Plan 的引用。

## 3. 与 best-practice 的协同

best-practice 仓库定义了：

- 目录结构（apps/packages/features/shared 等）；
- 状态管理拆分规则（store/slices/selectors）；
- service/adapter 模式与命名约定；
- 测试/Story/Doc 文件的放置方式。

v2 要求：

- CodeStructureIntent 必须以 best-practice 为基线；
- TemplateSpec 的 path/role 设计要与 best-practice 的结构保持一一对应。

## 4. 线稿级工程结构表达

为了让开发者以“线稿方式”表达工程结构意图，平台可以提供：

- 模块骨架编辑器：
  - 以树/表格形式列出模块和文件（page/components/store/service/query/flow 等）；
  - 支持从模板片段（feature 模板）快速添加；
  - 生成 CodeStructureIntent 与 Plan 草稿。
- LLM 辅助：
  - 开发者用自然语言描述模块划分，LLM 生成 CodeStructureIntent 初稿；
  - 可根据 best-practice 建议拆分或合并某些文件。

## 5. 与其它意图层的关系

- Layout/View/Interaction/Behavior/Data 决定“这块功能需要什么”；
- Code Structure 决定“要用哪些模块/文件来实现这些需求”；
- Plan/Template/Flow/Store/Service 等具体文件是 Code Structure Intent 的实现细节。
