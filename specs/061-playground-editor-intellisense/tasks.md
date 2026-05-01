# Tasks: 061 Playground 编辑器智能提示（Logix 全量补全）

**Input**: `specs/061-playground-editor-intellisense/spec.md` + `specs/061-playground-editor-intellisense/plan.md`
**Optional**: `specs/061-playground-editor-intellisense/research.md` / `specs/061-playground-editor-intellisense/contracts/README.md` / `specs/061-playground-editor-intellisense/quickstart.md`

**Tests**: 本特性以手工验收为主（见 `specs/061-playground-editor-intellisense/quickstart.md`），不强制新增单测。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可并行（不同文件、无依赖）
- **[Story]**: 用户故事标签（`[US1]` / `[US2]` / `[US3]`）

---

## Phase 1: Setup (Shared Infrastructure)

- [x] T001 [P] 确认 Monaco 依赖已加入 `examples/logix-sandbox-mvp/package.json`（`monaco-editor`、`@monaco-editor/react`）
- [x] T002 [P] 增加生成物忽略规则（治理：匹配 plan Q002）：在 `examples/logix-sandbox-mvp/.gitignore` 忽略 `src/components/editor/types/monacoTypeBundle.generated.ts`（及未来分块文件）
- [x] T003 在 `examples/logix-sandbox-mvp/package.json` 增加 `gen:monaco:types` 并把它接入 `dev/build/typecheck`（确保缺失时自动生成）

---

## Phase 2: Foundational (Blocking Prerequisites)

**⚠️ CRITICAL**：本阶段完成前，不开始任何用户故事验收；否则会出现“编辑器能渲染但无类型/无补全”的漂移。

- [x] T004 [P] 定义 Type Bundle 结构类型：`examples/logix-sandbox-mvp/src/components/editor/types/monacoTypeBundle.ts`
- [x] T005 实现生成脚本（递归收集传递依赖 types + 版本摘要 + 幂等跳过）：`examples/logix-sandbox-mvp/scripts/generate-monaco-type-bundle.ts`
- [x] T006 [P] 增加 Monaco Worker 路由与 Vite 兼容加载：`examples/logix-sandbox-mvp/src/components/editor/monacoWorkers.ts`
- [x] T007 [P] 实现 TS Worker 入口（在 Worker 内加载 bundle 并注入 `extraLibs`，并应用 `lib` 不含 DOM 的 compilerOptions）：`examples/logix-sandbox-mvp/src/components/editor/workers/ts.worker.ts`
- [x] T008 [P] 实现 Type Sense 安装与状态机（lazy + ready/error + `typeSenseReadyMs` 计时）：`examples/logix-sandbox-mvp/src/components/editor/typesense.ts`
- [x] T009 替换编辑器组件为 Monaco + fallback textarea，并支持 `language/filename/enableTypeSense` + 外部 `code` 更新策略（尽量保留 viewState，重置时可预期）：`examples/logix-sandbox-mvp/src/components/Editor.tsx`
- [x] T010 [P] 在编辑器 UI 提供基础格式化入口（format document/selection）：`examples/logix-sandbox-mvp/src/components/Editor.tsx`

---

## Phase 3: User Story 1 - Logix 程序完整智能提示与诊断 (Priority: P1) 🎯 MVP

**Goal**: `/playground` 与 `/ir` 的“代码编辑入口”具备补全/悬浮/跳转/诊断，并能覆盖 Logix 核心写法。

**Independent Test**: 按 `specs/061-playground-editor-intellisense/quickstart.md` 的第 1/2 步逐项验证。

- [x] T011 [US1] 接入 `/playground` TS 模式（filename 对齐运行时编译名）：`examples/logix-sandbox-mvp/src/App.tsx`
- [x] T012 [US1] 接入 `/ir` TS 模式（与 `/playground` 同口径）：`examples/logix-sandbox-mvp/src/ir/IrPage.tsx`
- [x] T013 [US1] 如需调整默认示例以提升补全/诊断覆盖，更新：`examples/logix-sandbox-mvp/src/modules/SandboxImpl.ts`

