---
description: "Task list for 080-full-duplex-prelude (Spec Group dispatch-only)"
---

# Tasks: Full-Duplex Prelude（080：全双工前置·总控/调度）

**Input**: `specs/080-full-duplex-prelude/*`（`spec.md`/`plan.md`/`spec-registry.*`/`checklists/group.registry.md`/`quickstart.md`）
**Prerequisites**: 本 spec 为 Spec Group：仅负责调度与门槛，不实现 runtime 代码（实现任务在 member specs 的 `tasks.md` 中）。

> 说明：080 的 tasks 只做“执行索引/里程碑门槛/证据回写/入口链接”，**严禁**复制 member spec 的实现 tasks（避免并行真相源）。

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: 可并行（不同文件、无依赖）
- 本 spec 为 group：默认不使用 `[USx]`；如需按 User Story 组织，仅允许“链接跳转型任务”。
- 任务描述必须包含明确文件路径

---

## Phase 1: 总控入口维护（P0）

- [ ] T001 维护 group registry（关系 SSoT=JSON；状态/依赖变化必须回写）`specs/080-full-duplex-prelude/spec-registry.json`
- [ ] T002 [P] 维护 group registry 人读阐述（Hard/Spike 标记 + 里程碑门槛口径）`specs/080-full-duplex-prelude/spec-registry.md`
- [ ] T003 [P] 刷新 group 执行索引清单（从 registry 生成/更新，禁止复制 member tasks）`specs/080-full-duplex-prelude/checklists/group.registry.md`

---

## Phase 2: M0（证据硬门）— 005/016（P0）

**Goal**: 先把跨宿主 JSON 硬门 + 稳定标识/可序列化诊断跑通，作为后续一切 IR/回写的底座。
**Independent Test**: 仅依赖 `005/016` 的 quickstart 即可验证“JSON-safe + 稳定锚点”的硬门不漂移。

- [ ] T010 执行并验收 005（观测协议硬门）`specs/005-unify-observability-protocol/tasks.md`、`specs/005-unify-observability-protocol/quickstart.md`
- [ ] T011 执行并验收 016（可序列化诊断与身份锚点）`specs/016-serializable-diagnostics-and-identity/tasks.md`、`specs/016-serializable-diagnostics-and-identity/quickstart.md`

---

## Phase 3: M1（结构可见）— 025/031/035/067/078（P1）

**Goal**: 平台无需读 AST，仅靠导出对象 + 受控试跑即可枚举 actions/servicePorts/ports&typeIr/artifacts 等结构关系。
**Independent Test**: 运行 025/031/035/067/078 的 quickstart，产物可序列化且可 diff，缺失/冲突可定位到稳定锚点。

- [ ] T020 执行并验收 025（Reflection/BuildEnv/TrialRun 基础链路）`specs/025-ir-reflection-loader/tasks.md`、`specs/025-ir-reflection-loader/quickstart.md`
- [ ] T021 执行并验收 031（TrialRun artifacts 槽位）`specs/031-trialrun-artifacts/tasks.md`、`specs/031-trialrun-artifacts/quickstart.md`
- [ ] T022 执行并验收 035（模块引用空间导出与协议）`specs/035-module-reference-space/tasks.md`、`specs/035-module-reference-space/quickstart.md`
- [ ] T023 执行并验收 067（Action Surface manifest）`specs/067-action-surface-manifest/tasks.md`、`specs/067-action-surface-manifest/quickstart.md`
- [ ] T024 执行并验收 078（Module↔ServicePorts 进入 Manifest）`specs/078-module-service-manifest/tasks.md`、`specs/078-module-service-manifest/quickstart.md`

---

## Phase 4: M2（可回写闭环）— 081/082/079/085（P1）🎯

**Goal**: 在 Platform-Grade 子集内建立最小可逆闭环：Parser→AnchorIndex→AutofillPolicy→PatchPlan→WriteBackResult→源码锚点。
**Independent Test**: 085 CLI 能跑通 `anchor index` 与 `anchor autofill --report/--write`，并满足“只补未声明字段、幂等、宁可漏不乱补”。

- [ ] T030 执行 081（Parser：AnchorIndex@v1）`specs/081-platform-grade-parser-mvp/tasks.md`
- [ ] T031 执行 082（Rewriter：PatchPlan@v1/WriteBackResult@v1）`specs/082-platform-grade-rewriter-mvp/tasks.md`
- [ ] T032 执行 079（Autofill policy：只补未声明且高置信度）`specs/079-platform-anchor-autofill/tasks.md`
- [ ] T033 执行 085（CLI：Node-only 集成测试跑道）`specs/085-logix-cli-node-only/tasks.md`

---

## Phase 5: M3（可选：语义/证据增强）— 083/084（P2）

**Goal**: 在不破坏“单一真相源”的前提下，增强平台可解释性与编辑边界。
**Independent Test**: 083/084 的输出工件可序列化、可 diff；均不得成为写回依据或并行权威。

- [ ] T040 执行 084（Loader Spy evidence：report-only）`specs/084-loader-spy-dep-capture/tasks.md`
- [ ] T041 执行 083（Named Logic Slots：语义坑位）`specs/083-named-logic-slots/tasks.md`

---

## Phase 6: 组内一致性验收与证据回写（持续维护）（P1）

- [ ] T050 组内一致性验收（多 spec acceptance：优先覆盖 079/081/082/085）`specs/080-full-duplex-prelude/checklists/group.registry.md`
- [ ] T051 关键证据入口回写到 registry（将“可复现验证入口/工件路径”链接回 group）`specs/080-full-duplex-prelude/spec-registry.md`
- [ ] T052 跑通 workspace 级质量门（typecheck/lint/test）并记录“最小通过口径”`package.json`

---

## Dependencies & Execution Order

- Phase 2（M0）→ Phase 3（M1）→ Phase 4（M2）为主线；Phase 5（M3）建议在 M2 跑通后再进入。
- Phase 6（证据回写）贯穿全程：每完成一个 member milestone，立即把验证入口回链到 `spec-registry.md`。
