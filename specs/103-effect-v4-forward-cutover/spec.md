# Feature Specification: Effect v4 前向式全仓迁移主线（v4-only）

**Feature Branch**: `103-effect-v4-forward-cutover`
**Created**: 2026-03-01
**Updated**: 2026-03-07
**Status**: Active
**Input**: 用户最初目标是“彻底迁移到 Effect v4，即使当前仍是 beta 也接受 forward-only 重构”；当前文档在 2026-03-07 做定位校正：`103` 继续作为全仓迁移主线 spec，runtime-core truthful closure 只是其中一个已完成阶段，而不是最终定位。

## 定位校正（2026-03-07）

先说结论：**方向没有被战略性放弃，但我在上一轮把 `103` 这个载体改窄了，这是定位错误。**

正确定位应该是：

1. `103` 仍然代表“全仓 Effect v4 迁移主线”；
2. 当前仓库只完成了其中一段：`logix-core` 的 Stage 2 runtime-core 收口与 gate truthfulness 对账；
3. 因为 package manifests 仍在 `effect` 3.x，且 Stage 3/4/5/6 尚未落地，所以 `103` 绝不能被标成整体完成。

仓库事实支持这个判断：

- workspace 依赖矩阵仍停留在 `effect` 3.19.x；
- Stage 3 / 4 / 5 没有落地到可验证完成态；
- `G5 PASS` 绑定的是旧快照 `8cb40d43 -> 8d4f36b1`，并不代表当前 `HEAD`；
- 仓库策略禁止在未显式授权时自动执行 `rebase` / 压历史，因此 `T103/T104` 不能被“默认视为已做”。

因此，本 spec 现在改成：**全仓迁移主线 + 当前已完成 slice 的真实进度描述**。

## 背景

当前仓库仍处于 forward-only 演进阶段，没有历史兼容负担。本次 closure 仍坚持以下约束：

- 不做 v3/v4 双栈；
- 不引入兼容开关与迁移桥接层；
- 事务窗口禁止 IO；
- 统一最小 IR（Static IR + Dynamic Trace）与稳定标识（`instanceId/txnSeq/opSeq`）保持不变；
- 诊断事件保持 slim、可序列化、可解释；
- 任何无法被当前仓库事实支撑的 gate / 发布结论，都必须降级为历史证据或 follow-up，而不是继续宣称已完成。

## 目标

1. 验证并收口当前 worktree 已经实现的 `logix-core` Stage 2 子轨改动。
2. 固化 runtime-core 的前向式迁移基线：Tag registry、Reference 子点、runtime boundary 清理、schema gate、diagnostics 对照。
3. 刷新 `GP-1/G1/G5` 等记录，使其准确描述当前仓库事实，而不是沿用旧快照结论。
4. 为继续推进 Stage 1 / 3 / 4 / 5 / 6 提供一致、真实的主线基线。

## 范围

### In Scope

- workspace 级 `effect/@effect/*` 版本升级与 v4 语义迁移；
- `packages/logix-core` 已落地的 Stage 2 子轨：
  - `T020` 的 `serviceId -> tag` / `moduleId -> runtime tag` 单点 helper；
  - `T021` 的 `execVmMode` / `currentLinkId` `Context.Reference` 子点；
  - `T022` 的 runtime boundary 第一刀（`Runtime.ts` hot-switch API、`ExternalStore.ts` public sugar 生命周期控制）；
  - `T024`、`T031`、`T033`、`T035`、`T036` 对应的代码、测试与证据；
- `packages/logix-react`、`packages/logix-sandbox`、`packages/i18n`、`packages/logix-query`、`packages/logix-form`、`packages/domain`、`packages/logix-cli` 的后续迁移；
- `apps/*`、`examples/*`、`apps/docs/*`、`docs/ssot/*` 的 v4-only 收口；
- `specs/103-effect-v4-forward-cutover/*` 的主线规划/门禁/证据；
- `GP-1` 当前远端状态的重新核验；
- 历史 `G5` 发布证据的重新定性（保留为历史 artifact，不再冒充当前 `HEAD` 放行），以及未来真正发布门的重新放行。

### Out of Scope

- v3/v4 双栈；
- 兼容层、兼容开关、弃用过渡 API；
- 以迁移为名引入第二套运行时真相源。

## User Scenarios & Testing

### User Story 1 - 核心维护者推进全仓迁移主线 (Priority: P1)

作为核心维护者，我希望 `103` 始终代表“全仓迁移到 Effect v4”的主线，而不是被中途改写成只覆盖一个子阶段的收尾 spec。

**Independent Test**: `spec.md/plan.md/tasks.md/checkpoint` 对 103 的定位一致，明确当前只完成 runtime-core slice，整体仍在推进中。

### User Story 2 - runtime-core 维护者验证已落地子轨 (Priority: P1)

作为 runtime-core 维护者，我希望当前 worktree 里已经写下来的 Stage 2 增量具备明确测试、类型检查与证据，而不是只停留在半完成 diff。

**Independent Test**: 运行 schema legacy gate、Stage 2 新增测试、`packages/logix-core` / `packages/logix-query` 的 typecheck，并确认 `diagnostics/s2.stage0-comparison.md` 结论成立。

### User Story 3 - 迁移负责人需要 truthful gate (Priority: P1)

作为迁移负责人，我希望 `GP-1/G1/G5` 描述的是当前仓库事实，而不是旧 snapshot 的放行错觉。

