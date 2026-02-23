# PR Draft: refactor/logix-core-dirtyset-id-fastpath-20260223

## 目标
- 优化 `StateTransaction.commit` 的 dirty-set 归并热路径，减少通用 `dirtyPaths` 分支判定在事务提交阶段的开销。
- 在不改变 `DirtyAllReason` / `rootIds` / `keyHash` 语义的前提下，引入 numeric-id 专用 fast path。

## 模块阅读范围
- `packages/logix-core/src/internal/field-path.ts`
- `packages/logix-core/src/internal/runtime/core/StateTransaction.ts`
- `packages/logix-core/test/internal/FieldPath/FieldPath.DirtySetReason.test.ts`
- `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.test.ts`

## 本轮改动
- `packages/logix-core/src/internal/field-path.ts`
  - 新增 `dirtyPathIdsToRootIds`：专门处理 `Iterable<FieldPathId>` 输入，复用 dirty-set 判定语义但避开 string/path 解析分支。
  - 抽取 `makeDirtyAllSet` 与 `buildSpecificDirtySetFromIds`，统一 `dirtyPathsToRootIds` 与 `dirtyPathIdsToRootIds` 的 root 收敛与 hash 生成逻辑。
- `packages/logix-core/src/internal/runtime/core/StateTransaction.ts`
  - `buildDirtySet` 改为调用 `dirtyPathIdsToRootIds`，使事务提交阶段直接走 id-only fast path。
- `packages/logix-core/test/internal/FieldPath/FieldPath.DirtySetReason.test.ts`
  - 新增 fast path 回归：前缀收敛、invalid id -> `nonTrackablePatch`、missing id -> `fallbackPolicy`。

## 验证
- `pnpm --filter @logixjs/core test -- test/internal/FieldPath/FieldPath.DirtySetReason.test.ts test/internal/Runtime/ModuleRuntime/ModuleRuntime.test.ts --reporter=dot --hideSkippedTests`
- `pnpm typecheck`
- `pnpm test:turbo`

## 独立审查
- 待补（创建 PR 后由独立 subagent review 并回填结论）。
