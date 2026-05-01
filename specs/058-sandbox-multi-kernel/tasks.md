# Tasks: Sandbox 多内核试跑与对照（058）

**Input**: `specs/058-sandbox-multi-kernel/spec.md`、`specs/058-sandbox-multi-kernel/plan.md`、`specs/058-sandbox-multi-kernel/research.md`、`specs/058-sandbox-multi-kernel/data-model.md`、`specs/058-sandbox-multi-kernel/contracts/*`、`specs/058-sandbox-multi-kernel/quickstart.md`
**Prerequisites**: `specs/058-sandbox-multi-kernel/plan.md`（required）、`specs/058-sandbox-multi-kernel/spec.md`（required）

**Tests**: 本特性落点在 `packages/logix-sandbox`（logix-* 核心包），默认视为必须补齐测试：覆盖 strict/fallback、内核枚举、RunResult 摘要字段与多 kernel URL 兼容性（含 browser tests 里的 MSW kernel mock）。

**Organization**: 任务按用户故事分组；US1/US2 为 P1（选择内核 + strict/fallback 门禁），US3 为 P2（枚举内核 + consumer 可解释展示）。

## Phase 0: Planning Artifacts（Already Done）

- [x] T001 规划产物已生成并相互引用：`specs/058-sandbox-multi-kernel/*`（Refs: FR-001..FR-008, NFR-001..NFR-005, SC-001..SC-006）

---

## Phase 1: Setup (Docs & Contract Alignment)

**Purpose**: 先把“协议口径/契约锚点”写死，避免实现阶段出现并行真相源。

- [x] T002 [P] 对齐 Sandbox 协议文档（多内核语义、strict/fallback、结果摘要字段）：`docs/specs/drafts/topics/sandbox-runtime/15-protocol-and-schema.md`
- [x] T003 [P] 对齐 Sandbox 包 API 文档（Config/Client API 的多内核形态与现状差异说明）：`docs/specs/drafts/topics/sandbox-runtime/25-sandbox-package-api.md`
- [x] T004 [P] 固化契约引用关系（058 contracts README 引用 045 KernelImplementationRef schema）：`specs/058-sandbox-multi-kernel/contracts/README.md`

**Checkpoint**: 文档与契约口径一致，可进入实现与测试。

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 建立 multi-kernel 的公共类型与最小运行闭环（不含 strict/fallback 行为细节）。

- [x] T005 [P] 定义 `KernelVariant`/`KernelSelection` 的公共类型（可序列化、Slim）：`packages/logix-sandbox/src/Types.ts`
- [x] T006 设计并实现 multi-kernel 配置形态（支持单 `kernelUrl` 与多 variant 注册；多内核时要求 `defaultKernelId` 明确默认）：`packages/logix-sandbox/src/Client.ts`
- [x] T007 [P] 暴露内核枚举能力（consumer 可用）：`packages/logix-sandbox/src/Client.ts`、`packages/logix-sandbox/src/Service.ts`
- [x] T008 实现“按单次运行选择 kernelId”所需的初始化策略（切换 kernel 时可重建 Worker 兜底）：`packages/logix-sandbox/src/Client.ts`
- [x] T009 [P] 调整 RunResult 摘要字段（requested/effective/fallbackReason + kernelImplementationRef 提取入口）：`packages/logix-sandbox/src/Types.ts`、`packages/logix-sandbox/src/Client.ts`

**Checkpoint**: consumer 能注册多个 kernel variant、可枚举、可按 run 选择并拿到最小可解释摘要（尚未实现 strict/fallback 的门禁规则）。

---

## Phase 3: User Story 1 - 选择内核并获得明确结果标识 (Priority: P1) 🎯 MVP

**Goal**: 同一 Host 环境下对同一模块选择 core/core-ng（或任意两个变体）试跑，结果中能明确标识 `effectiveKernelId` 与 `kernelImplementationRef`。

**Independent Test**: 在 browser tests 中准备两个不同的 kernelUrl（可用 MSW mock），分别运行两次，断言 RunResult 的 `effectiveKernelId` 与提取到的 `kernelImplementationRef` 存在且可序列化。

- [x] T010 [P] [US1] 扩展 browser tests 的 kernel mock：支持拦截多个 kernelUrl 并返回对应 kernel 资产：`packages/logix-sandbox/test/browser/msw/kernel-mock.ts`
- [x] T011 [P] [US1] 新增多内核 smoke 测试（core vs core-ng 的两次试跑对照）：`packages/logix-sandbox/test/browser/sandbox-worker-multi-kernel.test.ts`
- [x] T012 [US1] 在 `trialRunModule`/`run` API 中增加 per-run 的 kernel 选择参数（并保证结果摘要字段齐全）：`packages/logix-sandbox/src/Client.ts`

---

## Phase 4: User Story 2 - 不可用内核的失败/降级是可解释且可门禁的 (Priority: P1)

**Goal**: strict 模式下不允许降级；non-strict 模式可降级但必须记录 `fallbackReason`，且不会静默回退。

