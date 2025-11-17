# Perf Evidence: 044 Trait converge diagnostics sampling

> 说明：本特性触及 Logix Runtime 核心路径（trait converge 诊断事件/裁剪/采样），必须提供可复现证据。
> suites/budgets 的 SSoT：`.codex/skills/logix-perf-evidence/assets/matrix.json`

## 目标

- `diagnosticsLevel=sampled` 的平均开销显著低于 `full`（通过低采样率稀释 per-step 计时开销）。
- `diagnosticsLevel=off` 仍保持近零成本（不新增常驻采样/计时/对象分配）。

## 证据套件（最小闭环）

- suite：`diagnostics.overhead.e2e`
- 维度：`diagnosticsLevel={off|light|sampled|full}`、`scenario=watchers.clickToPaint`
- metric：`e2e.clickToPaintMs`

## 采集与对比（示例）

> 注意：硬结论证据必须在独立 `git worktree/单独目录` 中采集；当前 worktree 的结果只能作为线索。

```bash
# before
pnpm perf collect:quick -- --out specs/044-trait-converge-diagnostics-sampling/perf/before.browser.worktree.quick.json --files test/browser/perf-boundaries/diagnostics-overhead.test.tsx

# after
pnpm perf collect:quick -- --out specs/044-trait-converge-diagnostics-sampling/perf/after.browser.worktree.quick.json --files test/browser/perf-boundaries/diagnostics-overhead.test.tsx

# diff
pnpm perf diff -- --before specs/044-trait-converge-diagnostics-sampling/perf/before.browser.worktree.quick.json --after specs/044-trait-converge-diagnostics-sampling/perf/after.browser.worktree.quick.json --out specs/044-trait-converge-diagnostics-sampling/perf/diff.browser.worktree.quick.json
```

