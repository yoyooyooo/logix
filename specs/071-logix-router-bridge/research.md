# Research: Logix Router Bridge（关键裁决与备选对比）

> 本文回答“怎么做/为什么这么做”，并把关键取舍固定下来，避免实现期漂移。

## Decision 1：Router 以“能力包（Tag + Layer）”而不是“必选模块”交付

**Decision**：新增 `@logixjs/router`，以 `Context.Tag` 作为 Router Contract，对外通过 `Router.layer(service)` 注入实现；路由库集成通过 `Router.ReactRouter.make(...)` / `Router.TanStackRouter.make(...)` 等 builder 产出 `service`。

**Rationale**：

- 对齐 `@logixjs/query` 的注入模型：能力包只以 Layer 注入，不扩展 `$`，避免 God Object。
- 满足 `NFR-001`：未消费时不产生常驻后台工作；能力包可以做到“惰性订阅”（第一次 read/changes/navigate 才 acquire router listener）。
- 满足 `FR-006/NFR-004`：Tag 天然是 scope-bound 的；多 runtime/多 router 不串线。

**Alternatives considered**：

- 方案 A：Router 作为一个固定 Module（state=RouteSnapshot）
  - 优点：路由快照变更可以自然走 `state:update`/selector 体系。
  - 缺点：默认需要常驻监听以保持 state 更新，难满足“未消费时零成本”；并且对“只想读/导航”的场景引入额外 wiring（imports / module life cycle）。
- 方案 B：把 Router 直接挂到 `$`（扩展 Bound API）
  - 缺点：违反“$ 保持精简”的仓库约束；能力包数量增长会导致 `$` 无限膨胀，影响 DX 与可维护性。

## Decision 2：诊断链路只强约束“由 logic 发起的 navigate”

**Decision**：对 `Router.navigate` 做事件化：当业务 logic 发起导航时，诊断输出必须能解释因果链（SC-003）。对外部触发（浏览器 back/手输 URL）只要求“快照一致 + 可订阅”，不强制归因到某个 logic。

**Rationale**：

- SC-003 明确只要求“由业务 logic 发起的 Navigation Intent”可解释；把所有外部变化都强行归因会引入大量不可靠的启发式推断。
- 事件化落点选择 TraitLifecycle：内核可从 Bound API 提取 `moduleId/instanceId`，满足“谁发起”诉求；领域包保持最小依赖面。
- 诊断的“after snapshot”不可在 navigate 边界同步强求：采用 `navSeq + phase(start/settled)` 的两阶段 trace，after 由订阅异步采样，不阻塞业务逻辑。

**Alternatives considered**：

- 方案 A：所有 route change 都进入 ReplayLog，并与 txn/state:update 强关联
  - 缺点：需要更深的内核改造（把 router change 编排进事务/commit meta），超出本特性的 “Router Bridge” 范围。
- 方案 B：仅用 `Debug.record(trace:router:*)`，不保证 moduleId/instanceId
  - 缺点：无法稳定满足“谁发起”。

## Decision 3：RouteSnapshot 的最小字段与 params 语义

**Decision**：`RouteSnapshot` 的最小字段为：

- `pathname/search/hash`（字符串）
- `params: Record<string, string>`（键缺失表示不存在；不做隐式类型转换）

额外字段（如 routeId/matches）允许由具体实现扩展，但必须保持 Slim & 可序列化。

**Rationale**：对齐 `FR-001/FR-007`，同时不绑定任一路由库的数据结构。

**补充：一致快照语义（避免 pending 中间态外泄）**：

- React Router：对外快照应以 `router.state.location` + `router.state.matches` 为准；pending 目标在 `router.state.navigation.location`（不进入 `RouteSnapshot`）。
- TanStack Router：对外快照应以 `router.state.resolvedLocation` + `router.state.matches` 为准；`router.state.location` 可能尚未 resolved。

## Router API 对比与映射（实现用）

> 原始证据见 `specs/071-logix-router-bridge/notes/sessions/2026-01-03.md`（含上游源码/文档链接）。

### React Router（Data Router）

- Snapshot：`router.state.location`（已提交）+ `router.state.matches`（params 聚合）；忽略 `router.state.navigation.location`（pending）。
- Subscribe：`router.subscribe((state) => ...)`。
- Navigate：`push/replace` 映射为 `router.navigate(to, { replace })`；`back` 映射为 `router.navigate(-1)`。

### TanStack Router

- Snapshot：`router.state.resolvedLocation` + `router.state.matches`；避免直接使用 `router.state.location`（未 resolved）。
- Subscribe：`router.subscribe('onResolved', ...)`（按 resolved 变更推送）。
- Navigate：`push/replace` 映射为 `router.navigate({ to, replace })`；`back` 映射为 `router.history.back()`（不可用时结构化错误）。

### Query Params（DX）

- Contract 仍保持 `RouteSnapshot.search` 为 raw string；官方提供 `Router.SearchParams` helpers（支持 `getAll`），避免业务侧重复解析样板。

## Decision 4：测试夹具先交付 Memory 实现

**Decision**：Phase 1 优先交付 `Router.Memory`（或等价命名）的纯内存实现，用于：

- 驱动 route snapshot change；
- 捕获并断言导航意图；
- 在单元测试中覆盖 FR/SC（尤其 SC-004）。
- 提供最小 history stack（push/replace/back），以覆盖 `back()` 的语义测试。

**Rationale**：避免把“真实浏览器 history”作为测试依赖；同时为后续引擎适配器提供对照基准。

## Next Questions（留给实现阶段的裁决点）

- `Router.navigate` 的返回语义：已裁决为 `void`（对齐原路由库的 “navigate returns Promise<void>” 心智）；结果通过 `changes/getSnapshot` 观测，diagnostics on 时以 start/settled 两阶段采集 before/after 快照用于解释链路。
- 惰性订阅策略：已裁决为 **仅在消费 `changes` 时启动监听**；`getSnapshot` 为纯读取，不引入常驻后台工作（对齐 NFR-001）。
- diagnostics 事件载荷的上限：哪些字段必须进入事件，哪些应只留 id 引用（对齐 “Slim & 可序列化”）。
