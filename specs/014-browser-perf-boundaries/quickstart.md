# Quickstart: 014 浏览器压测基线与性能边界地图

> 目标：用 `vitest` browser mode 运行大颗粒度长链路集成压测，产出可对比的 PerfReport，并固化到 `specs/014-browser-perf-boundaries/perf/`。

## 1) 选择矩阵与运行档位

- 矩阵 SSoT：`@logix/perf-evidence/assets/matrix.json`（物理：`.codex/skills/logix-perf-evidence/assets/matrix.json`）
- 默认 runs/warmup/timeout 与稳定性阈值：见 `matrix.json.defaults`

## 2) 运行浏览器集成测试（主跑道）

- 运行入口（browser project）：`pnpm -C packages/logix-react test -- --project browser`

## 3) 采集并落盘（规划中的最短闭环）

> browser mode 内不直接写文件，建议通过 “机器可解析输出协议（LOGIX_PERF_REPORT）+ 采集脚本” 落盘（对应任务：T005–T008）。

- 采集（推荐）：`pnpm perf collect`（或 `pnpm perf collect:quick`）
  - 指定输出：`pnpm perf collect -- --out specs/014-browser-perf-boundaries/perf/after.worktree.json`
- diff：`pnpm perf diff -- --before <before.json> --after <after.json>`

## 4) 固化基线（Before）

- 命名约定：见 `specs/014-browser-perf-boundaries/perf.md`
- 建议文件名：
  - `specs/014-browser-perf-boundaries/perf/before.<gitSha>.<envId>.json`
  - `specs/014-browser-perf-boundaries/perf/after.<gitSha>.<envId>.json`

## 5) 复用与扩展

- 新增/调整维度：只改 `@logix/perf-evidence/assets/matrix.json`（SSoT），报告与 diff 必须继续符合 `@logix/perf-evidence/assets/schemas/*`。
- 负优化边界：优先跑 `negativeBoundaries.dirtyPattern`（含反直觉调度 + `uniquePatternPoolSize` 主轴），并检查 `requiredEvidence` 是否齐全。

### 作为“全仓性能证据框架”被其它 spec 复用（推荐）

如果你的特性需要“改动前后可对比的性能证据”，优先复用 014 的协议与脚本，而不是自建 report/diff：

1) **把证据落在你的 feature 目录**：在 `specs/<id>/perf/*` 固化 `before.*.json` / `after.*.json` / `diff.*.json`（命名约定可直接沿用 014 的 `perf.md`）。
2) **复用采集脚本**：用 `pnpm perf collect -- --out specs/<id>/perf/after.worktree.json` 把报告落盘；需要只跑子集时加 `--files <path>`。
3) **复用对比脚本**：用 `pnpm perf diff -- --before specs/<id>/perf/before.<...>.json --after specs/<id>/perf/after.<...>.json --out specs/<id>/perf/diff.<...>.json`；若你的矩阵不是 014 的 `matrix.json`，再额外指定 `--matrix <your-matrix.json>`。
