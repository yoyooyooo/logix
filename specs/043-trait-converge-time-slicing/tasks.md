# Tasks: 043 Trait 收敛 Dirty Checks 的 Time-slicing（显式 Opt-in）

**Input**: `specs/043-trait-converge-time-slicing/spec.md`、`specs/043-trait-converge-time-slicing/plan.md`

> 约束提醒：
>
> - 默认关闭：不开启时行为必须不变（每操作窗口内收敛、0/1 commit、事务窗口禁止 IO/async）。
> - 显式声明：immediate/deferred 的分类必须来自用户/模块声明，禁止自动推断。
> - 诊断事件必须 Slim 且可序列化；`diagnostics=off` 近零成本。
> - 并行开发：避免触碰 `packages/logix-core/src/internal/runtime/core/ReadQuery.ts`（由 057 会话推进）。

---

## Phase 1: Setup（Shared）

- [x] T001 建立 time-slicing 术语与证据字段草案（在实现中落地为最终字段）`specs/043-trait-converge-time-slicing/plan.md`

---

## Phase 2: Foundational（Blocking Prerequisites）

- [x] T002 [P] 扩展 converge step 的 scheduling 模型（immediate/deferred）`packages/logix-core/src/internal/state-trait/model.ts`
- [x] T003 [P] 扩展 StateTrait DSL：computed/link 支持显式 scheduling 声明（默认 immediate）`packages/logix-core/src/StateTrait.ts`
- [x] T004 [P] 将 scheduling 下沉到 Converge Static IR（并保持拓扑/校验语义不变）`packages/logix-core/src/internal/state-trait/converge-ir.ts`
- [x] T005 [P] 扩展 Converge Exec IR：为不同 scheduling 预计算 topoOrder（避免每 txn 扫全量 steps）`packages/logix-core/src/internal/state-trait/converge-exec-ir.ts`
- [x] T006 [P] 扩展 stateTransaction 控制面：time-slicing runtime/module/provider overrides + 校验（不影响默认）`packages/logix-core/src/internal/runtime/core/env.ts`、`packages/logix-core/src/Runtime.ts`、`packages/logix-core/src/internal/runtime/core/ModuleRuntime.ts`、`packages/logix-core/src/internal/runtime/core/ModuleRuntime.traitConvergeConfig.ts`、`packages/logix-core/src/internal/runtime/core/configValidation.ts`

---

## Phase 3: User Story 1 - 高频输入下仍流畅（Priority: P1）

**Goal**: 大量 traits + 高频事务下，将 per-txn 的 dirty checks/触发成本从 O(N) 收敛为 O(N_immediate)；deferred 合并到后续窗口执行。

**Independent Test**: 单测可验证 immediate 同窗口收敛、deferred 延迟后补算；browser perf-boundary 可对比 time-slicing on/off 的 txnCommitMs（p95）。

- [x] T010 [US1] converge 支持按 scheduling 选择执行范围（all/immediate/deferred），并确保 budget/rollback 语义不变 `packages/logix-core/src/internal/state-trait/converge.ts`
- [x] T011 [US1] ModuleRuntime.transaction 集成 time-slicing：跳过 deferred 的 dirty checks、累积 backlog、在事务外 debounce 后触发一次 deferred flush 事务（含 maxLag/饥饿保护）`packages/logix-core/src/internal/runtime/core/ModuleRuntime.transaction.ts`
- [x] T012 [US1] 新增核心单测：deferred 不在当前 txn 更新、flush 后更新；maxLag 生效且不破坏 0/1 commit `packages/logix-core/test/StateTrait/StateTrait.Converge.TimeSlicing.test.ts`
- [x] T013 [US1] 新增 Browser perf-boundary：1000+ traits 场景下 time-slicing on/off 的 txnCommitMs 对比 `packages/logix-react/test/browser/perf-boundaries/converge-time-slicing.runtime.ts`、`packages/logix-react/test/browser/perf-boundaries/converge-time-slicing.test.tsx`

---

## Phase 4: User Story 2 - 延迟策略可解释（Priority: P2）

**Goal**: Devtools/证据能解释本窗口为何跳过 deferred、何时补算、是否触发饥饿保护/降级。

**Independent Test**: 单测触发跳过/补算/降级路径，验证 `trace:trait:converge` 的 time-slicing 字段可序列化且 light 档位被裁剪。

- [x] T020 [US2] 扩展 converge decision evidence：time-slicing 摘要字段 + reason 枚举对齐 `packages/logix-core/src/internal/state-trait/model.ts`
- [x] T021 [US2] 更新 DebugSink 对 `trace:trait:converge` 的 light 裁剪规则（避免重字段常驻）`packages/logix-core/src/internal/runtime/core/DebugSink.ts`
- [x] T022 [US2] 更新 013 的 converge data schema（light/full）以覆盖新增字段 `specs/013-auto-converge-planner/contracts/schemas/trait-converge-data.light.schema.json`、`specs/013-auto-converge-planner/contracts/schemas/trait-converge-data.full.schema.json`
- [x] T023 [US2] 更新用户文档口径（time-slicing 开关、成本模型、优化梯子、overrides）`apps/docs/content/docs/guide/advanced/converge-control-plane.md`

---

## Phase 5: User Story 3 - 默认行为不变（Priority: P3）

**Goal**: 未启用时行为与性能不回归，不引入新心智模型。

**Independent Test**: 关闭时跑通既有回归；新增单测确保 time-slicing 默认不生效。

- [x] T030 [US3] 新增回归单测：默认关闭时不会跳过/调度 deferred（保持既有 converge 行为）`packages/logix-core/test/StateTrait/StateTrait.Converge.TimeSlicing.DefaultOff.test.ts`

---

## Phase 6: Polish & Validation

- [x] T040 补齐本特性 perf 采集落点目录与说明 `specs/043-trait-converge-time-slicing/perf/README.md`
- [x] T041 修正一轮类型（含测试类型）并跑通测试 `pnpm typecheck:test`、`pnpm test:turbo`
