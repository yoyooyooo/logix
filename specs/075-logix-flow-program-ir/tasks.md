# Tasks: FlowProgram IR（可编译控制律）

**Input**: `specs/075-logix-flow-program-ir/*`  
**Prerequisites**: `spec.md`, `plan.md`, `data-model.md`, `contracts/*`, `quickstart.md`  
**Tests**: REQUIRED（语义测试 + perf evidence，见 `plan.md`）

## Phase 1: Spec Solidification（Contracts / IR / Examples）

- [ ] T001 完成 `contracts/public-api.md`（对外 API 口径：DSL + install/mount 入口）
- [ ] T002 完成 `contracts/ir.md`（Static IR：version+digest+nodes/edges；锚点去随机化）
- [ ] T003 完成 `contracts/diagnostics.md`（Dynamic Trace：tickSeq 关联；禁止把整图塞进事件流）
- [ ] T004 完成 `data-model.md`（统一最小 IR：Static IR + Dynamic Trace 的口径）
- [ ] T005 完成 `quickstart.md`（submit + delay 两个最小示例）
- [ ] T006 完成 `contracts/tape.md`（可回放磁带：Record/Replay/Fork；覆盖 `Σ_t=(S_t,I_t)` 的在途态锚点）

## Phase 2: Core Implementation（@logix/core）

- [ ] T010 新增公共子模块 `packages/logix-core/src/FlowProgram.ts`（DSL + 类型导出）
- [ ] T011 新增 internal `packages/logix-core/src/internal/runtime/core/FlowProgramRuntime.ts`（compile + mount）
- [ ] T012 最小节点集：trigger(action/lifecycle/timer) + step(dispatch/serviceCall/delay)
- [ ] T013 并发策略：latest/exhaust/parallel（复用 FlowRuntime 语义；取消可解释）
- [ ] T014 时间算子对齐 tick：`delay` 通过 TickScheduler/TimerService 调度（禁止影子 setTimeout）
- [ ] T015 运行期写侧约束：默认只允许 dispatch（禁止 direct state write；违反 fail-fast + 诊断）

## Phase 3: Tests & Examples

- [ ] T020 语义测试：submit → serviceCall → success/failure 分支（含取消语义）
- [ ] T021 语义测试：delay → timer 触发归因到 tickSeq（可用 TestClock/可控时间源）
- [ ] T022 诊断门控测试：diagnostics=off 近零成本（不发 Program 级 trace）
- [ ] T023 examples：新增最小场景 `examples/logix/src/scenarios/flow-program-ir.ts`

## Phase 4: Perf Evidence & Quality Gates

- [ ] T030 新增 perf boundary（timer + submit 两条链路的 tick overhead）
- [ ] T031 收集 before/after perf report 并回写 `plan.md#Perf Evidence Plan`（budget/结论）
- [ ] T032 跑 workspace gates：`pnpm typecheck`、`pnpm lint`、`pnpm test:turbo`
