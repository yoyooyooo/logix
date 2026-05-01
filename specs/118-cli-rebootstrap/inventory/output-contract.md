# Inventory: Output Contract

## Goal

固定 `check / trial / compare` 的统一机器输出字段。

## Shared Fields

| Field | Required | Meaning |
| --- | --- | --- |
| `schemaVersion` | yes | 报告 schema 版本 |
| `kind` | yes | 报告类型 |
| `stage` | yes | `check` / `trial` / `compare` |
| `verdict` | yes | `pass` / `warn` / `fail` |
| `summary` | yes | 人类可读摘要 |
| `artifacts` | yes | 关键工件引用或摘要 |
| `repairHints` | yes | 后续修复提示数组 |
| `nextRecommendedStage` | yes | 下一推荐阶段 |

## Command Mapping

| Command | Report Kind |
| --- | --- |
| `check` | `RuntimeCheckReport` |
| `trial` | `RuntimeTrialReport` |
| `compare` | `RuntimeCompareReport` |

## Contract Notes

- 命令最终 stdout 仍包装在 `CommandResult`
- 以上字段应出现在主 artifact 的 `inline` 或落盘 JSON 中
