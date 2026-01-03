# Questions (Resolved / Pending)

## 1) Snapshot 语义：以哪个状态作为“对外一致快照”？

- React Router：`router.state.location`（已提交） vs `router.state.navigation.location`（pending）。
- TanStack Router：`router.state.location` vs `router.state.resolvedLocation`（resolved）。
- 已裁决：`Router.Tag.getSnapshot/changes` 对外只暴露“已解析/已提交”的一致快照；不提供 pending 观察能力（pending 中间态不以 `RouteSnapshot` 对外泄露）。

## 2) `matches`/`routeId` 是否进入统一 `RouteSnapshot`？

- React Router：`matches` 里可能包含 `route.id`/`params`/`pathname` 等信息（待落证据）。
- TanStack Router：`state.matches[]` 明确有 `routeId`、`params`、`pathname` 等（已落证据）。
- 已裁决：`RouteSnapshot` 最小字段只要求 `pathname/search/hash + params`；`routeId/matches` 允许可选扩展（用于调试/解释/高级用法），但必须 Slim 且可序列化，且不作为跨引擎等价的硬承诺。

## 3) `navigate` 的参数形状（intent）

- 已裁决：对外只暴露最小可替换集 `push/replace/back`；其他能力按 forward-only 扩展（不做兼容层/弃用期）。

## 已裁决（本轮）

- 返回值：`navigate/controller.*` 返回 `Effect<void, RouterError>`（对齐路由库的 `Promise<void>` 心智）；结果通过 `changes/getSnapshot` 观测，diagnostics on 时由实现采集 before/after 快照用于解释链路。
