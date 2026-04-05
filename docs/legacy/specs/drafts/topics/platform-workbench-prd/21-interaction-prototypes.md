---
title: 21 · 关键流程原型（线框 + 交互）（Platform Workbench PRD）
status: draft
version: 2025-12-19
value: core
priority: now
related:
  - ./20-information-architecture.md
  - ./22-rule-grid-and-validation.md
  - ./23-live-spec-and-scenario-editor.md
  - ../intent-studio-ux/00-overview.md
  - ../sdd-platform/05-intent-pipeline.md
  - ../sandbox-runtime/35-playground-product-view.md
  - ../../../sdd-platform/workbench/ui-ux/00-platform-ui-and-interactions.md
---

# 21 · 关键流程原型（线框 + 交互）（Platform Workbench PRD）

> 目标：用最低保真（文本线框）把 MVP‑1/2 的关键页面与交互跑通，避免“先做 UI 再发现信息架构不成立”。

## P0 · Workbench Shell（统一三栏布局）

```
┌──────────────────────────────────────────────────────────────────────┐
│ TopBar: Project ▾  Branch ▾   Search…   Run ▾   Agent ▾   User ▾     │
├───────────────┬───────────────────────────────┬──────────────────────┤
│ Left Nav      │ Main                           │ Right Panel          │
│ - Dashboard   │ (当前页面主体)                 │ (Context / Inspector)│
│ - Features    │                               │ - 属性/配置表单       │
│ - Modules     │                               │ - Diff / Preview      │
│ - Rules       │                               │ - AI Assist           │
│ - Playground  │                               │                      │
│ - Runs        │                               │                      │
└───────────────┴───────────────────────────────┴──────────────────────┘
```

交互要点：

- 左侧导航只切“对象类型”（Feature/Module/Rule/Run），对象列表在 Main 内二级呈现；
- Right Panel 永远服务“当前选中对象”（规则行/模块节点/场景步骤），不混入全局信息；
- 所有对象都具备统一的 “ID / Revision / Owner / Status / Last Run” 摘要卡片。

## P1 · Feature → Scenario → Run（MVP‑1 主旅程）

### Feature 详情页（主视图）

```
Main:
  Feature Header: name / status / last alignment / sign-off
  Tabs: [Spec] [Scenarios] [Blueprint] [Rules] [Runs]

  Scenarios Tab:
    - Scenario List (绿/红灯 + last run time + owner)
    - Button: + New Scenario
    - Quick Actions: Run All / Generate Plan (Agent)

  Spec Tab (Live Spec):
    - Rich text + Intent Blocks (UserStory / DomainConcept / Scenario / Risk)
    - Scenario blocks show status lights + pin/latest + last report
    - Actions: Insert Block (/) / Review / Sign-off

Right Panel:
  When select scenario row -> show Scenario Summary + Actions:
    [Open] [Run] [View Last Report]
```

关键交互：

- Scenario 行点击“Run”后，直接跳转 Playground 并自动选中该场景（保留 breadcrumb）。
- Feature 的 “Run All” 必须产出一个批量 Run 的聚合报告（哪怕 MVP 先是列表）。

### Spec Tab · Live Spec 编辑（富文本 + Blocks + 评论锚点）

```
Main: Live Spec
  Top: docId / revisionId / status lights / [Sign-off]
  Left: Outline
    - User Stories
    - Scenarios
    - Domain Concepts
    - Risks / No-Go
  Center: Rich text editor (paragraphs + embedded blocks)
    - Scenario Block Card: lights(spec/scenario/evidence) + pinned/latest + [Open Scenario] [Run]

Right Panel (selection driven):
  - Block Inspector (structured fields)
  - Comments (threads anchored to blockId/stepId; orphaned threads need re-anchor)
```

交互要点：

- 插入 Block 用 `/` 命令或工具栏；平台分配稳定 `blockId`，跨 doc revision 复用（见 `23-live-spec-and-scenario-editor.md`）。
- Scenario Block 的状态灯必须拆分显示：Spec/Scenario/Evidence，避免“绿了但 pinned/outdated”。
- 评论/审阅必须绑定 `Anchor`（blockId/stepId/ruleId/code），否则 revision 变更会导致讨论漂移。

## P2 · Scenario 编辑（Given‑When‑Then vs Steps）

### 结构（MVP‑1 推荐 Steps First）

```
Main: Scenario Detail
  Header: scenario name / status / last run
  Left Column: Step List
    - Step1 ... (covered/pending)
    - Step2 ...
    - + Add Step
  Center: Step Editor
    - intent: (select / click / input)
    - target: (semantic widget ref)
    - payload: (structured)
  Bottom: Expectations
    - state predicates (optional in MVP-1)

Right Panel:
  - Linked Rules (IntentRuleSet filtered)
  - Linked Runs (recent)
```

交互要点：

- Steps 的每次编辑都产生 `scenarioRevisionId`（append‑only），Run 只能针对某个 revision；
- 未来可在同一页面增加 Given‑When‑Then 富文本视图，但底层仍落到 Steps（便于可执行与对齐）。

