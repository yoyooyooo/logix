# 2026-03-06 · S-1：externalStore broad residual 五轮复核

本刀不是继续优化 externalStore runtime，而是验证 current-head broad matrix 里 `watchers=256` 的 `full/off<=1.25` 失守到底是不是稳定问题。

## 结论

- 结论：不是稳定复现的问题。
- 在独立 worktree 内连续跑 5 轮 quick audit，`externalStore.ingest.tickNotify` 的 `full/off<=1.25` 全部稳定通过到 `watchers=512`。
- 因此 current-head broad matrix 中那一个 `watchers=256` 失守，应降级为 residual / broad-matrix 噪声，而不是继续作为 runtime 主线。

## 证据

五轮 audit：
- `specs/103-effect-v4-forward-cutover/perf/s2.audit.external-store.current.quick.r1.json`
- `specs/103-effect-v4-forward-cutover/perf/s2.audit.external-store.current.quick.r2.json`
- `specs/103-effect-v4-forward-cutover/perf/s2.audit.external-store.current.quick.r3.json`
- `specs/103-effect-v4-forward-cutover/perf/s2.audit.external-store.current.quick.r4.json`
- `specs/103-effect-v4-forward-cutover/perf/s2.audit.external-store.current.quick.r5.json`

关键观察：
- 每轮都通过：`p95<=3.00ms {off/full}` 到 `watchers=512`
- 每轮都通过：`full/off<=1.25` 到 `watchers=512`
- 其中 `watchers=256` 的 `off/full` p95 基本都在 `1.0~1.2ms`，没有出现 broad current-head 那种稳定超线

## 影响

1. `externalStore` 不再是 current-head 最该继续砍的 runtime 主线。
2. 后续若再看到 broad matrix 单点失守，应优先走复核，不应立即继续改热路径。
3. `docs/perf/02-externalstore-bottleneck-map.md` 仍保留作为历史瓶颈地图，但它描述的是“曾经的 P1 主阻塞”，不代表 current-head 仍以它为主线。

## 后续

- 这条副线到此收口，不继续改代码。
- 若未来再次稳定复现 broad residual，再另起一刀；届时仍应先复核，再决定是否动 `external-store.ts` 或 `ModuleRuntime.transaction.ts`。
