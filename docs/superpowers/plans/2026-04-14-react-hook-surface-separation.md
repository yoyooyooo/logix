# React Hook Surface Separation Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 `useModule` 收口为纯实例入口，把状态读取统一收口到 `useSelector`，并修复 `useModule(existingRef)` 的类型与运行时身份漂移。

**Architecture:** 这次 cutover 只改 React host projection 的 hook surface，不改 runtime kernel。执行顺序固定为三段：先用 dts 和 runtime contract 测试钉死新公式，再收口 `useModule` 的 overload 与 identity 行为，最后清扫 tests、examples、README、SSoT 与 docs site 中的旧 selector sugar 口径。

**Tech Stack:** TypeScript, React 19, Effect V4, Vitest, pnpm, Logix React, SSoT docs, apps/docs

---

## Ramanujan Lens

这次优化只保留两条稳定公式：

1. `useModule(...)` 负责拿实例句柄。
2. `useSelector(...)` 负责读整份 state 或 state projection。

凡是把“拿实例”和“读状态”揉进同一个返回面的写法，都属于清扫面。`useModule(ref)` 需要成为 identity path，这样公式才可推导，类型与运行时也才一致。

## Scope Check

包含：

- `packages/logix-react` 的 `useModule` / `useSelector` 公开签名与实现边界
- `packages/logix-react/test-dts` 的 compile-time surface contract
- `packages/logix-react/test/**` 与 `examples/logix-react/**` 中的旧 `useModule(..., selector)` 调用迁移
- `packages/logix-react/README.md`
- `docs/ssot/runtime/**` 与 `docs/standards/logix-api-next-guardrails.md`
- `apps/docs/content/docs/**` 里直接描述 `useModule(handle, selector)` sugar 的页面

不包含：

- `useImportedModule` / `useDispatch` 的新能力扩张
- runtime scheduler、store、ReadQuery 的内核语义重写
- `ModuleImpl` specialized route 的删除
- `docs/archive/**` 冻结历史文档修订

执行前先读：

- `AGENTS.md`
- `docs/ssot/runtime/01-public-api-spine.md`
- `docs/ssot/runtime/03-canonical-authoring.md`
- `docs/ssot/runtime/10-react-host-projection-boundary.md`
- `docs/standards/logix-api-next-guardrails.md`
- `packages/logix-react/src/internal/hooks/useModule.ts`
- `packages/logix-react/src/internal/hooks/useSelector.ts`

建议搭配：

- `@project-guide`
- `@technical-design-review`
- `@verification-before-completion`

## File Structure

### Hook Surface

- Modify: `packages/logix-react/src/internal/hooks/useModule.ts`
  - 删除 selector overload，保留实例入口与 `ModuleRef` identity path。
- Modify: `packages/logix-react/src/internal/hooks/useSelector.ts`
  - 明确 `useSelector(handle)` 读取整份 state，`useSelector(handle, selector)` 读取 projection。
- Modify: `packages/logix-react/src/Hooks.ts`
  - 保持导出面稳定，确保文档与实现口径一致。

### Type Contracts

- Modify: `packages/logix-react/test-dts/canonical-hooks.surface.ts`
  - 固定 `useModule` / `useSelector` 的 compile-time contract。
- Modify: `packages/logix-react/test-dts/tsconfig.json`
  - 若需要新增 dts 夹具，把新文件纳入单独编译。

### Runtime Contracts

- Modify: `packages/logix-react/test/Hooks/useModule.keep-surface-contract.test.tsx`
  - 保护 `useModule(existingRef)` identity 与 `useSelector(ref)` whole-state route。
- Modify: `packages/logix-react/test/Hooks/useSelector.test.tsx`
  - 保护 `useSelector(handle)` 与 `useSelector(handle, selector, equalityFn?)` 的主路径。

### Callsite Sweep

