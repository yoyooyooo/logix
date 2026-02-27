# Release Checklist: O-025 DevtoolsHub Tiered Projection

## Default Switch Guard (full -> light)

- [x] `DevtoolsHub` 默认 `projectionTier` 已切换到 `light`。
- [x] `projection.degraded` 在 `light` 档位可解释，且携带稳定原因码。
- [x] `snapshotToken` 与可见字段一致性通过回归测试。
- [x] `full` 档位仍可提供 `latestStates` / `latestTraitSummaries` 高保真资产。

## Consumer Matrix

- [x] `@logixjs/devtools-react` 已展示 `projection:light + degraded reason`。
- [x] `@logixjs/sandbox` 消费链路有 degraded 兼容测试（不误判为故障）。
- [x] 导入证据（Evidence import）路径保持可序列化，不因投影分层崩溃。

## Quality Gates

- [x] `pnpm typecheck`
- [x] `pnpm lint`
- [x] `pnpm test:turbo`
