# Contract: StageGateRecord

## 目标

统一 `GP-1/G0/G1.0/Gate-A/Gate-B/G1/Gate-C/G2/G3/G4/G5` 的判定结构，确保 gate 判定可复现、可追责、可自动审计。

## 字段

- `gate`: `"GP-1" | "G0" | "G1.0" | "Gate-A" | "Gate-B" | "G1" | "Gate-C" | "G2" | "G3" | "G4" | "G5"`
- `result`: `"PENDING" | "IN_PROGRESS" | "PASS" | "NOT_PASS" | "FAIL"`
- `mode`: `"strict_gate" | "exploratory"`
- `timestamp`: ISO8601 时间戳
- `criteria`: `Record<string, string>`（判据名 -> 结果）
- `commands`: `string[]`（复现实验命令）
- `evidenceRefs`: `string[]`（证据文件路径）
- `notes`: 文字说明
- `baselineDebt`（可选）：`BaselineDebtEntry[]`（仅在采用 `no-worse` 语义时出现）

### BaselineDebtEntry

- `id`: debt 条目唯一标识
- `owner`: 负责收敛人/模块
- `noWorseThreshold`: no-worse 阈值描述（例如“maxLevel 不下降”或“p95 不劣于 before 超过 5%/5ms”）
- `exitCondition`: debt 出清条件
- `evidenceRef`: 对应证据路径
- `status`: `"OPEN" | "CLOSED"`

## 约束

- `mode=strict_gate` 且 `result=PASS` 才可放行下一阶段。
- `mode=exploratory` 永远不能作为 gate 放行证据。
- `evidenceRefs` 为空时，`result` 只能是 `PENDING/IN_PROGRESS/NOT_PASS`。
- 使用 `--allow-partial` 产出的 validate 结果只能记录在 `mode=exploratory`。
- 当 `gate` 为 `G1` 或 `G2` 且 `mode=strict_gate` 时，`criteria` 必须包含：`perf_abs_gate_passed`、`perf_rel_gate_passed`、`baseline_debt_declared`。
- 当 `mode=strict_gate` 且 `gate` 为 `G1/G2` 且 `result=PASS` 时，`perf_abs_gate_passed` 与 `perf_rel_gate_passed` 必须同时为 `PASS`。
- 若 `baseline_debt_declared=PASS`，则所有采用 `no-worse` 的切片必须出现在 `baselineDebt`，且每条记录必须具备 `owner/noWorseThreshold/exitCondition/evidenceRef`。

## 审计规则

- 每次 gate 结论变化，都必须同步更新 `inventory/checkpoint-decision-log.md`。
- 发现 `comparable=false`、`stabilityWarning`、`missing suite` 任一命中时，`result` 不得为 `PASS`。
- G1/G2 的 gate 摘要必须拆分展示：`head budgetExceeded`、`regressions/improvements`、`baseline debt` 状态；禁止合并为单一未分层结论。