- Modify: `packages/logix-react/test/Hooks/asyncLocalModuleLocalRuntime.test.tsx`
- Modify: `packages/logix-react/test/Hooks/hooks.test.tsx`
- Modify: `packages/logix-react/test/Hooks/multiInstance.test.tsx`
- Modify: `packages/logix-react/test/Hooks/useModule.impl-keyed.test.tsx`
- Modify: `packages/logix-react/test/Hooks/useModule.keep-surface-contract.test.tsx`
- Modify: `packages/logix-react/test/Hooks/useModule.program-blueprint-identity.test.tsx`
- Modify: `packages/logix-react/test/Hooks/useModule.test.tsx`
- Modify: `packages/logix-react/test/Hooks/useModuleSuspend.test.tsx`
- Modify: `packages/logix-react/test/Hooks/useProcesses.test.tsx`
- Modify: `packages/logix-react/test/Hooks/watcherPatterns.test.tsx`
- Modify: `packages/logix-react/test/RuntimeProvider/runtime-bootresolve-phase-trace.test.tsx`
- Modify: `packages/logix-react/test/RuntimeProvider/runtime-logix-chain.test.tsx`
- Modify: `packages/logix-react/test/RuntimeProvider/runtime-react-render-events.integration.test.tsx`
- Modify: `packages/logix-react/test/browser/perf-boundaries/react-boot-resolve-phase-probe.test.tsx`
- Modify: `packages/logix-react/test/browser/perf-boundaries/react-boot-resolve.test.tsx`
- Modify: `packages/logix-react/test/browser/perf-boundaries/react-defer-preload.test.tsx`
- Modify: `packages/logix-react/test/browser/perf-boundaries/runtime-store-no-tearing.test.tsx`
- Modify: `packages/logix-react/test/browser/perf-boundaries/txn-lanes.test.tsx`
- Modify: `packages/logix-react/test/browser/watcher-browser-perf.test.tsx`
- Modify: `packages/logix-react/test/integration/app-counter-demo-layout.test.tsx`
- Modify: `packages/logix-react/test/integration/app-demo-layout-trace-suspend.test.tsx`
- Modify: `packages/logix-react/test/integration/runtime-yield-to-host.integration.test.tsx`
- Modify: `packages/logix-react/test/integration/runtimeProviderSuspendSyncFastPath.test.tsx`
- Modify: `packages/logix-react/test/integration/runtimeProviderTickServices.regression.test.tsx`
- Modify: `examples/logix-react/src/demos/AsyncLocalModuleLayout.tsx`
- Modify: `examples/logix-react/src/demos/FractalRuntimeLayout.tsx`
- Modify: `examples/logix-react/src/demos/LayerOverrideDemoLayout.tsx`
- Modify: `examples/logix-react/src/demos/LinkDemoLayout.tsx`
- Modify: `examples/logix-react/src/demos/LocalModuleLayout.tsx`
- Modify: `examples/logix-react/src/demos/MiddlewareDemoLayout.tsx`
- Modify: `examples/logix-react/src/demos/ProcessSubtreeDemo.tsx`
- Modify: `examples/logix-react/src/demos/SuspenseModuleLayout.tsx`
- Modify: `examples/logix-react/src/demos/form/FieldFormDemoLayout.tsx`
- Modify: `examples/logix-react/src/sections/GlobalRuntimeSections.tsx`

### Docs Sweep

- Modify: `packages/logix-react/README.md`
- Modify: `docs/ssot/runtime/01-public-api-spine.md`
- Modify: `docs/ssot/runtime/03-canonical-authoring.md`
- Modify: `docs/ssot/runtime/10-react-host-projection-boundary.md`
- Modify: `docs/standards/logix-api-next-guardrails.md`
- Modify: `apps/docs/content/docs/api/react/use-module.md`
- Modify: `apps/docs/content/docs/api/react/use-module.cn.md`
- Modify: `apps/docs/content/docs/api/react/use-selector.md`
- Modify: `apps/docs/content/docs/api/react/use-selector.cn.md`
- Modify: `apps/docs/content/docs/guide/recipes/react-integration.md`
- Modify: `apps/docs/content/docs/guide/recipes/react-integration.cn.md`

## Chunk 1: Contract Cutover

### Task 1: 钉死新的 dts 合同

