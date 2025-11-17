# 019 Perf Evidence（复用 014 跑道）

> 目标：在实现 019 的 runtime/React 性能改动前后，产出可对比的 Before/After/Diff 证据文件（JSON），用于回归判定与交接。
> 证据协议与对比语义统一复用 014：`matrix.json + PerfReport + PerfDiff`。

## 证据文件约定

- `before.*.json`：认可的基线（Before）
- `after.*.json`：对比样本（After）
- `diff.*.json`：Before/After 对比摘要（PerfDiff）

命名建议沿用 `specs/014-browser-perf-boundaries/perf.md` 的 envId 与 before/after 规则。

## SC-001~SC-003 映射（当前口径）

> 说明：019 的部分指标需要新增诊断证据字段才能精确衡量；在能力落地前允许 `unavailable + reason`，但必须明确标注缺口并在落地后补齐基线。

- SC-001（高优先级可见反馈 p95 ≤ 16ms）：
  - 014 suite：`watchers.clickToPaint`
  - metric/budget：`e2e.clickToPaintMs` + `p95<=16ms`
  - 注：这是“交互→可见反馈”的 proxy；若要更贴近“高频输入/连续键入”，应在 014 增补 input workload（后续 019/014 联动补齐）。
- SC-002（增量派生/校验执行比例 ≤ 20%）：
  - 需要在 019 落地可序列化证据字段（示例）：`validate.executedRules`、`validate.totalRules`、`derive.executedClosures`
  - 014 落点：作为 point-level `evidence[]` 输出并在 diff 中可对比（unit=count/ratio）。
- SC-003（同步反应链路提交次数多次→1 次）：
  - 需要在 019 落地可序列化证据字段（示例）：`commit.count`、`stateUpdate.count`、`commitMode`、`priority`
  - 014 现有可用 proxy：`converge.txnCommit` 的 `runtime.txnCommitMs`（辅助观察提交成本，但不等价于提交次数）。

## 最短闭环（推荐）

1) 采集 After（默认 profile=default）：

- `pnpm perf collect -- --out specs/019-txn-perf-controls/perf/after.worktree.json`

2) 固化 Before（改动前跑一次并重命名）：

- `pnpm perf collect -- --out specs/019-txn-perf-controls/perf/before.<gitSha>.<envId>.json`

3) 采集 After（改动后）并对比：

- `pnpm perf diff -- --before specs/019-txn-perf-controls/perf/before.<...>.json --after specs/019-txn-perf-controls/perf/after.<...>.json --out specs/019-txn-perf-controls/perf/diff.<before>__<after>.json`

> 提示：当你需要只跑子集（例如只关注 converge/diagnostics）时，直接用 `pnpm perf collect -- --files <path> --out specs/019-txn-perf-controls/perf/after.worktree.json` 指定 suite 文件/目录，并用 `--out` 把结果落到本目录。
