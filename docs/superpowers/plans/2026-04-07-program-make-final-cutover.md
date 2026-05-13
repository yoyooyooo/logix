# Program.make Final Cutover Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 完成 `Program.make(...)` 的最终收口，让它成为唯一公开装配心智，同时把剩余公开测试、集成测试和样板里的 `.implement()` 调用进一步压回遗留层。

**Architecture:** 先把 `@logixjs/core` 的公开类型面彻底收成“定义期 `Module` + 装配期 `Program`”，把 `.implement()` 继续降成 internal / deprecated wrapper。然后按“公开 Runtime 语义 → React Hooks/RuntimeProvider 集成 → browser perf/sandbox 残尾”三批清理剩余调用面，最后刷新 sandbox 产物并做定向验证，确保 docs、实现和测试三条线一致。

**Tech Stack:** TypeScript, Effect v4, Vitest, React 19, pnpm, esbuild

---

## Scope Check

当前剩余未迁移点分成 4 个高价值簇，已经可以在一个计划里按 chunk 顺序推进：

1. `@logixjs/core` 公开类型面还保留 `.implement()` 与 `ModuleDef` deprecated alias。
2. `packages/logix-core/test/Runtime/**` 和 `packages/logix-core/test/Contracts/**` 还剩一批 `.implement()` 驱动的公开语义测试。
3. `packages/logix-react/test/{Hooks,RuntimeProvider,integration}/**` 还剩一批公开集成测试和 hooks 测试。
4. `packages/logix-react/test/browser/perf-boundaries/**` 与 `examples/logix-sandbox-mvp/test/**` 还剩 browser/perf/sandbox 尾项。

本计划只覆盖这 4 个簇。更深的 `FieldKernel / Process / Reflection / Bound / internal Runtime` 遗留测试，不纳入这份计划。

## File Structure

- Modify: `packages/logix-core/src/Module.ts`
  - 收紧定义期 `Module` 的公开类型；把 `.implement()` 继续下沉成 internal / deprecated wrapper。
- Modify: `packages/logix-core/src/Program.ts`
  - 保持 `Program.make(...)` 作为唯一公开装配入口，并承接 shared assembler。
- Modify: `packages/logix-core/src/internal/runtime/core/module.ts`
  - 对齐 `_kind: 'Module' | 'Program'` 的最小运行时契约。
- Modify: `packages/logix-react/src/internal/hooks/useModule.ts`
  - 保持 hooks 只把定义期 `Module` 和装配期 `Program` 当成显式两态。
- Modify: `packages/logix-react/src/internal/hooks/useLocalModule.ts`
  - 保持局部实例路径只接受定义期 `Module` 或 `ModuleTag`。
- Modify: `packages/logix-react/src/internal/store/ModuleRef.ts`
  - 继续以 `ModuleRefOfProgram` 为主，降低 `ModuleRefOfDef` 的存在感。
- Modify: `docs/ssot/runtime/01-public-api-spine.md`
- Modify: `docs/ssot/runtime/03-canonical-authoring.md`
- Modify: `docs/standards/logix-api-next-guardrails.md`
- Modify: `docs/adr/2026-04-04-logix-api-next-charter.md`
  - 将 “`Program.make(...)` 已是实际装配实现入口” 固化为事实源。
- Modify: `packages/logix-core/test/Runtime/Runtime.BatchWindow.test.ts`
- Modify: `packages/logix-core/test/Runtime/Runtime.Devtools.test.ts`
- Modify: `packages/logix-core/test/Runtime/Runtime.PublicSemantics.NoDrift.test.ts`
- Modify: `packages/logix-core/test/Contracts/Contracts.045.KernelActivation.test.ts`
- Modify: `packages/logix-core/test/Contracts/Contracts.045.KernelContractVerification.test.ts`
- Modify: `packages/logix-core/test/Contracts/Contracts.047.FullCutoverGate.fallback.test.ts`
- Modify: `packages/logix-core/test/Contracts/Contracts.047.FullCutoverGate.serializable.test.ts`
- Modify: `packages/logix-core/test/Contracts/Contracts.047.FullCutoverGate.trial.test.ts`
  - 清剩余 Runtime / Contract 公开语义测试中的 `.implement()` 起点。
