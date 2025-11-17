# Quickstart: 如何为 packages/* 新增/重构 Public Submodules

**Branch**: `030-packages-public-submodules`  
**Date**: 2025-12-24  
**Spec**: `specs/030-packages-public-submodules/spec.md`

本 quickstart 面向仓库贡献者：如何在不扩大 public surface 的前提下，为某个 `packages/*` 子包新增或重构对外概念入口。

## 1) 先裁决概念

在写代码前，先在 `specs/030-packages-public-submodules/contracts/public-submodules.md`：

- 确认该能力是否是“概念级入口”（Public Submodule），还是应作为 internal 实现细节。
- 若需要新增子路径入口（subpath export），先登记其目的与边界（禁止空壳入口）。

## 2) 放置与命名

- Public Submodule：放在 `src/` 根目录，文件名 PascalCase。
- internal 实现：放在 `src/internal/**`，可自由重构。
- 仅允许少量白名单文件出现在 `src/` 根目录：`index.ts(x)`、`global.d.ts`（如有）等。

## 3) 对外导出与 exports

- `src/index.ts(x)` 作为对外 barrel：按概念聚合导出。
- `package.json#exports`：
  - 默认对标 effect：允许 `./* -> ./src/*.ts(x)`，但必须满足“`src/` 根目录治理不变量 + 回归门”（见 `contracts/exports-policy.md`）。
  - internal 必须被屏蔽（例如 `./internal/*: null`）。
  - 子路径入口（如 `./react`、`./vite`）必须显式列出，并与 `contracts/public-submodules.md` 的裁决一致（禁止空壳）。

## 4) 回归与验收

至少通过：

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- “public submodules 验证门”：`pnpm verify:public-submodules`

预期输出（通过时）：

```text
[verify:public-submodules] PASS (0 violations)
```

并同步更新仓库内调用方：

- `examples/*`
- `apps/docs/*`
- `scripts/*`（若有生成器/脚手架引用旧入口）

## 5) 提交前自检清单（建议）

- [ ] `contracts/public-submodules.md`：已登记/更新本次新增或调整的对外概念入口（含独立子路径入口）。
- [ ] `package.json#exports`：已屏蔽 `./internal/*`，且（如使用通配导出）满足 `src/` 根目录治理不变量。
- [ ] 已更新仓库内调用方 import：`examples/*`、`apps/docs/*`、相关 `scripts/*`。
- [ ] 已通过结构治理验证门：`pnpm verify:public-submodules`
- [ ] 已通过质量门：`pnpm typecheck`、`pnpm lint`、`pnpm test`
