# Feature Specification: Suspense Resource/Query（默认异步：缓存/去重/预取/取消）

**Feature Branch**: `090-suspense-resource-query`  
**Created**: 2026-01-10  
**Status**: Draft  
**Input**: 补齐 Suspense 友好的资源/查询层：提供数据请求的缓存、去重、失效、预取、重试与取消语义，并将加载状态以统一方式暴露给 React（可挂起/可降级）；目标是让路由与入口默认异步，快网尽量无 loading、慢网呈现稳定且不闪烁的协调 fallback。

## Context

Async React 的“默认异步”需要一个基础事实：数据获取不是零散的 `useEffect(fetch)`，而应当由框架层提供可协调的资源模型（Resource/Query）：

- 快网：用户不应看到 loading 闪烁。
- 慢网：用户应看到稳定、可预测的 fallback（并且可解释）。
- 同一请求：必须去重、可取消、可复用缓存；否则会造成浪费与诊断噪音。

本仓已有 `@logixjs/query`（领域查询/请求层）与 Runtime/React 的订阅/优先级基础，但缺少一套“Suspense 友好”的资源语义与入口/路由 preload 的协同闭环。

本特性负责补齐这一层，并强制与 088 Async Action 协调面合流（资源请求也应挂在 action chain 上，方便诊断与取消）。

## Terminology

- **Resource**：可缓存、可去重、可取消的数据获取单元（由稳定 key 标识）。
- **Query**：面向业务语义的资源（通常是 Resource 的组合/投影），仍应能降解为 Resource key + 依赖关系。
- **Preload**：在 UI 渲染前（或更合适时机）启动资源请求，使快网尽量不触发 fallback。
- **Suspend / Degrade**：默认可挂起（Suspense），但需支持在某些模式下降级为非挂起（例如测试/诊断）。

## Assumptions

- 依赖 088：资源请求应能挂在 ActionRun 上，以获得取消/覆盖语义与稳定标识贯穿。
- 事务窗口禁 IO：真正的网络/IO 永远发生在事务外；事务内只写入“请求意图/状态”并提交。

## Clarifications

### Session 2026-01-10

- AUTO: Q: `resourceKey` 的稳定性要求与推荐形态？ → A: `resourceKey` MUST 为稳定字符串（可确定重建，禁止 random/time 默认）；推荐形态：`resource:<name>:<stableHash(args)>`（hash 必须稳定，避免直接 JSON.stringify 的非确定性）。
- AUTO: Q: Suspense 的默认策略：何时 suspend，何时 degrade？ → A: React 消费侧默认 `suspend`（配合 Suspense 边界）；同时必须提供显式 `degrade` 模式（不 throw promise，返回可观测 pending 状态），用于测试/诊断/特殊场景；两种模式共享同一 Resource 状态机与取消/去重语义。
- AUTO: Q: 缓存的上界与淘汰策略？ → A: cache MUST 有界且可配置；默认采用 LRU（按访问更新时间），默认 `maxEntries=200`（保守值，可按 workload 调整）；优先淘汰已 settle 且无订阅者的条目，避免内存泄露。
- AUTO: Q: 失效（invalidate）的默认语义？ → A: `invalidateKey`/`invalidateTag` 默认删除对应缓存条目；下一次读取触发重取（不默认做 SWR）；失效原因必须可解释（诊断事件）。
- AUTO: Q: 去重/取消/乱序如何裁决？ → A: 同一 `resourceKey` 请求天然去重并共享结果；取消采用引用计数：仅当无剩余消费者时才中止底层请求（优先 AbortController）；乱序返回必须用 generation guard 丢弃，禁止污染新状态。
- AUTO: Q: 资源请求如何与 ActionRun 合流？ → A: 资源请求可在诊断事件中关联到触发它的 action `linkId`（作为 initiator），但缓存事实源仍以 `resourceKey` 为准；跨 action 共享同一 key 时不得把“取消某 action”误当成“取消该 key 的所有消费者”。

### Session 2026-01-12

- Q: 在 SC-001 里，“快网不触发 fallback、慢网 fallback 不闪烁”的可测定义选哪一个？ → A: 写死测试档位 + 规则：`fast=50ms` MUST 不出现 fallback；`slow=400ms` MUST 出现 fallback；且 fallback 展示遵守 `delay=150ms`、`minDuration=300ms`（对齐 091 默认）。

## Out of Scope

- 业务领域的具体 API 设计（GraphQL/REST 等）；本 spec 聚焦资源语义与协调契约。
- Busy Indicator 的 UX 策略（由 091 负责），但本 spec 必须提供足够信号支持 busy 策略实现。

## User Scenarios & Testing _(mandatory)_

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.

  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->

### User Story 1 - 快网无 fallback，慢网有稳定反馈（Priority: P1）

作为业务开发者，我能用 Resource/Query 声明“我要什么数据”，并在 React 中消费；框架自动处理缓存/去重/预取，使快网尽量不出现 fallback，慢网出现稳定且可预测的 fallback。

**Why this priority**: 这是“默认异步”体验是否成立的关键；否则会回到“到处写 loading”的混乱期。

**Independent Test**: 在同一 UI 场景下，通过模拟快/慢两种网络延迟，验证：快网不出现 fallback；慢网出现 fallback 且不会闪烁。

**Acceptance Scenarios**:

1. **Given** 资源已被 preload 且网络足够快，**When** UI 渲染该资源依赖视图，**Then** 不触发 fallback（或在极短时间内不显示 busy）。
2. **Given** 网络较慢且资源未就绪，**When** UI 渲染该资源依赖视图，**Then** 进入 fallback，并在资源就绪后一次性过渡到最终视图（避免闪烁）。