- Modify: `packages/logix-react/test/Hooks/useModule.impl-keyed.test.tsx`
- Modify: `packages/logix-react/test/RuntimeProvider/runtime-debug-trace-integration.test.tsx`
- Modify: `packages/logix-react/test/RuntimeProvider/runtime-task-runner.runLatestTask.integration.test.tsx`
- Modify: `packages/logix-react/test/RuntimeProvider/runtime-bootresolve-phase-trace.test.tsx`
- Modify: `packages/logix-react/test/RuntimeProvider/runtime-react-render-events.integration.test.tsx`
- Modify: `packages/logix-react/test/RuntimeProvider/runtime-logix-chain.test.tsx`
- Modify: `packages/logix-react/test/RuntimeProvider/runtime-high-field-transaction.integration.test.tsx`
- Modify: `packages/logix-react/test/RuntimeProvider/runtime-transaction-react.test.tsx`
- Modify: `packages/logix-react/test/integration/strictModeSuspenseModuleRuntime.test.tsx`
- Modify: `packages/logix-react/test/integration/runtime-yield-to-host.integration.test.tsx`
- Modify: `packages/logix-react/test/integration/runtimeProviderSuspendSyncFastPath.test.tsx`
- Modify: `packages/logix-react/test/integration/runtimeProviderOnError.test.tsx`
  - 清 React Hooks / RuntimeProvider / integration 剩余 `.implement()`。
- Modify: `packages/logix-react/test/browser/perf-boundaries/runtime-store-no-tearing.test.tsx`
- Modify: `packages/logix-react/test/browser/perf-boundaries/react-defer-preload.test.tsx`
- Modify: `packages/logix-react/test/browser/perf-boundaries/react-boot-resolve.test.tsx`
- Modify: `packages/logix-react/test/browser/perf-boundaries/react-boot-resolve-phase-probe.test.tsx`
- Modify: `packages/logix-react/test/browser/perf-boundaries/react-strict-suspense-jitter.test.tsx`
- Modify: `packages/logix-react/test/browser/perf-boundaries/tick-yield-to-host.test.tsx`
- Modify: `packages/logix-react/test/browser/perf-boundaries/diagnostics-overhead.test.tsx`
- Modify: `packages/logix-react/test/browser/perf-boundaries/external-store-ingest.test.tsx`
- Modify: `packages/logix-react/test/browser/perf-boundaries/runtime-store-no-tearing.test.tsx`
- Modify: `packages/logix-react/test/browser/perf-boundaries/workflow-075.test.tsx`
- Modify: `packages/logix-react/test/browser/perf-boundaries/txn-lanes.test.tsx`
- Modify: `packages/logix-react/test/browser/perf-boundaries/form-list-scope-check.test.tsx`
- Modify: `packages/logix-react/test/browser/perf-boundaries/converge-runtime.ts`
- Modify: `packages/logix-react/test/browser/perf-boundaries/converge-time-slicing.runtime.ts`
- Modify: `packages/logix-react/test/browser/perf-boundaries/dispatch-shell.runtime.ts`
- Modify: `examples/logix-sandbox-mvp/test/ir.noArtifacts.test.ts`
- Modify: `packages/logix-sandbox/scripts/bundle-kernel.mjs`
  - 清 browser/perf/sandbox 尾项，并在最后刷新 `public/sandbox/**`。

## Chunk 1: Public Surface Hard Cutover

### Task 1: 把 `.implement()` 从公开 `Module` 类型面进一步降到遗留层

