# 2026-03-14 · 当前有效结论

本页只保留当前阶段仍然有效、可直接驱动后续行动的结论。

目标：

- 统一覆盖已经被后续证据推翻或收口的旧判断
- 让后续继续读 perf 结论时，不需要在多篇 dated 文档里来回跳

## 当前有效结论

### 1. current-head 没有默认 runtime blocker

证据：

- `docs/perf/2026-03-14-c7-current-head-reprobe-clear.md`
- `docs/perf/06-current-head-triage.md`

结论：

- `probe_next_blocker --json` 继续返回 `clear`
- 默认不再开新的 perf worktree

### 2. `externalStore.ingest.tickNotify` 已收口

证据：

- `docs/perf/2026-03-14-u1-tickscheduler-start-immediately.md`

结论：

- `p95<=3ms` 已打穿到 `watchers=512`
- soak 下 `full/off<=1.25` 也已回到门内
- 这条线不再是默认 blocker

### 3. `react.bootResolve.sync` 的旧“小固定税”结论已失效

证据：

- `docs/perf/2026-03-14-c6-bootresolve-observer-ready.md`

结论：

- 旧 suite 的主要税点是 `requestAnimationFrame` 轮询地板
- 切到 `MutationObserver` 后，`sync/suspend` 都回到 `~1ms` 级
- 因此旧的 `bootResolve.sync` runtime 小税不再成立

### 4. `react.bootResolve.sync` 已明确排除的切口

证据：

- `docs/perf/2026-03-13-c2-bootresolve-sync-config-reload-failed.md`
- `docs/perf/2026-03-14-c3-bootresolve-readsync-scope-fastpath-failed.md`
- `docs/perf/2026-03-14-c5-provider-gating-idle-binding-failed.md`

结论：

- `config reload skip` 不是正确切口
- `readSync scope-make fastpath` 不是正确切口
- `provider.gating idle binding fastpath` 也不是正确切口

### 5. 当前只剩条件性架构候选

证据：

- `docs/perf/07-optimization-backlog-and-routing.md`
- `docs/perf/09-worktree-open-decision-template.md`

结论：

- 当前只保留 `R-2` 作为 watchlist
- 只有在以下条件成立时才允许继续开新的 perf 实施线：
  1. 新的 real probe failure
  2. 新的 clean/comparable native-anchor 证据
  3. 新的产品级 SLA

## 已被覆盖的旧判断

以下旧判断不应再直接拿来驱动行动：

- `externalStore.ingest.tickNotify` 仍是共同未收口绝对预算债
- `react.bootResolve.sync` 存在稳定小固定税
- `provider.gating` 是当前唯一值得继续切的已确认 runtime 税点

这些说法都已被 `U-1 / C-6 / C-7` 或后续失败试探覆盖。

## 当前默认动作

- 不开新的 perf worktree
- 不继续盲切 runtime
- 若只是维护 current-head 结论，只做 docs/evidence-only 收口
