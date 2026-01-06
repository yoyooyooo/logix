---
title: 23 · Live Spec 与 Scenario 编辑器（Platform Workbench PRD）
status: draft
version: 2025-12-19
value: core
priority: now
related:
  - ./10-requirements-and-mvp.md
  - ./20-information-architecture.md
  - ./21-interaction-prototypes.md
  - ./22-rule-grid-and-validation.md
  - ./31-data-model-and-contracts.md
  - ./32-collaboration-and-permissions.md
  - ./33-alignment-and-diagnostics.md
  - ../sdd-platform/ui-ux/03-spec-studio.md
  - ../sdd-platform/05-intent-pipeline.md
  - ../sdd-platform/11-spec-to-code-mvp.md
  - ../sdd-platform/ui-ux/04-semantic-ui-modeling.md
  - ../sandbox-runtime/35-playground-product-view.md
  - ../sandbox-runtime/65-playground-as-executable-spec.md
  - ../../../sdd-platform/workbench/ui-ux/00-platform-ui-and-interactions.md
  - ../../../sdd-platform/ssot/assets/00-assets-and-schemas.md
---

# 23 · Live Spec 与 Scenario 编辑器（Platform Workbench PRD）

> 目标：把 L0/SPECIFY 阶段的“Live Spec（富文本 + Intent Blocks）”与 Scenario（Steps‑First）编辑器收敛到可实现粒度，并明确：
>
> - 块模型（Block Model）：哪些结构化块是平台一等公民
> - 版本化与协作：谁能改、怎么 review/sign‑off、如何并发处理
> - 锚点与对齐：Spec/Step 如何与 Rule/Code/RunResult 形成可解释闭环

## 1. 范围与非目标

### 1.1 本文覆盖

- Live Spec 的块模型：最小必需 block 类型、字段形状、输出契约
- Scenario 编辑器：Steps‑First 模型、Step 类型、与 UI_INTENT/断言的映射
- 与协作/审计/对齐报告的接口：anchors/derivedFrom/diagnostics 的一致性

### 1.2 本文不覆盖

- 不设计完整的“文档 ↔ 代码”自动双向同步（MVP 默认单向 Doc→下游资产，代码侧漂移只做 Outdated 提示）
- 不拍板具体富文本引擎选型（Tiptap/ProseMirror/BlockNote 等属于实现层）
- 不引入第二套 IR：规则层仍以 `IntentRule` 为唯一规则 IR（见 `22-rule-grid-and-validation.md`）

## 2. Live Spec 的数据模型（最小）

### 2.1 关键裁决：文档与资产的关系

Live Spec 是“可编辑文档”，但平台的可执行资产（Feature/Scenario/RuleSet/Run/Report）必须可独立版本化与审计。

建议关系：

- Live Spec 文档本身是 `FeatureRevision` 的组成部分（承载背景/约束/风险等）
- Scenario/RuleSet 等可执行资产是独立 Artifact（revision‑first），Live Spec 通过 block 进行嵌入/引用

### 2.2 SpecDocRevision（占位）

```json
{
  "docId": "doc_feature_region_selector",
  "revisionId": "rev_2025_12_19_0100",
  "blocks": [
    { "blockId": "blk_story_001", "kind": "userStory", "data": {} },
    { "blockId": "blk_entity_001", "kind": "domainConcept", "data": {} },
    { "blockId": "blk_scn_001", "kind": "scenario", "data": { "scenarioId": "scn_region_selector_happy_path" } }
  ]
}
```

约束：

- `blockId` 必须稳定（跨 revision 复用），用于评论/审计/溯源
- `blocks[*].data` 必须是 JsonValue（可序列化）

## 3. Intent Blocks（结构化块）清单

> 块的目标不是“更漂亮的 UI”，而是把 L0 产物变成可计算资产：可生成 Pipeline/Blueprint，可运行、可对齐、可回放。

### 3.1 Feature Group / Epic（可选）

- 作用：聚合多个 Feature 的容器（范围与胃口）
- MVP 可不实现；但若实现，需提供稳定 epicId，并能作为权限/审计边界

### 3.2 User Story Block（必须）

输入形态：`As a <Role>, I want <Feature>, So that <Benefit>`