**Files:**
- Modify: `packages/logix-core/src/Module.ts`
- Modify: `packages/logix-core/src/Program.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/module.ts`
- Modify: `packages/logix-react/src/internal/hooks/useModule.ts`
- Modify: `packages/logix-react/src/internal/hooks/useLocalModule.ts`
- Modify: `packages/logix-react/src/internal/store/ModuleRef.ts`
- Modify: `docs/ssot/runtime/01-public-api-spine.md`
- Modify: `docs/ssot/runtime/03-canonical-authoring.md`
- Modify: `docs/standards/logix-api-next-guardrails.md`
- Modify: `docs/adr/2026-04-04-logix-api-next-charter.md`
- Test: `packages/logix-core/test/Runtime/Runtime.make.Program.test.ts`
- Test: `packages/logix-core/test/Runtime/Runtime.make.Module.test.ts`
- Test: `packages/logix-core/test/Contracts/KernelBoundary.test.ts`

- [ ] **Step 1: 写失败的契约断言**

在 `packages/logix-core/test/Contracts/KernelBoundary.test.ts` 增加断言，要求：

```ts
expect('implement' in (Logix.Module.make('X', { state: S, actions: A }) as any)).toBe(false)
expect(typeof Logix.Program.make).toBe('function')
```

如果当前实现还保留公开 `.implement()`，这里应先失败。

- [ ] **Step 2: 跑定向测试确认失败**

Run:

```bash
pnpm -C packages/logix-core exec vitest run \
  test/Contracts/KernelBoundary.test.ts \
  test/Runtime/Runtime.make.Program.test.ts \
  test/Runtime/Runtime.make.Module.test.ts
```

Expected: 至少有一条与公开 `.implement()` 暴露相关的断言失败。

- [ ] **Step 3: 实现最小收口**

目标代码形态：

```ts
// Module.ts
export type Module<...> = ModuleBase<...> & {
  readonly _kind: 'Module'
  // no public implement in the main type
}

/** @deprecated legacy wrapper only */
type LegacyImplement = <...>(...) => Program<...>
```

`Program.make(...)` 继续走 shared assembler，`.implement()` 若仍需要存在，只能通过 deprecated / internal 路径访问，不出现在公开主类型面。

- [ ] **Step 4: 跑类型检查与契约测试**

Run:

```bash
pnpm -C packages/logix-core exec tsc -p tsconfig.json --noEmit
pnpm -C packages/logix-react typecheck
pnpm -C packages/logix-core exec vitest run \
  test/Contracts/KernelBoundary.test.ts \
  test/Runtime/Runtime.make.Program.test.ts \
  test/Runtime/Runtime.make.Module.test.ts
```

Expected: 全部通过。

- [ ] **Step 5: 按仓库策略跳过 commit**

说明：当前仓库禁止自动 `git add/commit`，本任务不执行提交。

## Chunk 2: Runtime And Contract Test Sweep

### Task 2: 清剩余 `logix-core` 公开运行语义测试中的 `.implement()`

**Files:**
- Modify: `packages/logix-core/test/Runtime/Runtime.BatchWindow.test.ts`
- Modify: `packages/logix-core/test/Runtime/Runtime.Devtools.test.ts`
- Modify: `packages/logix-core/test/Runtime/Runtime.PublicSemantics.NoDrift.test.ts`
- Modify: `packages/logix-core/test/Contracts/Contracts.045.KernelActivation.test.ts`
- Modify: `packages/logix-core/test/Contracts/Contracts.045.KernelContractVerification.test.ts`
- Modify: `packages/logix-core/test/Contracts/Contracts.047.FullCutoverGate.fallback.test.ts`
- Modify: `packages/logix-core/test/Contracts/Contracts.047.FullCutoverGate.serializable.test.ts`
- Modify: `packages/logix-core/test/Contracts/Contracts.047.FullCutoverGate.trial.test.ts`

- [ ] **Step 1: 把 `Root.implement(...)` / `M.implement(...)` 改成 `Program.make(...)`**

统一替换模式：

```ts
const program = Logix.Program.make(Root, {
  initial: { ... },
  logics: [ ... ],
  imports: [ChildProgram.impl],
})

const runtime = Logix.Runtime.make(program)
```

- [ ] **Step 2: 跑这批公开运行语义测试**

Run:

