# Tasks: 090 Suspense Resource/Query

**Input**: `specs/090-suspense-resource-query/spec.md`, `specs/090-suspense-resource-query/plan.md`  
**Prerequisites**: `specs/088-async-action-coordinator/`（action 链路与稳定标识）  
**Tests**: 涉及 IO/缓存/React 关键路径，测试与 perf evidence 视为必需。

## Phase 1: Setup（文档与术语）

- [ ] T001 补齐用户文档：Resource/Query + Suspense 的心智模型（≤5 关键词 + preload/失效/取消 + 优化梯子）`apps/docs/content/docs/guide/advanced/resource-and-suspense.md`
- [ ] T002 更新 `@logixjs/query` 的 public API 文档入口（如存在）`packages/logix-query/README.md`

---

## Phase 2: Foundational（Resource 协议：key/生命周期/去重）

- [ ] T010 定义 ResourceKey 与生命周期状态机（start/resolve/reject/cancel/invalidate）`packages/logix-query/src/Resource.ts`（新建/扩展）
- [ ] T011 实现去重：同 key 并发只发起一次实际请求，结果共享 `packages/logix-query/src/Resource.ts`
- [ ] T012 实现取消与乱序防护：取消后旧结果不得污染新状态 `packages/logix-query/src/Resource.ts`
- [ ] T013 定义缓存与失效协议（key/标签；可回收与上界）`packages/logix-query/src/Cache.ts`（新建/扩展）

---

## Phase 3: User Story 1（P1）preload + fast/slow fallback 闭环

**Goal**: preload 协同使快网无 fallback；慢网有稳定 fallback。

**Independent Test**: 同一示例在快/慢两种延迟下表现符合 spec（自动化测试可断言）。

- [ ] T020 [US1] 提供 preload API（入口/路由可调用）`packages/logix-query/src/Resource.ts`
- [ ] T021 [US1] React 适配：提供 suspend + degrade 两种消费模式 `packages/logix-react/src/internal/hooks/useResource.ts`（新建）
- [ ] T022 [US1] React 测试：快/慢网下 fallback 行为不闪烁 `packages/logix-react/test/*`（按实际落点）

---

## Phase 4: User Story 2（P2）失效刷新与可预测裁决

**Goal**: 失效/刷新/重试语义可预测，避免请求风暴。

**Independent Test**: 同一 key 失效后按策略刷新；重复失效可 coalesce。

- [ ] T030 [US2] 实现 invalidate（按 key/标签）与刷新策略 `packages/logix-query/src/Resource.ts`
- [ ] T031 [US2] 实现 retry（仅对业务错误；defect 走 defect 语义）`packages/logix-query/src/Resource.ts`
- [ ] T032 [US2] 单测：去重/取消/失效/重试的组合行为 `packages/logix-query/test/Resource.test.ts`（新建/扩展）

---

## Phase 5: User Story 3（P3）可解释事件链路（可选但推荐）

**Goal**: Devtools 能解释资源生命周期与裁决点。

**Independent Test**: resolve/reject/cancel/invalidate 都能生成 Slim 事件并可序列化。

- [ ] T040 [US3] 定义 Slim 资源事件并写入 Debug/Devtools sink（off 近零成本）`packages/logix-core/src/internal/runtime/core/DebugSink.ts`（或 query 内部的可注入 observer）
- [ ] T041 [US3] Devtools UI：资源生命周期视图入口（可选最小可用）`packages/logix-devtools-react/src/internal/ui/*`

---

## Phase 6: Perf Evidence（强制门禁）

- [ ] T050 新增 Node workload：多消费者去重/取消/失效的吞吐与分配对照 `specs/090-suspense-resource-query/perf/*`
- [ ] T051 新增 Browser workload：preload vs no-preload 的 fallback/notify/render 对照 `specs/090-suspense-resource-query/perf/*`
- [ ] T052 产出 before/after/diff 并回写结论到 `specs/090-suspense-resource-query/plan.md`
