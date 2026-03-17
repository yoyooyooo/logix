# Data Model: Effect v4 前向式全仓重构

## 1. MigrationLedgerEntry

用于记录单个 v3 模式命中点的迁移状态。

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | `string` | 稳定条目标识（建议 `path:line:pattern`） |
| `path` | `string` | 文件路径 |
| `pattern` | `string` | 命中模式（如 `Effect.locally(`） |
| `category` | `"api-rename" | "semantic-rewrite"` | 迁移类型 |
| `stage` | `"S0".."S6"` | 当前所属阶段 |
| `status` | `"todo" | "in_progress" | "done" | "blocked"` | 当前状态 |
| `owner` | `string` | 责任人/责任组 |
| `evidenceRefs` | `string[]` | 关联证据文件 |

说明：S0 阶段允许先产出聚合快照（summary），S2 以后再逐步细化为条目级 ledger。

## 1.1 MigrationLedgerSummary

用于 S0 的聚合基线快照。

| 字段 | 类型 | 说明 |
|---|---|---|
| `snapshotAt` | `string` | 快照时间 |
| `scope` | `string[]` | 扫描范围 |
| `patternCounts` | `Record<string, number>` | 模式 -> 命中数 |
| `notes` | `string` | 摘要说明 |

## 2. EvidenceBundle

用于阶段验收证据的标准化索引。

| 字段 | 类型 | 说明 |
|---|---|---|
| `stage` | `"S0".."S6"` | 阶段 |
| `typecheck` | `string[]` | 类型检查结果引用 |
| `tests` | `string[]` | 测试结果引用 |
| `perf` | `string[]` | perf before/after/diff 引用 |
| `diagnostics` | `string[]` | 诊断快照或对照报告 |
| `summary` | `string` | 结论摘要 |

## 3. StageGateRecord

用于 gate 判定与审计追踪。

| 字段 | 类型 | 说明 |
|---|---|---|
| `gate` | `"GP-1" | "G0" | "G1.0" | "Gate-A" | "Gate-B" | "G1" | "Gate-C" | "G2" | "G3" | "G4" | "G5"` | gate 编号 |
| `result` | `"PENDING" | "IN_PROGRESS" | "PASS" | "NOT_PASS" | "FAIL"` | 判定结果 |
| `mode` | `"strict_gate" | "exploratory"` | 证据模式（仅 strict_gate 可用于放行） |
| `timestamp` | `string` | 判定时间（ISO8601） |
| `criteria` | `Record<string, string>` | 判据与结果 |
| `commands` | `string[]` | 复现实验命令（按执行顺序） |
| `evidenceRefs` | `string[]` | 证据引用 |
| `notes` | `string` | 附加说明 |

## 4. STMDecisionRecord

用于 S3 go/no-go 决策。

| 字段 | 类型 | 说明 |
|---|---|---|
| `decision` | `"GO" | "NO-GO"` | 结论 |
| `mustChecks` | `Record<string, "PASS" | "FAIL">` | MUST 判据结果 |
| `shouldChecks` | `Record<string, "PASS" | "FAIL">` | SHOULD 判据结果 |
| `score` | `number` | SHOULD 通过项数量 |
| `scope` | `string[]` | 允许点位 |
| `banned` | `string[]` | 禁区 |
| `evidenceRefs` | `string[]` | 证据引用 |
| `notes` | `string` | 结论说明 |

## 5. 示例（STMDecisionRecord）

```json
{
  "decision": "GO",
  "mustChecks": {
    "correctness": "PASS",
    "perfBudget": "PASS",
    "diagnosticExplainability": "PASS",
    "forbiddenBoundaryUntouched": "PASS"
  },
  "shouldChecks": {
    "complexityDrop>=10%": "PASS",
    "coverageImproved": "PASS",
    "triagePathShorter": "FAIL"
  },
  "score": 2,
  "scope": [
    "WorkflowRuntime.ProgramState",
    "ProcessRuntime.InstanceControlState"
  ],
  "banned": [
    "ModuleRuntime.transaction",
    "TaskRunner",
    "WorkflowStep(IO)"
  ],
  "evidenceRefs": [
    "specs/103-effect-v4-forward-cutover/perf/s3.diff.<envId>.default.json",
    "specs/103-effect-v4-forward-cutover/diagnostics/s3.stm-compare.md"
  ],
  "notes": "满足 MUST，且 SHOULD=2，采纳局部 STM"
}
```

## 6. CheckpointDecisionRecord

用于阶段级汇总，不替代 gate 记录。

| 字段 | 类型 | 说明 |
|---|---|---|
| `checkpoint` | `"CP-0" | "CP-1" | "CP-2" | "CP-3" | "CP-4" | "CP-5"` | 检查点编号 |
| `checkpointResult` | `"PASS" | "NOT_PASS" | "BLOCKED" | "NO-GO"` | 检查点结论 |
| `relatedGates` | `string[]` | 关联 gate |
| `evidenceRefs` | `string[]` | 证据引用 |
| `nextAction` | `string` | 下一步动作 |
| `checkpointCommit` | `string` | 当前检查点对应提交 |
| `lastPassCheckpointCommit` | `string` | 回滚锚点提交（未知时写明获取步骤） |
| `timestamp` | `string` | 时间戳 |
