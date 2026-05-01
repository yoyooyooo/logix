# Inventory: Legacy Routing

## Goal

记录旧 CLI 命令的退场去向，避免新旧主线并列。

## Legacy Disposition

| Legacy Command | Route | Notes |
| --- | --- | --- |
| `describe` | `expert` | 保留为命令契约发现，不再属于主 verification surface |
| `ir export` | `expert` | 继续作为低层 artifact 生产器 |
| `ir validate` | `expert` | 由 `check` 主命令包一层 control-plane 语义 |
| `ir diff` | `expert` | 由 `compare` 主命令包一层 control-plane 语义 |
| `trialrun` | `archive` | 旧命名退出主线，由 `trial` 接管 |
| `contract-suite run` | `archive` | 当前不进主线，后续若回归也只能 expert 化 |
| `spy evidence` | `archive` | 保留历史价值，不进主线 |
| `anchor index` | `removed` | 已从 parser、internal help 与 describe 契约移除；历史材料只作 archive 背景 |
| `anchor autofill` | `removed` | 已从 parser、internal help 与 describe 契约移除；历史材料只作 archive 背景 |
| `transform module` | `archive` | 退出 verification 主线 |

## Expert Routing Rule

- expert 命令可以继续存在于内部实现与 describe 报告中
- 新用户与 agent 的默认路由只指向 `check / trial / compare`
