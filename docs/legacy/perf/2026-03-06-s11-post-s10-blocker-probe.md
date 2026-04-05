# 2026-03-06 · S-11：post-S10 blocker probe

本线不做 runtime cut。目标是在 `S-10` 关闭 `txnLanes` 之后，重新确认 current-head 的第一个 browser blocker 是否还存在，并把结果回写 routing。

## 基线

只读确认：
- `git status --short --branch`
- `python3 fabfile.py list_tasks`
- `python3 fabfile.py probe_next_blocker --dry-run`

dry-run 结果：
- `04-agent-execution-playbook.md` 的默认 probe 队列仍把 `txnLanes.urgentBacklog` 放在第 1 位。
- remaining queue 为 `externalStore.ingest.tickNotify -> runtimeStore.noTearing.tickNotify -> form.listScopeCheck`。

## 实跑

第一次实跑：
- 命令：`python3 fabfile.py probe_next_blocker`
- 结果：停在 `txnLanes.urgentBacklog`
- `failure_kind=environment`
- 直接原因：当前独立 worktree 缺 `node_modules`，stdout/stderr 分别提示 `Local package.json exists, but node_modules missing` 与 `sh: vitest: command not found`

环境补齐：
- 命令：`pnpm install --frozen-lockfile`
- 目的仅是让当前独立 worktree 具备 browser probe 运行前提，不改变主工作区或主分支结论。

第二次实跑：
- `python3 fabfile.py probe_next_blocker`
- `python3 fabfile.py probe_next_blocker --json`
- `externalStore.ingest.tickNotify`、`runtimeStore.noTearing.tickNotify`、`form.listScopeCheck` 全部通过。
- `next_blocker: none`

补充观察：
- `--json` 输出显示旧的 `txnLanes` probe 命令使用 `-t "browser txn lanes: urgent p95 under non-urgent backlog (mode matrix)"`。
- 由于 Vitest 的 `-t/--testNamePattern` 按 regex 解释，未转义的括号会导致目标测试被记成 `1 skipped`，而不是实际执行。
- 因此 `txnLanes` 不应继续留在默认 blocker probe 队列里；如果未来确实要重开，只能使用 file-level 命令或显式转义 pattern。

## 裁决

- current-head 已无默认 runtime 主线。
- 默认 browser blocker 队列只保留 remaining health/regression suites：`externalStore`、`runtimeStore`、`form`。
- 本轮没有识别出新的 runtime blocker；remaining 活跃方向只剩：
  - `S-2`：`watchers.clickToPaint` benchmark 解释链 / 展示层候选
  - `R-2`：`TxnLanePolicy` API vNext 架构候选（仅在新 SLA / 新证据下重开）
- `txnLanes` 继续保持 `S-10` 的关闭结论，不回到默认 blocker 队列。

## 回写

- `docs/perf/README.md`
- `docs/perf/03-next-stage-major-cuts.md`
- `docs/perf/04-agent-execution-playbook.md`
- `docs/perf/05-forward-only-vnext-plan.md`
- `docs/perf/06-current-head-triage.md`
- `docs/perf/07-optimization-backlog-and-routing.md`

## 通过 / 未通过门

- 通过：独立 worktree 能跑通 real `probe_next_blocker`
- 通过：remaining blocker queue clear
- 通过：routing 已更新为“无默认 runtime 主线”
- 未通过：没有新的 runtime blocker 可开线；因此本线按 docs/evidence-only 收口

## 下一刀计划

- 默认不开新的 runtime worktree。
- 如果要继续推进 perf，优先考虑 `S-2` 的 benchmark 解释链，而不是 runtime core。
- 只有在出现新的 clean/comparable native-anchor 证据时，才决定是否重开 `txnLanes` 或推进 `R-2`。
