# PR Draft: refactor/logix-core-selectorgraph-reads-by-root-20260223

## 目标
- 优化 `SelectorGraph.onCommit` 热路径的 overlap 判断，减少多 root selector 下不必要的读路径扫描。
- 保持既有语义：dirtyAll 回退、registry 缺失回退、`read_query::eval_error` 诊断、`trace:selector:eval` 证据事件不变。

## 模块阅读范围
- `packages/logix-core/src/internal/runtime/core/SelectorGraph.ts`
- `packages/logix-core/test/Runtime/ModuleRuntime/SelectorGraph.test.ts`
- `docs/ssot/handbook/tutorials/21-readquery-selectors-topics.md`

## 本轮改动
- `packages/logix-core/src/internal/runtime/core/SelectorGraph.ts`
  - `SelectorEntry` 新增 `readsByRootKey`，在 `ensureEntry` 预分组 read paths。
  - `shouldEvaluateEntryForDirtyRoots` 改为仅扫描 dirtyRoot 对应 rootKey 的 reads。
  - 多 selector 路径下的 overlap 判断同样改为按 rootKey 命中 `readsByRootKey`，避免遍历无关 root 的 reads。
  - 移除已不再使用的 `readRootKeySet` 字段，减少 entry 状态噪音。
- `packages/logix-core/test/Runtime/ModuleRuntime/SelectorGraph.test.ts`
  - 新增回归用例：`does not recompute multi-root selector when dirty path is non-overlapping under same root`。
  - 锁定语义：同 root 下非重叠路径更新不会触发 selector 重算/发布。

## 验证
- `pnpm --filter @logixjs/core test -- test/Runtime/ModuleRuntime/SelectorGraph.test.ts --reporter=dot --hideSkippedTests`
- `pnpm --filter @logixjs/core test -- test/Process/Process.Trigger.ModuleStateChange.test.ts test/Process/Process.Trigger.PlatformEvent.test.ts --reporter=dot --hideSkippedTests`
- `pnpm typecheck`
- `pnpm test:turbo`

## 独立审查
- 待补（创建 PR 后由独立 subagent review 并回填结论）。
