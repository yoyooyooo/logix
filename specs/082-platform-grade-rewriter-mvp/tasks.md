---
description: "Task list for 082-platform-grade-rewriter-mvp (PatchPlan@v1 / WriteBackResult@v1)"
---

# Tasks: Platform-Grade Rewriter MVP（082：PatchPlan@v1 / WriteBackResult@v1）

**Input**: `specs/082-platform-grade-rewriter-mvp/spec.md`
**Prerequisites**: `specs/082-platform-grade-rewriter-mvp/plan.md`（required）, `specs/082-platform-grade-rewriter-mvp/research.md`, `specs/082-platform-grade-rewriter-mvp/data-model.md`, `specs/082-platform-grade-rewriter-mvp/contracts/`, `specs/082-platform-grade-rewriter-mvp/quickstart.md`

**Tests**: 本特性是源码回写能力（高风险）：必须把“最小 diff / 幂等 / 显式失败”作为核心回归面，补齐 schema 预检 + 关键边界单测，避免 silent corruption。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可并行（不同文件、无依赖）
- **[US1]/[US2]/[US3]**: 对应 `spec.md` 的 User Story
- 任务描述必须包含明确文件路径

---

## Phase 1: Setup（contracts 预检 + 包入口）

- [ ] T001 [P] 补齐 082 contracts README（schemas + mode 语义 + 最小 diff/幂等不变量）`specs/082-platform-grade-rewriter-mvp/contracts/README.md`
- [ ] T002 [P] 增加 contracts 预检测试（082 schemas JSON 可解析 + $ref 可解析）`packages/logix-anchor-engine/test/Contracts/Contracts.082.RewriterContracts.test.ts`
- [ ] T003 [P] 增加 Rewriter 对外入口导出（与 081 Parser 并列）`packages/logix-anchor-engine/src/index.ts`

---

## Phase 2: Foundational（回写骨架：PatchPlan 生成 + 执行 WriteBack）

**⚠️ CRITICAL**: 本阶段完成前，不开始任何具体锚点写回（US1/US2/US3 都依赖该骨架）。
**Checkpoint**: 给定单个“AddObjectProperty”操作，可生成稳定 PatchPlan，并在 write 模式下写回且幂等。

- [ ] T004 定义 Rewriter 公共入口（入参：operations + mode + budgets）`packages/logix-anchor-engine/src/Rewriter.ts`
- [ ] T005 [P] 定义 PatchPlan/WriteBackResult 的内部领域模型（与 schema 对齐）`packages/logix-anchor-engine/src/internal/rewriter/model.ts`
- [ ] T006 [P] 实现稳定 opKey 生成（禁止时间戳/随机；基于 file+span+property）`packages/logix-anchor-engine/src/internal/rewriter/opKey.ts`
- [ ] T007 [P] 实现 plan→write 竞态防线：生成/校验 `expectedFileDigest`（文件变化则 fail）`packages/logix-anchor-engine/src/internal/rewriter/fileDigest.ts`
- [ ] T008 实现 AddObjectProperty 的安全写入（仅 object literal；不重排；不触碰已有字段）`packages/logix-anchor-engine/src/internal/rewriter/applyAddObjectProperty.ts`
- [ ] T009 实现 report-only：只生成 PatchPlan，不写文件（并保证与 write 模式拟修改摘要一致）`packages/logix-anchor-engine/src/internal/rewriter/writeBack.ts`
- [ ] T010 [P] 单测：report-only 不修改文件且输出 plan 稳定 `packages/logix-anchor-engine/test/Rewriter/Rewriter.report-only.test.ts`

---

## Phase 3: User Story 1 - 最小可审阅补丁（只改缺失，不覆盖已有）（Priority: P1）🎯 MVP

**Goal**: 对缺失锚点字段生成最小补丁：只新增缺失字段、不覆盖已有声明、不引入格式噪音；应用后幂等。
**Independent Test**: fixture 文件在 `--write` 后产生最小 diff；第二次运行产生 0 diff；`services: {}` 不被覆盖。