```bash
pnpm -C packages/logix-core exec vitest run \
  test/Runtime/Runtime.BatchWindow.test.ts \
  test/Runtime/Runtime.Devtools.test.ts \
  test/Runtime/Runtime.PublicSemantics.NoDrift.test.ts \
  test/Contracts/Contracts.045.KernelActivation.test.ts \
  test/Contracts/Contracts.045.KernelContractVerification.test.ts \
  test/Contracts/Contracts.047.FullCutoverGate.fallback.test.ts \
  test/Contracts/Contracts.047.FullCutoverGate.serializable.test.ts \
  test/Contracts/Contracts.047.FullCutoverGate.trial.test.ts
```

Expected: 全部通过。

- [ ] **Step 3: 跑 `logix-core` 类型检查**

Run:

```bash
pnpm -C packages/logix-core exec tsc -p tsconfig.test.json --noEmit
```

Expected: PASS。

- [ ] **Step 4: 按仓库策略跳过 commit**

说明：当前仓库禁止自动 `git add/commit`，本任务不执行提交。

## Chunk 3: React Public Test Sweep

### Task 3: 清剩余 `logix-react` 公开 hooks / RuntimeProvider / integration 测试中的 `.implement()`

**Files:**
- Modify: `packages/logix-react/test/Hooks/useModule.impl-keyed.test.tsx`
- Modify: `packages/logix-react/test/RuntimeProvider/runtime-debug-trace-integration.test.tsx`
- Modify: `packages/logix-react/test/RuntimeProvider/runtime-task-runner.runLatestTask.integration.test.tsx`
- Modify: `packages/logix-react/test/RuntimeProvider/runtime-bootresolve-phase-trace.test.tsx`
- Modify: `packages/logix-react/test/RuntimeProvider/runtime-react-render-events.integration.test.tsx`
- Modify: `packages/logix-react/test/RuntimeProvider/runtime-logix-chain.test.tsx`
- Modify: `packages/logix-react/test/RuntimeProvider/runtime-high-field-transaction.integration.test.tsx`
- Modify: `packages/logix-react/test/RuntimeProvider/runtime-transaction-react.test.tsx`
- Modify: `packages/logix-react/test/integration/strictModeSuspenseModuleRuntime.test.tsx`
- Modify: `packages/logix-react/test/integration/runtime-yield-to-host.integration.test.tsx`
- Modify: `packages/logix-react/test/integration/runtimeProviderSuspendSyncFastPath.test.tsx`
- Modify: `packages/logix-react/test/integration/runtimeProviderOnError.test.tsx`

- [ ] **Step 1: 仅保留真正需要 `ModuleImpl` 语义覆盖的测试走 `.impl`**

规则：

```ts
// default path
const program = Logix.Program.make(ModuleDef, { initial, logics, imports })

// only when the test explicitly compares impl path
const impl = Logix.Program.make(ModuleDef, { initial, logics }).impl
```

- [ ] **Step 2: 跑 Hooks + RuntimeProvider + integration 定向测试**

Run:

```bash
pnpm -C packages/logix-react exec vitest run \
  test/Hooks/useModule.impl-keyed.test.tsx \
  test/RuntimeProvider/runtime-debug-trace-integration.test.tsx \
  test/RuntimeProvider/runtime-task-runner.runLatestTask.integration.test.tsx \
  test/RuntimeProvider/runtime-bootresolve-phase-trace.test.tsx \
  test/RuntimeProvider/runtime-react-render-events.integration.test.tsx \
  test/RuntimeProvider/runtime-logix-chain.test.tsx \
  test/RuntimeProvider/runtime-high-field-transaction.integration.test.tsx \
  test/RuntimeProvider/runtime-transaction-react.test.tsx \
  test/integration/strictModeSuspenseModuleRuntime.test.tsx \
  test/integration/runtime-yield-to-host.integration.test.tsx \
  test/integration/runtimeProviderSuspendSyncFastPath.test.tsx \
  test/integration/runtimeProviderOnError.test.tsx
```

Expected: 全部通过。

- [ ] **Step 3: 跑 `logix-react` 类型检查**