输出契约（最小）：

- 可生成/更新 Feature 的目标与用户价值（供 Pipeline/对齐报告摘要展示）
- 可作为 AI 提问与边界澄清的上下文（Spec Agent）

### 3.3 Domain Concept Block（建议）

作用：在 SPECIFY 阶段提前固化领域名词与字段原型（避免后续命名漂移）。

输出契约（最小）：

- `entityId` + 字段草稿（name/type/description）
- `derivedFrom`：引用原文片段/外部 PRD

> 后续可被 Pipeline Stage 1–2 结晶为 ModuleIntent/Schema（见 `../sdd-platform/05-intent-pipeline.md`）。

### 3.4 Scenario Block（必须）

作用：SPECIFY 的可执行入口；每个 Scenario 必须能被 Playground 运行并产出 AlignmentReport。

块字段（最小）：

- `scenarioId`（稳定）
- `pinnedRevisionId?`（可选：是否 pin 到某个 revision；默认跟随 latest）
- `status`：draft/in_review/signed_off
- `lastRun?`：{ runId, passed, at }（只读投影）

Scenario 的内容不建议直接塞进 block data，而应引用独立 `ScenarioRevision`（见 `31-data-model-and-contracts.md`）。

### 3.5 Logic Flow（Gherkin / Natural Language）（可选）

用途：帮助 PM 用自然语言表达“Given/When/Then”，由 AI/编译器转成 Steps 草稿。

裁决：

- 对齐闭环必须以 Steps 为准（可执行、可对齐）；Gherkin 只是输入法，不是事实源。

### 3.6 UI Sketch / Semantic UI Tree（建议）

用途：在 SPECIFY 阶段把“页面大致长什么样”转为语义组件树（UiPort），为后续 UI_INTENT/Step 对齐提供锚点。

对齐原则：

- 平台编辑的是 UiPort/UiBinding/UiSignal，而不是 JSX/样式
- 相关协议见：`../sdd-platform/ui-ux/04-semantic-ui-modeling.md`

### 3.7 Risk / No‑Go Block（建议）

用途：显式记录不可做/不支持/风险假设（避免 AI/开发补齐“用户没要的东西”）。

输出契约：

- 在生成 Context Pack 时必须注入（作为硬约束）
- 在 Sign‑off 时必须可见（作为审批要点）

## 4. Scenario 编辑器（Steps‑First）

### 4.1 为什么 Steps‑First（裁决）

Steps‑First 可以把 Scenario 变成：

- 可执行输入（Playground/Worker）
- 可覆盖（Step covered/pending）
- 可解释（stepId ↔ UI_INTENT ↔ trace ↔ stateDiff）

### 4.2 Step 类型（最小集合）

保持与 `31-data-model-and-contracts.md` 兼容：

- `ui-intent`：用户交互意图（选择/点击/输入）
- `assert`：断言（stateSnapshot/stateDiff/trace 条件）
- `note`：说明（不参与执行）

### 4.3 `ui-intent` 的 payload（建议）

最小字段：

- `intentId`（稳定，建议由平台分配）
- `widgetId`（指向语义组件实例 id）
- `action`：`select | click | input`
- `value?`：结构化值

> 运行时侧必须透传 `stepId/intentId`（见 `33-alignment-and-diagnostics.md` 与 `sandbox-runtime/*`）。

### 4.4 `assert` 的 payload（建议）

建议先支持 state 断言（MVP‑1）：

- `{ path, op, value }`（例如 includes/equals/notEmpty）

后续再扩展：

- trace 断言（span 发生、ruleId 被触发等）
- 性能断言（duration budget 等）

## 5. 版本化、协作与 Sign‑off

对齐 `32-collaboration-and-permissions.md`：

- 编辑 Scenario 创建新 `ScenarioRevision`（append‑only）
- ScenarioBlock 可以选择：
  - 跟随 latest（默认，便于快速迭代）
  - pin 到某个 revision（便于审阅/回放稳定证据）
- Sign‑off 的最小门禁：
  - 未签核的 Scenario 可 Run，但 RunResult 标记为 `unapproved_input`
  - 已签核的 Scenario 的任何修改都必须产生新 revision，并要求重新 sign‑off 才能作为“正式证据”

