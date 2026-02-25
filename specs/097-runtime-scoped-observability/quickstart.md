# Quickstart: 097 Runtime-Scoped Observability

本 quickstart 用于 O-004 最小交付验收（runtimeLabel 维度隔离 + 定向 clear）。

## 1) 运行相关测试子集

```bash
pnpm --filter @logixjs/core test -- --run packages/logix-core/test/Debug/DevtoolsHub.test.ts
```

如需同时覆盖快照 token / buffer=0：

```bash
pnpm --filter @logixjs/core test -- --run \
  packages/logix-core/test/Debug/DevtoolsHub.test.ts \
  packages/logix-core/test/Debug/DevtoolsHub.SnapshotToken.test.ts \
  packages/logix-core/test/Debug/DevtoolsHub.BufferSizeZero.test.ts
```

## 2) 验收要点

- 不同 `runtimeLabel` 的事件窗口互相隔离（按 runtime 查询时不得串扰）。
- `clearDevtoolsEvents('R1')` 仅清理 `R1`，`R2` 不受影响。
- `clearDevtoolsEvents()`（无参）保持全局清理行为兼容。

## 3) 性能证据（占位）

执行与 `research.md` 一致的 before/after/diff 命令并落盘到：

- `specs/097-runtime-scoped-observability/perf/before.*.json`
- `specs/097-runtime-scoped-observability/perf/after.*.json`
- `specs/097-runtime-scoped-observability/perf/diff.*.json`

## 4) 迁移说明（forward-only）

- 推荐消费侧优先使用 runtime-scoped 查询接口（按 `runtimeLabel` 读取快照）。
- 旧的全局 `getDevtoolsSnapshot()` 仍可用，但在多 runtime 场景下应避免将其作为唯一隔离视图。
