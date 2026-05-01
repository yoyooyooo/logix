# Research: 097 Runtime-Scoped Observability

## 现状（As-Is）

- `packages/logix-core/src/internal/runtime/core/DevtoolsHub.ts` 当前以进程级全局单例维护观测快照。
- `events` 由单一 `ringBuffer` 承载，`latestStates/latestFieldSummaries` 为全局 Map；多 runtime 共享同一窗口。
- `clearDevtoolsEvents()` 仅支持全局清理，无法定向清理单 runtime。
- 对外公开查询只有 `getDevtoolsSnapshot()`，缺少 runtimeLabel 维度的隔离查询。

## 最小方案（To-Be, O-004 最小可交付）

- 将 DevtoolsHub 的 `events/latest/exportBudget` 改为按 `runtimeLabel` 分桶存储（runtime bucket）。
- 保留现有全局 API 兼容：
  - `getDevtoolsSnapshot()` 继续可用（聚合视图）。
  - `clearDevtoolsEvents()` 无参行为保持“全局清理”。
- 新增 runtime 维度查询能力：
  - `getDevtoolsSnapshotByRuntimeLabel(runtimeLabel)` 返回该 runtime 的隔离快照。
- 扩展 clear 能力：
  - `clearDevtoolsEvents(runtimeLabel?)` 支持仅清理指定 runtime（有参）。

## 取舍与边界

- 本次只做 runtime-scoped 隔离最小闭环，不引入新的异步投影队列，不修改业务 DSL/API。
- 尽量只改 `DevtoolsHub.ts` 与必要类型导出（`Debug.ts`），避免扩散到无关模块。
- 迁移策略维持 forward-only：不加兼容层，仅通过新增查询 API 与定向 clear 提供替代路径。

## 性能证据命令（占位）

> 说明：以下命令为本特性 before/after/diff 的占位模板，待实现收口后替换 `<...>` 并执行。

### before

```bash
pnpm perf collect -- --profile default --files packages/logix-core \
  --out specs/097-runtime-scoped-observability/perf/before.<base_sha>.macos-arm64.node20.default.json
```

### after

```bash
pnpm perf collect -- --profile default --files packages/logix-core \
  --out specs/097-runtime-scoped-observability/perf/after.<worktree_sha>.macos-arm64.node20.default.json
```

### diff

```bash
pnpm perf diff -- \
  --before specs/097-runtime-scoped-observability/perf/before.<base_sha>.macos-arm64.node20.default.json \
  --after specs/097-runtime-scoped-observability/perf/after.<worktree_sha>.macos-arm64.node20.default.json \
  --out specs/097-runtime-scoped-observability/perf/diff.before__after.macos-arm64.node20.default.json
```
