# Contract: CheckpointDecisionRecord

## 目标

定义阶段级检查点摘要格式，用于汇总当前推进状态，不替代具体 gate 判定。

## 字段

- `checkpoint`: `"CP-0" | "CP-1" | "CP-2" | "CP-3" | "CP-4" | "CP-5"`
- `checkpointResult`: `"PASS" | "NOT_PASS" | "BLOCKED" | "NO-GO"`
- `relatedGates`: `string[]`
- `evidenceRefs`: `string[]`
- `nextAction`: `string`
- `checkpointCommit`: `string`（生成该 checkpoint 时的提交哈希）
- `lastPassCheckpointCommit?`: `string`（用于回滚锚点；未知时必须在 `nextAction` 说明获取步骤）
- `timestamp`: ISO8601 时间戳

## 约束

- Checkpoint 只能聚合现有 gate 状态，不得凭空判定。
- `evidenceRefs` 必须指向具体文件路径，不能只写目录。
- 当 `checkpointResult=NO-GO` 时，必须给出可执行 `nextAction`。
- 当 `checkpointResult=NO-GO` 时，必须补充 `checkpointCommit`，并给出 `lastPassCheckpointCommit` 或其获取步骤。
