---
title: 质量门与验证（project-guide）
status: draft
version: 1
---

# 质量门与验证（project-guide）

> **目标**：把“改完该跑什么”变成可交接的最小清单；按需再扩展到更深的回归/性能基线。

## 0. 总原则

- 优先跑“一次性命令”（非 watch）：`vitest run` / `pnpm test`。
- 先窄后宽：优先针对改动包跑 typecheck/test，再跑 workspace 级兜底。
- 改动触及 runtime 核心路径（A/B/E/F/G/H/I）时，除了类型/测试，还应补 perf/诊断基线（见：`diagnostics-perf-baseline.md`）。

## 1. Workspace 级质量门（建议顺序）

1. `pnpm typecheck`
2. `pnpm lint`（= `pnpm lint:oxlint && pnpm lint:eslint`，且 `--max-warnings 0`）
3. `pnpm verify:public-submodules`（结构治理：exports/internal/test 目录）
4. `pnpm test`（= `vitest run`）

常用变体：

- 需要覆盖 test 类型：`pnpm typecheck:test`
- 需要浏览器集成测试：`pnpm test:browser`
- 需要构建产物：`pnpm build`（递归执行各包 build）
- 需要快速回归：`pnpm test:fast`（`bun x vitest run`）
- 需要格式化：`pnpm format`（prettier）

## 2. 包内最小验证（按需）

> 建议在“已经定位到改动包”的前提下使用；否则直接跑 workspace 级 `pnpm test` 更稳。

- `@logix/core`：`pnpm -C packages/logix-core typecheck`、`pnpm -C packages/logix-core typecheck:test`、`pnpm -C packages/logix-core test`
- `@logix/react`：`pnpm -C packages/logix-react typecheck`、`pnpm -C packages/logix-react test`
- `@logix/devtools-react`：`pnpm -C packages/logix-devtools-react typecheck:test`、`pnpm -C packages/logix-devtools-react test`
- `@logix/sandbox`：`pnpm -C packages/logix-sandbox typecheck:test`、`pnpm -C packages/logix-sandbox test`
- `@logix/form`：`pnpm -C packages/form typecheck:test`、`pnpm -C packages/form test`
- `@logix/query`：`pnpm -C packages/query typecheck:test`、`pnpm -C packages/query test`
- `@logix/i18n`：`pnpm -C packages/i18n typecheck:test`、`pnpm -C packages/i18n test`
- `@logix/domain`：`pnpm -C packages/domain typecheck:test`、`pnpm -C packages/domain test`

注意：

- `packages/logix-test/package.json` 的 `test` 脚本是 `vitest`（默认 watch）；在自动化/一次性验证里优先用 workspace `pnpm test`，或显式 `pnpm -C packages/logix-test exec vitest run`。

## 3. 触发条件建议（最小闭环）

- 改 `A/B`（StateTransaction / FlowRuntime / Middleware / ConcurrencyPolicy 等）：至少 `pnpm typecheck` + `pnpm test`；再按需补 `diagnostics-perf-baseline.md` 的 perf/证据。
- 改 `E/F/G`（Debug/DevtoolsHub/Evidence/Replay）：至少 `pnpm test`；必要时跑 `packages/logix-devtools-react/test/*` 相关用例。
- 改 React 订阅/ExternalStore：至少 `pnpm -C packages/logix-react test`；涉及浏览器行为再 `pnpm test:browser`。
- 改 Sandbox worker/protocol：至少 `pnpm -C packages/logix-sandbox test`；涉及 browser worker 再 `pnpm test:browser`。
