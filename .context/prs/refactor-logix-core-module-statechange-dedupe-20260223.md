# PR Draft: refactor/logix-core-module-statechange-dedupe-20260223

## 目标
- 优化 `moduleStateChange` 触发器去重热路径，减少每次事件去重时的 `Ref.get + Ref.set` 双操作。
- 保持行为语义不变：仍按 `Object.is(prev, next)` 去重，且仅在值变化时发出 trigger。

## 模块阅读范围
- `packages/logix-core/src/internal/runtime/core/process/triggerStreams.ts`
- `packages/logix-core/test/Process/Process.Trigger.ModuleStateChange.test.ts`
- `packages/logix-core/test/Process/Process.Trigger.ModuleStateChange.SelectorDiagnostics.test.ts`

## 本轮改动
- `packages/logix-core/src/internal/runtime/core/process/triggerStreams.ts`
  - 新增 `dedupeConsecutiveByValue` helper，统一去重状态机。
  - 在 `diagnostics=off` 的 fallback 分支与 `diagnostics=light/full/sampled` 分支均改为 `Ref.modify` 单步去重。
  - 去掉重复的 `Ref.get` + `Ref.set` 样板，降低热路径状态访问开销并提高可维护性。

## 验证
- `pnpm --filter @logixjs/core test -- test/Process/Process.Trigger.ModuleStateChange.test.ts test/Process/Process.Trigger.ModuleStateChange.SelectorDiagnostics.test.ts --reporter=dot --hideSkippedTests`
- `pnpm --filter @logixjs/core test -- test/Process/Process.Trigger.PlatformEvent.test.ts test/Process/Process.Concurrency.LatestVsSerial.test.ts --reporter=dot --hideSkippedTests`
- `pnpm typecheck`
- `pnpm test:turbo`

## 独立审查
- 待补（创建 PR 后由独立 subagent review 并回填结论）。