**Independent Test**: 刷新 `inventory/perf-prerequisite.md` 的远端哈希与计数；把 `inventory/gate-g5.md` 改成历史 artifact 记录；在 `inventory/checkpoint-decision-log.md` 中追加 scope reset 说明。

### User Story 4 - 后续 owner 需要干净基线 (Priority: P2)

作为后续 owner，我希望 Stage 1 / 3 / 4 / 5 / 6 被明确标记为主线剩余工作，而不是被错误地从 `103` 主线中“移出”。

**Independent Test**: `spec.md/plan.md/tasks.md/checklists/requirements.md` 对 scope 的描述一致，且不再把 `103` 标为整体完成。

## Edge Cases

- `feat/perf-dynamic-capacity-maxlevel` 已接近合入但尚未真正进入 `origin/main`：允许继续保留 `GP-1=NOT_PASS`，但必须刷新为当前事实；
- 历史 release artifact 仍然存在：允许保留，但只能被记为“历史 snapshot”，不能再被当前 gate 复用；
- 当前 worktree 是 dirty 的：允许以新增测试与文档为证据继续收口，但不得把 dirty 状态包装成“完整发布快照”；
- 在主线尚未完成前，允许出现“某个阶段已完成、整体未完成”的中间状态，但不得再把阶段完成写成 spec 完成。

## Requirements

### Functional Requirements

- **FR-001**: 本 spec MUST 继续作为“全仓 Effect v4 迁移主线”存在，不能被重新定义成单一阶段的 closure spec。
- **FR-002**: 系统 MUST 保持 forward-only：不引入兼容层、双栈或临时开关。
- **FR-003**: 系统 MUST 保持统一最小 IR、稳定标识、事务窗口禁 IO 与 slim 诊断事件约束不变。
- **FR-004**: 系统 MUST 将当前已完成的 runtime-core slice（`serviceId -> tag`、`moduleId -> runtime tag`、`execVmMode`、`currentLinkId`、runtime public boundary、schema gate 等）回写为“当前进度”，而不是“最终完成”。
- **FR-005**: 系统 MUST 刷新 `inventory/perf-prerequisite.md` 到当前远端事实，并明确 `GP-1` 仍限制性能宣称。
- **FR-006**: 系统 MUST 保持 `inventory/gate-g1.md` 为 truthful `NOT_PASS`，直到当前 `HEAD` 自身重新满足 strict gate；不得复用旧 `G5 PASS` 冒充当前放行。
- **FR-007**: 系统 MUST 将 Stage 1 / 3 / 4 / 5 / 6 保留为 `103` 的剩余主线任务，而不是移交出主线。
- **FR-008**: 系统 MUST 将历史 `G5` soak+strict artifact 重新定性为“历史发布快照”，并在 gate 记录里明确它不代表当前 `HEAD`。
- **FR-009**: 系统 MUST 让 `spec.md`、`plan.md`、`tasks.md`、`checklists/requirements.md`、`inventory/checkpoint-decision-log.md` 对“主线仍然是全仓迁移、当前只完成部分阶段”保持一致。
- **FR-010**: 系统 MUST 保留对未来完整 cutover 有价值的历史证据（perf、diagnostics、release notes），但不得把它们混成当前整体完成的放行结论。

### Non-Functional Requirements

- **NFR-001**: 所有“已完成”声明 MUST 绑定当前 worktree 可复现证据（测试、typecheck、search、gate 记录），不得依赖口头解释。
- **NFR-002**: 当前 spec closure MUST 不触发任何未获授权的 Git 历史操作（rebase、squash、commit rewrite）。
- **NFR-003**: 当前主线 spec MUST 不隐瞒剩余阶段未完成事实；所有未完成项都要被明确标记。

### Key Entities

- **Stage2RuntimeClosure**: 已落地的 runtime-core 子轨闭环（代码 + tests + diagnostics evidence）。
- **HistoricalGateRecord**: 只能作为历史证据引用、不能代表当前 HEAD 放行的 gate 记录。
- **MigrationMasterTrack**: `103` 作为全仓 Effect v4 迁移主线。
- **CurrentCompletedSlice**: 已经完成的 runtime-core 子阶段闭环。

## Success Criteria

### Measurable Outcomes

- **SC-001**: `pnpm check:schema-v4-legacy` 通过。
- **SC-002**: `pnpm -C packages/logix-core exec vitest run test/internal/ExternalStore/ExternalStore.RuntimeBoundary.test.ts test/internal/Runtime/Runtime.ExecVmModeReference.test.ts test/internal/ServiceId.TagRegistry.test.ts` 通过。
- **SC-003**: `pnpm -C packages/logix-core typecheck:test` 与 `pnpm -C packages/logix-query typecheck:test` 通过。
- **SC-004**: `diagnostics/s2.stage0-comparison.md` 保留并能说明 Stage 2 当前实现没有新的 diagnostics explainability regression 证据。
- **SC-005**: `inventory/perf-prerequisite.md` 的哈希/计数刷新到 2026-03-07 当前远端事实。
- **SC-006**: `inventory/gate-g5.md` 不再把旧 snapshot 当作当前 HEAD 的放行结论。
- **SC-007**: `spec.md/plan.md/tasks.md/checklists/requirements.md` 一致声明：`103` 仍是全仓迁移主线，当前只完成了其中的 runtime-core slice。
