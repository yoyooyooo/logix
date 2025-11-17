---
name: frontend-project-init
description: 用于在 intent-flow 仓库内初始化前端项目，基于内置模板（首个为 Vite + Logix Sandbox 空壳）快速生成可运行的前端工程骨架。
---

# frontend-project-init

## PURPOSE · 技能目标

- 提供一套在 intent-flow 仓库内初始化前端项目的标准流程。
- 通过内置模板（Vite + Logix 空壳工程）快速生成带完整配置的 Vite 前端工程骨架。
- 在不遗漏关键配置（TypeScript、Vite、Logix Sandbox 相关插件与依赖）的前提下，避免重复从零搭建项目。

## WHEN · 何时使用本 skill

- 在 intent-flow 仓库内需要新建一个前端示例 / Playground / PoC 项目时。
- 希望基于仓库内预定义的 Vite + Logix 空壳模板，快速获得一个可运行但没有业务逻辑的前端工程。
- 计划后续维护多种前端模板（例如：纯 React、Logix Playground、Studio 子应用等），并希望通过统一流程管理这些模板时。

## TEMPLATES · 模板索引

当前内置模板列表：

- 模板 ID `vite-logix-empty`
  - 类型：Vite + React + Tailwind + Logix 前端空工程（无业务模块）。
  - 目录：`assets/vite-logix-empty/`
  - 关键特性：
    - 使用 `vite` + `@vitejs/plugin-react-swc` + `@tailwindcss/vite`。
    - 内置 `@logix/sandbox/vite` 的 `logixSandboxKernelPlugin()`，预置 Sandbox 运行时内核配置。
    - 依赖 workspace 内的 `@logix/core` / `@logix/react` / `@logix/sandbox` 包，适合作为 Logix Sandbox / Playground 类项目的起点。

> 若需要新增模板（如纯 Vite + React、Studio 子应用空壳），应在本节追加模板 ID 与说明，并将对应代码放入 `assets/<template-id>/`。

## WORKFLOW · 使用步骤

在收到“初始化前端项目”的需求时，按以下步骤执行。

### 0. 脚本用法速览

- 命令行一键初始化（默认模板 `vite-logix-empty`）：
  - `node .codex/skills/frontend-project-init/scripts/init-frontend-project.cjs <target-dir>`
  - 示例：`node .codex/skills/frontend-project-init/scripts/init-frontend-project.cjs examples/my-sandbox`
- 可选参数：
  - `node .codex/skills/frontend-project-init/scripts/init-frontend-project.cjs <target-dir> <template-id>`
  - 例如：`node ... init-frontend-project.cjs examples/my-sandbox vite-logix-empty`

### 1. 选择模板

1. 明确需求类型（例如：Logix Sandbox Playground、普通前端 Demo、Studio 子模块）。
2. 若用户未指定模板，默认使用 `vite-logix-empty`：
   - 适用于：希望以 Vite + Logix 空项目为起点，后续自行添加模块与 UI 的场景。
3. 如模板列表未来扩展，在此处根据模板 ID 进行分支决策。

### 2. 创建目标目录

1. 与用户确认新项目的落点（例如：`examples/<project-name>` 或 `apps/<project-name>`）。
2. 在目标位置创建新目录，例如：
   - `examples/logix-sandbox-new-demo`
3. 确保新目录不存在冲突（若已存在，需要与用户对齐是否覆盖或合并）。

### 3. 复制模板文件

默认推荐使用脚本进行复制：

1. 执行脚本（以 `vite-logix-empty` 为例）：
   - `node .codex/skills/frontend-project-init/scripts/init-frontend-project.cjs <target-dir>`
2. 脚本行为：
   - 从 `assets/<template-id>/` 递归复制所有文件到 `<target-dir>`。
   - 忽略常见产物目录：`node_modules/`、`dist/`、`.git/`、`.turbo/`。
   - 忽略文件：`tsc_output.txt` 等构建产物。
   - 若目标目录存在且非空，会直接报错而不会覆盖。
3. 若需要手动复制（例如在脚本不可用的环境），可按以下规则执行：
   - 将 `assets/vite-logix-empty/` 下所有文件复制到目标目录。
   - 不复制构建产物和依赖目录（如 `dist/`、`node_modules/`）。
   - 复制后可根据项目语义调整 `package.json.name` 与页面标题文案。

### 4. 安装依赖并验证

在目标目录下：

1. 运行依赖安装（示例）：
   - 使用 `pnpm` 工作区时：在仓库根目录执行 `pnpm install` 确保 workspace 依赖齐全。
   - 仅针对新示例补充依赖时，可在目标目录下执行 `pnpm install`（依项目管理策略而定）。
2. 在目标目录执行：
   - `pnpm run typecheck`（或 `pnpm run build`）验证 TypeScript 配置与依赖是否完整。
   - `pnpm run dev` 启动 Vite 开发服务器（需由使用者在本地终端手动运行，避免在交互式环境中长时间驻留）。

若类型检查或构建失败：

- 首先检查 `package.json` 中 workspace 依赖（`@logix/core` / `@logix/react` / `@logix/sandbox` / `effect` / `vite` 等）是否满足当前仓库版本。
- 如为 Logix 相关类型问题，优先参照 `project-guide`（含 Logix v3 速查与入口）或 `.codex/skills/project-guide/references/runtime-logix` 中的契约进行修正。

### 5. 可选：模板轻量化或自定义

当模板功能过重而用户只需要最小壳时：

1. 在复制后的项目中，通过以下方式瘦身：
   - 保留 `RuntimeProvider` 和最小的 `App` 入口，移除不需要的页面/组件。
   - 保留 Tailwind / Theme / 布局基础，删除多余 Playground 或 Alignment Lab 配置。
2. 若这些瘦身步骤具有复用价值，应将其沉淀为新的模板（例如 `vite-logix-playground`），并：
   - 在 `assets/vite-logix-playground/` 中维护一份整理后的代码。
   - 在本 SKILL 中追加模板说明与使用方法。

## NOTES · 设计与约束

- 模板默认假定在 intent-flow monorepo 内使用，依赖 `workspace:*` 形式的 `@logix/*` 包。
- 在复制模板时，避免修改 Logix 运行时与 Vite 配置，除非已经在 `.codex/skills/project-guide/references/runtime-logix` 中更新对应规范。
- 若未来需要为外部仓库提供前端模板，应单独设计不依赖 workspace 的变体，并在本 skill 中明确区分使用场景。
