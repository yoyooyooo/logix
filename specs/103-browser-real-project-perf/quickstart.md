# Quickstart: 真实项目 Browser 模式性能集成测试基线

## 0. 目标

在 `examples/logix-react` 里跑真实业务场景的 browser perf 套件，输出可比较证据，并完成 before/after/diff 闭环。

## 1. 先决条件

- Node.js 20+
- pnpm 9+
- Playwright Chromium 可用
- 当前目录：仓库根目录

## 2. 运行场景（browser mode）

```bash
pnpm -C examples/logix-react test -- --project browser
```

建议先按场景子集执行（开发态，quick）：

```bash
pnpm -C examples/logix-react test -- --project browser \
  test/browser/perf-scenarios/route-switch.test.tsx \
  test/browser/perf-scenarios/query-list-refresh.test.tsx
```

## 3. 采集 before/after

```bash
pnpm perf collect -- \
  --cwd examples/logix-react \
  --profile default \
  --files test/browser/perf-scenarios \
  --out specs/103-browser-real-project-perf/perf/before.<sha>.<envId>.default.json

pnpm perf collect -- \
  --cwd examples/logix-react \
  --profile default \
  --files test/browser/perf-scenarios \
  --out specs/103-browser-real-project-perf/perf/after.<sha|worktree>.<envId>.default.json
```

## 4. 生成 diff

```bash
pnpm perf diff -- \
  --before specs/103-browser-real-project-perf/perf/before.<...>.json \
  --after specs/103-browser-real-project-perf/perf/after.<...>.json \
  --out specs/103-browser-real-project-perf/perf/diff.before__after.<envId>.default.json
```

当可比性不足只做线索时：

```bash
pnpm perf diff:triage -- \
  --before specs/103-browser-real-project-perf/perf/before.<...>.json \
  --after specs/103-browser-real-project-perf/perf/after.<...>.json \
  --out specs/103-browser-real-project-perf/perf/diff.before__after.<envId>.triage.json
```

## 5. 读取结果

优先看：

- `meta.comparability.comparable` 与 `configMismatches/envMismatches`
- `suites[id=examples.logixReact.scenarios].thresholdDeltas`（看场景级 maxLevel 变化）
- `suites[id=examples.logixReact.scenarios].evidenceDeltas`（看 memory/diagnostics 信号）
- `summary.regressions / budgetViolations`

## 6. 失败回退策略

- `timeout`：先跑子集，再升 `profile` 或增加 timeout。
- `missing suite`：先修场景注册，再做 diff。
- `comparable=false`：只输出线索，不输出回归硬结论。
- `stabilityWarning`：补一轮 `soak` 复测后再下结论。
- `memory.heapDriftRatio` 持续上升：先检查缓存/闭包保留，再用 `memory-soak` 子集复测。
- `diagnostics.overheadRatio` 异常：先降到 `sampled/light`，再对回归场景定点开 `full`。

## 7. 质量门（进入实现后）

```bash
pnpm typecheck
pnpm lint
pnpm test:browser
```
