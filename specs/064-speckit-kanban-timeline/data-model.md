# Data Model: 064-speckit-kanban-timeline

本特性不引入数据库；“数据模型”指后端 API 与前端 UI 共享的核心概念与字段口径。

## Spec

表示 `specs/` 下的一个特性目录。

- `id`: string（通常为目录名，如 `064-speckit-kanban-timeline`）
- `num`: number（从 `id` 前缀 `NNN` 解析；用于排序）
- `title`: string（优先从 `spec.md` 一级标题推断；回退到目录名）
- `paths`:
  - `spec`: `specs/<id>/spec.md`
  - `plan`: `specs/<id>/plan.md`
  - `tasks`: `specs/<id>/tasks.md`
- `taskStats`（可选）:
  - `total`: number
  - `done`: number
  - `todo`: number

## Task

表示 `tasks.md` 中的一条可勾选任务（checkbox item）。

- `line`: number（1-based；用于定位与更新）
- `checked`: boolean
- `raw`: string（该行原始文本）
- `title`: string（从 `raw` 解析得到：去掉 `- [ ]` / `- [x]` 前缀后的文本）
- `taskId`（可选）: string（如 `T012`；若能从 `title` 解析则提供）
- `tags`（可选）:
  - `parallel`: boolean（包含 `[P]`）
  - `story`: string（如 `[US1]`）

## ArtifactFile

表示 spec 目录内一个可读写文件。

- `name`: `spec.md | plan.md | tasks.md`
- `path`: string（受控路径，始终在 `specs/<id>/` 下）
- `content`: string（UTF-8）

## Error Shape（统一错误）

后端错误统一形状（用于 UI 展示）：

- `_tag`: string（稳定错误类型）
- `message`: string（面向用户的错误摘要）
- `details?`: unknown（可选：开发用补充信息；不包含敏感路径/内容）
