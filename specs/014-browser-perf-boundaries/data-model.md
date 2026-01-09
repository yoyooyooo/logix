# Data Model: 014 浏览器压测基线与性能边界地图

**Branch**: `[014-browser-perf-boundaries]`  
**Date**: 2025-12-17

本特性的数据模型以“机器可解析、可长期对比、可版本化”为核心；字段的最终裁决以 JSON schema 为准。

## Entities

### 1) PerfMatrix（SSoT）

**File**: `@logixjs/perf-evidence/assets/matrix.json`（物理：`.codex/skills/logix-perf-evidence/assets/matrix.json`）

- `schemaVersion:number`：矩阵格式版本
- `id:string`：矩阵标识（report `meta.matrixId` 需引用）
- `defaults:{ runs,warmupDiscard,timeoutMs,stability,browser,profiles }`：默认运行策略与稳定性阈值
- `semantics:{ refSyntax, relativeBudget, thresholds }`：ref 语法与相对预算/阈值语义
- `suites:SuiteSpec[]`：用例集合

SuiteSpec（核心字段）：

- `id:string`、`priority:P1|P2|P3`、`primaryAxis:string`
- `axes:Record<string, Array<string|number|boolean>>`：参数轴与档位
- `derivedParams?:{ name, rule }[]`：派生参数规则（例如 dirtyRoots）
- `metrics:string[]`：观测指标名（时间类）
- `budgets:BudgetSpec[]`：预算阈值（absolute/relative）
- `baselineBudgetId? / limitBudgetId?`：用于 baseline/limit 的预算锚点
- `baselinePoints?:Params[]`：需要稳定对照的点位
- `requiredEvidence?:string[]`：负优化边界要求的证据字段清单
- `comparisons?:ComparisonSpec[]`：跨点对比派生结果（diagnostics overhead 等）
- `patternKindDocs?:Record<string,string>`：对抗场景说明（反直觉场景）

### 2) PerfReport（边界地图报告）

**Schema**: `@logixjs/perf-evidence/assets/schemas/perf-report.schema.json`（物理：`.codex/skills/logix-perf-evidence/assets/schemas/perf-report.schema.json`）

- `schemaVersion:number`
- `meta:Meta`
- `suites:SuiteResult[]`

Meta：

- `createdAt`、`generator`、`matrixId`
- `git?:{ branch,commit,dirty }`
- `config:{ runs,warmupDiscard,timeoutMs,headless?,profile?,humanSummary?,stability?,budgets? }`
- `env:{ os,arch,cpu?,memoryGb?,node,pnpm?,vitest?,playwright?,browser:{ name,version?,headless? } }`

SuiteResult：

- `id`、`title?`、`priority?`、`primaryAxis?`
- `budgets?:Budget[]`
- `metricCategories?:Record<string,"e2e"|"runtime"|"diagnostics">`（按指标名称标记观测口径）
- `points:PointResult[]`
- `thresholds?:Threshold[]`
- `comparisons?:ComparisonResult[]`

PointResult：

- `params:Record<string,string|number|boolean>`
- `status:"ok"|"timeout"|"failed"|"skipped"` + `reason?`
- `metrics:MetricResult[]`
- `evidence?:EvidenceResult[]`（cache/cutOff 等非时间证据）

MetricResult（时间类）：

- `name`、`unit:"ms"`、`status:"ok"|"unavailable"`
- `stats?:{ n,medianMs,p95Ms }`
- `samples?:number[]`（默认不写；开启采集开关时才写）
- `unavailableReason?`

EvidenceResult（非时间类）：

- `name`、`unit:"count"|"ratio"|"bytes"|"string"`、`status`
- `value?:number|string` 或 `unavailableReason`

Threshold（阈值/边界）：

- `budget:Budget`
- `where?:Params`（除 primaryAxis 外的子空间）
- `maxLevel`、`firstFailLevel?`、`reason?`
- `recommendations?:Recommendation[]`（手动杠杆提示）

ComparisonResult（跨点对比派生结果）：

- `kind:"ratio"|"delta"`、`metric`
- `numeratorWhere`、`denominatorWhere`
- `unit:"ratio"|"ms"`
- `stats:{ median,p95 }`

### 3) PerfDiff（Before/After 差异摘要）

**Schema**: `@logixjs/perf-evidence/assets/schemas/perf-diff.schema.json`（物理：`.codex/skills/logix-perf-evidence/assets/schemas/perf-diff.schema.json`）

- `schemaVersion:number`
- `meta:{ createdAt, from:ReportRef, to:ReportRef }`
- `summary:{ regressions, improvements, budgetViolations }`
- `suites:SuiteDiff[]`

SuiteDiff：

- `id`
- `thresholdDeltas?:ThresholdDelta[]`
- `budgetViolations?:BudgetViolation[]`
- `evidenceDeltas?:EvidenceDelta[]`（cache/cutOff 等证据字段的 before/after 聚合对比）

ThresholdDelta / BudgetViolation：

- `budget`、`where?`、`message`
- `recommendations?:Recommendation[]`（手动杠杆提示）

EvidenceDelta（证据对比摘要）：

- `name`、`unit`、`scope:"points"|"whereSlices"`
- `before/after:{ ok,unavailable,missing,value? }`（`value` 为聚合值：count/bytes=sum，ratio=median，cutOffCount 以 whereSlices 聚合）
- `message`

### 4) PerfEvidence（落盘证据文件）

**Directory**: `specs/014-browser-perf-boundaries/perf/`

- `before.<gitSha>.<envId>.json`：基线锚点（PerfReport）
- `after.<gitSha>.<envId>.json` / `after.worktree.json`：对比报告（PerfReport）
- `diff.<before>__<after>.txt`：人类摘要（可选）

关系：

- PerfReport `meta.matrixId` → PerfMatrix `id`
- PerfDiff `meta.from/to` → PerfEvidence 中两份 PerfReport 的引用