## 6. 锚点与溯源（必须）

对齐闭环依赖统一锚点（Anchor）：

- Spec：docId/blockId/scenarioId/stepId
- Rule：ruleId（以及 ruleSetRevisionId）
- Code：file/span/contentHash（必要时补 symbol）
- Runtime：runId/txnSeq/opSeq/spanId（必要时补 intentId/stepId）

建议：

- ScenarioStep 必须包含 `stepId`（稳定）与可选 `intentId`
- ScenarioBlock 必须能展示：
  - last alignment 状态（passed/failed）
  - 失败违规项（Violation）列表（点击跳转到 stepId/ruleId/code anchor）

### 6.1 Anchor（统一锚点结构，建议形状）

> 原则：锚点的职责是“可回跳 + 可对齐”，不是“携带全部上下文”。结构必须 Slim 且可序列化（JsonValue）。

建议把锚点统一为一个“可扩展 union”，并在所有资产中复用（对齐 `31-data-model-and-contracts.md` 的 Anchor 形状）：

```ts
type Anchor =
  | { type: "spec"; spec: { docId?: string; blockId?: string; scenarioId?: string; stepId?: string } }
  | { type: "rule"; rule: { ruleId: string; ruleSetRevisionId?: string } }
  | { type: "code"; code: { file: string; span?: { start: number; end: number }; contentHash?: string; symbol?: string } }
  | { type: "runtime"; runtime: { runId?: string; txnSeq?: number; opSeq?: number; spanId?: string; intentId?: string; stepId?: string } }
```

约束：

- **稳定性**：`blockId/stepId/ruleId` 不得随机生成；应由平台分配并长期保留，或由结构化内容+上下文生成稳定 hash。
- **最小必要**：锚点只携带定位信息；具体内容（Step/Rule/Code 片段、RunResult 全量证据）通过 `artifactId/revisionId/runId` 拉取。
- **可降级**：当无法给出精确锚点时，只能降级为更弱的锚点（例如只给 `scenarioId`），禁止伪造“看似精确”的 file/span。

### 6.2 derivedFrom（溯源链的最小要求）

对齐 `31-data-model-and-contracts.md` 的 `derivedFrom: ArtifactRef[]` 占位：

- **ScenarioRevision** 至少要 `derivedFrom` 到：
  - 所属 `FeatureRevision`
  - 对应 ScenarioBlock（`spec` anchor: docId + blockId）
- **ScenarioStep**（`ui-intent`/`assert`）至少要能被定位到：
  - `spec` anchor（scenarioId + stepId，必要时再补 docId/blockId）
- **RuleSetRevision / Rule** 至少要 `derivedFrom` 到：
  - 关联的 ScenarioRevision（或 Blueprint/Spec blocks）
  - 规则对应的 `spec`/`scenario-step` anchor（用于解释“这条规则从哪来”）
- **Run / AlignmentReport** 必须能反向指回：
  - scenarioRevisionId（必需）
  - ruleSetRevisionId（若参与对齐/覆盖，建议必需）

### 6.3 评论、审阅与“可回跳讨论”（Comment Anchors）

Live Spec 的核心产品能力之一是：讨论必须可绑定到“事实锚点”，而不是飘在文档里。

建议：

- CommentThread 必须绑定 `Anchor`（优先 spec blockId/stepId；也允许 ruleId/code anchor）。
- 锚点必须指向“稳定实体”（blockId/stepId/ruleId），而不是纯文本 offset；否则 revision 变更会让评论漂移。
- 当锚点对应的实体被删除/重命名：
  - Thread 不删除，只标记 `orphaned=true`；
  - UI 显示“需要重新锚定”，由人类选择新锚点或关闭讨论。

> 最小目标：任何 Violation 都能一键跳转到对应 Step/Rule/Code，并能在同一锚点下继续讨论与提案。

### 6.4 Outdated / Drift（文档与资产的漂移策略）

在 MVP 阶段默认是单向 Doc→下游资产，因此必须明确“漂移可见但不自动修复”的策略。

#### 6.4.1 三种常见漂移

