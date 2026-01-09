# Tasks: 006-optimize-traits（Trait 事务内收敛“极致优化”）

**Input**: `specs/006-optimize-traits/spec.md`、`specs/006-optimize-traits/plan.md`  
**Prerequisites**: `spec.md`（required）、`plan.md`（required）  
**Tests**: 本特性主落点在 `packages/logix-core`，测试视为必选；涉及 Devtools 展示的改动需补充 `packages/logix-devtools-react` 的最小 UI/状态测试。

## Phase 1: Baseline（基准与指标口径固化）

- [ ] T001 [US1] 固化“真实复杂表单基准”为自动化回归用例：新增 `examples/logix-react/test/complex-trait-form.baseline.integration.test.ts`，用 `@logixjs/test` 跑 `ComplexTraitFormModule + ComplexTraitFormImpl` 的固定 action 序列，并断言：语义正确 + 每个 action 对应的 State 变更通知次数（`result.trace` 中 `_tag: "State"` 增量）≤ 1
- [ ] T002 [P] [US1] 新增“可调合成压力基准”生成器（规则规模 + 数据规模；10x=单次输入触发依赖边数≈10x）并可重复运行：`examples/logix-react/src/demos/*` 或 `packages/logix-core/test/*`（按现有基准组织方式择一）

**Checkpoint**: 能在同一版本上重复得到与 SC-001/SC-004/SC-007 对齐的指标读数，后续变更可做回归对比。

---

## Phase 2: Foundational（Trait 收敛引擎内核 + 静态校验）

- [ ] T003 [US1] 定义运行期 Rule IR（computed/link 进入收敛；source 不进入）与稳定执行顺序，并实现“depPath → rules[] / targetPath → rule”索引：`packages/logix-core/src/internal/state-trait/*`
- [ ] T004 [P] [US1] 实现静态校验：冲突写回（多 rule 写同一 targetPath）与结构性循环依赖检测（输出可读诊断）：`packages/logix-core/src/internal/state-trait/*`
- [ ] T005 [P] [US1] 实现收敛循环：脏集传播 + 等价跳过 + fixed point 停止条件；为每条规则计时并产出 Top3 成本摘要：`packages/logix-core/src/internal/state-trait/*`
- [ ] T006 [US1] 实现振荡/不收敛检测（窗口内重复写回阈值/指纹）并按“配置错误硬失败”输出诊断：`packages/logix-core/src/internal/state-trait/*`

**Checkpoint**: 纯函数/纯算法层面可在单测中证明：最小触发、确定性、冲突/循环可检测、收敛可停止。

---

## Phase 3: User Story 1（P1）- 一次 action = 一个 Operation Window = 0/1 次提交

**Goal**: reducer + Trait 派生在同一 StateTransaction 内完成收敛，对外只提交 0/1 次；不再出现“派生 watcher 自己开事务/自己提交”的风暴。

### Tests for US1（先写并确保失败）

- [ ] T007 [P] [US1] 新增/更新测试：一次 dispatch 只产生 0/1 次 `state:update`（按“无变化=0，有变化=1”），并且 txnId 在窗口内一致：`packages/logix-core/test/ModuleRuntime.test.ts` 或 `packages/logix-core/test/Runtime.OperationSemantics.test.ts`
- [ ] T008 [P] [US1] 新增测试：与字段无依赖的规则触发次数为 0（通过诊断摘要或等价信号断言）：`packages/logix-core/test/StateTrait.*.test.ts`

### Implementation for US1

