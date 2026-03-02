# Scenario × CLI Primitives Coverage Matrix

## 1. Legend

- `C` = covered
- `P` = partial
- `M` = missing

能力列：

- C1 能力发现（describe）
- C2 静态结构（ir export/validate/diff）
- C3 动态试跑（trialrun）
- C4 变更原语（transform/anchor）
- C5 动作执行（next-actions exec）

## 2. Matrix

| 场景 | C1 | C2 | C3 | C4 | C5 | 结论 |
| --- | --- | --- | --- | --- | --- | --- |
| S01 表单编辑与脏态 | C | C | P | P | P | `partial` |
| S02 搜索-详情联动 | C | P | P | P | P | `partial` |
| S03 审批与流程编排 | C | P | P | P | P | `partial` |
| S04 批量操作 | C | P | P | P | P | `partial` |
| S05 文件导入 | C | P | P | P | P | `partial` |
| S06 长任务与进度 | C | P | P | P | P | `partial` |
| S07 跨模块协作 | C | P | P | P | P | `partial` |
| S08 外部源同步 | C | P | P | P | P | `partial` |
| S09 乐观更新与回滚 | C | P | P | P | P | `partial` |
| S10 Agent 协同控制 | C | P | P | P | P | `partial` |

## 3. Why Most Rows Are Partial

共性缺口：

- 缺“场景动作脚本”输入协议：primitives 只能跑 entry，不能声明动作时序与断言。
- 缺“业务语义断言”协议：`ir validate` 与 `trialrun` 偏结构与运行层，缺业务判定层。
- 缺“从失败到修复动作”的直接映射：reason code 已有，但到场景修复动作仍需人工策略。

## 4. Coverage Summary

- `covered`: 0/10
- `partial`: 10/10
- `missing`: 0/10

## 5. Evidence Anchors (Representative)

- C1: `describe` + `describeReport`
- C2: `ir export` + `ir validate --profile contract` + `ir diff`
- C3: `trialrun --emit evidence` + `trialrun.report.json/trace.slim.json/evidence.json`
- C4: `transform.module --mode report` + `anchor.autofill --mode report`
- C5: `next-actions exec --dsl|--report`
