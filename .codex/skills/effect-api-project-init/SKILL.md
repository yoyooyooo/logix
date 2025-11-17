---
name: effect-api-project-init
description: 在 intent-flow 仓库内从 examples/effect-api 初始化后端项目到 apps/*（Effect + @effect/platform-node 的 HttpApi 骨架）。当需要新建/重建后端 app（例如 logix-galaxy-api），或基于该模板派生新的 Effect API 项目时使用。
---

# effect-api-project-init

## Overview

把 `examples/effect-api/` 当作后端模板源，从中复制出一个新的 workspace 包，并做最小必要的“项目语义改名”（`package.json.name` + README 路径）。

## Workflow

1. 确认模板目录存在：默认 `examples/effect-api/`。
2. 确认目标目录不存在或为空：默认 `apps/logix-galaxy-api/`。
3. 执行初始化脚本完成复制与改名。

## Commands

- 初始化（默认落点）：`node .codex/skills/effect-api-project-init/scripts/init-logix-galaxy-api.cjs`
- 初始化到自定义目录：`node .codex/skills/effect-api-project-init/scripts/init-logix-galaxy-api.cjs apps/logix-galaxy-api`
- 自定义包名与模板源：`node .codex/skills/effect-api-project-init/scripts/init-logix-galaxy-api.cjs --target apps/logix-galaxy-api --packageName logix-galaxy-api --template examples/effect-api`
- 预览不写盘：`node .codex/skills/effect-api-project-init/scripts/init-logix-galaxy-api.cjs --dry-run`

## Behavior

- 不覆盖已有非空目录（避免破坏性写入）。
- 复制时忽略：`node_modules/`、`dist/`、`.turbo/`、`.DS_Store`。
- 初始化后会更新：
  - 目标目录下 `package.json.name`
  - 目标目录下 `README.md` 的标题与路径（把模板路径替换为目标路径）