---

## Phase 4: User Story 2 - 示例项目允许依赖的全量补全 (Priority: P2)

**Goal**: 对 `effect` / `@logixjs/*` / 以及其必要传递依赖，编辑器侧不出现“无法解析模块/类型”的基础阻断，并可解释当前 bundle 的覆盖范围与版本摘要。

**Independent Test**: 按 `specs/061-playground-editor-intellisense/quickstart.md` 的第 1 步（导入 + 悬浮）与第 3 步（故意破坏加载）验证。

- [x] T014 [US2] 扩展/固化“允许依赖集合”与 allow/deny list（递归闭包策略落地在生成脚本）：`examples/logix-sandbox-mvp/scripts/generate-monaco-type-bundle.ts`
- [x] T015 [US2] 在 UI 展示 bundle meta（`meta.packages` + 可选 `meta.stats`，便于诊断）：`examples/logix-sandbox-mvp/src/components/editor/typesense.ts`

---

## Phase 5: User Story 3 - 体验稳定、可诊断、可降级 (Priority: P3)

**Goal**: 满足 NFR-001/002/003/004 的预算、稳定性与降级要求。

**Independent Test**: 按 `specs/061-playground-editor-intellisense/quickstart.md` 的第 0/3/4 步验证。

- [x] T016 [US3] 确保“≤500ms 可输入”路径：Monaco/Type Sense 采用懒加载与渐进就绪（必要时先渲染 textarea 再升级），并记录 `inputReadyMs`：`examples/logix-sandbox-mvp/src/components/Editor.tsx`
- [x] T017 [US3] 修复/规避路由切换资源泄漏：monaco model/worker 复用或正确 dispose（保证 20 次切换不单调增长）：`examples/logix-sandbox-mvp/src/components/editor/typesense.ts`
- [x] T018 [US3] 完成失败可诊断与恢复建议 + textarea 降级可运行：`examples/logix-sandbox-mvp/src/components/Editor.tsx`

---

## Phase N: Polish & Cross-Cutting Concerns

- [x] T019 [P] 若实现细节与内部约定不同步，更新：`specs/061-playground-editor-intellisense/contracts/README.md`
- [x] T020 按示例工程脚本跑通质量门：`examples/logix-sandbox-mvp/package.json`（`pnpm -C examples/logix-sandbox-mvp typecheck` / `pnpm -C examples/logix-sandbox-mvp build`）
- [x] T021 跑通整套验收步骤并修复漂移：`specs/061-playground-editor-intellisense/quickstart.md`

---

## Phase N+ : Acceptance Automation (Optional but Recommended)

- [x] T022 [P] 增加 SPA 导航入口（避免整页刷新，便于 SC-004 20 次切换验收）：`examples/logix-sandbox-mvp/src/pages/_shared/SandboxShell.tsx`、`examples/logix-sandbox-mvp/src/ir/IrPage.tsx`
- [x] T023 [P] 暴露最小 Monaco 测试钩子（用于 e2e 读取诊断 markers）：`examples/logix-sandbox-mvp/src/components/Editor.tsx`
- [x] T024 [P] 新增一键 e2e 验收脚本（覆盖 NFR-001 / SC-003 / SC-004 / FR-008），并同步 quickstart：`specs/061-playground-editor-intellisense/scripts/e2e-acceptance.cjs`、`specs/061-playground-editor-intellisense/quickstart.md`

---

## Dependencies & Execution Order

- Phase 1 → Phase 2（阻塞）：生成脚本/worker/typesense/editor 必须先可用。
- Phase 3/4/5：都依赖 Phase 2；可按 P1 → P2 → P3 顺序推进。
- Phase N：依赖至少完成 P1；最终以 `quickstart.md` 全量验收为准。
