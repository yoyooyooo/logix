# PR Draft: refactor/coderabbit-triggerstream-hardening-20260223

## 目标
- 跟进 CodeRabbit 对 `moduleStateChange` 触发流的建议，补上 fallback 缺流守卫，避免抛出非 typed `TypeError`。
- 清理 `selectorDiagnostics` 分支中的死条件，收敛为单一路径，减少可选分支噪音。
- 补齐缺流回归测试，并在既有 diagnostics 用例中显式声明 `changesReadQueryWithMeta` 前提。

## 模块阅读范围
- `packages/logix-core/src/internal/runtime/core/process/triggerStreams.ts`
- `packages/logix-core/test/Process/Process.Trigger.ModuleStateChange.SelectorDiagnostics.test.ts`
- `packages/logix-core/test/Process/Process.Trigger.ModuleStateChange.MissingStreams.test.ts`

## 本轮改动
- `packages/logix-core/src/internal/runtime/core/process/triggerStreams.ts`
  - 新增 `makeMissingChangesStreamError`（`process::missing_changes_stream`）。
  - 在 `changesReadQueryWithMeta` fallback 分支中，对 `runtime.changesWithMeta` 增加 `typeof === 'function'` 守卫，缺失时走 typed `Effect.fail`。
  - 去除 `enableSelectorDiagnostics` 下的死分支：`selectorDiagnosticsRef` / `selector` 收敛为非可选形态。
- `packages/logix-core/test/Process/Process.Trigger.ModuleStateChange.MissingStreams.test.ts`
  - 新增回归：当 trigger 目标 runtime 缺失 `changesWithMeta` 时，稳定产出 `process::missing_changes_stream`，且不误报 `process::missing_dependency`。
- `packages/logix-core/test/Process/Process.Trigger.ModuleStateChange.SelectorDiagnostics.test.ts`
  - 在“unrelated updates”用例中显式断言 `changesReadQueryWithMeta` 为函数，固定测试前提。

## 风险与取舍
- 风险：新增缺流 guard 后，过去由 defect 触发的异常路径将转为 typed error，事件语义会更可预期。
- 取舍：优先保证错误通道可诊断与可断言，避免在 ProcessRuntime 路径出现不可控的 JS 运行时异常。

## 验证
- `pnpm --filter @logixjs/core test -- test/Process/Process.Trigger.ModuleStateChange.MissingStreams.test.ts test/Process/Process.Trigger.ModuleStateChange.SelectorDiagnostics.test.ts --run --reporter=dot --hideSkippedTests`
- `pnpm typecheck`
- `pnpm test:turbo`

## 独立审查
- Reviewer：subagent `019c8ac9-aae3-7961-9378-12b836bcc6b5`（default，只读）
- 结论：无阻塞问题；提示 residual risks：
  - guard 当前只校验 `changesWithMeta` 是否为函数，未额外校验返回值是否为合法 `Stream`
  - 缺流回归仅覆盖 `diagnosticsLevel='light'`
  - 现有 diagnostics 用例新增的 `changesReadQueryWithMeta` 断言会绑定实现细节
