# Tasks: 088 Async Action Coordinator

**Input**: `specs/088-async-action-coordinator/spec.md`, `specs/088-async-action-coordinator/plan.md`  
**Prerequisites**: 087 总控已创建（`specs/087-async-coordination-roadmap/`）  
**Tests**: 本特性触及 Runtime/React/Devtools 关键链路，测试与 perf evidence 视为必需。

## Phase 1: Setup（术语与文档入口）

- [ ] T001 固化“Async Action”心智模型（≤5 关键词 + 成本模型 + 优化梯子）到用户文档入口 `apps/docs/content/docs/guide/advanced/async-actions.md`（新建或落点调整）
- [ ] T002 更新 runtime SSoT：补齐 Async Action 的对外契约文档 `docs/ssot/runtime/logix-core/api/*`（按实际落点选择）
- [ ] T003 在 087 registry 中确认依赖与状态（保持 json 为 SSoT）`specs/087-async-coordination-roadmap/spec-registry.json`

---

## Phase 2: Foundational（核心协议与稳定标识）

- [ ] T010 定义 ActionRun 的最小数据模型（pending/settle + stable ids + 可取消语义）`packages/logix-core/src/Action.ts`
- [ ] T011 [P] 定义 Slim 诊断事件模型（JsonValue），并明确 downgrade 规则 `packages/logix-core/src/internal/runtime/core/ActionRuntime.events.ts`
- [ ] T012 将 ActionRun 与稳定锚点贯穿（instance/txn/op/link）并固化生成点 `packages/logix-core/src/internal/runtime/core/ActionRuntime.ts`
- [ ] T013 将 ActionRun 接入 Runtime/ModuleRuntime：确保 pending 与回写分段且遵守事务边界 `packages/logix-core/src/internal/runtime/core/ModuleRuntime.*`（按实际落点拆分）

---

## Phase 3: User Story 1（P1）业务触发与观测（MVP）

**Goal**: 业务只声明 action，即可得到 pending→settle 的可观测状态与回写。

**Independent Test**: 最小 demo：一次按钮触发 async IO + 回写，不写手工 loading。

- [ ] T020 [US1] 提供最小触发 API（运行 action + 返回可观测句柄/状态）`packages/logix-core/src/Action.ts`
- [ ] T021 [US1] 支持覆盖/取消策略（后续 run 覆盖旧 run）并确保旧 run 最终 settle `packages/logix-core/src/internal/runtime/core/ActionRuntime.ts`
- [ ] T022 [US1] 单测：success/failure/cancel 三路径的状态转移与稳定标识一致性 `packages/logix-core/test/internal/Runtime/ActionRuntime.test.ts`（新建）

---

## Phase 4: User Story 2（P2）Devtools 可解释链路

**Goal**: action run 的因果链可解释、可聚合、可回放（Slim/可序列化）。

**Independent Test**: 对同一输入序列，Devtools 事件能串联触发源→pending→txn→settle。

- [ ] T030 [US2] 将 action 事件写入 Debug/Devtools sink（遵守 slim/jsonvalue）`packages/logix-core/src/internal/runtime/core/DebugSink.ts`
- [ ] T031 [US2] Devtools UI：新增 action timeline/徽标入口（最小可用）`packages/logix-devtools-react/src/internal/ui/*`
- [ ] T032 [US2] 测试：诊断事件 schema/序列化校验（off 下不产出；on 下可解释）`packages/logix-core/test/internal/Observability/ActionTrace.Schema.test.ts`（新建）

---

## Phase 5: User Story 3（P3）React/Design System 接入点

**Goal**: 组件库可用 Action Props 接入；业务不再传 `isLoading`。

**Independent Test**: 一个按钮组件只接 action，pending 时禁用/显示忙碌。

- [ ] T040 [P] [US3] 新增 React hooks：触发 action + 订阅 pending/settle（Viewer 模式，无数据胶水）`packages/logix-react/src/internal/hooks/useAction.ts`（新建）
- [ ] T041 [US3] 集成到 RuntimeProvider（遵守 suspend/defer 策略；必要时提供 preload）`packages/logix-react/src/internal/provider/*`
- [ ] T042 [US3] React 测试：并发触发/取消/覆盖时不出现 tearing（同一 commit 读到一致快照）`packages/logix-react/test/*`（按实际落点）

---

## Phase 6: Perf Evidence（强制门禁）

- [ ] T050 新增至少 1 条 Node workload（action pending/settle + minimal diagnostics off/on 对照）并接入 `$logix-perf-evidence` `specs/088-async-action-coordinator/perf/*`
- [ ] T051 新增至少 1 条 Browser workload（action trigger + notify +（可选）render）并接入 `$logix-perf-evidence` `specs/088-async-action-coordinator/perf/*`
- [ ] T052 产出 before/after/diff（同 envId/profile/matrixHash）并回写结论到 `specs/088-async-action-coordinator/plan.md`