- [ ] T011 [P] [US1] 构造最小写回 fixture（object literal 缺失字段、已存在字段、`services: {}`）`packages/logix-anchor-engine/test/fixtures/repo-rewrite-minimal/*`
- [ ] T012 [US1] 支持把 `missing.*.insertSpan` 作为插入点写入字段（valueCode 原样落盘）`packages/logix-anchor-engine/src/internal/rewriter/applyAddObjectProperty.ts`
- [ ] T013 [P] [US1] 单测：缺失字段被新增且不重排其它字段 `packages/logix-anchor-engine/test/Rewriter/Rewriter.addObjectProperty.minimal-diff.test.ts`
- [ ] T014 [P] [US1] 单测：`services: {}` 视为已声明 → operation 必须 skip `packages/logix-anchor-engine/test/Rewriter/Rewriter.skip.explicit-empty-services.test.ts`
- [ ] T015 [P] [US1] 单测：幂等（写回后再次运行 no-op）`packages/logix-anchor-engine/test/Rewriter/Rewriter.idempotent.test.ts`
- [ ] T015.1 [P] [US1] 单测：支持对嵌套对象（例如 Workflow steps 的 step 对象）写入缺失字段且最小 diff `packages/logix-anchor-engine/test/Rewriter/Rewriter.addObjectProperty.nested-object.test.ts`

---

## Phase 4: User Story 2 - 歧义/冲突显式失败（宁可不改）（Priority: P1）

**Goal**: 遇到歧义/风险/子集外形态必须 fail/skip 并输出 reasonCodes（禁止 silent corruption）。
**Independent Test**: 构造“多候选插入点/跨表达式/非 object literal/spread”输入，系统拒绝写回并给出可行动 reason codes。

- [ ] T016 [US2] 定义并固化失败/跳过 reason codes（与 079 reason-codes.md 保持语义一致）`packages/logix-anchor-engine/src/internal/rewriter/reasonCodes.ts`
- [ ] T017 [US2] 对不可安全改写形态（非 object literal / 包含 spread / span 不匹配）显式 fail `packages/logix-anchor-engine/src/internal/rewriter/applyAddObjectProperty.ts`
- [ ] T018 [P] [US2] 构造歧义/风险 fixture（spread、动态构造、多个候选）`packages/logix-anchor-engine/test/fixtures/repo-rewrite-ambiguous/*`
- [ ] T019 [P] [US2] 单测：歧义输入必须失败且 reasonCodes 稳定 `packages/logix-anchor-engine/test/Rewriter/Rewriter.fail.ambiguous.test.ts`
- [ ] T020 [P] [US2] 单测：plan→write 间文件变化必须 fail（reasonCodes=changed_since_plan）`packages/logix-anchor-engine/test/Rewriter/Rewriter.fail.file-changed-since-plan.test.ts`

---

## Phase 5: User Story 3 - report-only 模式（Priority: P2）

**Goal**: report-only 与 write 模式共享同一 PatchPlan 生成逻辑；report-only 只输出拟修改清单供审阅/门禁。
**Independent Test**: 同一输入下，report-only 与 write 的 PatchPlan（除 mode 字段外）一致；write 额外产出 WriteBackResult。

- [ ] T021 [US3] 保证 PatchPlan.mode 在 report/write 间切换不影响 operations 内容 `packages/logix-anchor-engine/src/Rewriter.ts`
- [ ] T022 [P] [US3] 单测：report vs write 的 plan 等价性（忽略 mode）`packages/logix-anchor-engine/test/Rewriter/Rewriter.plan-equivalence.test.ts`
- [ ] T023 [P] [US3] 单测：WriteBackResult 输出包含 modified/skipped/failed 且可 diff `packages/logix-anchor-engine/test/Rewriter/Rewriter.writeback-result.shape.test.ts`

---

## Phase 6: Polish & Cross-Cutting

- [ ] T024 [P] 文档回链：补齐 quickstart 的“报告审阅→显式 --write→幂等验证”步骤 `specs/082-platform-grade-rewriter-mvp/quickstart.md`
- [ ] T025 质量门：跑通引擎包单测 + workspace typecheck（记录最小通过口径）`packages/logix-anchor-engine/package.json`

---

## Dependencies & Execution Order

- Phase 1 → Phase 2（BLOCKS all user stories）
- US1（最小补丁）与 US3（report-only）共享同一回写骨架；US2（显式失败）必须在进入 write-back 之前完成并覆盖关键歧义场景
- 本 spec 的输入通常来自 081 AnchorIndex/079 AutofillPolicy，但单测应允许使用最小 fixture（不强耦合 081 实现）

---

## Phase 7: 既有文档措辞同步（延后到本需求收尾阶段）

- [ ] T026 同步平台 SSoT：补齐“Platform-Grade 回写/最小 diff/幂等/write-back 竞态防线”的统一口径与导航入口 `docs/ssot/platform/**`（仅措辞/导航对齐）