Run:

```bash
pnpm -C packages/logix-react typecheck
```

Expected: PASS。

- [ ] **Step 4: 按仓库策略跳过 commit**

说明：当前仓库禁止自动 `git add/commit`，本任务不执行提交。

## Chunk 4: Browser / Sandbox Tail Sweep

### Task 4: 清 browser perf 边界与 sandbox 测试尾项

**Files:**
- Modify: `packages/logix-react/test/browser/perf-boundaries/converge-runtime.ts`
- Modify: `packages/logix-react/test/browser/perf-boundaries/converge-time-slicing.runtime.ts`
- Modify: `packages/logix-react/test/browser/perf-boundaries/diagnostics-overhead.test.tsx`
- Modify: `packages/logix-react/test/browser/perf-boundaries/dispatch-shell.runtime.ts`
- Modify: `packages/logix-react/test/browser/perf-boundaries/external-store-ingest.test.tsx`
- Modify: `packages/logix-react/test/browser/perf-boundaries/form-list-scope-check.test.tsx`
- Modify: `packages/logix-react/test/browser/perf-boundaries/react-boot-resolve-phase-probe.test.tsx`
- Modify: `packages/logix-react/test/browser/perf-boundaries/react-boot-resolve.test.tsx`
- Modify: `packages/logix-react/test/browser/perf-boundaries/react-defer-preload.test.tsx`
- Modify: `packages/logix-react/test/browser/perf-boundaries/react-strict-suspense-jitter.test.tsx`
- Modify: `packages/logix-react/test/browser/perf-boundaries/runtime-store-no-tearing.test.tsx`
- Modify: `packages/logix-react/test/browser/perf-boundaries/tick-yield-to-host.test.tsx`
- Modify: `packages/logix-react/test/browser/perf-boundaries/txn-lanes.test.tsx`
- Modify: `packages/logix-react/test/browser/perf-boundaries/workflow-075.test.tsx`
- Modify: `examples/logix-sandbox-mvp/test/ir.noArtifacts.test.ts`
- Modify: `packages/logix-sandbox/scripts/bundle-kernel.mjs`

- [ ] **Step 1: 清 browser/perf/sandbox 里的 `.implement()` 起点**

优先替换：

```ts
const program = Logix.Program.make(ModuleDef, { initial, logics, imports })
const runtime = Logix.Runtime.make(program)
```

仅在需要显式 `ModuleImpl` 行为覆盖时保留：

```ts
const impl = Logix.Program.make(ModuleDef, { initial, logics }).impl
```

- [ ] **Step 2: 重新生成 sandbox 内置 kernel**

Run:

```bash
pnpm -C packages/logix-sandbox bundle:kernel
```

Expected: `public/sandbox/**` 刷新完成，`chunks/` 不保留陈旧 bundle。

- [ ] **Step 3: 跑 browser/perf/sandbox 定向检查**

Run:

```bash
pnpm -C packages/logix-react exec tsc -p tsconfig.test.json --noEmit
pnpm -C examples/logix-sandbox-mvp exec tsc -p tsconfig.json --noEmit
pnpm -C packages/logix-sandbox exec vitest run \
  test/browser/sandbox-worker-smoke.test.ts \
  test/browser/sandbox-worker-process-events.compat.test.ts
```

Expected: 全部通过。

- [ ] **Step 4: 做最终残留扫描**

Run:

```bash
rg -n '\\.implement\\(' \
  packages/logix-core/test \
  packages/logix-react/test \
  packages/logix-form/test \
  packages/logix-query/test \
  packages/domain/test \
  examples \
  -g '!**/node_modules/**' -g '!**/dist/**' -g '!**/*.generated.*'
```

Expected:

- 只剩刻意保留的 `ModuleImpl` / legacy 覆盖用例
- 不再在公开集成层和主流运行语义测试里看到“默认从 `.implement()` 起步”

- [ ] **Step 5: 按仓库策略跳过 commit**

说明：当前仓库禁止自动 `git add/commit`，本任务不执行提交。
