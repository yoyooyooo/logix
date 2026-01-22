# Tasks: 060 Txn Lanes（事务后续工作优先级调度 / 可解释调度）

**Input**: Design documents from `specs/060-react-priority-scheduling/`  
**Prerequisites**: `specs/060-react-priority-scheduling/plan.md`, `specs/060-react-priority-scheduling/spec.md`  
**Tests**: 本特性触及 runtime 核心路径与调度语义，测试与 perf evidence 视为必需（除非在任务中显式写明理由）。

## Phase 1: Setup（规格与落点对齐）

- [x] T001 固化对外心智模型与关键词（≤5）到用户文档草稿 `apps/docs/content/docs/guide/advanced/txn-lanes.md`
- [x] T002 固化 LanePolicy/LaneEvidence 契约检查点：引用 `specs/060-react-priority-scheduling/contracts/schemas/*.json` 到实现验收清单（`specs/060-react-priority-scheduling/quickstart.md`）

---

## Phase 2: Foundational（lane-aware queue + policy 配置面）

- [x] T003 设计并实现 TxnQueue 的 lane-aware 接口（保持事务不可中断）`packages/logix-core/src/internal/runtime/core/ModuleRuntime.txnQueue.ts`
- [x] T004 [P] 增加 TxnLanePolicy 的 runtime 配置与 overrides（runtime_default / runtime_module / provider / instance）`packages/logix-core/src/internal/runtime/core/env.ts`
- [x] T005 [P] 增加 TxnLanePolicy 的配置校验（含 overridesByModuleId）`packages/logix-core/src/internal/runtime/core/configValidation.ts`
- [x] T006 解析并裁决 TxnLanePolicy 的生效值与 configScope（参考 traitConvergeConfig 的 scope 规则）`packages/logix-core/src/internal/runtime/core/ModuleRuntime.txnLanePolicy.ts`
- [x] T007 将 TxnLanePolicy 接入 ModuleRuntime 装配期（为后续 follow-up work 调度提供 resolver）`packages/logix-core/src/internal/runtime/core/ModuleRuntime.ts`

---

## Phase 3: User Story 1（P1）关键交互优先、backlog 不堵塞（MVP）

**Goal**: backlog 存在时 urgent 仍优先完成，并获得可证据化的 p95 改善。

**Independent Test**: 构造“先触发 non-urgent backlog，再触发 urgent dispatch”的场景，验证 urgent 不被队列拖尾；停止输入后 backlog 在上界内追平。

- [x] T008 [US1] 将 043 的 deferred converge flush 入队标记为 non-urgent，并支持合并/取消中间态 `packages/logix-core/src/internal/runtime/core/ModuleRuntime.ts`
- [x] T009 [US1] 实现 non-urgent work loop：按 budget 分片执行，并在片间让路给 urgent `packages/logix-core/src/internal/runtime/core/ModuleRuntime.ts`
- [x] T009a [US1] 增加 microbench（work loop slicing 开销/粒度）：验证“让路”收益不被调度开销吞噬，并把结果落盘到 060 perf 目录（before/after/diff）`.codex/skills/logix-perf-evidence/package.json`、`.codex/skills/logix-perf-evidence/scripts/060-react-priority-scheduling.txn-lanes-workloop.ts`、`specs/060-react-priority-scheduling/perf/*`
- [x] T010 [US1] 为 non-urgent work loop 增加饥饿保护（maxLag 超界触发可解释升档/强制追平）`packages/logix-core/src/internal/runtime/core/ModuleRuntime.ts`
- [x] T011 [US1] 单测：验证 urgent 事务可优先于已排队的 non-urgent flush（且 non-urgent 不会永久饿死）`packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnQueue.Lanes.test.ts`
- [x] T012 [US1] 单测：验证 043 deferred flush 在 lanes 开启时不再堵塞后续 urgent dispatch `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.TimeSlicing.Lanes.test.ts`

---

## Phase 4: User Story 2（P2）可解释调度与证据

**Goal**: 能解释“为什么延后/为什么让路/是否合并取消/是否触发饥饿保护”。

**Independent Test**: 在同一输入序列下触发延后、合并、饥饿保护三种路径，验证输出 Slim 且可序列化（符合 schema）。

> Note：本阶段同时吸收 `specs/057-core-ng-static-deps-without-proxy/` 的 US2 交集：统一 “Txn Lanes + Read Lanes” 的证据字段、DebugSink 投影与 Devtools 汇总视图（避免两套 lane 口径/并行真相源）。

