# Contract: STMDecisionRecord

## 目标

规范 S3（STM 局部 PoC）的 `GO/NO-GO` 决策格式，确保决策可回放且可解释。

## 字段

- `decision`: `"GO" | "NO-GO"`
- `mustChecks`: `Record<string, "PASS" | "FAIL">`
- `shouldChecks`: `Record<string, "PASS" | "FAIL">`
- `score`: `number`（SHOULD 通过数）
- `scope`: `string[]`（允许点位）
- `banned`: `string[]`（禁区）
- `evidenceRefs`: `string[]`（证据路径）
- `notes`: 文字说明

## 约束

- 任一 MUST=FAIL => `decision=NO-GO`。
- MUST 全 PASS 且 SHOULD>=2 才允许 `decision=GO`。
- `evidenceRefs` 必须覆盖：并发矩阵、replay 一致性、稳定标识 diff、性能对比、诊断可解释性对照。
- 禁止未完成禁区触碰检查就输出 `GO`。

## 与 Gate 对齐

- `decision` 产出前必须确认 `Gate-C=PASS`。
- 决策结果必须回写 `inventory/gate-g2.md` 与 `inventory/checkpoint-decision-log.md`。
