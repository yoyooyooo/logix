# 2026-03-26 v4 react base-red fix ready

## 分支

- worktree: `/Users/yoyo/Documents/code/personal/logix.worktrees/v4-perf.react-base-red-fix`
- branch: `agent/v4-perf-react-base-red-fix-20260326`
- base: `v4-perf@acfa2d45`

## 建议提交说明

`fix(react): restore runtime provider and local module base-red paths`

## 最终文件面

见：

- `specs/103-effect-v4-forward-cutover/perf/2026-03-26-v4-react-base-red-fix.files.txt`

## 已完成本地验证

```bash
pnpm -C packages/logix-react test -- test/internal/integration/reactConfigRuntimeProvider.test.tsx
pnpm -C packages/logix-react test -- test/integration/runtimeProviderTickServices.regression.test.tsx
pnpm -C packages/logix-react test -- test/internal/RuntimeExternalStore.lowPriority.test.ts
pnpm -C packages/logix-react test -- test/Hooks/asyncLocalModuleLocalRuntime.test.tsx
pnpm -C packages/logix-react test -- test/Hooks/useModuleSuspend.test.tsx
pnpm -C packages/logix-react test -- test/integration/runtime-yield-to-host.integration.test.tsx
pnpm -C packages/logix-core test -- test/Runtime/Runtime.PublicSemantics.NoDrift.test.ts test/internal/Runtime/TickScheduler.correlation.test.ts test/internal/Runtime/TickScheduler.fixpoint.test.ts test/internal/Runtime/TickScheduler.telemetry.test.ts test/internal/Runtime/TickScheduler.topic-classification.test.ts
pnpm -C packages/logix-react typecheck:test
pnpm -C packages/logix-core typecheck:test
```

## 整包验证裁决

```bash
pnpm -C packages/logix-react test
```

最终只剩：

- `test/browser/perf-boundaries/converge-steps.test.tsx`

这条失败属于母线 `v4-perf` 既有的 `converge-steps` perf hard gate，和本次 react base-red 修复无直接因果关系。

## 待执行

- 等待用户授权 `git add` / `git commit` / `git push`