## P3 · IntentRule Explorer（MVP‑2 主旅程）

### 规则表（Keyboard‑First）

```
Main: Rule Explorer
  Filters: Module ▾  Feature ▾  Scenario ▾  Tag ▾  (search)
  Table columns:
    - Source (context/type/selector)
    - Pipeline (chips: debounce/throttle/filter/…)
    - Sink (context/type/handler ref)
    - Mode (whitebox / graybox / raw)
    - Last Triggered (from runs)

Right Panel (when select a row):
  - Rule form (structured)
  - Code Preview (generated fluent chain)
  - Actions: [Generate Patch] [Open in Code] [Run Scenario]
```

交互要点（对齐 `../../../sdd-platform/impl/README.md`）：

- 默认只允许编辑“白盒子集”规则；Gray/Raw 只给跳转与建议，不做结构化编辑。
- “Generate Patch” 必须是可回滚的补丁集（但平台不做自动 git 操作），并且生成后能再解析回等价 IntentRule。

补充：键盘与校验（PM/高频用户）

- 规则表格支持“Excel 级”操作：复制粘贴、批量填充、向下填充、快速插行/删行；
- 规则行级校验分两类：
  - **硬错误**（确定性）：冲突、循环、非法写入、缺失必填字段 → 阻止生成 patch；
  - **软建议**（可选）：遗漏补全、治理建议 → 允许一键应用（但需审阅）。

## P4 · Playground（MVP‑0/1 主旅程）

Playground 的页面结构与交互细节以 `../sandbox-runtime/35-playground-product-view.md` 为准，本 Topic 只补一条“Workbench 集成形态”的原型：

```
Main: Playground (Scenario Scoped)
  Top: [Run] [Stop] [Reset]    runId / duration / status
  Left: Scenario Steps + Spec summary + Linked Rules (optional)
  Center: Code/Config Summary (readonly in MVP-1)
  Right: UI Preview + Tabs(State / Logs / Trace / Intent*)
```

集成要点：

- Playground 必须能被 Feature/Scenario 详情页深链到 `scenarioId + revisionId`；
- RunResult 必须可回放（Runs 页或 Scenario 详情内）。

## P5 · Feature Pipeline（Stage 0–3 的流水线视图）

> 对齐：`../sdd-platform/05-intent-pipeline.md` 的 Stage 0–3。

```
Main: Feature Pipeline
  Columns:
    Stage 0 · Requirement (raw)   | Stage 1 · Domain | Stage 2 · Schema/Module | Stage 3 · Rules/Logic

  Each column shows:
    - Artifacts list (with status light)
    - AI suggestions (translucent cards)
    - Sign-off checkpoints

Right Panel (selection driven):
  - Traceability: derivedFrom / anchors
  - Actions: [Accept Suggestion] [Open Spec] [Open Rules] [Open Code] [Run Scenario]
```

关键交互：

- 任意 artifact 的卡片都必须显示 `derivedFrom`（来源锚点），支持一键回跳；
- “AI 建议”与“已确认”必须在视觉上严格区分（避免把建议当真理源）。

## P6 · Intent Studio（决策表 / 左文-中表-右果）

> 对齐：`../intent-studio-ux/00-overview.md`。

```
Main: Intent Studio
  A (Left): Input Stream (rich text / pasted PRD snippets)
  B (Center): Smart Grid (Decision Table: When/If/Then)
  C (Right): Health Check (conflicts + payload preview)

Bottom:
  - Preview: generated IntentRuleSet JSON
  - Actions: [Validate] [Publish RuleSet] [Generate Patch]
```

关键交互：

- A↔B 双向高亮：网格中某一行规则必须能回跳到原文片段（最小 traceability）；
- 校验默认算法优先（SAT/图分析），AI 只做建议，不做裁决；
- 发布 RuleSet 必须生成新 revision，并记录审计信息（谁/为什么/基于哪个 baseRevision）。

## P7 · Universe（模块拓扑 + 治理信号）

```
Main: Universe
  Left: Zones/Modules Tree
  Center: Graph (modules + edges)
  Top: Filters (domain / risk / runtimeTarget)

Right Panel (when select node/edge):
  - Module summary (exports/imports/providers)
  - Governing signals:
      * cycle risk
      * cross-domain coupling
      * unmodeled deps
  - Actions: [List Rules] [Open Code] [Open Runs]
```

关键交互：

- 模块节点必须能 Drill‑down 到“该模块关联的规则/场景/运行证据”；
- 治理信号只做提示，不在 MVP 阶段自动修复（修复走 Agent/任务）。

## P8 · Runs / Reports（回放 + Diff）

```
Main: Runs
  List: runs (scenarioRevisionId, status, duration, passed)
  Compare: pick two runs -> diff (stateDiff + key trace spans)

Right Panel:
  - AlignmentReport summary
  - Violations list (each links to ruleId / code anchor)
```

关键交互：

- Diff 默认以“对齐锚点”为索引（stepId/ruleId/txnSeq/opSeq），避免纯文本 diff 难以解释；
- 一键生成“可交接诊断包”（给开发或 Agent 的最小 Context Pack）。
