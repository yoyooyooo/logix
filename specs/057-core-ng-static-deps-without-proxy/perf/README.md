# Perf: 057 ReadQuery/SelectorSpec + SelectorGraph

本目录用于落盘 `$logix-perf-evidence` 的 before/after/diff（Node + Browser）与结论摘要。

## Hard Conclusion（profile=default）

- Matrix SSoT：`.codex/skills/logix-perf-evidence/assets/matrix.json`（`id=logix-browser-perf-matrix-v1`）
- Browser：`diff.browser.legacy__selectorGraph.darwin-arm64.default.json`（`comparability.comparable=true` 且 `summary.regressions==0`）
- Node（worktree+GC）：`diff.node.legacy__selectorGraph.darwin-arm64.default.worktree.gc.json`（`comparability.comparable=true` 且 `summary.regressions==0`）

## Evidence（authoritative）

> 采集隔离：本组 hard evidence 在独立目录 `/tmp/intent-flow-perf-057-20251230-002158` 中采集（并行工作区结果仅作线索，不得用于宣称 Gate PASS）。

- Browser:
  - `before.browser.legacy.dynamic.darwin-arm64.default.json`
  - `after.browser.selectorGraph.darwin-arm64.default.json`
  - `diff.browser.legacy__selectorGraph.darwin-arm64.default.json`
- Node:
  - `before.node.legacy.dynamic.darwin-arm64.default.worktree.gc.json`
  - `after.node.selectorGraph.darwin-arm64.default.worktree.gc.json`
  - `diff.node.legacy__selectorGraph.darwin-arm64.default.worktree.gc.json`

## Reproduce（P1 minimal）

```bash
# Browser（legacy.dynamic -> selectorGraph）
pnpm perf collect -- --profile default \
  --files packages/logix-react/test/browser/watcher-browser-perf.test.tsx \
  --files packages/logix-react/test/browser/perf-boundaries/converge-steps.test.tsx \
  --out specs/057-core-ng-static-deps-without-proxy/perf/before.browser.legacy.dynamic.darwin-arm64.default.json

VITE_LOGIX_PERF_KERNEL_ID=core-ng pnpm perf collect -- --profile default \
  --files packages/logix-react/test/browser/watcher-browser-perf.test.tsx \
  --files packages/logix-react/test/browser/perf-boundaries/converge-steps.test.tsx \
  --out specs/057-core-ng-static-deps-without-proxy/perf/after.browser.selectorGraph.darwin-arm64.default.json

pnpm perf diff -- \
  --before specs/057-core-ng-static-deps-without-proxy/perf/before.browser.legacy.dynamic.darwin-arm64.default.json \
  --after specs/057-core-ng-static-deps-without-proxy/perf/after.browser.selectorGraph.darwin-arm64.default.json \
  --out specs/057-core-ng-static-deps-without-proxy/perf/diff.browser.legacy__selectorGraph.darwin-arm64.default.json

# Node（legacy.dynamic -> selectorGraph）
NODE_OPTIONS=--expose-gc pnpm perf bench:traitConverge:node -- --profile default \
  --out specs/057-core-ng-static-deps-without-proxy/perf/before.node.legacy.dynamic.darwin-arm64.default.worktree.gc.json

NODE_OPTIONS=--expose-gc LOGIX_PERF_KERNEL_ID=core-ng pnpm perf bench:traitConverge:node -- --profile default \
  --out specs/057-core-ng-static-deps-without-proxy/perf/after.node.selectorGraph.darwin-arm64.default.worktree.gc.json

pnpm perf diff -- \
  --before specs/057-core-ng-static-deps-without-proxy/perf/before.node.legacy.dynamic.darwin-arm64.default.worktree.gc.json \
  --after specs/057-core-ng-static-deps-without-proxy/perf/after.node.selectorGraph.darwin-arm64.default.worktree.gc.json \
  --out specs/057-core-ng-static-deps-without-proxy/perf/diff.node.legacy__selectorGraph.darwin-arm64.default.worktree.gc.json
```