**Files:**
- Modify: `packages/logix-react/test-dts/canonical-hooks.surface.ts`
- Modify: `packages/logix-react/test-dts/tsconfig.json`
- Test: `packages/logix-react/test-dts/canonical-hooks.surface.ts`

- [x] **Step 1: 先写失败的 dts 合同**

```ts
import { useImportedModule, useModule, useSelector } from '../src/Hooks.js'

const page = useModule(PageProgram, { key: 'page:42' })
const tagged = Object.assign(page, { marker: 'keep-me' as const })
const same = useModule(tagged)
const full = useSelector(tagged)

const marker: 'keep-me' = same.marker
const ready: boolean = full.ready

// @ts-expect-error useModule no longer accepts selector overloads
useModule(tagged, (s) => s.ready)

// @ts-expect-error constructor + selector route is removed from useModule
useModule(Counter.tag, (s) => s.count)

void useImportedModule(page, Counter.tag)
```

- [x] **Step 2: 运行 dts 编译，确认它先失败**

Run: `pnpm --filter @logixjs/react exec tsc -p test-dts/tsconfig.json --noEmit`
Expected: FAIL，至少出现一个 `Unused '@ts-expect-error'`，以及 `marker` 或返回类型不匹配。

- [x] **Step 3: 只做最小 dts 夹具调整**

```ts
// 若现有 canonical-hooks.surface.ts 过长，就新增一个独立夹具文件并把它纳入 tsconfig include。
```

- [x] **Step 4: 再跑 dts 编译，确认失败门稳定可复现**

Run: `pnpm --filter @logixjs/react exec tsc -p test-dts/tsconfig.json --noEmit`
Expected: 仍然 FAIL，错误稳定落在新合同上。

- [ ] **Step 5: 提交这一轮红灯夹具**

```bash
git add packages/logix-react/test-dts/canonical-hooks.surface.ts packages/logix-react/test-dts/tsconfig.json
git commit -m "test: lock react hook surface dts contract"
```

### Task 2: 先回写事实源，再让实现追上

**Files:**
- Modify: `docs/ssot/runtime/01-public-api-spine.md`
- Modify: `docs/ssot/runtime/03-canonical-authoring.md`
- Modify: `docs/ssot/runtime/10-react-host-projection-boundary.md`
- Modify: `docs/standards/logix-api-next-guardrails.md`

- [x] **Step 1: 先写出新的公开公式**

```md
- `useModule(...)` 只负责 lookup / instantiate，并返回 `ModuleRef`
- `useSelector(handle)` 读取整份 state
- `useSelector(handle, selector, equalityFn?)` 读取 projection
- `useModule(handle, selector)` 已退出公开 surface
```

- [x] **Step 2: 用 grep 记录当前旧口径命中**

Run: `rg -n "useModule\\(handle, selector|useModule\\([^\\n]*, \\(s\\)|syntax sugar|语法糖" docs/ssot/runtime docs/standards`
Expected: 命中 `docs/ssot/runtime/10-react-host-projection-boundary.md` 等旧口径。

- [x] **Step 3: 回写 SSoT 与 guardrails**

```md
day-one 构造入口：
- useModule(ModuleTag)
- useModule(Program, options?)

读取入口：
- useSelector(handle)
- useSelector(handle, selector, equalityFn?)
```

- [x] **Step 4: 再跑 grep，确认事实源收口**

Run: `rg -n "useModule\\(handle, selector|useModule\\([^\\n]*, \\(s\\)|syntax sugar|语法糖" docs/ssot/runtime docs/standards`
Expected: 只剩允许保留的 specialized 注释，或无输出。

- [ ] **Step 5: 提交事实源**

```bash
git add docs/ssot/runtime/01-public-api-spine.md docs/ssot/runtime/03-canonical-authoring.md docs/ssot/runtime/10-react-host-projection-boundary.md docs/standards/logix-api-next-guardrails.md
git commit -m "docs: split react hook construct and select surfaces"
```

## Chunk 2: Hook Implementation

### Task 3: 把 `useModule` 切回纯实例入口

