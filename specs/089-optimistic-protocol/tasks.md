# Tasks: 089 Optimistic Protocol

**Input**: `specs/089-optimistic-protocol/spec.md`, `specs/089-optimistic-protocol/plan.md`  
**Prerequisites**: `specs/088-async-action-coordinator/`（协议与稳定标识）  
**Tests**: 触及事务写入与订阅传播，测试与 perf evidence 视为必需。

## Phase 1: Setup（文档与契约入口）

- [ ] T001 补齐用户文档：optimistic 的心智模型（≤5 关键词 + 何时用/何时不用 + 回滚语义）`apps/docs/content/docs/guide/advanced/optimistic.md`
- [ ] T002 更新 runtime SSoT：optimistic 协议与 ActionRun 的关系 `docs/ssot/runtime/logix-core/*`

---

## Phase 2: Foundational（协议与 token 有界）

- [ ] T010 定义 optimistic 的最小协议类型（optimisticId/apply/confirm/rollback + 原因分类）`packages/logix-core/src/Optimistic.ts`（新建或并入现有 public submodule）
- [ ] T011 定义 token 存活/清理/上界策略（避免无限堆积）`packages/logix-core/src/internal/runtime/core/OptimisticRuntime.ts`（新建）
- [ ] T012 与 088 ActionRuntime 合流：optimistic 绑定 ActionRun（继承取消/覆盖语义）`packages/logix-core/src/internal/runtime/core/ActionRuntime.ts`

---

## Phase 3: User Story 1（P1）apply/confirm/rollback（MVP）

**Goal**: optimistic 在 success/failure/cancel 三路径均可收敛且可回滚。

**Independent Test**: 最小示例中：apply 立即可见；最终 confirm/rollback 后一致。

- [ ] T020 [US1] 实现 optimistic apply：同步事务内写入并记录 token `packages/logix-core/src/internal/runtime/core/OptimisticRuntime.ts`
- [ ] T021 [US1] 实现 confirm：成功后清理/合并 token，最终语义等价于非 optimistic `packages/logix-core/src/internal/runtime/core/OptimisticRuntime.ts`
- [ ] T022 [US1] 实现 rollback：失败/取消/覆盖时撤销变更并恢复一致 `packages/logix-core/src/internal/runtime/core/OptimisticRuntime.ts`
- [ ] T023 [US1] 单测：success/failure/cancel 三路径的有限步收敛与一致性 `packages/logix-core/test/internal/Runtime/OptimisticRuntime.test.ts`（新建）

---

## Phase 4: User Story 2（P2）可解释事件链路

**Goal**: Devtools 能解释 apply/confirm/rollback 与原因分类，并关联 action/txn。

**Independent Test**: 同一输入在 confirm 与 rollback 下都有可解释链路。

- [ ] T030 [US2] 定义并写入 Slim 诊断事件（JsonValue）`packages/logix-core/src/internal/runtime/core/DebugSink.ts`
- [ ] T031 [US2] Devtools UI：展示 optimistic markers（绑定 action run）`packages/logix-devtools-react/src/internal/ui/*`
- [ ] T032 [US2] 测试：事件序列化校验与 off/ on 行为差异 `packages/logix-core/test/internal/Observability/OptimisticTrace.Schema.test.ts`（新建）

---

## Phase 5: User Story 3（P3）合并/覆盖/幂等

**Goal**: 高频输入下 token 数量有界，且最终一致可预测。

**Independent Test**: 连续触发 N 次 optimistic，系统按策略 coalesce/override，最终一致。

- [ ] T040 [US3] 定义默认合并/覆盖策略（最小可用，保守）`packages/logix-core/src/internal/runtime/core/OptimisticRuntime.ts`
- [ ] T041 [US3] 单测：乱序返回/重试/叠加覆盖的可预测性 `packages/logix-core/test/internal/Runtime/OptimisticRuntime.Coalesce.test.ts`（新建）

---

## Phase 6: Perf Evidence（强制门禁）

- [ ] T050 新增 Node workload：optimistic apply/rollback 在高频输入下的 txn commit/alloc 对照（off/on）`specs/089-optimistic-protocol/perf/*`
- [ ] T051 新增 Browser workload：optimistic 对 notify/render 的影响对照 `specs/089-optimistic-protocol/perf/*`
- [ ] T052 产出 before/after/diff 并回写结论到 `specs/089-optimistic-protocol/plan.md`
