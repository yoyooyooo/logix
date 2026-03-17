# 2026-03-16 · v4-perf 恢复后活跃 worktree 状态

## 目的

在母线 `v4-perf` 完成冲突恢复、accepted 回收、docs-only 收口与 real probe 复验之后，统一回答：

1. 还有哪些活跃 worktree
2. 哪些已经被母线语义吸收
3. 哪些只是残留临时文件
4. 哪些仍需后续单独裁决

本页只记录当前状态，不执行清理动作。

后续补充：

- 经用户明确授权后，已清理三处纯残留：
  - `v4-perf.hot-snapshot/.tmp-baseline-60c5fed1`
  - `v4-perf.oncommit-envelope/.tmp-baseline-b3a74db5`
  - `v4-perf.preload-plan/docs/perf/archive/2026-03/2026-03-16-r4-react-hook-side-shared-module-read-plan-failed.md`

## 数据来源

命令：

```sh
python3 fabfile.py list_active_worktrees --json
python3 fabfile.py show_branch_diff agent/v4-perf-op-snapshot --json
python3 fabfile.py show_branch_diff agent/v4-perf-preload-plan --json
python3 fabfile.py show_branch_diff agent/v4-perf-taskrunner-latest --json
python3 fabfile.py show_branch_diff agent/v4-perf-hot-snapshot --json
python3 fabfile.py show_branch_diff agent/v4-perf-oncommit-envelope --json
```

补充只读核对：

```sh
git -C /Users/yoyo/Documents/code/personal/logix.worktrees/v4-perf.op-snapshot status --short --branch
git -C /Users/yoyo/Documents/code/personal/logix.worktrees/v4-perf.preload-plan status --short --branch
git -C /Users/yoyo/Documents/code/personal/logix.worktrees/v4-perf.hot-snapshot status --short --branch
git -C /Users/yoyo/Documents/code/personal/logix.worktrees/v4-perf.oncommit-envelope status --short --branch
```

## 当前结论总表

| worktree | branch | 现状 | 母线状态 | 下一步 |
| --- | --- | --- | --- | --- |
| `v4-perf.rowid-gate` | `agent/v4-perf-rowid-gate` | clean | 已被 `66b5d413 + 91d0f695` 吸收 | 不再需要重复回收 |
| `v4-perf.taskrunner-latest` | `agent/v4-perf-taskrunner-latest` | clean | docs-only 失败结论已由 `38e16191` 吸收 | 不再需要重复回收 |
| `v4-perf.preload-plan` | `agent/v4-perf-preload-plan` | clean | docs-only 失败结论已由 `3120374a` 吸收 | 已完成残留清理，无需继续处理 |
| `v4-perf.op-snapshot` | `agent/v4-perf-op-snapshot` | clean | 只吸收了 pending/docs 结论，未回收代码 | source 已清理；若未来重开，必须从母线新拉线 |
| `v4-perf.p0-2-op-inline` | `agent/v4-perf-p0-2-op-inline` | clean | 已被 `bd006ee5 + 6edeea83` 吸收 | 本轮独立 worktree 已完成 accepted 回收 |
| `v4-perf.p0-2-txn-hot` | `agent/v4-perf-p0-2-txn-hot` | clean | 已被 `a5ab0df1` 吸收 | 本轮独立 worktree 已完成 accepted 回收 |
| `v4-perf.p0-2-hot-context` | `agent/v4-perf-p0-2-hot-context` | clean | 已被 `368ebc93` 吸收 | 本轮独立 worktree 已完成 accepted 回收 |
| `v4-perf.p1-5-selector-activation` | `agent/v4-perf-p1-5-selector-activation` | clean | 已被 `93ad39fb` 吸收 | 本轮独立 worktree 已完成 accepted 回收 |
| `v4-perf.hot-snapshot` | `agent/v4-perf-hot-snapshot` | clean | 语义已被 accepted 线吸收 | 临时 baseline 目录已清理 |
| `v4-perf.oncommit-envelope` | `agent/v4-perf-oncommit-envelope` | clean | 已被 `f41a7b89` 吸收 | 临时 baseline 目录已清理 |

## 逐线说明

### `rowid-gate`

- source branch：`agent/v4-perf-rowid-gate`
- source head：`29513007`
- source worktree：clean

母线回收结果：

- `66b5d413` `docs(perf): refresh no-trackby rowid gate evidence`
- `91d0f695` `perf(logix-core): gate no-trackBy rowid reconcile`

当前结论：

- 已完成回收
- source worktree 只剩历史存在价值，不再承担 merge-ready 角色

### `taskrunner-latest`

- source branch：`agent/v4-perf-taskrunner-latest`
- source head：`31174d71`
- `show_branch_diff`：`ahead=1, behind=7, merge_ready=false`