**Files:**
- Modify: `packages/logix-react/src/internal/hooks/useModule.ts`
- Modify: `packages/logix-react/src/internal/hooks/useSelector.ts`
- Modify: `packages/logix-react/src/Hooks.ts`
- Modify: `packages/logix-react/test/Hooks/useModule.keep-surface-contract.test.tsx`
- Modify: `packages/logix-react/test/Hooks/useSelector.test.tsx`
- Test: `packages/logix-react/test/Hooks/useModule.keep-surface-contract.test.tsx`
- Test: `packages/logix-react/test/Hooks/useSelector.test.tsx`

- [x] **Step 1: 先写失败的 runtime contract 测试**

```tsx
it('useModule(existingRef) keeps runtime identity and custom fields', async () => {
  const { result } = renderHook(() => {
    const page = useModule(PageProgram, { key: 'page:42' })
    const tagged = React.useMemo(() => Object.assign(page, { marker: 'keep-me' as const }), [page])
    const same = useModule(tagged)
    const full = useSelector(same)
    return { same, tagged, full }
  }, { wrapper })

  await waitFor(() => {
    expect(result.current.same).toBe(result.current.tagged)
    expect(result.current.same.marker).toBe('keep-me')
    expect(result.current.full.ready).toBe(true)
  })
})
```

- [x] **Step 2: 跑定向测试，确认它先失败**

Run: `pnpm --filter @logixjs/react test -- test/Hooks/useModule.keep-surface-contract.test.tsx test/Hooks/useSelector.test.tsx`
Expected: FAIL，`same !== tagged`、扩展字段丢失，或旧 `useModule(..., selector)` 仍然存在。

- [x] **Step 3: 只做最小实现改动**

```ts
export function useModule<M extends ModuleRef<any, any, any, any, any>>(handle: M): M

if (isModuleRef(handle)) {
  return handle
}

if (typeof selectorOrOptions === 'function') {
  throw new Error('[useModule] selector route moved to useSelector(handle, selector)')
}
```

```ts
export function useSelector<H extends ReactModuleHandle>(handle: H): StateOfHandle<H>
export function useSelector<H extends ReactModuleHandle, V>(
  handle: H,
  selector: (state: StateOfHandle<H>) => V,
  equalityFn?: (previous: V, next: V) => boolean,
): V
```

- [x] **Step 4: 先跑定向测试，再跑 dts**

Run: `pnpm --filter @logixjs/react test -- test/Hooks/useModule.keep-surface-contract.test.tsx test/Hooks/useSelector.test.tsx`
Expected: PASS

Run: `pnpm --filter @logixjs/react exec tsc -p test-dts/tsconfig.json --noEmit`
Expected: PASS

- [ ] **Step 5: 提交 hook surface cutover**

```bash
git add packages/logix-react/src/internal/hooks/useModule.ts packages/logix-react/src/internal/hooks/useSelector.ts packages/logix-react/src/Hooks.ts packages/logix-react/test/Hooks/useModule.keep-surface-contract.test.tsx packages/logix-react/test/Hooks/useSelector.test.tsx packages/logix-react/test-dts/canonical-hooks.surface.ts packages/logix-react/test-dts/tsconfig.json
git commit -m "refactor: split react hook construct and select APIs"
```

## Chunk 3: Callsite Migration

### Task 4: 清扫 package tests 与 examples 里的旧 selector sugar

