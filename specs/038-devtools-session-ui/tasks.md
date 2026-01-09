# Tasks: Devtools Session‑First 界面重设计（Pulse + Txn Swimlanes + Hero Advisor）

**Input**: Design documents from `specs/038-devtools-session-ui/`
**Prerequisites**: `specs/038-devtools-session-ui/plan.md`、`specs/038-devtools-session-ui/spec.md`、`specs/038-devtools-session-ui/ui.md`、`specs/038-devtools-session-ui/data-model.md`、`specs/038-devtools-session-ui/research.md`、`specs/038-devtools-session-ui/contracts/`

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可并行（不同文件/无依赖）
- **[Story]**: `[US1]` / `[US2]` / `[US3]`（对应 `spec.md` 的用户故事）
- 每条任务必须包含明确文件路径

## Phase 1: Setup（实现约束与基础样式）

- [ ] T001 读取并遵守实现硬约束（D.I.D），并对齐 design-review 的审美裁决于 `specs/038-devtools-session-ui/ui.md`
- [ ] T002 [P] 在 Devtools 主题中补齐 Intent 变量（含 data-flow/data-impact/success/focus/highlight；并禁止组件内 hardcode 原色）于 `packages/logix-devtools-react/src/internal/theme/theme.css`
- [ ] T003 [P] 抽出 Pulse bucket 纯计算函数供 OverviewStrip/MicroSparkline 复用于 `packages/logix-devtools-react/src/internal/ui/overview/pulseBuckets.ts`
- [ ] T004 将 OverviewStrip 改为使用抽出的 bucket 计算（不再内联复杂 bucket 逻辑）于 `packages/logix-devtools-react/src/internal/ui/overview/OverviewStrip.tsx`

---

## Phase 2: Foundational（阻塞性前置：Runtime 协议升级 + 可信锚点）

**⚠️ CRITICAL**：本期不做“卡顿玩具 Graph UI”，先把 `linkId` 提拔为协议一等字段，解决“数据骨架骨感”的根因。

- [x] T005 在 `RuntimeDebugEventRef` 增加 `linkId?: string` 字段于 `packages/logix-core/src/internal/runtime/core/DebugSink.ts`
- [x] T006 在 `Debug.record` 对 `trace:effectop` 注入当前 Fiber 的 `linkId`（读取 `EffectOpCore.currentLinkId`），并在 `toRuntimeDebugEventRef` 将 `linkId` 提拔为一等字段（`trace:*` 支持从 `data.meta.linkId` 兜底提取）于 `packages/logix-core/src/internal/runtime/core/DebugSink.ts`
- [x] T007 [P] 更新事件协议文档：`RuntimeDebugEventRef` 增加 `linkId` 的字段与语义于 `docs/ssot/runtime/logix-core/observability/09-debugging.02-eventref.md`
- [ ] T008 [P] 补齐序列化回归：确保 `RuntimeDebugEventRef.linkId` 可 JSON 导出（至少覆盖 `trace:effectop`，并验证 `trace:*` 的 meta 兜底提取路径）于 `packages/logix-core/test/Debug/Debug.RuntimeDebugEventRef.Serialization.test.ts`
- [x] T009 将 OverviewStrip 的 txnKey 兜底归并从 “掏 `ref.meta.meta.linkId`” 迁移为优先使用 `ref.linkId`（必要时保留兼容兜底）于 `packages/logix-devtools-react/src/internal/ui/overview/OverviewStrip.tsx`

**Checkpoint**：到此为止，“链路锚点 linkId”成为 `RuntimeDebugEventRef` 的一等字段，消费侧优先使用 `ref.linkId`（必要时对 `trace:*` 做 meta 兜底），避免依赖深层 meta 作为主路径。

---

## Phase 3: User Story 1 - 以「交互会话」为入口定位问题 (Priority: P1) 🎯 MVP

**Goal**：Session Card 监控墙 + 右侧会话概览（不读全量 timeline 也能找方向）
**Independent Test**：触发一次 action 后，左侧新增会话卡片（含健康信号+Sparkline）；点击后右侧显示会话概览与脉冲

### Implementation（US1）

- [ ] T010 [US1] 在 DevtoolsState 增加会话域：`sessions[]/selectedSessionId/liveMode/pinned` 等字段于 `packages/logix-devtools-react/src/internal/state/model.ts`
- [ ] T011 [US1] 在 compute 层派生会话列表：按 `linkId → txnId → window` 聚合，计算指标/健康等级/退化原因/脉冲 buckets 于 `packages/logix-devtools-react/src/internal/state/compute.ts`
- [ ] T012 [US1] 增加会话交互 actions（selectSession/togglePinned/backToLive/setSessionSearch 等）于 `packages/logix-devtools-react/src/internal/state/logic.ts`