母线回收结果：

- 等价 docs-only 失败结论已存在于 `38e16191`

当前结论：

- 不需要重复 cherry-pick
- source worktree clean，但语义已经被母线吸收

### `preload-plan`

- source branch：`agent/v4-perf-preload-plan`
- source head：`173645df`
- `show_branch_diff`：`ahead=1, behind=22, merge_ready=false`
- 当前 dirty 原因：`?? docs/perf/archive/2026-03/2026-03-16-r4-react-hook-side-shared-module-read-plan-failed.md`

母线回收结果：

- `3120374a` 已吸收该 docs-only 失败结论

当前结论：

- 这条线的“该保留的信息”已经回到母线
- 原 worktree 的未跟踪 note 已按授权清理
- 当前 source worktree 已恢复 clean

### `op-snapshot`

- source branch：`agent/v4-perf-op-snapshot`
- source head：`b30e36a6`
- `show_branch_diff`：`ahead=1, behind=25, merge_ready=false`
- 当前 source worktree：clean

母线回收结果：

- `3120374a` 只吸收了 docs-only pending note：
  - `2026-03-16-p0-existing-link-inline-operation-fast-path-pending.md`

当前结论：

- 这份脏 diff 已被判定为“未收口实验，已被后续正式方案绕过”
- 当前 source worktree 已按授权清理回分支 `HEAD`
- 当前 source 分支不再保留未提交实验代码
- 若未来重开，只能从当前母线新拉独立实验线，并补齐语义守门与 perf 证据

### `hot-snapshot`

- source branch：`agent/v4-perf-hot-snapshot`
- source head：`873aaec4`
- `show_branch_diff`：`ahead=1, behind=36, merge_ready=false`
- 当前 dirty 原因：`?? .tmp-baseline-60c5fed1/`

母线对应 accepted 结论：

- `P0-2 deferred worker HotSnapshot`
- 证据页：`2026-03-15-p0-2-deferred-worker-hot-snapshot.md`

当前结论：

- 这条线的核心收益已被母线语义吸收
- 当前 worktree 已清理临时 baseline 目录
- 当前 source worktree 已恢复 clean

### `p0-2-op-inline`

- source branch：`agent/v4-perf-p0-2-op-inline`
- source head：`8ea4ef13`
- `show_branch_diff`：`ahead=1, behind=1, merge_ready=false`
- 当前 source worktree：clean

母线回收结果：

- `bd006ee5` `perf(logix-core): inline existing-link operation runner fast path`
- `6edeea83` `docs(perf): revalidate p0 txn direct fastpath`

当前结论：

- 这条线已被母线吸收
- worker 线内已收口成 1 个最终提交
- 当前 source worktree 已恢复 clean

### `p0-2-txn-hot`

- source branch：`agent/v4-perf-p0-2-txn-hot`
- source head：`c92b7d17`
- 当前 source worktree：clean

母线回收结果：

- `a5ab0df1` `perf: snapshot transaction hot runtime services`

当前结论：

- 这条线已被母线吸收
- worker 线内已收口成 1 个最终提交
- 当前 source worktree 已恢复 clean

### `p0-2-hot-context`

- source branch：`agent/v4-perf-p0-2-hot-context`
- source head：`48111f8d`
- 当前 source worktree：clean

母线回收结果：

- `368ebc93` `perf(core): share txn operation hot context`

当前结论：

- 这条线已被母线吸收
- worker 线内已收口成 1 个最终提交
- 当前 source worktree 已恢复 clean

### `p1-5-selector-activation`

- source branch：`agent/v4-perf-p1-5-selector-activation`
- source head：`98c7b13c`
- 当前 source worktree：clean

母线回收结果：

- `93ad39fb` `perf(react): keep selector activation alive across short gaps`

当前结论：

- 这条线已被母线吸收
- worker 线内已收口成 1 个最终提交
- 当前 source worktree 已恢复 clean

### `oncommit-envelope`

- source branch：`agent/v4-perf-oncommit-envelope`
- source head：`ea8adf2a`
- `show_branch_diff`：`ahead=1, behind=9, merge_ready=false`
- 当前 dirty 原因：`?? .tmp-baseline-b3a74db5/`

当前结论：

- 这条线已被母线吸收：
  - `f41a7b89` `perf(runtime): tighten oncommit scheduler envelope`
- 合入后最小语义验证继续通过
- 合入后 `python3 fabfile.py probe_next_blocker --json` 仍返回 `clear`
- 当前临时 baseline 目录已清理
- 当前 source worktree 已恢复 clean

## 当前建议

1. 不再继续从这些 source worktree 直接回收代码
2. 当前列出的 source worktree 已全部恢复 clean
3. `op-snapshot` 方向后续若要继续，只能基于母线里的 pending 结论重新开独立实验线