1. **Pinned Outdated（显式版本不一致）**
   - ScenarioBlock pin 到 `pinnedRevisionId`，但 `latestRevisionId` 已变化
   - 该漂移是“显式且可控”的：UI 必须显示 pinned 与 latest 的差异
2. **Spec Drift（溯源基线变化）**
   - 当前 Live Spec Doc 已进入新 revision，但 ScenarioRevision 的 `derivedFrom` 仍指向旧 doc revision
   - UI 必须显示“Spec 已更新，场景可能过期”，但不自动迁移 steps
3. **Evidence Drift（运行证据过期）**
   - Run/Report 的 code anchors（file/contentHash）与当前 workspace 解析出的 anchors 不一致
   - UI 显示“需要重跑以生成新证据”，并允许 Compare 两次 run 的差异（对齐锚点 diff）

#### 6.4.2 状态灯（Scenario Block 的最小可视化）

ScenarioBlock 的状态灯建议由三段组成（避免“绿了但其实 pinned/outdated”）：

- Spec：spec revision 是否与当前 doc 对齐（ok/outdated）
- Scenario：pinned vs latest（pinned/outdated/following）
- Evidence：last run 的证据是否过期（fresh/stale/never)

### 6.5 MVP 与现有 Sandbox 协议的兼容口径（备注）

当前 `sandbox-runtime/15-protocol-and-schema.md` 的 `UI_INTENT.meta` 使用 `storyId/stepId` 作为覆盖锚点。为避免多套口径，建议在 MVP 阶段先统一为：

- `storyId = scenarioId`（或明确约定为 featureId，但必须全局一致）
- `stepId = ScenarioStep.stepId`

后续若需要同时携带 featureId/scenarioId，可扩展 meta，但不得在 MVP 里“双写双读”。

### 6.6 最小可实现样例（ScenarioBlock + CommentThread）

ScenarioBlock（文档内 block）建议只存“可编辑字段”，其余由后端/计算产出只读投影：

```json
{
  "blockId": "blk_scn_001",
  "kind": "scenario",
  "data": {
    "scenarioId": "scn_region_selector_happy_path",
    "pinnedRevisionId": "rev_2025_12_19_0001",
    "status": "in_review"
  },
  "projection": {
    "latestRevisionId": "rev_2025_12_19_0003",
    "lights": { "spec": "ok", "scenario": "outdated", "evidence": "stale" },
    "lastRun": { "runId": "run_2025_12_19_140001", "at": "2025-12-19T14:01:00Z" },
    "lastReport": { "reportId": "rep_2025_12_19_140100", "passed": false, "errors": 1 }
  }
}
```

CommentThread（讨论绑定锚点；锚点实体删除时 thread 不删）：

```json
{
  "threadId": "thr_001",
  "anchor": { "type": "spec", "spec": { "docId": "doc_feature_region_selector", "blockId": "blk_scn_001", "stepId": "step_select_province" } },
  "status": "open",
  "orphaned": false,
  "messages": [{ "id": "msg_001", "author": "user:u_123", "createdAt": "2025-12-19T14:02:00Z", "text": "这里的 provinceSelect 是否需要默认值？" }]
}
```

## 7. AI Assist（生成/修复的产品化边界）

AI 在 Live Spec/Scenario 中只能做两类事：

1. **生成提案（proposal）**：从自然语言产出 block/step 草稿
2. **修复建议（advisor）**：根据 AlignmentReport 给出可审阅的修改建议（Spec/Rule/Mock/Code 的其中一种）

硬约束：

- AI 不得自动 sign‑off
- AI 的任何写入必须落到 revision/proposal，并写入审计事件（actor=agent）

## 8. 与 Workbench 其它模块的接口

- Pipeline：Stage 0 的入口产物就是 Live Spec + ScenarioRevisions（见 `../sdd-platform/05-intent-pipeline.md`）
- Rules：Scenario 的 steps/断言会驱动 RuleSet 的覆盖要求（见 `22-rule-grid-and-validation.md`）
- Playground：ScenarioRevisionId 是 run 的最小可执行输入（见 `../sandbox-runtime/35-playground-product-view.md`）
- Alignment：RunResult → AlignmentReport 回写到 ScenarioBlock（见 `33-alignment-and-diagnostics.md`）
