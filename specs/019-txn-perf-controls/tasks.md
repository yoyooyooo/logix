---
description: 'Task list for 019-txn-perf-controls'
---

# Tasks: 事务性能控制（dirty-set/单事务同步收敛/显式 batch & 低优先级/最佳实践）

**Input**: Design documents from `specs/019-txn-perf-controls/`
**Prerequisites**: `specs/019-txn-perf-controls/plan.md`, `specs/019-txn-perf-controls/spec.md`

**Tests**: 本特性触及 `packages/logix-core` 核心路径与诊断协议，测试与回归防线视为必需（含基线/诊断字段验证）。

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 为性能基线与证据落点准备“可复现产物目录 + runner”。

- [x] T001 创建 019 性能产物目录与说明：`specs/019-txn-perf-controls/perf/README.md`, `specs/019-txn-perf-controls/perf/.gitkeep`, `specs/019-txn-perf-controls/perf.md`
- [x] T002 [P] 复用 014 的浏览器跑道产出 019 基线证据：在 `specs/019-txn-perf-controls/perf/README.md` 固化“SC-001/SC-002/SC-003 → suite/指标/证据字段/预算”的映射与命令模板（`pnpm perf collect -- --out specs/019-txn-perf-controls/perf/after.worktree.json` + `pnpm perf diff ...`），并规定 before/after/diff 的命名约定
- [x] T003 [P] 收敛 perf 命令入口：统一通过 `.codex/skills/logix-perf-evidence/package.json` 的 scripts 运行 collect/diff（通过 `--out` 约定落盘到 `specs/<id>/perf/`），避免在根 `package.json` 堆积 `perf:<id>:*` 别名
- [x] T004 [P] 增加 contracts 预检测试：`packages/logix-core/test/Contracts.019.TxnPerfControls.test.ts`（至少验证 schemas JSON 可解析）

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 先把“dirty-set 证据 + 诊断字段 + 可序列化投影”打通，作为所有故事的共同底座。

- [x] T005 扩展 dirty-set 解析证据：`packages/logix-core/src/internal/field-path.ts`（为 dirtyAll 引入 `DirtyAllReason` 映射，并提供可生成 prefix-free roots 的 helper）
- [x] T006 在事务产物中暴露 dirty-set：`packages/logix-core/src/internal/runtime/core/StateTransaction.ts`（将 `dirtyPaths` 或聚合后的 `dirtySet` 纳入 commit 返回值/元信息）
- [x] T007 扩展 `state:update` 事件协议字段位：`packages/logix-core/src/internal/runtime/core/DebugSink.ts`（新增 `dirtySet`/`commitMode`/`priority` 可选字段，并保持 Slim + 可序列化）
- [x] T008 在提交点填充新字段：`packages/logix-core/src/internal/runtime/ModuleRuntime.ts`（state:update 记录 `dirtySet`，默认 `commitMode="normal"`、`priority="normal"`）
- [x] T009 [P] 覆盖诊断分档投影：`packages/logix-core/test/Debug.DiagnosticsLevels.test.ts`（验证 light/full 对 `dirtySet/commitMode/priority` 的裁剪口径与 JSON 可序列化）
- [x] T010 [P] 覆盖 dirtyAll reason：`packages/logix-core/test/FieldPath.DirtySetReason.test.ts`（星号/非法 path/缺失 registry id 的 reason 映射）

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - 增量派生与校验（减少无效计算） (Priority: P1) 🎯 MVP

**Goal**: 常规小影响域写入能稳定生成字段级 dirty-set，从而 converge/validate 走增量路径并复用计划缓存。

**Independent Test**: 在包含多个 computed/check 的模块中，仅修改字段 `A` 时，converge 进入 `dirty`（非 `unknown_write`），validate 只执行依赖 `A` 的最小集合。

### Tests for User Story 1

- [x] T011 [P] [US1] 新增“mutate 自动字段级 dirty-set + 普通 reducer 退化 dirtyAll”用例：`packages/logix-core/test/StateTrait.ConvergeAuto.DirtySetFromMutate.test.ts`
- [x] T012 [P] [US1] 新增 validate 最小集合/去重用例：`packages/logix-core/test/StateTrait.Validate.Incremental.test.ts`

