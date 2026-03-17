# 2026-03-19 · externalStore targeted audit wave4（5 轮）

## 目标与约束

- 目标：在独立 worktree 内连续 5 轮复核 `externalStore.ingest.tickNotify` 的 `full/off<=1.25`。
- 约束：只做 evidence/docs，不改源码、不改测试、不改 matrix。
- 工作区：`/Users/yoyo/Documents/code/personal/logix.worktrees/v4-perf.externalstore-wave4-audit`
- 分支：`agent/v4-perf-externalstore-wave4-audit`

## 执行命令

每轮固定执行同一命令：

```bash
pnpm -C packages/logix-react test -- --project browser test/browser/perf-boundaries/external-store-ingest.test.tsx -t "perf: externalStore ingest"
```

依赖检查与准备：

```bash
pnpm install --frozen-lockfile
```

## 证据文件

- `specs/103-effect-v4-forward-cutover/perf/2026-03-19-externalstore-wave4-audit.r1.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-19-externalstore-wave4-audit.r2.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-19-externalstore-wave4-audit.r3.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-19-externalstore-wave4-audit.r4.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-19-externalstore-wave4-audit.r5.json`

## 五轮摘要

| 轮次 | createdAt (UTC) | `firstFailLevel` | `maxLevel` | 结果 |
| --- | --- | --- | --- | --- |
| r1 | `2026-03-19T07:09:41.504Z` | `128` | `null` | threshold fail |
| r2 | `2026-03-19T07:09:56.665Z` | `null` | `512` | pass |
| r3 | `2026-03-19T07:10:11.597Z` | `null` | `512` | pass |
| r4 | `2026-03-19T07:10:28.051Z` | `null` | `512` | pass |
| r5 | `2026-03-19T07:10:44.420Z` | `256` | `128` | threshold fail |

补充观测（`timePerIngestMs` p95，full/off 比值）：

- r1：watchers128=`1.778`，watchers256=`0.889`，watchers512=`1.308`
- r2：watchers128=`1.091`，watchers256=`1.400`，watchers512=`1.364`
- r3：watchers128=`1.571`，watchers256=`1.300`，watchers512=`1.333`
- r4：watchers128=`1.000`，watchers256=`1.000`，watchers512=`1.333`
- r5：watchers128=`1.500`，watchers256=`1.800`，watchers512=`1.417`

## 三选一裁决

结论：`edge_gate_noise`

依据：

1. 5 轮里有 3 轮完整通过到 `watchers=512`，没有形成“连续阻塞”形态。
2. 失败轮次的 `firstFailLevel` 在 `128` 与 `256` 漂移，阻塞档位不稳定。
3. 该门是相对预算门（`full/off<=1.25`，`minDeltaMs=0.6`），当前样本仍处于低毫秒量级，轮次间抖动会放大为门限翻转。

## 回写范围判断

- 本次结论强度未达到“非常硬”，不回写以下文件：
  - `docs/perf/README.md`
  - `docs/perf/06-current-head-triage.md`
  - `docs/perf/07-optimization-backlog-and-routing.md`
