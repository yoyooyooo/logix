---
title: 31 · 核心数据模型与契约（Platform Workbench PRD）
status: draft
version: 2025-12-19
value: core
priority: now
related:
  - ./30-system-architecture.md
  - ./32-collaboration-and-permissions.md
  - ./33-alignment-and-diagnostics.md
  - ../../../docs/ssot/platform/assets/00-assets-and-schemas.md
  - ../../../sdd-platform/workbench/20-intent-rule-and-ux-planning.md
  - ../sandbox-runtime/65-playground-as-executable-spec.md
---

# 31 · 核心数据模型与契约（Platform Workbench PRD）

> 目标：给平台侧资产一套“可版本化、可审计、可对齐”的最小数据模型；具体 Schema 可后续下沉到独立包或 `docs/specs` SSoT。

## 1. 标识与版本化（硬约束）

### 1.1 三种 ID

- `artifactId`：稳定的业务资产标识（Feature/Scenario/RuleSet/Blueprint/Pattern 等）
- `revisionId`：某资产的一次不可变快照（append‑only）
- `runId`：一次运行（Run）的标识（必须可追溯到 scenarioRevisionId）

### 1.2 稳定性与去随机化

平台与运行时的“对齐锚点”必须稳定，避免随机漂移导致无法对比：

- `ruleId`：规则级稳定 id（建议由规则结构 + 上下文生成，或由平台分配并长期保留）
- `intentId`：UI Intent / Step 的稳定 id（与 Scenario Step 绑定）
- `txnSeq/opSeq`：运行时事件序列号（稳定递增），用于时序回放与 diff

> 运行时侧的稳定标识约束详见上游说明（本 Topic 只承接其要求，不在此拍板具体实现）。

### 1.3 Traceability（derivedFrom：需求 ↔ Schema ↔ Logic ↔ Runtime）

对齐闭环能不能“可解释”，取决于平台是否强制维护溯源链：

- Stage 0（Spec）产物必须具备稳定 blockId/stepId
- Stage 1–3（Blueprint/Rules/Code）必须记录“来自哪些 Spec 片段”
- Run/Report 必须能反向指到具体 stepId/ruleId/代码锚点

推荐所有核心资产统一提供 `derivedFrom: ArtifactRef[]`（append‑only），用来承载跨阶段溯源关系。

## 2. 最小实体模型（概念）

### 2.0 通用结构（建议）

> 本节是“形状约定”，不是最终 Schema；落库细节可后续分流到 SSoT。

#### ArtifactRef（溯源引用）

- `kind`: `"spec-block" | "scenario-step" | "rule" | "code" | "run" | "external"`
- `artifactId`: string
- `revisionId?`: string
- `anchor?`: Anchor
- `note?`: string

#### Anchor（锚点，最小可用）

- `type`: `"spec" | "rule" | "code" | "runtime"`
- `spec`：`{ docId?: string; blockId?: string; scenarioId?: string; stepId?: string }`
- `rule`：`{ ruleId: string; ruleSetRevisionId?: string }`
- `code`：`{ file: string; span?: { start: number; end: number }; contentHash?: string; symbol?: string }`
- `runtime`：`{ runId?: string; txnSeq?: number; opSeq?: number; spanId?: string; intentId?: string; stepId?: string }`

> 约束：Anchor 必须是可序列化数据（JsonValue），不得携带函数/循环引用。

### 2.1 Project

- `projectId`
- `name`
- `defaultBranch` / `workspaces`（占位）

### 2.2 FeatureSpec（Artifact）

- `artifactId`（feature）
- `revisions[]`：FeatureRevision（append‑only）

FeatureRevision（不可变）建议包含：

- `revisionId`
- `title/description`
- `specDoc`：SpecDocRevision（Live Spec 文档快照）
- `scenarios: ScenarioRef[]`
- `status: draft | in_review | signed_off`
- `createdAt/createdBy`
- `derivedFrom?: ArtifactRef[]`（例如外部 PRD/讨论记录的引用）

SpecDocRevision（最小）建议包含：

- `docId`
- `revisionId`
- `blocks: SpecBlock[]`

SpecBlock（最小）建议包含：

- `blockId`（稳定，跨 doc revision 复用）
- `kind`（如 `userStory` / `domainConcept` / `scenario` / `risk`）
- `data`（JsonValue，可序列化）
- `derivedFrom?: ArtifactRef[]`（可选：引用外部 PRD/讨论记录/历史 blocks）

### 2.3 ScenarioSpec（Artifact）

ScenarioRevision 建议包含：

- `scenarioId`（artifactId）
- `revisionId`
- `steps: ScenarioStep[]`（结构化，可执行）
- `expectations`（可选：state predicates / rule expectations）
- `linkedRuleSetIds`（可选：引用 IntentRuleSet）
- `derivedFrom?: ArtifactRef[]`（至少引用所属 FeatureRevision + 相关 spec blocks）

ScenarioStep（最小）：

- `stepId`（稳定）
- `kind: "ui-intent" | "assert" | "note"`（最小枚举）
- `payload`（结构化，供执行与对齐）
- `intentId?: string`（若 step 对应 UI intent，建议显式记录，避免运行期再生成随机 id）
- `anchors?: Anchor[]`（可选：与 UI 节点、Spec block 的映射）