- [ ] T009 [US1] 在 `ModuleRuntime` 增加内部注册点（例如 `__registerStateTraitProgram(program)`），并在运行时缓存“编译后的 Rule IR + 索引 + 校验结果”：`packages/logix-core/src/internal/runtime/ModuleRuntime.ts`
- [ ] T010 [US1] 在 `BoundApiRuntime` 暴露对应内部 hook（供 `StateTrait.install` 调用）：`packages/logix-core/src/internal/runtime/BoundApiRuntime.ts`
- [ ] T011 [US1] 改造 `StateTrait.install`：computed/link 不再安装 `onState` watcher；改为注册 Program 到 runtime；source 仍注册 `$.traits.source.refresh`：`packages/logix-core/src/internal/state-trait/install.ts`
- [ ] T012 [US1] 在 `dispatch` 的 `runWithStateTransaction({ kind: "action" })` 内加入 Trait 收敛引擎执行（顺序：reducer → converge → action debug → publish），确保所有事件共享同一 txnId：`packages/logix-core/src/internal/runtime/ModuleRuntime.ts`
- [ ] T013 [US1] 落实 SC-001 的 0 次提交：无可观察变化时不得写入底层状态，也不得新增 `state:update` 事件（不依赖 instrumentation 是否为 full）：`packages/logix-core/src/internal/runtime/core/StateTransaction.ts`（及其在 ModuleRuntime 的调用点）
- [ ] T014 [US1] 失败策略接线：\n - 配置错误（冲突/循环/振荡）→ 事务硬失败：阻止本次提交并输出诊断；\n - 运行时错误/超预算（默认 200ms）→ 软降级：回滚派生、提交基础字段、派生冻结，并输出诊断：`packages/logix-core/src/internal/state-trait/*` + `packages/logix-core/src/internal/runtime/ModuleRuntime.ts`

**Checkpoint**: 端到端验证：一次输入动作不会再触发多次 state:update；Devtools 里同一窗口的事件 txnId 一致。

---

## Phase 4: Diagnostics & Devtools（默认可解释 + 60s 诊断保留）

- [ ] T015 [US1] 定义并产出“窗口级 Trait 收敛摘要”事件（触发/跳过/Top3/状态/预算/耗时），并确保可被 Devtools 消费：`packages/logix-core/src/internal/runtime/core/DebugSink.ts`（事件归一化）+ `packages/logix-core/src/internal/state-trait/*`
- [ ] T016 [P] [US1] Devtools Inspector 增加摘要展示（绑定 txnId/Operation Window）：`packages/logix-devtools-react/src/ui/inspector/*`
- [ ] T017 [P] [US1] 诊断等级开关（高可观测/低开销）在 Devtools 设置中可切换，且默认高可观测：`packages/logix-devtools-react/src/state/*` + `packages/logix-core/src/internal/state-trait/*`
- [ ] T018 [US1] 实现诊断历史默认保留 60s（本地）：为窗口级摘要/错误诊断提供时间淘汰策略，并补充测试：`packages/logix-core/src/internal/runtime/core/DevtoolsHub.ts`（或新增等价的诊断存储位置）+ `packages/logix-core/test/*`

---

## Phase 5: Bench & Regression（真实场景 + 合成压力回归）

- [ ] T019 [US1] 真实复杂表单基准：覆盖 SC-002/SC-003/SC-007/SC-008 的复现步骤与回归断言（尽量自动化）：`examples/logix-react/src/demos/*`
- [ ] T020 [US1] 合成压力基准（10x）：覆盖 SC-006 与 SC-004（无关规则不触发）的回归断言：`examples/logix-react/src/demos/*` 或 `packages/logix-core/test/*`
- [ ] T021 [P] [US1] 新增“配置错误/循环/振荡”回归用例：必须在 1s 内给出诊断且不提交：`packages/logix-core/test/StateTrait.*.test.ts`
- [ ] T022 [P] [US1] 新增“运行时错误/超预算”回归用例：必须提交基础字段、派生冻结并给出诊断：`packages/logix-core/test/StateTrait.*.test.ts`

---

## Phase 6: Docs & Quality Gates（交接前必须完成）

- [ ] T023 更新 runtime 规范文档：Trait 在 Operation Window 内收敛、失败/降级语义、诊断信号与 Devtools 对齐：`.codex/skills/project-guide/references/runtime-logix/logix-core/runtime/05-runtime-implementation.md`、`.codex/skills/project-guide/references/runtime-logix/logix-core/observability/09-debugging.md`
- [ ] T024 质量门：`pnpm typecheck` / `pnpm lint` / `pnpm test --filter @logixjs/core`（全部通过）
