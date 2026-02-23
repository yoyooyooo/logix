# PR Draft: refactor/logix-core-module-statechange-dedupe-20260223

## PR
- `#39`：https://github.com/yoyooyooo/logix/pull/39

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
- 审查方式：1 个独立 subagent（worker，`agent_id=019c8983-bd64-7201-8d0b-431f3f77489b`）基于 `origin/main...HEAD` 的真实 diff 做只读审查。
- 结论：无阻塞问题，可合并。
- 非阻塞建议：
  - 补一条强制走 `changesWithMeta` fallback 分支的去重回归用例；
  - 收紧 `triggerStreams.ts` 中 `evt: any` 的内部类型约束。
