# DebugSink dirty root path 解析统一

## Branch
- perf/cr88-debugsink-dirtyroot-helper
- PR: #89 (https://github.com/yoyooyooo/logix/pull/89)

## 核心改动
- 在 `packages/logix-core/src/internal/runtime/core/DebugSink.record.ts` 抽取共享 helper：`resolveDirtyRootPathsFromRootIds`。
- `resolveStateUpdateDirtySetRootPaths` 与 `resolveTraitConvergeDirtyRootPaths` 统一走同一套 rootIds->rootPaths 校验：`finite`、`non-negative`、`in-bounds`、`非空字符串 segment`。
- 保持输出 shape 不变：仍返回 `ReadonlyArray<JsonValue> | undefined`，仅在有效 rootPath 存在时输出。

## 验证
- `pnpm -C packages/logix-core exec vitest run test/observability/DebugSink.record.off.test.ts`
