# Contract: Projection Tier (O-025)

## Unified Mode Semantics (off/light/full)

- `mode=off`:
  - Runtime 进入 vacuum path，不挂载 DevtoolsHub sink / DebugObserver。
  - 只关闭观测导出路径，不改变业务执行语义。
- `mode=light`:
  - 使用 `projection.tier=light`，输出最小摘要 + degraded 信息。
- `mode=full`:
  - 使用 `projection.tier=full`，保留重资产（`latestStates` / `latestTraitSummaries`）。
- 默认 `mode=light`。

## Snapshot Projection Shape

- `projection.tier`: `"light" | "full"`（稳定枚举）
- `projection.degraded`: `boolean`
- `projection.reason`（仅 `degraded=true` 时出现）：
  - `code`: 稳定原因码（当前为 `projection_tier_light`）
  - `message`: 机器可读/人类可读解释
  - `recommendedAction`: 消费端可执行动作建议
  - `hiddenFields`: 被当前 tier 隐藏的字段列表
- `projection.visibleFields`: 当前 tier 对外可见字段白名单

## Tier Semantics

- `full`: 保留完整投影与重资产。
- `light`: 仅保留最小摘要与 degraded 信息。
  - `light` 下 `hiddenFields` 必须至少包含 `latestStates`、`latestTraitSummaries`。

## Snapshot Consistency

- `snapshotToken` 与可见字段必须一致。
- tier 切换时必须触发一次 token 递增，并同步更新 `projection` 视图。
- 从 `full -> light` 时必须清理被隐藏重资产，防止“看不到但仍旧驻留”的语义漂移。