- [ ] T013 [P] [US1] 新增 MicroSparkline（SVG `<path>` + 平滑曲线 + 渐变填充；使用 `--intent-data-flow/--intent-data-impact`；禁止 div bars）于 `packages/logix-devtools-react/src/internal/ui/session/MicroSparkline.tsx`
- [ ] T014 [P] [US1] 新增 SessionCard（Card 化、Intent 渗色、Hover/Active 物理反馈、禁网格边框）于 `packages/logix-devtools-react/src/internal/ui/session/SessionCard.tsx`
- [ ] T015 [US1] 新增 SessionList/MonitorWall（渲染会话卡片列表 + 搜索/空态）于 `packages/logix-devtools-react/src/internal/ui/session/SessionNavigator.tsx`
- [ ] T016 [US1] 新增 SessionWorkbench 概览区（Header + pulses + 基本指标；danger 先占位）于 `packages/logix-devtools-react/src/internal/ui/session/SessionWorkbench.tsx`
- [ ] T017 [US1] 重排 DevtoolsShell：用 “SessionNavigator + SessionWorkbench” 替换 timeline-first 布局于 `packages/logix-devtools-react/src/internal/ui/shell/DevtoolsShell.tsx`

### Tests（US1）

- [ ] T018 [P] [US1] 新增会话派生确定性测试（同一事件输入 → 会话数/范围/指标一致）于 `packages/logix-devtools-react/test/internal/DevtoolsSessionDerivation.unit.test.ts`
- [ ] T019 [P] [US1] 新增 MicroSparkline 渲染测试（必须产出 `<path>`，并具备渐变 fill）于 `packages/logix-devtools-react/test/internal/MicroSparkline.test.tsx`

**Checkpoint**：US1 完成后，开发者无需阅读全量事件即可定位“哪次会话不健康、为何不健康”。

---

## Phase 4: User Story 2 - Devtools 给出“处方”，而不是只给数据 (Priority: P2)

**Goal**：Advisor 处方卡片 + danger Hero Banner（结论先行，点击可 pin 证据）
**Independent Test**：制造一次 waterfall 或 degraded 会话，进入详情后出现至少 1 条 finding（含证据 + 建议）；danger 时顶部出现 Hero Banner

### Implementation（US2）

- [ ] T020 [US2] 定义/派生 AdvisorFinding：waterfall / degraded / unknown_write（带 EvidenceRef）于 `packages/logix-devtools-react/src/internal/state/converge/audits.ts`
- [ ] T021 [P] [US2] 新增 AdvisorHero（Header 状态流转的 Hero：danger 渗色 + 大白话结论 + 点击 pin；禁止插入大块 Banner）于 `packages/logix-devtools-react/src/internal/ui/session/AdvisorHero.tsx`
- [ ] T022 [P] [US2] 新增 AdvisorPanel（finding 列表：结论/证据/建议；点击证据联动高亮）于 `packages/logix-devtools-react/src/internal/ui/session/AdvisorPanel.tsx`
- [ ] T023 [US2] 将 AdvisorHero/AdvisorPanel 接入 SessionWorkbench，并实现 evidence pin 的状态联动于 `packages/logix-devtools-react/src/internal/ui/session/SessionWorkbench.tsx`

### Tests（US2）

- [ ] T024 [P] [US2] 新增 finding 规则回归：waterfall/degraded/unknown_write 至少覆盖 1 条于 `packages/logix-devtools-react/test/internal/AdvisorFindings.test.ts`

---

## Phase 5: User Story 3 - 在不丢失细节的前提下降噪 (Priority: P3)

**Goal**：细节下钻仍可用，但默认降噪；主时间轴采用 Txn Swimlanes（胶囊化）
**Independent Test**：选中会话后切换到详情时间轴，只显示会话范围内事件；事件按 txn 分泳道聚合；可一键回到全局视角

### Implementation（US3）

- [ ] T025 [US3] 将平铺 timeline 改为 Txn Swimlanes（groupBy(txnId) + 胶囊容器 + 折叠/展开 + converge 高亮（指示条/表面着色，使用 `--intent-highlight-focus`）+ 连接线）于 `packages/logix-devtools-react/src/internal/ui/timeline/EffectOpTimelineView.tsx`
- [ ] T026 [US3] 会话范围与 Timeline/Inspector 联动：选中会话默认设置 `timelineRange`，并提供 “Show all” 清空过滤于 `packages/logix-devtools-react/src/internal/state/logic.ts`
- [ ] T027 [US3] Inspector 在会话过滤下保持一致（选中事件/状态快照来源不漂移）于 `packages/logix-devtools-react/src/internal/ui/inspector/Inspector.tsx`

### Tests（US3）

- [ ] T028 [P] [US3] 更新 timeline 视图测试：覆盖泳道分组、折叠胶囊、converge 高亮于 `packages/logix-devtools-react/test/internal/EffectOpTimelineView.test.tsx`

---

## Phase 6: Polish & Cross‑Cutting

- [ ] T029 [P] 统一 UI 的 Intent 用法与 D.I.D 约束（避免回退到 border 网格/硬编码颜色/div bars）于 `specs/038-devtools-session-ui/ui.md`
- [ ] T030 [P] 更新 quickstart（补充“监控墙/泳道/英雄处方”的用户心智）于 `specs/038-devtools-session-ui/quickstart.md`
- [ ] T031 通过质量门（typecheck/lint/test），并确保 `SC-006` 的确定性用例可回归于 `specs/038-devtools-session-ui/spec.md`

---

## Dependencies & Execution Order

- Phase 1 → Phase 2 → US1 → US2/US3 → Polish
- US2/US3 依赖 US1 的会话派生与工作台壳，但可在 UI 组件层并行推进（标记为 [P] 的任务）

## Parallel Example（US1）

- 可并行：`T013`（MicroSparkline）+ `T014`（SessionCard）+ `T018`（派生测试）+ `T019`（渲染测试）
