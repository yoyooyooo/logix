# Tasks: 文档内联教学 Playground（041）

**Input**: `specs/041-docs-inline-playground/spec.md`、`specs/041-docs-inline-playground/plan.md`、`specs/041-docs-inline-playground/research.md`、`specs/041-docs-inline-playground/data-model.md`、`specs/041-docs-inline-playground/contracts/*`、`specs/041-docs-inline-playground/quickstart.md`
**Prerequisites**: `specs/041-docs-inline-playground/plan.md`（required）、`specs/041-docs-inline-playground/spec.md`（required）

**Tests**: 本特性主要落点在 `apps/docs`（文档站点 UI）；默认以 `apps/docs` 的 `types:check` + `build` 作为质量门。若实现过程中需要改动 `packages/logix-sandbox` 的协议/预算/终止语义，则必须补齐对应 Vitest 用例（必要时使用 `@effect/vitest`）。

**Organization**: 任务按用户故事分组；US1/US2 为教学 MVP（可运行 + 可编辑重跑），US3 补齐作者意图（观察点/默认面板/i18n），US4 为高级/Debug 文档按需启用深度观测。

## Phase 0: Planning Artifacts（Already Done）

- [x] T001 规划产物已生成并相互引用：`specs/041-docs-inline-playground/*`（Refs: FR-001..FR-011, NFR-001..NFR-005, SC-001..SC-005）

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 在实现前先固化“运行资产可复现 + 组件注册入口 + 文案/i18n”三件套，避免后续反复返工。

- [ ] T002 [P] 为文档站点引入 Sandbox 运行底座依赖：`apps/docs/package.json`（Refs: FR-007）
- [ ] T003 [P] 增加 Sandbox 静态资产同步脚本并接入 dev/build（可选支持同步多 kernel 资产：core/core-ng）：`apps/docs/scripts/sync-sandbox-assets.mjs`、`apps/docs/package.json`（Refs: FR-007, NFR-001）
- [ ] T004 [P] 新增 Playground UI 文案与 i18n 映射（中/英）：`apps/docs/src/components/playground/i18n.ts`（Refs: FR-011）

**Checkpoint**: 文档站点具备“可引入 Sandbox Client + 同源静态资产 + 基础文案/i18n”能力。

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 搭起可复用的 Playground 基础组件与运行控制（确定性 runId、有界输出、可取消/可重置）。

- [ ] T005 创建 PlaygroundBlock 基础组件与 Props 形态（title/level/observe/defaultPanels/moduleExport/code/budgets）：`apps/docs/src/components/playground/Playground.tsx`（Refs: FR-001, FR-004, FR-006）
- [ ] T006 实现文档侧 Sandbox 运行封装（init/试运行/取消（重置 worker）/有界缓存/确定性 runId；并从 TrialRunReport.environment 提取 kernelImplementationRef 摘要供 debug 展示）：`apps/docs/src/components/playground/sandbox.ts`（Refs: FR-002, FR-007, FR-008, NFR-003, NFR-004）
- [ ] T007 注册 MDX components，使文档可直接使用 `<Playground />`：`apps/docs/src/mdx-components.tsx`（Refs: FR-001）
- [ ] T008 实现教学默认面板骨架（Notes/Console/Result/State 的 tabs + 空状态）：`apps/docs/src/components/playground/panels/*`（Refs: FR-004）

**Checkpoint**: 可以在任意 MDX 页面渲染 `<Playground />`，并具备“可运行/可取消/输出有界”的基础能力（尚未要求编辑体验完善）。

---

## Phase 3: User Story 1 - 一键运行教学示例并获得“可观察结果” (Priority: P1) 🎯 MVP

**Goal**: 作者标记的示例块可一键运行，页面内展示成功/失败、耗时与关键输出摘要。

**Independent Test**: 在一篇包含示例块的文档页中，点击运行后能看到结果摘要；失败时能看到可理解错误与恢复建议。

- [ ] T009 [US1] 接入 `trialRunModule` 并渲染 RunResult 摘要（成功/失败/耗时/错误定位/恢复提示）：`apps/docs/src/components/playground/sandbox.ts`、`apps/docs/src/components/playground/panels/ResultPanel.tsx`（Refs: FR-008, FR-009）
- [ ] T010 [US1] 运行状态机与按钮交互（运行/取消/重跑入口）：`apps/docs/src/components/playground/Playground.tsx`（Refs: FR-002）
- [ ] T011 [US1] 新增 1 篇“可运行示例”文档页（中英）并挂到导航：`apps/docs/content/docs/guide/get-started/playground.mdx`、`apps/docs/content/docs/guide/get-started/playground.en.mdx`、`apps/docs/content/docs/guide/get-started/meta.json`、`apps/docs/content/docs/guide/get-started/meta.en.json`（Refs: SC-001）

**Checkpoint**: US1 单独完成即可对外演示“文档内一键运行 + 可观察结果”的最小闭环。

---

## Phase 4: User Story 2 - 随意编辑并重新运行，用于“探索式学习” (Priority: P1)

**Goal**: 读者可编辑示例并重跑，随时重置为作者提供的初始版本；多次运行不串扰。