### Implementation for User Story 1

- [x] T013 [US1] 引入 mutative patch 路径提取封装：`packages/logix-core/src/internal/runtime/core/mutativePatches.ts`（从一次 mutate 产出 `nextState + patchPaths`）
- [x] T014 [US1] 让 `$.state.mutate` 自动记录字段级 patch：`packages/logix-core/src/internal/runtime/BoundApiRuntime.ts`（使用 mutativePatches，调用 `__recordStatePatch`/`StateTransaction.recordPatch`）
- [x] T015 [US1] 让 `Logix.Module.Reducer.mutate` 可输出 patchPaths：`packages/logix-core/src/Module.ts`（允许 reducer 接收可选第三参 sink，并在 mutate 内部回传 patchPaths）
- [x] T016 [US1] 明确 reducer 的 dirty-set 口径并消灭默认 `path="*"`：`packages/logix-core/src/internal/runtime/ModuleRuntime.ts`（对 `Logix.Module.Reducer.mutate` 产出字段级 patchPaths；普通 reducer 无法产出证据时确定性降级 dirtyAll+reason，并发出迁移诊断）
- [x] T017 [US1] 为 `state.update / runtime.setState` 明确降级语义：`packages/logix-core/src/internal/runtime/ModuleRuntime.ts`（保留可用性但把 `path="*"` 解释为 dirtyAll+reason，并在 dev 模式发出可行动 diagnostic）
- [x] T018 [US1] 事务内 validate 请求合并/去重：`packages/logix-core/src/internal/runtime/ModuleRuntime.ts`（flush 前 dedupe targets；root 请求覆盖其他请求）
- [x] T019 [US1] 对齐 converge 的 dirtyAll reason（不增加 off 成本）：`packages/logix-core/src/internal/state-trait/converge.ts`（在 decision/reasons 中暴露原因，保持轻载荷裁剪）

**Checkpoint**: User Story 1 should be functional and independently testable

---

## Phase 4: User Story 2 - 同步反应合并成单次可观察提交 (Priority: P1)

**Goal**: 一次触发链路内的同步写回（reducer → converge → validate）最多产生一次可观察提交与一次 state:update。

**Independent Test**: 构造“dispatch + scopedValidate + traits 派生”的链路，验证同一 linkId 下 `state:update` ≤ 1，且最终 state 与 errors 正确。

### Tests for User Story 2

- [x] T020 [P] [US2] 扩展提交次数回归用例：`packages/logix-core/test/Runtime.OperationSemantics.test.ts`（加入 scopedValidate 场景并断言单次 commit）

### Implementation for User Story 2

- [x] T021 [US2] 同步事务边界违规诊断：`packages/logix-core/src/internal/runtime/ModuleRuntime.ts`（检测 txn window 内的 async/await 逃逸并输出 diagnostic）
- [x] T022 [US2] 统一同步写回落点：`packages/logix-core/src/internal/runtime/ModuleRuntime.ts`（确保 converge/validate/source 的写回只走 draft+patch，禁止绕过 `StateTransaction`）

**Checkpoint**: User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - 显式低优先级/批处理模式（极端高频场景兜底） (Priority: P2)

**Goal**: 提供显式 batch 与 lowPriority 旋钮：高优先级交互不被拖慢，低优先级可延迟/合并但最终必达且有上界。

**Independent Test**: 在同一模块中执行两次同步 dispatch：batch 模式下只产生一次 commit；lowPriority 模式下通知被降级调度且不影响最终状态。

### Tests for User Story 3

- [x] T023 [P] [US3] batch 语义用例：`packages/logix-core/test/Runtime.BatchWindow.test.ts`（两次 dispatch → 一次 state:update，commitMode=batch）
- [x] T024 [P] [US3] lowPriority 通知调度用例：`packages/logix-react/test/internal/ModuleRuntimeExternalStore.lowPriority.test.ts`（验证合并/延迟与 maxDelayMs 上界）

### Implementation for User Story 3