- [x] T013 [US2] 定义并输出 TxnLaneEvidence（Slim、可序列化、稳定锚点对齐）`packages/logix-core/src/internal/runtime/core/DebugSink.ts`
- [x] T014 [US2] 将 TxnLaneEvidence 关联到统一锚点链路（moduleId/instanceId/txnSeq/opSeq）并确保 `diagnostics=off` 近零成本 `packages/logix-core/src/internal/runtime/core/ModuleRuntime.operation.ts`
- [x] T015 [US2] 增加 schema 校验用例（LaneEvidence 必须通过 JSON schema；off 下不产出）`packages/logix-core/test/internal/Observability/TxnLaneEvidence.Schema.test.ts`
- [x] T016 [US2] 扩展 DebugSink：统一投影 TxnLaneEvidence + `trace:react-selector` 的车道字段（Slim、可序列化、与 txn 对齐）`packages/logix-core/src/internal/runtime/core/DebugSink.ts`
- [x] T017 [US2] 更新 react-render/selector 集成测试与 DebugObserver 测试：断言车道字段完整且可对齐 `packages/logix-react/test/RuntimeProvider/runtime-react-render-events.integration.test.tsx`、`packages/logix-core/test/Middleware/Middleware.DebugObserver.test.ts`
- [x] T018 [US2] Devtools UI：新增 lanes summary（Txn backlog + Selector lane 分布 + fallbackReason TopN），并补齐渲染测试 `packages/logix-devtools-react/src/internal/ui/overview/OverviewDetails.tsx`、`packages/logix-devtools-react/test/internal/EffectOpTimelineView.test.tsx`
- [x] T019 [US2] 更新内部解释文档（并发/批处理/低优先级）补充 lane-aware queue 与 work loop 心智模型 `docs/ssot/handbook/reading-room/impl-notes/08-concurrency-and-batching.md`

---

## Phase 5: User Story 3（P3）默认不变、快速回退与对照

**Goal**: 默认关闭无回归；运行期可强制关闭/强制全同步做止血与对照。

**Independent Test**: 同一用例在 off/on/forcedSync/forcedOff 下行为可预测，且证据可解释当前模式。

- [x] T020 [US3] 增加运行期覆盖开关（forcedSync/forcedOff）并明确优先级与 configScope `packages/logix-core/src/internal/runtime/core/env.ts`
- [x] T021 [US3] 单测：覆盖开关对行为与证据的影响（含切换时 backlog 归属与清理规则）`packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.TxnLanes.Overrides.test.ts`

---

## Phase 6: Perf Evidence & Browser Boundary（强制门禁）

- [x] T022 新增浏览器 perf boundary：urgent p95 + backlog 追平（off vs on）`packages/logix-react/test/browser/perf-boundaries/txn-lanes.test.tsx`
- [x] T023 产出 Node + Browser before/after/diff（隔离 worktree）并落盘到 `specs/060-react-priority-scheduling/perf/`（文件名遵循 plan.md 约定）
- [x] T023a core-ng trial 证据复跑：同一套 off/on 的 Node+Browser 证据在 core-ng 下再跑一轮（不得 skip suite；仍需 `matrixId+matrixHash` 可比），落盘到 `specs/060-react-priority-scheduling/perf/`（命名区分 `core-ng`）`specs/060-react-priority-scheduling/perf/*`

---

## Phase 7: Polish（用户文档与交付闭环）

- [x] T024 完成用户文档：什么时候用/怎么选/怎么验证/怎么回退（对齐证据字段与术语）；并明确区分“Logix 内部延后计算/通知”与“React 延后渲染（startTransition）”的关系与推荐组合；补齐 React 集成页的 lanes 入口/跳转 `apps/docs/content/docs/guide/advanced/txn-lanes.md`、`apps/docs/content/docs/guide/essentials/react-integration.md`
- [x] T025 更新 046 registry 状态与依赖（060 从 planned→draft/implementing→done）`specs/046-core-ng-roadmap/spec-registry.json`
- [x] T026 Quickstart 验证：按 `specs/060-react-priority-scheduling/quickstart.md` 跑通验收步骤并回写必要说明 `specs/060-react-priority-scheduling/quickstart.md`

---

## Phase 8: Modern Browser Enhancement（P2，渐进增强）

> 目标：仅在现代浏览器可用时利用额外信号提升吞吐/延迟折中；不作为核心依赖，不阻塞 P1 闭环。

- [x] T027 [P] 引入可注入的 `shouldYieldNonUrgent` 判定（默认纯时间预算；可选读取 `navigator.scheduling.isInputPending`），并确保保留硬上界（定期让出以避免饿死渲染）`packages/logix-core/src/internal/runtime/core/ModuleRuntime.ts`（或抽到 `packages/logix-core/src/internal/runtime/core/ModuleRuntime.txnLanes.shouldYield.ts`）
- [x] T028 [P] 证据字段补齐：在 diagnostics=light/sampled/full 的 `TxnLaneEvidence` 里记录“本次切片让路判定来源/原因”（例如 `reason=input_pending` / `reason=budget_exceeded` / `reason=forced_frame_yield`），方便在 Devtools 中解释“为什么此刻让路/为什么没让路”`packages/logix-core/src/internal/runtime/core/DebugSink.ts`、`specs/060-react-priority-scheduling/contracts/schemas/txn-lane-evidence.schema.json`
- [x] T029 [P] Browser perf boundary 增加对照维度：同一 workload 下比较 `shouldYieldNonUrgent=baseline` vs `inputPending`（重点看 backlog 追平速度与 urgent p95 是否回归），并将结果落盘到 060 perf 目录 `packages/logix-react/test/browser/perf-boundaries/txn-lanes.test.tsx`、`specs/060-react-priority-scheduling/perf/*`