**Independent Test**: 在同一示例块中完成“编辑 → 运行 → 再编辑 → 再运行 → 重置 → 再运行”。

- [ ] T012 [US2] 增加可编辑代码区（轻量 textarea 版）与 dirty/reset 逻辑：`apps/docs/src/components/playground/Editor.tsx`、`apps/docs/src/components/playground/Playground.tsx`（Refs: FR-003）
- [ ] T013 [US2] 确保跨运行不串扰（清理输出/状态/观测数据；runId 递增确定性）：`apps/docs/src/components/playground/sandbox.ts`（Refs: FR-002, FR-010, NFR-004）
- [ ] T014 [US2] 新增第 2 篇示例页（强调“编辑重跑”教学点，中英齐全）：`apps/docs/content/docs/form/playground.mdx`、`apps/docs/content/docs/form/playground.en.mdx`、`apps/docs/content/docs/form/meta.json`、`apps/docs/content/docs/form/meta.en.json`（Refs: SC-001, SC-002）

---

## Phase 5: User Story 3 - 作者可声明“观察点”与默认面板 (Priority: P2)

**Goal**: 作者可声明观察点与默认面板；无观察点时也有最小反馈；Playground UI 文案随站点语言切换。

**Independent Test**: 同一组件在中/英页面下显示对应语言文案；观察点在运行结果区清晰可见；默认面板按作者配置生效。

- [ ] T015 [US3] 支持 `observe/defaultPanels/level` Props 与渲染策略（含 observe 缺省 fallback）：`apps/docs/src/components/playground/Playground.tsx`、`apps/docs/src/components/playground/panels/NotesPanel.tsx`（Refs: FR-004, FR-005）
- [ ] T016 [US3] Playground UI 接入站点 i18n（读取当前语言并切换文案）：`apps/docs/src/components/playground/i18n.ts`、`apps/docs/src/components/playground/Playground.tsx`（Refs: FR-011）
- [ ] T017 [US3] 新增第 3 篇示例页（展示观察点 + 默认面板配置，中英齐全）：`apps/docs/content/docs/index.mdx`、`apps/docs/content/docs/index.en.mdx`（Refs: SC-001, SC-003）

---

## Phase 6: User Story 4 - 高级/Debug 文档可按需启用深度观测 (Priority: P3)

**Goal**: 仅在 debug 级示例中展示深度观测（Trace/时间线/事件摘要），普通教程不出现。

**Independent Test**: basic 示例看不到深度面板；debug 示例可看到并能与运行轮次关联。

- [ ] T018 [US4] 实现 debug-only 面板（最小 Trace/时间线视图）并接入有界 trace 数据（展示 `kernelImplementationRef` 与关键锚点：`instanceId/txnSeq/opSeq`）：`apps/docs/src/components/playground/panels/TracePanel.tsx`、`apps/docs/src/components/playground/Playground.tsx`（Refs: FR-006, FR-008, NFR-005）
- [ ] T019 [US4] 新增高级/Debug 示例页（默认开启 debug 并展示深度面板，中英齐全）：`apps/docs/content/docs/guide/advanced/playground-debug.mdx`、`apps/docs/content/docs/guide/advanced/playground-debug.en.mdx`、`apps/docs/content/docs/guide/advanced/meta.json`、`apps/docs/content/docs/guide/advanced/meta.en.json`（Refs: SC-003）

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: 收敛体验细节与质量门，确保 SC-004/SC-005 可交付。

- [ ] T020 统一预算默认值与“被截断/超时/取消”的用户可见提示：`apps/docs/src/components/playground/sandbox.ts`、`apps/docs/src/components/playground/panels/*`（Refs: FR-008, NFR-003, SC-004）
- [ ] T021 确保同页多示例块隔离（独立 client/独立状态/互不影响）并补齐手动验收清单：`apps/docs/src/components/playground/Playground.tsx`、`specs/041-docs-inline-playground/quickstart.md`（Refs: FR-010, SC-005）
- [ ] T022 更新作者侧使用说明（保持与 quickstart 一致）：`apps/docs/README.md`（Refs: FR-001, FR-005）
- [ ] T023 质量门验证：`pnpm -C apps/docs types:check` 与 `pnpm -C apps/docs build`（Refs: NFR-001）

---

## Dependencies & Execution Order

- Setup（Phase 1）可并行开始；完成后进入 Foundational（Phase 2）。
- US1/US2/US3/US4 均依赖 Foundational（Phase 2）。
- US1/US2 均为 P1，可在 Phase 2 完成后并行推进；但建议先把 US1 跑通作为 MVP 演示，再完善 US2。
- Polish（Phase 7）依赖至少完成 US1/US2；其余随交付范围收敛。

## Parallel Opportunities

- Phase 1 的 T002/T003/T004 可并行。
- Phase 2 的组件骨架（T005/T008）与 sandbox 封装（T006）可并行（但最终都依赖 T007 的 MDX 注册串起来验证）。
- 文档内容（T011/T014/T017/T019）可以在 UI 组件能力稳定后并行补齐中英页面。