**Files:**
- Modify: `packages/logix-react/test/Hooks/asyncLocalModuleLocalRuntime.test.tsx`
- Modify: `packages/logix-react/test/Hooks/hooks.test.tsx`
- Modify: `packages/logix-react/test/Hooks/multiInstance.test.tsx`
- Modify: `packages/logix-react/test/Hooks/useModule.impl-keyed.test.tsx`
- Modify: `packages/logix-react/test/Hooks/useModule.keep-surface-contract.test.tsx`
- Modify: `packages/logix-react/test/Hooks/useModule.program-blueprint-identity.test.tsx`
- Modify: `packages/logix-react/test/Hooks/useModule.test.tsx`
- Modify: `packages/logix-react/test/Hooks/useModuleSuspend.test.tsx`
- Modify: `packages/logix-react/test/Hooks/useProcesses.test.tsx`
- Modify: `packages/logix-react/test/Hooks/watcherPatterns.test.tsx`
- Modify: `packages/logix-react/test/RuntimeProvider/runtime-bootresolve-phase-trace.test.tsx`
- Modify: `packages/logix-react/test/RuntimeProvider/runtime-logix-chain.test.tsx`
- Modify: `packages/logix-react/test/RuntimeProvider/runtime-react-render-events.integration.test.tsx`
- Modify: `packages/logix-react/test/browser/perf-boundaries/react-boot-resolve-phase-probe.test.tsx`
- Modify: `packages/logix-react/test/browser/perf-boundaries/react-boot-resolve.test.tsx`
- Modify: `packages/logix-react/test/browser/perf-boundaries/react-defer-preload.test.tsx`
- Modify: `packages/logix-react/test/browser/perf-boundaries/runtime-store-no-tearing.test.tsx`
- Modify: `packages/logix-react/test/browser/perf-boundaries/txn-lanes.test.tsx`
- Modify: `packages/logix-react/test/browser/watcher-browser-perf.test.tsx`
- Modify: `packages/logix-react/test/integration/app-counter-demo-layout.test.tsx`
- Modify: `packages/logix-react/test/integration/app-demo-layout-trace-suspend.test.tsx`
- Modify: `packages/logix-react/test/integration/runtime-yield-to-host.integration.test.tsx`
- Modify: `packages/logix-react/test/integration/runtimeProviderSuspendSyncFastPath.test.tsx`
- Modify: `packages/logix-react/test/integration/runtimeProviderTickServices.regression.test.tsx`
- Modify: `examples/logix-react/src/demos/AsyncLocalModuleLayout.tsx`
- Modify: `examples/logix-react/src/demos/FractalRuntimeLayout.tsx`
- Modify: `examples/logix-react/src/demos/LayerOverrideDemoLayout.tsx`
- Modify: `examples/logix-react/src/demos/LinkDemoLayout.tsx`
- Modify: `examples/logix-react/src/demos/LocalModuleLayout.tsx`
- Modify: `examples/logix-react/src/demos/MiddlewareDemoLayout.tsx`
- Modify: `examples/logix-react/src/demos/ProcessSubtreeDemo.tsx`
- Modify: `examples/logix-react/src/demos/SuspenseModuleLayout.tsx`
- Modify: `examples/logix-react/src/demos/form/FieldFormDemoLayout.tsx`
- Modify: `examples/logix-react/src/sections/GlobalRuntimeSections.tsx`

- [x] **Step 1: 用真实清单锁定旧语法糖命中**

Run: `rg -n "useModule\\([^\\n]*,\\s*(\\(s\\)|select|selector)" packages/logix-react/test examples/logix-react`
Expected: 命中上面列出的文件。

- [x] **Step 2: 按最小改动批量替换为 `useSelector`**

```tsx
const counter = useModule(Counter.tag)
const count = useSelector(counter, (s) => s.count)

const state = useSelector(form)
const draft = useSelector(editor, (s) => s.draft)
```

- [ ] **Step 3: 跑回归测试，先覆盖 hooks，再覆盖 integration / perf 边界**

Run: `pnpm --filter @logixjs/react test -- test/Hooks/hooks.test.tsx test/Hooks/multiInstance.test.tsx test/Hooks/useModuleSuspend.test.tsx test/Hooks/watcherPatterns.test.tsx`
Expected: PASS

Run: `pnpm --filter @logixjs/react test -- test/integration/runtimeProviderSuspendSyncFastPath.test.tsx test/integration/runtime-yield-to-host.integration.test.tsx test/browser/perf-boundaries/runtime-store-no-tearing.test.tsx`
Expected: PASS

- [x] **Step 4: 再跑 grep，确认 package 内旧写法清零**

Run: `rg -n "useModule\\([^\\n]*,\\s*(\\(s\\)|select|selector)" packages/logix-react/test examples/logix-react`
Expected: 无输出

- [ ] **Step 5: 提交 callsite 迁移**

```bash
git add packages/logix-react/test examples/logix-react
git commit -m "refactor: migrate react tests and demos to useSelector"
```

