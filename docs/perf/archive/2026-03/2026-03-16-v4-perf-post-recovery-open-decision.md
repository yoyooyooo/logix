# 2026-03-16 · v4-perf 母线恢复后的开线裁决

## Perf Worktree 开线裁决

- Date: `2026-03-16`
- Base branch: `v4-perf`
- Base HEAD: `3120374a`
- Current-head triage: `当前没有默认 runtime 下一刀`
- Current routing: `current-head=clear 之后的候选池只作为 future-only watchlist；默认不进入当前排期`

### Trigger

- Status: `不成立`
- Type: `none`
- Evidence:
  - `docs/perf/06-current-head-triage.md`
  - `docs/perf/07-optimization-backlog-and-routing.md`
  - `docs/perf/09-worktree-open-decision-template.md`
  - `docs/perf/archive/2026-03/2026-03-16-v4-perf-post-recovery-reprobe-clear.md`

### Default Decision

- 默认裁决：`不开新的 perf worktree`

### Override

- 是否 override：`否`
- 原因：无

### If Not Open

- 结论：`本轮不开新的 perf worktree`
- Watchlist only:
  - 更深的 `P1-5` core-side retain/release 下沉
    历史项；后续已完成并收口，见 `docs/perf/archive/2026-03/2026-03-17-p1-5-closeout.md`
  - `P1-3` externalStore 直接写 txn draft primitive
    历史项；`large-batch-only` 继续试探后仍判失败，见 `docs/perf/archive/2026-03/2026-03-17-p1-3-large-batch-only-discarded.md`
  - `R-2` 仅在新 SLA 成立时讨论
- Reopen conditions:
  1. 当前母线在依赖齐全的 clean/comparable 环境里重新出现新的 real probe failure
  2. 出现新的可比 targeted 证据，且现有 `docs/perf` 已不能把它归为 measurement drift / environment failure
  3. 用户明确引入新的产品级 SLA，要求把更高层 admission / policy 税纳入正式预算

## 补充说明

这次继续操作的重点是把母线从 cherry-pick 冲突中恢复，并把已有 accepted/docs-only 结论回收到可检索状态。

已完成的回收包括：

- `rowId gate` accepted 代码与文档
- `preload-plan` 的 docs-only 失败 note
- `op-snapshot` 未收口实验的 docs-only pending note

因此当前最正确的动作是停在“母线干净 + 事实源完整”，而不是在没有新证据时继续开新线。
