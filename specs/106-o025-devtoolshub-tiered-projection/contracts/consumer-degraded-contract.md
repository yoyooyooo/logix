# Contract: Consumer Degraded Semantics (O-025)

## Consumer Requirements

- 必须读取 `snapshot.projection`，将 `degraded=true` 视为“已声明降级”，而不是数据损坏。
- 必须展示稳定原因码（当前：`projection_tier_light`），并保留 `recommendedAction` 的提示通道。
- 当 `hiddenFields` 包含 `latestStates`/`latestTraitSummaries` 时，消费者不得把这些字段缺失误判为运行时错误。
- 在消费者功能强依赖被隐藏字段时，必须给出显式“不支持当前投影档位”的提示（禁止 silent mismatch）。

## Degraded Reason Code（当前版本）

- `projection_tier_light`
  - 含义：当前快照为 summary-only 投影，重资产字段被有意隐藏。
  - 推荐动作：切换 `projectionTier=full` 后再执行高保真分析/回放。
