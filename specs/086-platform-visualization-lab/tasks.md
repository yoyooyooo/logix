# Tasks: Platform Visualization Lab（086 · examples/logix-react 的独立可视化 POC）

**Input**: `specs/086-platform-visualization-lab/spec.md`、`specs/086-platform-visualization-lab/plan.md`  
**Prerequisites**: `specs/086-platform-visualization-lab/plan.md`（required）、`specs/086-platform-visualization-lab/spec.md`（required）

**Tests**: 本特性仅落点在 `examples/logix-react`；以 `pnpm -C examples/logix-react typecheck` 作为最小质量门。

**Organization**: 任务按 User Stories 分组；每个页面只承载一个可视化能力（独立颗粒度）。

**Traceability**: 每条任务末尾必须标注 `Refs:`，引用本 feature 的 `FR-*`/`NFR-*`/`SC-*`；纯载体任务写 `Refs: —` 并注明原因。

## Phase 0: Planning Artifacts（Already Done）

- [x] P000 `spec.md`/`plan.md` 已具备可执行口径（Refs: —，规划产物）

---

## Phase 1: Routing & Navigation（Blocking Prerequisites）

- [ ] T010 在 `examples/logix-react` 新增 `/platform-viz` 入口路由与侧边栏导航入口（Refs: FR-001, SC-001）
- [ ] T011 新增 `/platform-viz` index 页面：引导到 Manifest / Diff，并提供 TrialRun Evidence 直达链接（Refs: FR-001, SC-001, SC-003）

---

## User Story 1 - Manifest Inspector（单模块 IR 可解释） (Priority: P1)

- [ ] T020 新增 `ManifestInspector` 页面：可选择一个 module-like 对象，并调用 `Logix.Reflection.extractManifest`（Refs: FR-002, SC-001, SC-002）
- [ ] T021 展示摘要视图（moduleId/digest/计数）+ Raw JSON（pretty JSON + 一键复制 + 可滚动）（Refs: FR-002, NFR-002）
- [ ] T022 缺失可选字段时显式提示（例如 `servicePorts` pending 078），不得崩溃（Refs: FR-004）
- [ ] T023 提供 budgets 演示入口（`maxBytes`/`includeStaticIr`），并对裁剪标记做可解释提示（Refs: NFR-002, FR-004）

---

## User Story 2 - Manifest Diff Viewer（门禁化差异可视化） (Priority: P1)

- [ ] T030 新增 `ManifestDiffViewer` 页面：支持 before/after 模块选择与 JSON 粘贴输入，并生成 diff（Refs: FR-003, SC-001, SC-002）
- [ ] T031 展示 verdict + summary + changes（severity/code/pointer/message/details），并提供 Raw JSON（Refs: FR-003）
- [ ] T032 JSON 粘贴输入做最小字段校验；失败必须可解释并阻止计算（Refs: FR-003, FR-004）

---

## User Story 3 - TrialRun Evidence Inspector（动态证据可视化） (Priority: P2)

- [ ] T040 在 `/platform-viz` index 或相关页面提供直达 `/trial-run-evidence` 的入口（复用既有 Demo）（Refs: SC-003）

---

## Polish & Regression Defenses（Required）

- [ ] T050 确认本特性未引入 Node-only 依赖到浏览器 bundle（避免 `ts-morph/swc/fs` 等 import）（Refs: FR-005）
- [ ] T051 跑通 `examples/logix-react` 的类型检查（Refs: —，质量门）

---

## 既有文档措辞同步（延后到本需求收尾阶段）

- [ ] T060 同步 SSoT/既有文档：补齐 Visualization Lab 的定位与导航入口（Manifest/Diff/TrialRun/Workflow slices）到平台文档索引 `docs/ssot/platform/**`（Refs: —，仅措辞/导航对齐）
