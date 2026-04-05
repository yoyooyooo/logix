---
title: Public Submodules 与导入约定
status: living
version: 1
---

# Public Submodules 与导入约定

> 目的：把 `packages/*` 的“对外入口（Public Submodules）/子路径入口（Independent Entry Points）/exports-policy/验证门”收敛成一份可交接的仓库级事实源。

## TL;DR（记住 3 条）

1. **只依赖“对外入口”**：从 `@logixjs/<pkg>` 或 `@logixjs/<pkg>/<Concept>` 导入；只使用文档明确允许的子路径入口（例如 `@logixjs/form/react`、`@logixjs/sandbox/vite`）。
2. **禁止绕过边界**：禁止导入 `@logixjs/*/internal/*`；也禁止通过路径绕过到 `packages/*/src/internal/**`。
3. **改动后跑验证门**：结构治理相关改动至少跑 `pnpm verify:public-submodules`；再跑 `pnpm typecheck` / `pnpm lint` / `pnpm test`。

## 术语（≤5 个关键词，统一口径）

- **Public Submodule**：包对外稳定概念入口（可被 import 的契约单元），典型形态是 `@logixjs/<pkg>/<Concept>` 或 `@logixjs/<pkg>`（barrel）。
- **Independent Entry Point**：独立子路径入口（subpath export，例如 `@logixjs/form/react`、`@logixjs/sandbox/vite`），视为独立契约管理。
- **Exports Policy**：`package.json#exports` 的收口策略（含通配导出前置不变量与 `./internal/*: null` 屏蔽）。
- **Verify Gate**：可执行质量门 `pnpm verify:public-submodules`，阻止结构/导出面回归。
- **Promotion Path**：当某个子模块成长到需要独立演进时的“提升为独立子包”路径与迁移步骤。

## 推荐 import 形态

- 业务侧：优先从包根（`@logixjs/<pkg>`）导入概念 API（避免依赖文件组织形态）。
- 工具/细分概念：可从子模块入口导入（`@logixjs/<pkg>/<Concept>`），前提是该入口已被裁决为 Public Submodule。
- 独立入口：只使用已登记且非空壳的子路径入口（例如 `@logixjs/form/react`、`@logixjs/sandbox/vite`）。

## 禁止 import 形态（强约束）

- `@logixjs/*/internal/*`
- 任何包含 `packages/*/src/internal/**` 的绕过式路径 import
- 未登记的子路径入口（尤其是“占位/空壳入口”）

## 验证门（结构治理）

- 运行：`pnpm verify:public-submodules`
- 典型关注点：
  - `src/` 根目录仅允许概念入口（PascalCase）+ 白名单文件（`index.ts(x)`、`global.d.ts` 等）
  - `exports` 必须屏蔽 `./internal/*`
  - 子路径入口不得空壳
  - 测试结构：禁止 `src/**` 下出现测试；引用 `src/internal/**` 的用例必须收敛在 `test/internal/**`（browser project 例外）

## 裁决与细节落点（SSoT）

- 特性期裁决清单（当前基线）：`specs/030-packages-public-submodules/contracts/public-submodules.md`
- exports 策略：`specs/030-packages-public-submodules/contracts/exports-policy.md`
- internal 分区：`specs/030-packages-public-submodules/contracts/internal-structure.md`
- 测试结构：`specs/030-packages-public-submodules/contracts/test-structure.md`
- 提升为子包：`specs/030-packages-public-submodules/contracts/promotion-to-package.md`
