# PR Draft: refactor/logix-core-module-statechange-readquery-diag-20260223

## 目标
- 优化 `moduleStateChange` 触发器在 diagnostics 路径的热开销，避免无关 commit 上的 selector 重算。
- 保持既有行为约束：warning 发射语义、fallback 行为、`process::selector_high_frequency` 错误码与 hint 结构不变。

## 模块阅读范围
- `packages/logix-core/src/internal/runtime/core/process/triggerStreams.ts`
- `packages/logix-core/src/internal/runtime/core/SelectorGraph.ts`
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.impl.ts`
- `packages/logix-core/test/Process/Process.Trigger.ModuleStateChange.SelectorDiagnostics.test.ts`
- `docs/ssot/handbook/tutorials/21-readquery-selectors-topics.md`

## 本轮改动
- `packages/logix-core/src/internal/runtime/core/process/triggerStreams.ts`
  - 为 `moduleStateChange` 抽取 `buildModuleStateChangeBaseStream(selector)`，统一构建触发流。
  - diagnostics=light/full 路径改为优先走 `changesReadQueryWithMeta(ReadQuery.make(...))`，让增量判定复用 SelectorGraph 的 dirty-root 过滤。
  - 当 runtime 缺失 `changesReadQueryWithMeta` 时，保留 `changesWithMeta + dedupeConsecutiveByValue` 回退路径。
- `packages/logix-core/test/Process/Process.Trigger.ModuleStateChange.SelectorDiagnostics.test.ts`
  - 新增回归用例：`should not trigger for unrelated path updates in diagnostics mode`。
  - 锁定语义：在 diagnostics 模式下，非目标字段的高频更新不会触发该 `moduleStateChange(path)` process，也不会产生误报 warning。

## 验证
- `pnpm --filter @logixjs/core test -- test/Process/Process.Trigger.ModuleStateChange.test.ts test/Process/Process.Trigger.ModuleStateChange.SelectorDiagnostics.test.ts --reporter=dot --hideSkippedTests`
- `pnpm typecheck`
- `pnpm test:turbo`

## 独立审查
- 待补（创建 PR 后由独立 subagent review 并回填结论）。
