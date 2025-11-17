# Quickstart: 057 ReadQuery/SelectorSpec + SelectorGraph（怎么推进）

## 1) 057 的核心目标是什么？

- 让“读状态（selector）”可协议化：deps/车道/降级原因可解释，并能进入统一最小 IR。
- 在不装编译插件时仍可用：默认走 JIT，失败回退 dynamic（但回退必须可观测）。
- 为 “txn → selector → render” 因果链补齐 Devtools 证据，并为 strict gate 提供门禁口径。

## 2) 先从哪里开始实现？

- 先落协议与证据字段：`specs/057-core-ng-static-deps-without-proxy/tasks.md#Phase 1`
- 再做运行时机制：SelectorGraph（commit 驱动重算与缓存）`tasks.md#Phase 2`
- 最后补 UI 与门禁：Devtools 展示 + strict gate + perf evidence `tasks.md#Phase 4-5`
- perf evidence 采集必须隔离：在独立 `git worktree/单独目录` 中运行 `$logix-perf-evidence`（suites/budgets SSoT=matrix.json；硬结论至少 `profile=default`；混杂工作区结果仅作线索，不得用于宣称 Gate PASS）

## 3) 与 046 路线图的关系？

- 057 对应 046 的 M1.5（读状态协议化）：`specs/046-core-ng-roadmap/roadmap.md`
- 057 与 045 的“渐进替换（M2）”可并行，但必须共享统一最小 IR 与稳定锚点口径（避免并行真相源）。

## 4) 质量门（T052）

- 口径：`pnpm typecheck` → `pnpm lint` → `pnpm test:turbo`
- 最近一次通过：2025-12-30（本机一次性运行）
