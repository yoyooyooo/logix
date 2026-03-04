# Contracts: Effect v4 前向式迁移

本目录定义迁移过程中的“流程契约”，用于确保阶段 gate 与 STM 决策可审计、可复现。

## 合同列表

- `StageGateRecord`：阶段 gate 的统一记录结构（见 `contracts/stage-gate-record.md`）。
- `STMDecisionRecord`：S3 的 go/no-go 决策结构（见 `contracts/stm-decision-record.md`）。
- `CheckpointDecisionRecord`：检查点汇总记录结构（见 `contracts/checkpoint-decision-record.md`）。

## 状态词汇（统一）

- `result`：`PENDING` / `IN_PROGRESS` / `PASS` / `NOT_PASS` / `FAIL`
- `mode`：`strict_gate` / `exploratory`
- 约束：仅 `mode=strict_gate` 的记录可以作为放行 gate 的证据。

## Checkpoint 词汇（统一）

- `checkpointResult`：`PASS` / `NOT_PASS` / `BLOCKED` / `NO-GO`
- `checkpointCommit`：checkpoint 生成时的提交哈希
- `lastPassCheckpointCommit`：回滚锚点提交（未知时必须给获取步骤）
- 约束：Checkpoint 仅做阶段摘要，不替代 gate 记录；放行判断以 `StageGateRecord` 为准。

## 最低要求

- 每个 gate 必须有记录文件（建议 `inventory/gate-<id>.md` 或 JSON）。
- 每个 gate 记录必须引用具体证据文件路径。
- S3 决策必须包含 MUST/SHOULD 明细，不得只有结论。
- 所有 checkpoint 变更必须同步写入 `inventory/checkpoint-decision-log.md`。

## 禁止项

- 只给文字结论，不附证据引用。
- `comparable=false` 仍宣称性能 gate 通过。
- 使用 `--allow-partial` 的 validate 结果作为 gate 通过证据。
- STM 决策未列明禁区触碰检查。