### 2.4 IntentRuleSet（Artifact）

RuleSetRevision 建议包含：

- `ruleSetId`
- `revisionId`
- `scope`：moduleId / featureId / scenarioId（至少一种）
- `rules: IntentRule[]`
- `ruleAnchors?: Array<{ ruleId: string; anchor: Anchor }>`（可选：ruleId ↔ code anchor 的映射投影）
- `derivedFrom?: ArtifactRef[]`（至少引用关联 ScenarioRevision/Blueprint/Spec blocks）

IntentRule 结构以 `IntentRule`（R-S-T）为准（上游 SSoT）。

### 2.5 Run（一次执行）

- `runId`
- `scenarioRevisionId`
- `ruleSetRevisionId?`
- `runConfig`（环境/Mock/入口）
- `result: RunResult`
- `derivedFrom: ArtifactRef[]`（至少包含 scenarioRevision + ruleSetRevision + code anchors 摘要）

RunResult（最小）：

- `status: completed | failed | canceled`
- `durationMs`
- `logs[]`
- `traces[]`
- `stateSnapshot`（或 stateDiff）

### 2.6 AlignmentReport（对齐报告）

- `reportId`
- `runId`
- `scenarioRevisionId`
- `ruleSetRevisionId?`
- `passed: boolean`
- `summary?`（errors/warnings/stepsCovered/stepsTotal/rulesTriggered...）
- `violations[]`（每条必须包含 anchors，确保可回跳、可行动；详见 `33-alignment-and-diagnostics.md`）
- `coverage?`（steps/rules 覆盖；占位但结构应稳定）

### 2.7 CommentThread（讨论与审阅，占位）

> 讨论必须绑定 Anchor（优先 spec blockId/stepId），以保证 revision 变更后仍可回跳与审计。

- `threadId`
- `anchor: Anchor`
- `status: open | resolved | closed`
- `orphaned?: boolean`（锚点目标被删除/迁移后置 true）
- `messages[]`: `{ id, author, createdAt, text }[]`

## 3. 审计与协作（必需字段占位）

所有会改变资产的操作应具备：

- `actor`（userId 或 agentId）
- `reason`（human readable）
- `baseRevisionId`（乐观并发基线）
- `diff`（结构化 patch 或 JSON diff 的占位）

### 3.1 Revision 与并发（建议）

- 所有“编辑”都创建新 revision（append‑only），并携带：
  - `baseRevisionId`：用户编辑时所基于的版本
  - `mergePolicy`（占位）：`reject | manual | rebase`（MVP 默认 reject+manual）
- 冲突处理原则：
  - 不做隐式自动合并；
  - 显式展示 diff，让人类决定（或交给 Agent 生成合并建议）。

## 4. 与代码/解析器的锚点关系（占位）

为了支持 Rule ↔ Code：

- 解析器输出 IntentRule 时必须附带 `sourceAnchor`（file + span + contentHash）
- 生成器写回代码时必须保留 ruleId 与 anchor 的可追踪关系

该部分实现细节以 `../../../sdd-platform/impl/*` 为准，本 Topic 只要求“必须有锚点”，不规定具体 AST 序列化方案。

## 5. 示例（最小可用 JSON 样例）

> 目的：让后续实现者/Agent 在没有完整后端/数据库设计的情况下，也能用这组样例对齐字段形状与锚点语义。

### 5.1 ScenarioRevision（Steps First）

```json
{
  "scenarioId": "scn_region_selector_happy_path",
  "revisionId": "rev_2025_12_19_0001",
  "steps": [
    {
      "stepId": "step_select_province",
      "kind": "ui-intent",
      "intentId": "ui_select_province",
      "payload": { "widgetId": "provinceSelect", "value": { "code": "44", "name": "广东" } },
      "anchors": [
        {
          "type": "spec",
          "spec": {
            "docId": "doc_feature_region_selector",
            "blockId": "blk_scn_001",
            "scenarioId": "scn_region_selector_happy_path",
            "stepId": "step_select_province"
          }
        }
      ]
    },
    {
      "stepId": "step_assert_city_options",
      "kind": "assert",
      "payload": { "path": "cityOptions", "op": "includes", "value": { "code": "4401", "name": "广州" } }
    }
  ],
  "expectations": [],
  "linkedRuleSetIds": ["ruleset_region_selector"],
  "derivedFrom": [
    {
      "kind": "spec-block",
      "artifactId": "doc_feature_region_selector",
      "revisionId": "rev_2025_12_19_0100",
      "anchor": { "type": "spec", "spec": { "docId": "doc_feature_region_selector", "blockId": "blk_scn_001" } },
      "note": "来自 Live Spec 的 Scenario Block"
    }
  ]
}
```

### 5.2 RuleSetRevision（IntentRuleSet）

