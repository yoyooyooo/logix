---
title: 33 · 对齐报告与诊断（AlignmentReport）（Platform Workbench PRD）
status: draft
version: 2025-12-19
value: core
priority: now
related:
  - ./30-system-architecture.md
  - ./31-data-model-and-contracts.md
  - ./40-protocols-and-apis.md
  - ../sandbox-runtime/30-intent-coverage-and-ai-feedback.md
  - ../sandbox-runtime/35-playground-product-view.md
  - ../sandbox-runtime/65-playground-as-executable-spec.md
---

# 33 · 对齐报告与诊断（AlignmentReport）（Platform Workbench PRD）

> 目标：定义“平台解释力”的核心产物：AlignmentReport 与 Diagnostics。它们必须 **Slim、可序列化、可追溯、可行动**，并支撑人类与 Agent 的修复闭环。

## 1. 核心定义：什么是对齐（Alignment）

对齐不是“跑没报错”，而是：

> 在给定 `scenarioRevisionId` 与（可选）`ruleSetRevisionId` 的情况下，运行产生的动态证据（RunResult/Trace/State）满足 Spec 的断言与覆盖期望，并能解释“为什么满足/为什么不满足”。

因此 AlignmentReport 必须同时覆盖：

- **Correctness**：Spec/Steps 的断言是否通过（必需）
- **Coverage**：Steps/Rules 是否被触发、是否有关键分支未覆盖（强烈建议）
- **Actionability**：失败能否定位到可改的位置（必需）

## 2. Diagnostics（诊断）—— 统一的结构化错误/提示

### 2.1 诊断等级（建议）

- `error`：阻断（无法生成 patch / 无法完成 run / 明确违反 Spec）
- `warning`：风险（可能竞态/覆盖不足/灰盒不可解释）
- `info`：提示（可选建议/性能提示）

### 2.2 诊断必须携带的锚点

每条诊断至少要能指向以下之一：

- `spec`：`scenarioId/stepId/blockId`
- `rule`：`ruleId`
- `code`：`file/span/contentHash`
- `runtime`：`runId/txnSeq/opSeq/spanId`

> 统一锚点结构见 `31-data-model-and-contracts.md` 的 Anchor/ArtifactRef 占位。

## 3. AlignmentReport：最小结构（建议）

### 3.1 Report 顶层字段

- `reportId`
- `runId`
- `scenarioRevisionId`
- `ruleSetRevisionId?`
- `passed: boolean`
- `summary`: `{ errors: number; warnings: number; stepsCovered: number; stepsTotal: number; rulesTriggered?: number; rulesTotal?: number }`
- `violations: Violation[]`
- `coverage: Coverage`（可选先占位，但结构要定）

### 3.2 Violation（违规项）

每条违规必须是“可行动”的最小单元：

- `id`
- `severity: "error" | "warning"`
- `kind`：
  - `spec_assertion_failed`（断言失败）
  - `step_not_covered`（步骤未覆盖）
  - `rule_not_triggered`（规则未触发）
  - `rule_triggered_unexpected`（不应触发却触发）
  - `runtime_error`（运行错误）
  - `mock_mismatch`（Mock/环境不一致）
  - `graybox_unexplainable`（灰盒导致不可解释）
- `message`（面向人类）
- `anchors: Anchor[]`（至少 1 个）
- `relatedTraces?: Array<{ spanId?: string; txnSeq?: number; opSeq?: number }>`（可选）
- `suggestedActions?: SuggestedAction[]`（可选：用于“一键修复/生成任务”）

### 3.3 Coverage（覆盖）

最小覆盖分两条线：

- **Step 覆盖**：Scenario 的 stepId 命中情况（可直接面向 PM）
- **Rule 覆盖**：ruleId 命中情况（面向开发/架构）

建议形状：

- `steps`: `{ total: number; covered: number; missing: string[] /* stepIds */ }`
- `rules?`: `{ total: number; triggered: number; missing: string[] /* ruleIds */ }`
- `notes?`: string[]（例如 “存在 graybox，覆盖统计不完整”）

## 4. 证据链（Evidence Chain）：Report 如何引用 RunResult

Report 不应该复制大体量证据（logs/traces/state），而是引用：

- `runId`（取回完整 RunResult）
- `anchors`（定位到关键 span/txn/op）
- `diffSummary`（可选：将 stateSnapshot diff 的关键字段摘要化）

> 详细的 RunResult/Trace 协议以 `sandbox-runtime/*` 为准，本 Topic 只定义“Report 如何引用证据”。

## 5. 生成策略（MVP 可落地）

### 5.1 MVP‑1：Step‑First 对齐（优先满足 PM）

1. Scenario Steps 作为唯一验收入口（Steps 可执行）
2. 每次 UI Intent 事件必须携带 `stepId/intentId`
3. 对齐报告先只做：
   - Step 覆盖（covered/pending）
   - 关键 stateSnapshot 断言（简单谓词）

### 5.2 MVP‑2：Rule‑First 对齐（支撑 Plan→Code）

在 Rule Explorer 出码链路稳定后，再引入 Rule 维度：

1. 每条白盒规则具备稳定 `ruleId`
2. 运行时 Trace 透传 `ruleId`（或能从 span 推导）
3. Report 生成：
   - ruleId 覆盖（triggered/missing）
   - ruleId ↔ code anchor ↔ trace span 的三方链接

## 6. 给 AI 的 Context Pack（最小可用）

当 `passed=false`，平台要能生成“可交接的修复输入”（给 Agent 或开发者）：

- `scenarioRevision`：Steps + expectations（最小）
- `ruleSetRevision?`：与失败相关的 rules（可按 anchors 裁剪）
- `runResultSummary`：错误摘要 + 关键 traces 索引 + stateDiff 摘要
- `constraints`：白盒子集约束、禁止事项（例如禁止 async/await、禁止拆链）
- `target`：期望改动类型（patch rule / patch code / patch mock / patch spec）

> 关键原则：Context Pack 不能“把整个仓库打包给模型”；必须最小特权、可复现、可审阅。

## 7. 示例（最小 AlignmentReport）

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
        { "kind": "check_rule", "message": "确认规则 rule_province_change_refresh_cities 是否触发并调用 service" }
      ]
    }
  ],
  "coverage": {
    "steps": { "total": 2, "covered": 1, "missing": ["step_assert_city_options"] },
    "rules": { "total": 1, "triggered": 0, "missing": ["rule_province_change_refresh_cities"] },
    "notes": ["当前 run 未捕获到 ruleId 触发证据（可能为 graybox 或 trace 未透传 ruleId）"]
  }
}
```
