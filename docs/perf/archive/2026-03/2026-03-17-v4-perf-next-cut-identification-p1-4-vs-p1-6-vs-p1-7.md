# 2026-03-17 · v4-perf 下一刀识别（二次收口：P1-4 / P1-6 / P1-7）

## 结论类型

- `docs/evidence-only`
- 当前不打开新的 perf worktree

## 前提

本轮只回答一个受限问题：

- 在 `P1-4 topic plane`
- `P1-6 React resolve engine 统一`
- `P1-7 Provider 单飞化 + cache identity 解耦`

这三条里，如果未来必须继续开一刀，哪条最值。

本轮继续采信的前提：

- current-head 仍然没有默认 runtime blocker
- `P1-5` 已按 `accepted_with_evidence` 收口，见 `docs/perf/archive/2026-03/2026-03-17-p1-5-closeout.md`
- `P1-3 large-batch-only` 已按 `discarded_or_pending` 收口，见 `docs/perf/archive/2026-03/2026-03-17-p1-3-large-batch-only-discarded.md`
- 主会话这次只做识别、路由与 docs/evidence-only 收口

## 当前瓶颈排行

### 1. 默认 runtime 主线：无

`probe_next_blocker --json` 的 current-head 口径仍然是 `clear`。

这次的三选一，只能视为 future-only watchlist 排序，不能视为“已经出现了新的默认 blocker”。

### 2. 条件性候选第一位：`P1-4 topic plane`

当前已被证实成立的子切口有两条：

1. `topic subscriber gate`
2. `topic fanout post-commit`

对应证据：

- `docs/perf/archive/2026-03/2026-03-15-p1-topic-subscriber-gate-evidence-refresh.md`
- `docs/perf/archive/2026-03/2026-03-15-p1-topic-fanout-post-commit.md`

当前已被证伪的最小切面：

- `topicId minimal cut`
- 见 `docs/perf/archive/2026-03/2026-03-16-p1-topic-id-minimal-cut-failed.md`
- `normal-path shared microtask flush`
- 见 `docs/perf/archive/2026-03/2026-03-17-p1-4-normal-notify-shared-microtask-flush.md`

因此当前对 `P1-4` 的判断是：

- “topic plane 方向还值”
- “这版最小 `topicId` 切法不值”

也就是说，`P1-4` 剩下的空间不在 `RuntimeStore` 内部再包一层 `topicId` 缓存，而在更完整的跨面收口：

- `RuntimeStore`
- `TickScheduler`
- `RuntimeExternalStore`

之间的统一 topic plane 与 runtime 级通知调度。

新增约束：

- `normal notify shared microtask flush` 这条更窄 retry 已失败
- 它只证明了 microtask count 可收敛，没有证明 wall-clock 正收益
- 这条 micro-slice 默认不再重开

### 3. 条件性候选第二位：`P1-6 React resolve engine 统一`

当前已被证实成立的子切口：

- `defer preload plan unification`
- 见 `docs/perf/archive/2026-03/2026-03-15-p1-6-defer-preload-plan-unification.md`

当前已被证伪的试探：

- `react defer preload unresolved-only`
- `neutral config singleflight`
- `boot-epoch config singleflight` 的 owner conflict

对应记录：

- `docs/perf/archive/2026-03/2026-03-15-v4-perf-wave1-status.md`
- `docs/perf/archive/2026-03/2026-03-15-r3-react-controlplane-neutral-config-singleflight-failed.md`
- `docs/perf/archive/2026-03/2026-03-17-p1-6-boot-config-owner-conflict.md`

这说明 `P1-6` 方向本身有价值，但当前剩余部分已经接近：

- 多状态机统一
- provider readiness/controlplane 重写
- 更高概率触发表面 API 或对外语义裁决

新增约束：

- `boot-epoch config singleflight` 这条更窄切口当前被 owner conflict 卡住
- 它既不能按 accepted 计入正式收益，也不应再按原题目直接重开
- 后续若继续回到 `P1-6`，先重命名问题，再重做 RED

在没有新的 hard evidence 前，它还没有压过 `P1-4`。

### 4. 条件性候选第三位：`P1-7 Provider 单飞化 + cache identity 解耦`

这条线已经收掉了当前最硬的一段收益：

- `react cache identity decouple`
- 见 `docs/perf/archive/2026-03/2026-03-15-r2-react-cache-identity-decouple.md`
- 以及 `docs/perf/archive/2026-03/2026-03-15-r2-react-cache-identity-config-churn-evidence.md`

剩余未收口部分主要是 Provider controlplane singleflight。

但这条最小切口当前已有失败结论：

- `docs/perf/archive/2026-03/2026-03-15-r3-react-controlplane-neutral-config-singleflight-failed.md`

因此 `P1-7` 当前更像“高价值子问题已经被回收，剩余切面暂时没有更硬证据”。

## 我认为是伪影 / 门禁噪声的项

### 1. 把这次三选一误读成“current-head 已出现新 blocker”

这不成立。

当前仍然是：

- `current-head = clear`
- `默认不开新的 perf worktree`

所以这轮排序只是在 future-only 候选池里收口默认优先级。

### 2. 把 `P1-4 topicId minimal cut` 的失败，扩张成“P1-4 整体不值”

这也不成立。

被证伪的是这版最小 `topicId` 缓存切法，证据直接指向：

- 多一层 `topicKey -> descriptor -> id` 的 JS Map 跳转常数税过大

它不足以否掉已经成立的：

- `topic subscriber gate`
- `topic fanout post-commit`

也不足以否掉更完整的 cross-plane topic 收口。

### 3. 把 `P1-7` 已经吃到的收益，再重复算作“下一刀剩余收益”

这也不成立。

`cache identity decouple` 已经是 `accepted_with_evidence`，当前应计入“已回收收益”，不应再作为剩余空间抬高 `P1-7` 排位。

## 建议下一刀（只给一个）

默认建议：

- 不开新的 perf worktree

如果未来 trigger 成立，并且这次必须只在 `P1-4 / P1-6 / P1-7` 中选一条，我建议：

- `P1-4 topic plane`

原因只有三条：

1. `P1-4` 已有两条 accepted 子切口，说明方向本身成立，剩余空间仍覆盖 core 与 react 的公共平面。
2. `P1-4` 的更窄 normal notify retry 虽已失败，但它只否掉一个 micro-slice，没有推翻更大的 cross-plane 收口空间。
3. `P1-6` 当前剩余部分更像大状态机统一，实施成本和 API 风险都更高，现有证据只够支撑较小的 preload-plan 收口。
4. `P1-7` 当前最硬的收益已经被回收，剩余 Provider singleflight 切口已有失败记录，继续排在 `P1-4` 前面缺证据。

## 是否需要 API 变动

- 当前结论：`不需要`

若未来按这个排序重开 `P1-4`，默认先以内部重构推进：

- `RuntimeStore`
- `TickScheduler`
- `RuntimeExternalStore`

不要再回到：

- `normal-path shared microtask flush`

只有在后续实现被证明必须把稳定 topic 锚点外露到 public surface 时，才升级成 API 提案。
