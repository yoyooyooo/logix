# Perf Evidence: O-006 Runtime Assembly Graph

本目录用于落盘 O-006 冷启动证据（before/after/diff）。

## 预算

- 冷启动 p95 回归阈值：<= 5%
- `diagnostics=off`：额外开销接近 0

## 证据文件约定

- `before.<sha>.<envId>.<profile>.json`
- `after.<sha>.<envId>.<profile>.json`
- `diff.<before>__<after>.<envId>.<profile>.json`

## 采集命令（模板）

```bash
pnpm perf collect -- --profile default --out specs/099-runtime-assembly-graph/perf/before.<sha>.darwin-arm64.node20.default.json --files packages/logix-core/src/internal/runtime/AppRuntime.ts
pnpm perf collect -- --profile default --out specs/099-runtime-assembly-graph/perf/after.<sha>.darwin-arm64.node20.default.json --files packages/logix-core/src/internal/runtime/AppRuntime.ts
pnpm perf diff -- --before specs/099-runtime-assembly-graph/perf/before.<sha>.darwin-arm64.node20.default.json --after specs/099-runtime-assembly-graph/perf/after.<sha>.darwin-arm64.node20.default.json --out specs/099-runtime-assembly-graph/perf/diff.before__after.darwin-arm64.node20.default.json
```

## 判定规则

- `comparability.comparable` 必须为 `true`。
- 若 `comparability.comparable=false`，本轮结论无效，必须复测。