- [x] T025 [US3] 扩展 ModuleRuntime 公共接口：`packages/logix-core/src/internal/runtime/core/module.ts`（新增 `batch(...)` / `dispatchBatch(...)` / `dispatchLowPriority(...)` 或等价最小 API）
- [x] T026 [US3] 实现 batch window（单事务多 dispatch）：`packages/logix-core/src/internal/runtime/ModuleRuntime.ts`（提取 `dispatchInTransaction`，batch 内复用同一 runWithStateTransaction）
- [x] T027 [US3] 实现 lowPriority 标记与提交元信息：`packages/logix-core/src/internal/runtime/ModuleRuntime.ts`（commitMode/priority 写入 txn 上下文并透传到 state:update）
- [x] T028 [US3] 暴露 commit meta 给订阅层：`packages/logix-core/src/internal/runtime/ModuleRuntime.ts`（新增 `changesWithMeta(...)` 或等价 stream API）
- [x] T029 [US3] React 外部订阅按优先级调度：`packages/logix-react/src/internal/ModuleRuntimeExternalStore.ts`（normal=microtask；low=transition/raf/timeout，且有 maxDelayMs）

**Checkpoint**: User Stories 1–3 should now be independently functional

---

## Phase 6: User Story 4 - 高性能最佳实践与优化阶梯文档 (Priority: P3)

**Goal**: 用户文档提供可操作的高性能最佳实践，并与诊断字段命名一致。

**Independent Test**: 业务开发者可仅通过文档完成：观测 → 归因 → 选择优化动作（缩小影响域/合并同步反应/启用 batch/lowPriority）→ 验证改进。

### Implementation for User Story 4

- [x] T030 [US4] 补齐性能最佳实践 + 迁移指南（旧写法→同步合并/batch/lowPriority）：`apps/docs/content/docs/guide/advanced/performance-and-optimization.md`
- [x] T031 [US4] 补齐 React 性能用法（selector + batch/lowPriority 示例）：`apps/docs/content/docs/guide/recipes/react-integration.md`
- [x] T032 [P] [US4] 补齐诊断解释口径（dirtySet/commitMode/priority）：`apps/docs/content/docs/guide/advanced/debugging-and-devtools.md`

**Checkpoint**: All user stories are documented and independently understandable

---

## Phase 7: Polish & Cross-Cutting Concerns

- [x] T033 [P] 同步 runtime SSoT（诊断协议）：`.codex/skills/project-guide/references/runtime-logix/logix-core/observability/09-debugging.md`
- [x] T034 [P] 记录/更新性能基线数据与解读：`specs/019-txn-perf-controls/perf.md`（引用 `specs/019-txn-perf-controls/perf/*.json`）
- [x] T035 将质量门结果固化到交接材料：`specs/019-txn-perf-controls/perf.md`（记录 `pnpm typecheck`/`pnpm lint`/`pnpm test` 的结论与时间戳）

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Depends on Phase 1; BLOCKS all user stories
- **US1/US2/US3/US4 (Phase 3–6)**: Depend on Phase 2
- **Polish (Phase 7)**: Depends on desired stories being complete

### User Story Dependencies

- **US1 (P1)**: After Phase 2; no dependency
- **US2 (P1)**: After Phase 2; no dependency
- **US3 (P2)**: After Phase 2; recommends after US1（以复用字段级 dirty-set 作为诊断/归因底座）
- **US4 (P3)**: After US3（文档需覆盖 batch/lowPriority 的最终 API 与诊断字段）

---

## Parallel Examples

### Parallel Example: US1

```bash
Task: "T011 [US1] packages/logix-core/test/StateTrait.ConvergeAuto.DirtySetFromMutate.test.ts"
Task: "T012 [US1] packages/logix-core/test/StateTrait.Validate.Incremental.test.ts"
Task: "T013 [US1] packages/logix-core/src/internal/runtime/core/mutativePatches.ts"
```

### Parallel Example: US3

```bash
Task: "T023 [US3] packages/logix-core/test/Runtime.BatchWindow.test.ts"
Task: "T024 [US3] packages/logix-react/test/internal/ModuleRuntimeExternalStore.lowPriority.test.ts"
```

---

## Implementation Strategy

### MVP First (US1 Only)

1. Phase 1–2 先打通 dirty-set + 诊断字段 + 投影
2. 完成 US1（字段级 dirty-set + 增量 converge/validate）
3. 验收后再进入 US2/US3/US4