```json
{
  "ruleSetId": "ruleset_region_selector",
  "revisionId": "rev_2025_12_19_0003",
  "scope": { "moduleId": "RegionSelectorModule" },
  "rules": [
    {
      "ruleId": "rule_province_change_refresh_cities",
      "source": { "context": "self", "type": "state", "selector": "s => s.province" },
      "pipeline": [{ "op": "debounce", "args": [300] }],
      "sink": { "context": "self", "type": "service", "handler": "RegionApi.listCities" }
    }
  ],
  "ruleAnchors": [
    {
      "ruleId": "rule_province_change_refresh_cities",
      "anchor": {
        "type": "code",
        "code": { "file": "src/region/regionSelector.logic.ts", "span": { "start": 120, "end": 240 }, "contentHash": "sha256:..." }
      }
    }
  ],
  "derivedFrom": [
    {
      "kind": "scenario-step",
      "artifactId": "scn_region_selector_happy_path",
      "revisionId": "rev_2025_12_19_0001",
      "anchor": { "type": "spec", "spec": { "scenarioId": "scn_region_selector_happy_path", "stepId": "step_select_province" } }
    }
  ]
}
```

### 5.3 Run（一次执行）

```json
{
  "runId": "run_2025_12_19_140001",
  "scenarioRevisionId": "rev_2025_12_19_0001",
  "ruleSetRevisionId": "rev_2025_12_19_0003",
  "runConfig": { "env": "playground", "seed": 1 },
  "result": {
    "status": "completed",
    "durationMs": 1234,
    "logs": [],
    "traces": [
      { "spanId": "span_root", "name": "scenario.run", "attributes": { "stepId": "step_select_province", "intentId": "ui_select_province" } }
    ],
    "stateSnapshot": { "province": { "code": "44" }, "cityOptions": [{ "code": "4401", "name": "广州" }] }
  },
  "derivedFrom": [
    { "kind": "scenario-step", "artifactId": "scn_region_selector_happy_path", "revisionId": "rev_2025_12_19_0001" },
    { "kind": "rule", "artifactId": "rule_province_change_refresh_cities", "anchor": { "type": "rule", "rule": { "ruleId": "rule_province_change_refresh_cities", "ruleSetRevisionId": "rev_2025_12_19_0003" } } }
  ]
}
```

### 5.4 AlignmentReport（最小可行动）

```json
{
  "reportId": "rep_2025_12_19_140100",
  "runId": "run_2025_12_19_140001",
  "scenarioRevisionId": "rev_2025_12_19_0001",
  "ruleSetRevisionId": "rev_2025_12_19_0003",
  "passed": false,
  "summary": { "errors": 1, "warnings": 0, "stepsCovered": 1, "stepsTotal": 2, "rulesTriggered": 0, "rulesTotal": 1 },
  "violations": [
    {
      "id": "vio_step_assert_city_options",
      "severity": "error",
      "kind": "spec_assertion_failed",
      "message": "断言失败：cityOptions 未包含期望城市（广州）",
      "anchors": [
        { "type": "spec", "spec": { "docId": "doc_feature_region_selector", "blockId": "blk_scn_001", "stepId": "step_assert_city_options" } },
        { "type": "rule", "rule": { "ruleId": "rule_province_change_refresh_cities", "ruleSetRevisionId": "rev_2025_12_19_0003" } },
        { "type": "code", "code": { "file": "src/region/regionSelector.logic.ts", "span": { "start": 120, "end": 240 }, "contentHash": "sha256:..." } },
        { "type": "runtime", "runtime": { "runId": "run_2025_12_19_140001", "spanId": "span_root", "stepId": "step_assert_city_options" } }
      ],
      "relatedTraces": [{ "spanId": "span_root" }],
      "suggestedActions": [
        { "kind": "check_mock", "message": "确认 RegionApi.listCities 的 mock 是否返回广州" },
        { "kind": "check_rule", "message": "确认规则是否触发并调用 service" }
      ]
    }
  ],
  "coverage": {
    "steps": { "total": 2, "covered": 1, "missing": ["step_assert_city_options"] },
    "rules": { "total": 1, "triggered": 0, "missing": ["rule_province_change_refresh_cities"] },
    "notes": ["存在 graybox/trace 缺失时，rule 覆盖可能不完整"]
  }
}
```

### 5.5 SpecDocRevision / CommentThread（占位样例）

```json
{
  "docId": "doc_feature_region_selector",
  "revisionId": "rev_2025_12_19_0100",
  "blocks": [
    { "blockId": "blk_story_001", "kind": "userStory", "data": { "role": "商家", "feature": "选择省份", "benefit": "获得城市选项" } },
    { "blockId": "blk_scn_001", "kind": "scenario", "data": { "scenarioId": "scn_region_selector_happy_path", "pinnedRevisionId": "rev_2025_12_19_0001", "status": "in_review" } }
  ]
}
```

```json
{
  "threadId": "thr_001",
  "anchor": { "type": "spec", "spec": { "docId": "doc_feature_region_selector", "blockId": "blk_scn_001", "stepId": "step_select_province" } },
  "status": "open",
  "orphaned": false,
  "messages": [{ "id": "msg_001", "author": "user:u_123", "createdAt": "2025-12-19T14:02:00Z", "text": "这里的 provinceSelect 是否需要默认值？" }]
}
```
