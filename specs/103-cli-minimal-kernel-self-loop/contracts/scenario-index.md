# Scenario Index Contract (Primitive-Only)

## Purpose

以“场景优先 + 基础命令编排”方式，为 Agent 提供可机读的场景入口与推荐命令链。  
约束：**不新增 CLI 子命令**，所有执行都由既有 primitives 组合完成。

## Scenario Set (S01-S10)

| Scenario | Business Capability | Recommended Primitive Chain | Evidence Bundle |
| --- | --- | --- | --- |
| S01 | 表单编辑与脏态 | `describe -> ir export -> trialrun --emit evidence -> ir validate --profile contract -> verify-loop -> next-actions exec` | `trialrun.report.json`, `trace.slim.json`, `evidence.json`, `verify-loop.report.json` |
| S02 | 搜索-详情联动 | `describe -> ir export -> trialrun --emit evidence -> ir validate --profile contract -> ir diff -> verify-loop` | `workflow.surface.json`, `trialrun.report.json`, `verify-loop.report.json` |
| S03 | 审批与流程编排 | `describe -> ir export -> trialrun --emit evidence -> ir validate --profile contract -> transform.module --mode report -> verify-loop -> next-actions exec` | `trialrun.report.json`, `transform.report.json`, `verify-loop.report.json` |
| S04 | 批量操作 | `describe -> ir export -> trialrun --emit evidence -> ir validate --profile contract -> verify-loop` | `trialrun.report.json`, `ir.validate.report.json`, `verify-loop.report.json` |
| S05 | 文件导入 | `describe -> ir export -> trialrun --emit evidence -> ir validate --profile contract -> verify-loop` | `trialrun.report.json`, `evidence.json`, `verify-loop.report.json` |
| S06 | 长任务与进度 | `describe -> ir export -> trialrun --emit evidence -> ir validate --profile contract -> verify-loop -> next-actions exec` | `trialrun.report.json`, `trace.slim.json`, `verify-loop.report.json` |
| S07 | 跨模块协作 | `describe -> ir export -> ir validate --profile contract -> ir diff -> verify-loop` | `control-surface.manifest.json`, `ir.diff.report.json`, `verify-loop.report.json` |
| S08 | 外部源同步 | `describe -> trialrun --emit evidence -> verify-loop -> next-actions exec` | `trialrun.report.json`, `trace.slim.json`, `verify-loop.report.json` |
| S09 | 乐观更新与回滚 | `describe -> ir export -> trialrun --emit evidence -> transform.module --mode report -> verify-loop` | `trialrun.report.json`, `transform.report.json`, `verify-loop.report.json` |
| S10 | Agent 协同控制 | `describe -> ir export -> trialrun --emit evidence -> verify-loop -> next-actions exec` | `trialrun.report.json`, `next-actions.execution.json`, `verify-loop.report.json` |

## Chain Rules

- 必须由现有 primitives 组成：`describe`、`ir export`、`ir validate`、`ir diff`、`trialrun`、`transform.module`、`verify-loop`、`next-actions exec`。
- 场景执行层仅做编排，不引入新 CLI 命令。
- 所有场景输出统一聚合到 `scenario-playbook.report.json` 与 `scenario.verdict.json`。
