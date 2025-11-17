# Tasks: 015 Devtools Converge Performance Pane

**Input**: `specs/015-devtools-converge-performance/{spec.md,plan.md}`  
**Prerequisites**: 005 的数据源/聚合输出可在 devtools-react 消费；013 converge evidence 字段稳定

**Note**:

- 本 spec 属于 Devtools 交付面（组件/面板/Chrome 插件），按当前优先级整体延后：先完成 `specs/016-serializable-diagnostics-and-identity` 的 core hardening（单锚点 + 可序列化诊断 + setup-only）再推进。
- 任何涉及 `instanceId`/JsonValue/错误降级/diagnostics 分档 的横切口径，一律以 `specs/016-serializable-diagnostics-and-identity/tasks.md` 为唯一执行入口；本文件仅作为后续 Devtools 交付阶段的任务清单。

## Format: `- [ ] T### [P?] Description with file path`

## Phase 1: Setup

- [X] T001 增加 converge pane 的最小路由/入口与空态（无数据/无 converge evidence）在 `packages/logix-devtools-react/src/ui/perf/ConvergePerformancePane.tsx`
- [X] T002 [P] 定义 converge pane 的领域模型（ConvergeTxnRow/ConvergeAudit/ActionSnippet）在 `packages/logix-devtools-react/src/state/converge/model.ts`

## Phase 2: Audits Engine

- [X] T003 实现 Audits 引擎（CNV-001..CNV-008，纯函数，输入只来自 evidence；缺字段降级为 insufficient_evidence）在 `packages/logix-devtools-react/src/state/converge/audits.ts`
- [X] T004 [P] 实现“建议 + 可复制代码片段”生成器（Provider override 优先、runtime moduleId 其次，标注预期 `configScope`）在 `packages/logix-devtools-react/src/state/converge/snippets.ts`
- [X] T005 [P] Audits 单测：证据充足命中、证据不足降级、输出可序列化在 `packages/logix-devtools-react/test/ConvergeAudits.test.ts`

## Phase 3: Timeline Lanes (Converge)

- [X] T006 实现 converge lanes 的数据抽取与分组（moduleId+instanceId）在 `packages/logix-devtools-react/src/state/converge/compute.ts`
- [X] T007 [P] 实现 converge timeline 视图（复用 005 的 timeline 渲染/viewport；渲染 txn bar + decision/execution 分段 + reasons/configScope 标记）在 `packages/logix-devtools-react/src/ui/perf/ConvergeTimeline.tsx`
- [X] T008 [P] 实现详情面板（证据字段表 + Audits 列表 + 代码片段）在 `packages/logix-devtools-react/src/ui/perf/ConvergeDetailsPanel.tsx`
- [X] T009 [P] Timeline/Details 回归测试：light 降级不白屏，点击 txn 与 audit 高亮联动在 `packages/logix-devtools-react/test/ConvergeTimelinePane.test.tsx`

## Phase 4: Integration

- [X] T010 将 converge pane 接入现有数据源与聚合快照（live + evidence import），并保证排序一致性（seq/txn）在 `packages/logix-devtools-react/src/snapshot.ts`
- [X] T011 [P] 文档：补充 converge pane 的读法与“止血→纳入边界地图→回收覆盖”流程在 `apps/docs/content/docs/guide/advanced/debugging-and-devtools.md`
