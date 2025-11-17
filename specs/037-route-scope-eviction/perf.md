# Perf: 037 Scope 工具（ModuleScope）与 ScopeRegistry（不影响热路径）

> 目标：确保 037 的 Scope 工具化能力不引入 `useModule(Impl)` 热路径的可观测回退，并为未来的 Bridge（跨子树复用 scope）提供可复现的基线口径。

## 现阶段结论

- ModuleScope 是对 `useModule(hostImpl, options)` 的薄封装：不应在 render 热路径新增额外 O(n) 工作。
- ScopeRegistry/Bridge 属于低频边界操作：更关注“可解释 + 不泄漏”，不追求极限性能。
- 显式 eviction/clear API 已 DEFERRED；对应 perf gate 也一并推迟到后续 spec/phase。

## 运行方式（可选计划）

若后续要把 Bridge 作为稳定能力推进，建议新增一个微基准脚本（Node 环境）测量：

- ScopeRegistry：`register/get/release/clear*` 的分配与耗时
- Bridge：一次“注册 → 跨子树取回 → 释放”的端到端成本

脚本落点建议：纳入 `logix-perf-evidence`（统一入口：`pnpm perf`），并以 `pnpm perf bench:037:scope-registry` 暴露运行入口。

## 验收口径（建议）

- 热路径（diagnostics off）：
  - `useModule(Impl)` 的 acquire/retain/release p95 耗时与分配不超过基线 +5%
- 低频边界：
  - ScopeRegistry 的 `register/get/release` 在 N≤200 scopeId 的规模内保持线性，且无明显泄漏趋势（可通过 heap snapshot/长期跑测辅助确认）

## 记录格式（实施时补齐）

- Date:
- Branch:
- Command:
- Environment: `node`, `platform/arch`, `cpu`, `iters`, `N`
- Raw:
- Summary:
