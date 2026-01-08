---
title: Public Submodules 迁移与导入约定
description: 选择稳定的 import 路径，避免依赖不受支持的子路径，并提供可复用的迁移模板。
---

本篇给出一套可复用的“导入约定 + 迁移模板”，用于在升级 Logix 包对外入口时，统一团队的 import 形态并减少回归风险。

## 你需要记住的 3 条规则

1. 只从 `@logix/<pkg>` 或 `@logix/<pkg>/<Concept>` 导入；只使用文档明确允许的子路径入口（例如 `@logix/form/react`、`@logix/sandbox/vite`）。
2. 禁止导入 `@logix/*/internal/*`，也不要通过任何“未被明确允许的子路径”绕过 exports 收口（例如试图直接 import `dist/*` / `src/*` 等）。
3. 迁移后跑一轮验证：`pnpm verify:public-submodules`，并确保 `pnpm typecheck` / `pnpm lint` / `pnpm test` 通过。

## 关键词（≤5）

- **Public Submodule**：包对外稳定概念入口（可被 import 的契约单元）。
- **Independent Entry Point**：独立子路径入口（例如 `@logix/form/react`、`@logix/sandbox/vite`）。
- **Exports Policy**：`package.json#exports` 的收口策略（包含对 `internal` 路径的屏蔽）。
- **Verify Gate**：结构治理验证命令 `pnpm verify:public-submodules`。
- **Promotion Path**：当某个入口成长到需要独立演进时的“提升为独立子包”路径。

## 常见迁移：旧 import → 新 import

> 下面示例只展示“入口形态变化”。如果你仍然从包根导入（`@logix/<pkg>`），通常无需改动。

- `@logix/sandbox/client` → `@logix/sandbox/Client`
- `@logix/sandbox/service` → `@logix/sandbox/Service`
- `@logix/sandbox/vite` → `@logix/sandbox/vite`（保留；属于 Independent Entry Point）
- `@logix/test/vitest` → `@logix/test/Vitest`
- `@logix/domain/crud` → `@logix/domain/Crud`
- `@logix/query/react` → 删除（该入口不再提供）

## 迁移说明模板（复制即用）

```text
标题：<包名> Public Submodules 迁移

旧 import：
- ...

新 import：
- ...

禁止项：
- @logix/<pkg>/internal/*
- 任何未被明确允许的子路径绕过（例如 dist/src 直连）

验证：
- pnpm verify:public-submodules
- pnpm typecheck
- pnpm lint
- pnpm test
```
