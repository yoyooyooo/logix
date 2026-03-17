# 2026-03-22 · P1-4D-min remove LOGIX_CROSSPLANE_TOPIC dual path（docs/evidence-only，implementation reverted）

## 目标与边界

- worktree：`/Users/yoyo/Documents/code/personal/logix.worktrees/v4-perf.p1-4d-single-path-cleanup`
- branch：`agent/v4-perf-p1-4d-single-path-cleanup`
- 唯一目标：实施 `P1-4D-min remove LOGIX_CROSSPLANE_TOPIC dual path`
- 写入范围约束：
  - `packages/logix-core/src/internal/runtime/core/TickScheduler.ts`
  - `packages/logix-react/src/internal/store/RuntimeExternalStore.ts`
  - `packages/logix-core/test/internal/**`
  - `packages/logix-react/test/**`
  - `docs/perf/**`
  - `specs/103-effect-v4-forward-cutover/perf/**`

## 实施尝试与回滚

本轮在目标范围内完成了一版最小实现尝试，随后按照门禁执行最小验证链路。验证阶段命中环境阻塞，未形成可比证据。

按任务约束“若验证或语义风险不足则回滚实现并 docs/evidence-only 收口”，本轮已回滚所有代码与测试改动，不保留 runtime 行为变更，仅保留证据与路由文档。

## 最小验证结果

执行命令：

1. `pnpm -C packages/logix-core typecheck:test`
2. `pnpm -C packages/logix-react typecheck:test`
3. `python3 fabfile.py probe_next_blocker --json`

结果：

- `logix-core typecheck:test` 失败，`failure_kind=environment`，`tsc: command not found`，并提示 `node_modules missing`。
- `logix-react typecheck:test` 失败，`failure_kind=environment`，`tsc: command not found`，并提示 `node_modules missing`。
- `probe_next_blocker --json` 返回 `status=blocked`，首个 blocker 为 `externalStore.ingest.tickNotify`，`failure_kind=environment`，`vitest: command not found`，并提示 `node_modules missing`。

## 裁决

- 结论类型：`docs/evidence-only`
- 代码状态：`implementation reverted`
- accepted_with_evidence：`false`

## 已完成 / 待完成 / 阻塞

已完成文件：

- `docs/perf/2026-03-22-p1-4d-min-single-path-cleanup.md`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-22-p1-4d-min-single-path-cleanup.validation.core-typecheck.txt`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-22-p1-4d-min-single-path-cleanup.validation.react-typecheck.txt`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-22-p1-4d-min-single-path-cleanup.probe-next-blocker.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-22-p1-4d-min-single-path-cleanup.evidence.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-22-p1-4d-min-single-path-cleanup.summary.md`
- `docs/perf/07-optimization-backlog-and-routing.md`
- `docs/perf/README.md`
- `docs/perf/2026-03-21-crossplane-post-p1-4c-nextwide-identify.md`

待完成文件：

- 无新增待补代码文件；本轮已按门禁回滚实现。

阻塞原因：

- 当前 worktree 缺少依赖安装，导致 `tsc` 与 `vitest` 不可用，验证证据不可比。

下一步需要用户确认的点：

- 是否允许在同一 worktree 先补齐依赖环境后重开 `P1-4D-min` 实施线，并复跑最小验证链路。