### Task 5: 清扫 README、SSoT 示例与 docs site

**Files:**
- Modify: `packages/logix-react/README.md`
- Modify: `docs/ssot/runtime/10-react-host-projection-boundary.md`
- Modify: `apps/docs/content/docs/api/react/use-module.md`
- Modify: `apps/docs/content/docs/api/react/use-module.cn.md`
- Modify: `apps/docs/content/docs/api/react/use-selector.md`
- Modify: `apps/docs/content/docs/api/react/use-selector.cn.md`
- Modify: `apps/docs/content/docs/guide/recipes/react-integration.md`
- Modify: `apps/docs/content/docs/guide/recipes/react-integration.cn.md`

- [x] **Step 1: 先记录旧文档命中**

Run: `rg -n "useModule\\(handle, selector|useModule\\([^\\n]*, \\(s\\)|syntax sugar|语法糖|read full state|读取完整 state" packages/logix-react/README.md docs/ssot/runtime apps/docs/content/docs/api/react apps/docs/content/docs/guide/recipes`
Expected: 命中 `README`、`use-module`、`react-integration`、`use-selector` 等页面。

- [x] **Step 2: 重写文档示例与文字口径**

```md
`useModule`:
- `useModule(ModuleTag)`
- `useModule(Program, options?)`

`useSelector`:
- `useSelector(handle)`
- `useSelector(handle, selector, equalityFn?)`
```

```tsx
const counter = useModule(Counter.tag)
const count = useSelector(counter, (s) => s.count)
```

- [x] **Step 3: 跑 grep，确认公开文档不再宣传旧 sugar**

Run: `rg -n "useModule\\(handle, selector|useModule\\([^\\n]*, \\(s\\)|syntax sugar|语法糖" packages/logix-react/README.md docs/ssot/runtime apps/docs/content/docs/api/react apps/docs/content/docs/guide/recipes`
Expected: 无输出

- [ ] **Step 4: 提交文档**

```bash
git add packages/logix-react/README.md docs/ssot/runtime/10-react-host-projection-boundary.md apps/docs/content/docs/api/react/use-module.md apps/docs/content/docs/api/react/use-module.cn.md apps/docs/content/docs/api/react/use-selector.md apps/docs/content/docs/api/react/use-selector.cn.md apps/docs/content/docs/guide/recipes/react-integration.md apps/docs/content/docs/guide/recipes/react-integration.cn.md
git commit -m "docs: align react hook surface docs"
```

## Chunk 4: Verification And Handoff

### Task 6: 跑完整验证并记录残留风险

**Files:**
- Modify: `docs/superpowers/plans/2026-04-14-react-hook-surface-separation.md`

- [ ] **Step 1: 跑 dts、package typecheck 与 package tests**

Run: `pnpm --filter @logixjs/react exec tsc -p test-dts/tsconfig.json --noEmit`
Expected: PASS

Run: `pnpm --filter @logixjs/react typecheck`
Expected: PASS

Run: `pnpm --filter @logixjs/react test`
Expected: PASS

- [x] **Step 2: 跑仓库级 typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [x] **Step 3: 跑两组残留 grep 门**

Run: `rg -n "useModule\\([^\\n]*,\\s*(\\(s\\)|select|selector)" packages/logix-react examples/logix-react docs/ssot/runtime apps/docs/content/docs -g '*.ts' -g '*.tsx' -g '*.md' -g '*.mdx'`
Expected: 无输出

Run: `rg -n "useModule\\(handle, selector|syntax sugar|语法糖" packages/logix-react/README.md docs/ssot/runtime apps/docs/content/docs/api/react apps/docs/content/docs/guide/recipes`
Expected: 无输出

- [ ] **Step 4: 若仓库级验证失败，先判断是否为本任务引入**

```md
- 若失败来自本任务文件，继续修到绿灯
- 若失败来自并行任务或历史脏工作区，记录命令、文件、错误摘要，再停下汇报
```

- [x] **Step 5: 更新计划勾选状态并准备执行交接**

```md
- 把已完成步骤勾掉
- 在最终汇报里附上通过的命令与残留风险
```
