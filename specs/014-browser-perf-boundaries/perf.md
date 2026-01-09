# Perf Evidence: 014 浏览器压测基线与性能边界地图

> 记录 014 的浏览器端性能基线（baseline）与上限/边界（limit）证据，用于后续迭代 Before/After 对照。
> 统计口径以 `specs/014-browser-perf-boundaries/spec.md` 与矩阵 SSoT（`@logixjs/perf-evidence/assets/matrix.json`）为准（中位数 + p95；含 runs/warmup/timeout 元信息）。

## 环境元信息（必填）

- Date: 2025-12-17
- Git branch / commit: 011-upgrade-lifecycle / 402f93d2（worktree dirty）
- OS / arch: darwin / arm64
- CPU / Memory: Apple M2 Max / 64GB
- Node.js: v22.21.1
- pnpm: 9.15.9
- Browser: Chromium (Playwright) / headless=true
- Vitest / @vitest/browser / @vitest/browser-playwright / Playwright versions: Vitest 4.0.15 / Playwright 1.57.0
- Notes（电源模式/后台负载/浏览器版本锁定/是否切换 tab 等）: `VITE_LOGIX_PERF_PROFILE=quick`（runs=10 / warmupDiscard=2 / timeoutMs=8000）；runtime 类硬门默认在 `DiagnosticsLevel=off` 环境下运行

## 运行入口（固定）

- Browser 压测（主跑道）：`pnpm -C packages/logix-react test -- --project browser`
- 采集与落盘（建议）：`pnpm perf collect`（或 `pnpm perf collect:quick`）
  - 指定输出：`pnpm perf collect -- --out specs/014-browser-perf-boundaries/perf/after.worktree.json`
- diff（建议）：`pnpm perf diff -- --before <before.json> --after <after.json>`
- 推荐默认值（017 调参实验场，快速）：`pnpm perf tuning:best`（输出到 `specs/014-browser-perf-boundaries/perf/tuning/recommendation.latest.md|json`）

> 说明：browser mode 内无法直接写文件，默认通过“机器可解析输出协议（LOGIX_PERF_REPORT）+ 采集脚本”落盘。

## Raw Evidence（固化文件）

- 解读与“实验场工作法”：`specs/014-browser-perf-boundaries/perf/README.md`

- envId 命名建议：`<os>-<arch>.<cpu>.<browser>-<version>.<headless>`（示例：`darwin-arm64.m2max.chromium-131.headless`）。同一份 Before/After 对照必须使用同一 envId（同机同配置）。
- envId: `darwin-arm64.m2max.chromium.headless`
- Before（基线）：`specs/014-browser-perf-boundaries/perf/before.402f93d2.darwin-arm64.m2max.chromium.headless.json`
- After（对比）：`specs/014-browser-perf-boundaries/perf/after.<gitSha>.<envId>.json` 或工作区临时文件 `specs/014-browser-perf-boundaries/perf/after.worktree.json`
- Diff（摘要，可选）：`specs/014-browser-perf-boundaries/perf/diff.<before>__<after>.txt`

> 补充：PerfReport 中的 `meta.config.profile` 标记本次运行使用的 profile（如 `quick/default/soak`），`meta.config.humanSummary` 表示是否开启人类可读摘要输出（默认为 `false`，仅在 `VITE_LOGIX_PERF_HUMAN=1` 时为 `true`）；稳定性阈值写入 `meta.config.stability`，diff 在发现超过阈值的波动时会在 `SuiteDiff.notes` 中输出 `stabilityWarning`。

## 关键指标（表格位）

> 表格内容以 report 中的维度与预算为准；这里主要用于“快速肉眼对照”。

| Dimension | Budget | Threshold（max level） | Median@threshold (ms) | P95@threshold (ms) | Notes |
|---|---|---:|---:|---:|---|
| watchers(click→paint) | p95 ≤ 50ms | 256 | 38.7 | 41.5 | reactStrictMode=false（quick） |
| watchers(click→paint) | p95 ≤ 50ms | 256 | 40.5 | 42.0 | reactStrictMode=true（quick） |
| converge(commit) | commit.p95 <= 50ms | 800 | 10.6 | 11.8 | DiagnosticsLevel=off；convergeMode=full, dirtyRootsRatio=0.05（quick） |
| diagnostics overhead | off→full |  |  |  |  |

## 判定与结论（可复用）

- 本地对照原则：同机同配置（runs/warmup/timeout/浏览器版本）才可判定 Before/After。
- converge 的硬门：`auto<=full*1.05` 属于 runtime 类 gate；默认在 `DiagnosticsLevel=off` 下跑硬 gate（`light|full` 仅记录 overhead）。
- 如果波动过大不可判定：附加更高 warmup/重复次数的一组补充数据，并在 Notes 中解释噪声来源。