---

### User Story 2 - 去重/取消/失效可预测（Priority: P2）

作为框架维护者，我能保证同一 Resource key 的请求天然去重、可取消、可失效刷新；高频重渲染或重复触发不会形成请求风暴。

**Why this priority**: 没有去重/取消，任何“默认异步”都会在复杂页面中变成性能灾难与诊断噪音。

**Independent Test**: 在一个组件树中多处消费同一资源，验证同一时刻仅发生一次请求；切换条件或取消时能中止旧请求；失效后能按策略刷新。

**Acceptance Scenarios**:

1. **Given** 多个消费者同时请求同一 key，**When** 它们并发挂起，**Then** 底层只发起一次实际请求，其结果被所有消费者共享。
2. **Given** 请求尚未完成，**When** 该请求被覆盖/取消（路由切换、条件改变），**Then** 旧请求被中止且不会在完成后污染新状态。

---

### User Story 3 - 可解释链路（资源生命周期 + action 关联）（Priority: P3）

作为开发/排障人员，我能在 Devtools 中看到资源请求的生命周期（start/resolve/reject/cancel/invalidate），并能关联到触发它的 action run 与稳定锚点。

**Why this priority**: 资源层一旦成为黑盒，后续排障会回到“靠猜”的阶段。

**Independent Test**: 对同一资源，触发 resolve/reject/cancel/invalidate 四类事件，Devtools 能以 Slim/可序列化事件链展示，并能关联到 action 链路 id。

**Acceptance Scenarios**:

1. **Given** 一个资源请求由某 action run 触发，**When** 查看诊断事件，**Then** 能关联 resourceKey 与 action 链路 id，并可 drill-down 到 instance/txn。

### Edge Cases

- 错误语义：业务错误 vs defect；是否支持 retry；错误如何在 Suspense 边界与非挂起模式下呈现。
- 缓存一致性：stale-while-revalidate、强制刷新、失效范围（按 key 前缀/标签）。
- 取消与乱序：旧请求完成后不得覆盖新请求结果；取消必须可解释。
- SSR/预渲染（如未来需要）：必须保证 server/client 初始快照一致（本 spec 不实现，但需定义最小契约边界）。

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: 系统 MUST 定义 Resource 的稳定标识（resourceKey）与生命周期（start/resolve/reject/cancel/invalidate），并保证同 key 请求去重与结果共享。
- **FR-002**: 系统 MUST 支持缓存与失效：可按 key/标签触发失效与刷新，并保证失效行为可预测、可解释。
- **FR-003**: 系统 MUST 支持 preload：入口/路由可提前启动关键资源，使快网尽量不触发 fallback。
- **FR-004**: 系统 MUST 支持 Suspense 挂起与降级模式：React 消费侧默认可挂起（Suspense）；在需要时（测试/诊断/特殊场景）可显式降级为非挂起（degrade）但仍有统一的 pending 表达与 busy 信号。
- **FR-005**: 系统 MUST 支持取消与乱序防护：取消后旧请求不得污染新状态；乱序返回必须按 key 与 run/token 裁决。
- **FR-006**: 系统 MUST 与 088 合流：资源请求应能绑定到 ActionRun（取消/覆盖/稳定标识），并能在诊断事件中体现关联关系。
- **FR-007**: 系统 MUST 输出 Slim、可序列化诊断事件，能解释资源生命周期与关键裁决（去重命中、取消原因、失效原因）。

### Non-Functional Requirements (Performance & Diagnosability)

- **NFR-001**: 本特性触及 IO/缓存/订阅/渲染关键路径，MUST 定义性能预算并产出可复现 perf evidence（Node + Browser），预算与证据落点写入 `specs/090-suspense-resource-query/plan.md`。
- **NFR-002**: `diagnostics=off` 下必须接近零成本：不得在每次读取/订阅上构造事件对象；缓存/索引必须有界且可回收。
- **NFR-003**: 诊断事件必须 Slim 且可序列化；必须能解释去重命中/取消/失效等关键裁决。
- **NFR-004**: 事务边界红线：资源 IO 不能发生在事务窗口内；事务内只允许写入请求状态并提交。
- **NFR-005**: 若引入新的对外心智模型（Resource/Suspense 默认异步），必须同步补齐用户文档与优化梯子，并与诊断字段对齐。

### Key Entities _(include if feature involves data)_

- **ResourceKey**：稳定标识（用于缓存/去重/诊断）。
- **ResourceState**：生命周期状态（idle/pending/success/failure/cancelled 等）。
- **CacheEntry**：缓存条目（必须有界且可回收）。
- **ResourceTrace (Slim)**：生命周期与裁决事件（可序列化）。

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 在同一 UI 场景中，快网（模拟 latency=`50ms`）条件下 MUST 不触发 fallback；慢网（模拟 latency=`400ms`）条件下 MUST 触发 fallback，且 fallback 展示遵守 `delay=150ms`、`minDuration=300ms` 的规则（对齐 091 默认），避免闪烁（自动化测试可断言）。
- **SC-002**: 多处消费同一 resourceKey 时，实际请求去重（同一时刻仅一次），取消/乱序不污染最终状态（自动化测试可断言）。
- **SC-003**: `diagnostics=off` 下 perf evidence 达标：资源层引入的缓存/去重/订阅逻辑对核心路径无显著回归（阈值在 plan.md 固化）；`diagnostics=on` 时事件 Slim 且 ring buffer 有界。