**Independent Test**: 在只注册一个 kernel variant 的情况下请求另一个 kernelId：strict 失败；non-strict 运行成功且记录 fallback。

- [x] T013 [P] [US2] 增加 strict/fallback 行为测试（missing kernelId / init fail / fallback reason）：`packages/logix-sandbox/test/browser/sandbox-worker-multi-kernel.test.ts`
- [x] T014 [US2] 实现 strict/fallback 策略（默认 `strict=true`；fallback 需显式允许且目标固定为 `defaultKernelId`；错误摘要可序列化并包含 `availableKernelIds`）：`packages/logix-sandbox/src/Client.ts`、`packages/logix-sandbox/src/Types.ts`

---

## Phase 5: User Story 3 - 文档/Playground 可以枚举内核并在 Debug 场景中做对照 (Priority: P2)

**Goal**: consumer 可在运行前枚举内核并展示元信息；运行后能展示 `effectiveKernelId` 与 `kernelImplementationRef`（无需解析内部对象图）。

**Independent Test**: consumer（最小 harness 或示例）能 `listKernels()`，并在 RunResult 上读取摘要字段。

- [x] T015 [P] [US3] 为 `listKernels()` 增加行为测试（稳定 kernelId/label 返回）：`packages/logix-sandbox/test/Client/SandboxClient.listKernels.test.ts`
- [x] T016 [US3] 更新 quickstart，给出 consumer 读取/展示字段的建议用法（不写具体 UI 实现）：`specs/058-sandbox-multi-kernel/quickstart.md`

---

## Phase 6: Consumer Example - logix-sandbox-mvp 接入 multi-kernel（debug harness）(Priority: P2)

**Goal**: 在 `examples/logix-sandbox-mvp` 中可注册/枚举内核，并在 debug 场景下选择 `kernelId`（strict by default），同时展示 RunResult 的可解释摘要字段。

- [x] T019 [US3] 注入 `kernelRegistry`（至少 core/core-ng + defaultKernelId），并在 UI 层读取 `listKernels()`：`examples/logix-sandbox-mvp/src/sandboxClientConfig.ts`、`examples/logix-sandbox-mvp/src/RuntimeProvider.tsx`、`examples/logix-sandbox-mvp/src/ir/IrPage.tsx`
- [x] T020 [US3] 贯通 `kernelId/strict/allowFallback` 到 compile/run/trialRun，并提供 debug-only 选择 UI：`examples/logix-sandbox-mvp/src/modules/SandboxLogic.ts`、`examples/logix-sandbox-mvp/src/ir/IrPage.tsx`
- [x] T021 [US3] 展示 `requestedKernelId/effectiveKernelId/fallbackReason/kernelImplementationRef`（无需解析内部对象图）：`examples/logix-sandbox-mvp/src/App.tsx`、`examples/logix-sandbox-mvp/src/ir/IrPage.tsx`

### Phase 6.1: Dogfooding（Example 内 useState 清零）

**Goal**: 把 example 内的 UI 状态（/ir、主题、步骤编辑等）迁到 Logix Module（避免 React local state 漂移），作为 multi-kernel consumer 的“可交接参考写法”。

- [x] T022 [P] /ir 页面引入 `IrModule` 并把所有 useState 迁移到 Logix state/actions（含 kernel 选择、Artifacts/TIMELINE/StaticIR 的 filter/selection）：`examples/logix-sandbox-mvp/src/ir/*`
- [x] T023 主题切换与 StepDetailPanel 编辑缓冲迁到 Logix Module（不再使用 `useState`）：`examples/logix-sandbox-mvp/src/hooks/useTheme.ts`、`examples/logix-sandbox-mvp/src/components/StepDetailPanel.tsx`

---

## Phase N: Polish & Cross-Cutting Concerns

- [x] T017 [P] 清理并固化 docs/协议口径（保证与代码一致）：`docs/specs/drafts/topics/sandbox-runtime/*`
- [x] T018 质量门验证：`pnpm typecheck`、`pnpm lint`、`pnpm test`

---

## Dependencies & Execution Order

- Phase 1（文档与契约对齐）可以与 Phase 2 并行推进，但 Phase 2 的类型命名与结果字段应以 Phase 1 的口径为准。
- Phase 3/4/5 均依赖 Phase 2 完成。
- US1/US2 同为 P1：建议先完成 US1 的多内核跑通，再用 US2 补齐 strict/fallback 门禁。
- Phase 6（example 接入）依赖 Phase 2/3/4（API/结果摘要字段稳定）；如需验证“不同 kernelUrl”的真实对照，还需准备第二份 kernel bundle 资产（见 quickstart）。

## Parallel Opportunities

- Phase 1 的 T002/T003/T004 可并行。
- Phase 2 的 T005/T007/T009 可并行（但 T006/T008 需要串联完成以跑通 MVP）。
- Phase 3 的 T010 与 T012 可并行（测试先行），T011 依赖 mock 能力（T010）。
