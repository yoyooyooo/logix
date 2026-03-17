# 2026-03-16 · v4-perf 下一刀识别

## 前提

本轮识别只基于 current-head 事实，不再回头追旧 broad matrix。

当前证据链：

- `docs/perf/archive/2026-03/2026-03-16-v4-perf-post-recovery-reprobe-clear.md`
- `docs/perf/archive/2026-03/2026-03-16-v4-perf-post-recovery-open-decision.md`
- `docs/perf/2026-03-15-v4-perf-next-cut-candidates.md`
- `docs/perf/archive/2026-03/2026-03-16-p1-oncommit-scheduler-minimal-envelope.md`
- `docs/perf/archive/2026-03/2026-03-16-d3-no-trackby-rowid-gate.md`

## 后续更新（2026-03-17）

- `P1-5` 已按 `accepted_with_evidence` 收口，见 `docs/perf/archive/2026-03/2026-03-17-p1-5-closeout.md`
- `P1-3` 已按 `discarded_or_pending` 收口，见 `docs/perf/archive/2026-03/2026-03-17-p1-3-large-batch-only-discarded.md`
- 若后续只允许在 `P1-4 / P1-6 / P1-7` 中继续选线，统一以 `docs/perf/archive/2026-03/2026-03-17-v4-perf-next-cut-identification-p1-4-vs-p1-6-vs-p1-7.md` 为准

## 当前瓶颈排行

### 1. 默认 runtime 主线：无

当前 `probe_next_blocker --json` 继续返回：

- `status: "clear"`
- `blocker: null`
- `pending: []`

这说明 current-head 仍然没有新的默认 runtime 第一失败项。

### 2. 条件性候选第一位：更深的 `P1-5` core-side retain/release 下沉

本条识别结论已完成其历史使命。

后续更新：

1. `P1-5` 已沿着这条路径完成多刀 accepted 收口
2. 当前统一结论见 `docs/perf/archive/2026-03/2026-03-17-p1-5-closeout.md`
3. 默认不再把 `P1-5` 当 current-head 的条件性下一刀，除非出现新的 retained heap blocker

### 3. 条件性候选第二位：`P1-3` externalStore 直接写 txn draft primitive

本条识别结论也已过时。

后续更新：

1. `P1-3` 在 `large-batch-only` 切口上继续试过一轮
2. targeted perf 虽转正，但 externalStore / module-as-source 邻近回归失败
3. 当前统一结论见 `docs/perf/archive/2026-03/2026-03-17-p1-3-large-batch-only-discarded.md`
4. 默认不再把 `P1-3` 当 current-head 的条件性下一刀

### 4. 条件性候选第三位：`R-2`

这不是默认下一刀。

只有在新的产品级 SLA 出现时，才值得把它从 watchlist 提升为正式候选。

## 我认为是伪影 / 门禁噪声的项

### 1. `externalStore.ingest.tickNotify` 的低档位相对预算抖动

real probe 继续整体 `passed`。

当前更像低量级样本波动，不构成新的 runtime blocker。

### 2. `rowId gate` 在 `rows=100` 的单次 `validate.p95` 尖峰

`300/1000 rows` 的主样本仍然是正收益，`ensureList=70 -> 0` 的非时间语义也继续成立。

这条点位当前只应视为 sub-ms 观察点，不应推翻 `accepted_with_evidence`。

### 3. `onCommit scheduler envelope` 的记录型 perf test

这条 test 当前只负责记录当前实现样本，不直接与 baseline 做自动断言。

它可用于解释趋势，但不应被误当成当前默认 blocker probe。

## 建议下一刀

默认建议：不开新的 perf worktree。

理由：

1. current-head 没有真实 blocker
2. 所有 source worktree 已清理回可交接状态
3. 继续开线会违背 `09-worktree-open-decision-template.md` 的默认裁决

如果未来必须继续，只给一个候选：

- 更深的 `P1-5` core-side retain/release 下沉

后续更新：

- 这条条件性建议已结束历史作用
- 当前受限候选集的统一排序，改看 `docs/perf/archive/2026-03/2026-03-17-v4-perf-next-cut-identification-p1-4-vs-p1-6-vs-p1-7.md`

前提仍然是：

1. 新的 real probe failure
2. 新的 clean/comparable targeted 证据
3. 或新的产品级 SLA

## 是否需要 API 变动

- 当前结论：`不需要`

更深的 `P1-5` 默认也先做内部实现刀，不需要先动表面 API。

只有当更深的 `P1-5` retain/release 语义确实逼到 public surface 时，才升级成 API 提案。
