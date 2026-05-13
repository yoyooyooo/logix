# React Runtime Scope Unification Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Speckit note:** This spec intentionally replaces the default checklist-style `tasks.md` with a `writing-plans` style execution plan. This file is the execution source of truth for `134-react-runtime-scope-unification`.

**Goal:** 收口 React host projection 的用户心智与实现边界，让 `RuntimeProvider`、实例化语义、`useModule`、`useImportedModule`、`ModuleScope` 一起回到单一公式：`Program` 是装配蓝图，`ModuleRuntime` 是实例，`ModuleTag` 只解析当前 scope 下唯一绑定。

**Architecture:** 先用 failing tests 和 dts surface 把 “同模块多 Program 不串实例”“`useImportedModule` 只是 `imports.get` 的薄糖”“同 scope 重复 ModuleTag 绑定 fail-fast”“RuntimeProvider 只是 runtime scope provider” 四组规则钉死，再分别在 core identity、imports 归一化、react hooks 和 provider 层完成实现。最后同步 SSoT、README、examples 和错误文案，让用户视角与实现边界完全对齐。

**Tech Stack:** TypeScript, Effect v4, React 19, Vitest, pnpm, Logix runtime internals

---

## Scope Check

这份计划只覆盖一个耦合子系统：React host projection 的 scope / blueprint / instance 语义。

包含：

- `Program` blueprint identity
- React 本地实例缓存 key 收口
- same-scope duplicate `ModuleTag` binding fail-fast
- `useModule`、`useImportedModule`、`ModuleScope` 的统一语义
- `RuntimeProvider` 的定位与文档收口

不包含：

- 新 control plane 能力
- 新 host adapter
- alias imports 或多实例选择 DSL
- 非 React 相关的 core 主链重构

执行前先读：

- `specs/134-react-runtime-scope-unification/spec.md`
- `specs/134-react-runtime-scope-unification/plan.md`
- `docs/ssot/runtime/01-public-api-spine.md`
- `docs/ssot/runtime/03-canonical-authoring.md`
- `docs/ssot/runtime/07-standardized-scenario-patterns.md`
- `docs/ssot/runtime/10-react-host-projection-boundary.md`
- `packages/logix-react/src/internal/provider/RuntimeProvider.tsx`
- `packages/logix-react/src/internal/hooks/useModule.ts`
- `packages/logix-react/src/internal/hooks/useModuleRuntime.ts`

## File Structure

### New Units

- Create: `packages/logix-react/test-dts/canonical-hooks.surface.ts`
- Create: `packages/logix-react/test-dts/tsconfig.json`
- Create: `packages/logix-react/test/Hooks/useModule.program-blueprint-identity.test.tsx`
- Create: `packages/logix-react/test/Hooks/useImportedModule.duplicate-binding.test.tsx`

### Existing Units To Modify

- Modify: `packages/logix-core/src/Module.ts`
- Modify: `packages/logix-core/src/Program.ts`
- Modify: `packages/logix-core/src/internal/authoring/programImports.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/ModuleRuntime.impl.ts`
- Modify: `packages/logix-react/src/internal/hooks/useModule.ts`
- Modify: `packages/logix-react/src/internal/hooks/useModuleRuntime.ts`
- Modify: `packages/logix-react/src/internal/hooks/useImportedModule.ts`
- Modify: `packages/logix-react/src/internal/store/ModuleCache.ts`
- Modify: `packages/logix-react/src/internal/store/resolveImportedModuleRef.ts`
- Modify: `packages/logix-react/src/internal/provider/RuntimeProvider.tsx`
- Modify: `packages/logix-react/src/RuntimeProvider.ts`
- Modify: `packages/logix-react/src/ModuleScope.ts`
- Modify: `packages/logix-react/test/Hooks/useModule.test.tsx`
- Modify: `packages/logix-react/test/Hooks/useModule.module.test.tsx`
- Modify: `packages/logix-react/test/Hooks/useImportedModule.test.tsx`
- Modify: `packages/logix-react/test/Hooks/useImportedModule.hierarchical.test.tsx`
- Modify: `packages/logix-react/test/Hooks/moduleScope.test.tsx`
- Modify: `packages/logix-react/test/RuntimeProvider/RuntimeProvider.ControlPlaneBoundary.test.tsx`
- Modify: `packages/logix-react/README.md`
- Modify: `docs/ssot/runtime/01-public-api-spine.md`
- Modify: `docs/ssot/runtime/03-canonical-authoring.md`
- Modify: `docs/ssot/runtime/07-standardized-scenario-patterns.md`
- Modify: `docs/ssot/runtime/10-react-host-projection-boundary.md`

## Chunk 1: Freeze The Contract

### Task 1: Add failing dts and runtime contract tests

**Files:**
- Create: `packages/logix-react/test-dts/canonical-hooks.surface.ts`
- Create: `packages/logix-react/test-dts/tsconfig.json`
- Create: `packages/logix-react/test/Hooks/useModule.program-blueprint-identity.test.tsx`
- Create: `packages/logix-react/test/Hooks/useImportedModule.duplicate-binding.test.tsx`
- Modify: `packages/logix-react/test/RuntimeProvider/RuntimeProvider.ControlPlaneBoundary.test.tsx`

- [x] **Step 1: Write the failing dts surface**

```ts
import { Schema } from 'effect'
import * as Logix from '@logixjs/core'
import { useModule } from '../src/Hooks.js'

const Counter = Logix.Module.make('CanonicalHooksCounter', {
  state: Schema.Struct({ count: Schema.Number }),
  actions: {},
})

const CounterProgram = Logix.Program.make(Counter, {
  initial: { count: 0 },
})

useModule(Counter.tag)
useModule(CounterProgram)

// @ts-expect-error canonical surface should not teach Module handles
useModule(Counter)
```

- [x] **Step 2: Write the failing runtime tests**

```ts
it('does not reuse local instances across different programs from the same module', async () => {
  const Shared = Logix.Module.make('SharedBlueprintCounter', {
    state: Schema.Struct({ count: Schema.Number }),
    actions: {},
  })

  const AProgram = Logix.Program.make(Shared, { initial: { count: 0 } })
  const BProgram = Logix.Program.make(Shared, { initial: { count: 10 } })

  // same key, same Module, different Program
  // expected: different instance ids and different state snapshots
})

it('fails fast when one scope imports two child programs from the same module', async () => {
  const Child = Logix.Module.make('DuplicateBindingChild', {
    state: Schema.Struct({ value: Schema.Number }),
    actions: {},
  })

  const ChildA = Logix.Program.make(Child, { initial: { value: 1 } })
  const ChildB = Logix.Program.make(Child, { initial: { value: 2 } })

  const Host = Logix.Module.make('DuplicateBindingHost', {
    state: Schema.Struct({ ok: Schema.Boolean }),
    actions: {},
  })

  const HostProgram = Logix.Program.make(Host, {
    initial: { ok: true },
    capabilities: { imports: [ChildA, ChildB] },
  })

  // expected: fail-fast with duplicate ModuleTag binding error
})
```

- [x] **Step 3: Run tests to verify they fail**

Run:

```bash
pnpm -C packages/logix-react exec tsc -p test-dts/tsconfig.json --noEmit
pnpm -C packages/logix-react exec vitest run \
  test/Hooks/useModule.program-blueprint-identity.test.tsx \
  test/Hooks/useImportedModule.duplicate-binding.test.tsx \
  test/RuntimeProvider/RuntimeProvider.ControlPlaneBoundary.test.tsx
```

Expected: FAIL because blueprint identity, duplicate binding detection, and canonical hook surface are not fully enforced yet.

- [x] **Step 4: Write the minimal assertions for RuntimeProvider positioning**

```ts
it('documents RuntimeProvider as runtime scope provider only', () => {
  expect(RuntimeProviderNS.RuntimeProvider).toBeDefined()
  expect('hostAdapterSurface' in (RuntimeProviderNS as any)).toBe(false)
  expect('controlPlaneBoundary' in (RuntimeProviderNS as any)).toBe(false)
})
```

- [ ] **Step 5: Commit**

```bash
git add \
  packages/logix-react/test-dts/canonical-hooks.surface.ts \
  packages/logix-react/test-dts/tsconfig.json \
  packages/logix-react/test/Hooks/useModule.program-blueprint-identity.test.tsx \
  packages/logix-react/test/Hooks/useImportedModule.duplicate-binding.test.tsx \
  packages/logix-react/test/RuntimeProvider/RuntimeProvider.ControlPlaneBoundary.test.tsx
git commit -m "test: lock react runtime scope contracts"
```

## Chunk 2: Distinguish Blueprint From Instance

### Task 2: Add stable Program blueprint identity and use it in React local cache keys

**Files:**
- Modify: `packages/logix-core/src/Module.ts`
- Modify: `packages/logix-core/src/Program.ts`
- Modify: `packages/logix-react/src/internal/hooks/useModule.ts`
- Modify: `packages/logix-react/src/internal/store/ModuleCache.ts`
- Test: `packages/logix-react/test/Hooks/useModule.program-blueprint-identity.test.tsx`

- [x] **Step 1: Implement a stable internal blueprint identity on Program and impl**

```ts
const PROGRAM_BLUEPRINT_ID = Symbol.for('@logixjs/core/programBlueprintId')
const PROGRAM_BLUEPRINT_IDS = new WeakMap<object, string>()

const getOrCreateBlueprintId = (carrier: object, moduleId: string): string => {
  const cached = PROGRAM_BLUEPRINT_IDS.get(carrier)
  if (cached) return cached
  const next = `${moduleId}::program:${PROGRAM_BLUEPRINT_IDS.size + 1}`
  PROGRAM_BLUEPRINT_IDS.set(carrier, next)
  return next
}
```

- [x] **Step 2: Thread blueprint identity into `useModule(Program)` cache keys**

```ts
const blueprintId =
  (handle as any)[PROGRAM_BLUEPRINT_ID] ??
  (normalizedHandle as any)[PROGRAM_BLUEPRINT_ID] ??
  normalizedHandle.module.id

const preloadKey = runtimeContext.policy.preload?.keysByModuleId.get(blueprintId)
const baseKey = preloadKey ?? options?.key ?? (suspend ? `program:${blueprintId}` : `program:${blueprintId}:${componentId}`)
const ownerId = blueprintId
```

- [x] **Step 3: Run the focused test to verify it now passes**

Run:

```bash
pnpm -C packages/logix-react exec vitest run test/Hooks/useModule.program-blueprint-identity.test.tsx
```

Expected: PASS. Two different programs from the same module keep different local instances even when `key` is the same.

- [x] **Step 4: Run dts to verify the surface still compiles**

Run:

```bash
pnpm -C packages/logix-react exec tsc -p test-dts/tsconfig.json --noEmit
```

Expected: surface compiles, and `useModule(Counter)` still fails if the public overload has been removed.

- [ ] **Step 5: Commit**

```bash
git add \
  packages/logix-core/src/Module.ts \
  packages/logix-core/src/Program.ts \
  packages/logix-react/src/internal/hooks/useModule.ts \
  packages/logix-react/src/internal/store/ModuleCache.ts \
  packages/logix-react/test/Hooks/useModule.program-blueprint-identity.test.tsx
git commit -m "feat: separate program blueprint identity from runtime instances"
```

### Task 3: Fail fast on duplicate ModuleTag bindings in the same scope

**Files:**
- Modify: `packages/logix-core/src/internal/authoring/programImports.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/ModuleRuntime.impl.ts`
- Modify: `packages/logix-react/src/internal/store/resolveImportedModuleRef.ts`
- Test: `packages/logix-react/test/Hooks/useImportedModule.duplicate-binding.test.tsx`

- [x] **Step 1: Add duplicate-module detection while normalizing imports**

```ts
const seen = new Map<string, number>()

for (const entry of normalized) {
  const moduleId = resolveImportedModuleId(entry)
  const nextCount = (seen.get(moduleId) ?? 0) + 1
  seen.set(moduleId, nextCount)
  if (nextCount > 1) {
    throw new Error(`[Logix] Duplicate imported ModuleTag binding in the same scope: ${moduleId}`)
  }
}
```

- [x] **Step 2: Harden runtime-side error metadata**

```ts
const importsScope: RuntimeInternals['imports'] = {
  kind: 'imports-scope',
  get: (module) => importsMap.get(module),
}

// if duplicate binding detection reaches runtime, attach:
// moduleId, parentModuleId, parentInstanceId, fix hints
```

- [x] **Step 3: Make the React-facing error actionable**

```ts
const err = new Error(
  '[DuplicateImportedModuleBindingError] One parent scope cannot bind the same ModuleTag twice.\n' +
  `moduleId: ${tokenId}\n` +
  `parent: ${parentId}\n` +
  'fix:\n' +
  '- split the children into different parent scopes\n' +
  '- or wrap one variant in a different host/module boundary\n',
)
```

- [x] **Step 4: Run the focused test to verify it now passes**

Run:

```bash
pnpm -C packages/logix-react exec vitest run test/Hooks/useImportedModule.duplicate-binding.test.tsx
```

Expected: PASS. Duplicate child bindings fail fast with readable metadata.

- [ ] **Step 5: Commit**

```bash
git add \
  packages/logix-core/src/internal/authoring/programImports.ts \
  packages/logix-core/src/internal/runtime/core/ModuleRuntime.impl.ts \
  packages/logix-react/src/internal/store/resolveImportedModuleRef.ts \
  packages/logix-react/test/Hooks/useImportedModule.duplicate-binding.test.tsx
git commit -m "feat: fail fast on duplicate module tag bindings per scope"
```

## Chunk 3: Thin Down `useImportedModule`

### Task 4: Make `useImportedModule` a thin sugar over `parent.imports.get(tag)`

**Files:**
- Modify: `packages/logix-react/src/internal/hooks/useImportedModule.ts`
- Modify: `packages/logix-react/test/Hooks/useImportedModule.test.tsx`
- Modify: `packages/logix-react/test/Hooks/useImportedModule.hierarchical.test.tsx`
- Modify: `packages/logix-react/src/internal/store/resolveImportedModuleRef.ts`

- [x] **Step 1: Rewrite the public comment to remove any hint of extra semantics**

```ts
/**
 * Thin hook sugar for parent.imports.get(tag).
 * It resolves only within the given parent instance scope.
 */
```

- [x] **Step 2: Add a focused equivalence test**

```ts
it('returns the same child instance as parent.imports.get(tag)', async () => {
  const host = useModule(HostProgram, { key: 'host-1' })
  const byHook = useImportedModule(host, Child.tag)
  const byRef = host.imports.get(Child.tag)

  expect(byHook.runtime.instanceId).toBe(byRef.runtime.instanceId)
})
```

- [x] **Step 3: Make error messages describe parent-scope wiring only**

```ts
const err = new Error(
  '[MissingImportedModuleError] Cannot resolve imported module from parent scope.\n' +
  `parentModuleId: ${parentId}\n` +
  `parentInstanceId: ${parentInstanceId}\n` +
  `childModuleId: ${tokenId}\n`,
)
```

- [x] **Step 4: Run the focused tests**

Run:

```bash
pnpm -C packages/logix-react exec vitest run \
  test/Hooks/useImportedModule.test.tsx \
  test/Hooks/useImportedModule.hierarchical.test.tsx
```

Expected: PASS. `useImportedModule` is proven equivalent to `imports.get`.

- [ ] **Step 5: Commit**

```bash
git add \
  packages/logix-react/src/internal/hooks/useImportedModule.ts \
  packages/logix-react/src/internal/store/resolveImportedModuleRef.ts \
  packages/logix-react/test/Hooks/useImportedModule.test.tsx \
  packages/logix-react/test/Hooks/useImportedModule.hierarchical.test.tsx
git commit -m "refactor: reduce useImportedModule to parent-scope sugar"
```

## Chunk 4: Align Hooks And Scope Semantics

### Task 5: Downgrade canonical hook surface to ModuleTag lookup and Program instantiate

**Files:**
- Modify: `packages/logix-react/src/internal/hooks/useModule.ts`
- Modify: `packages/logix-react/src/internal/hooks/useModuleRuntime.ts`
- Modify: `packages/logix-react/test/Hooks/useModule.test.tsx`
- Modify: `packages/logix-react/test/Hooks/useModule.module.test.tsx`
- Test: `packages/logix-react/test-dts/canonical-hooks.surface.ts`

- [x] **Step 1: Downgrade `useModule(Module)` from canonical docs while compatibility overload remains**

```ts
export function useModule<Id extends string, Sh extends Logix.AnyModuleShape>(
  handle: Logix.ModuleTagType<Id, Sh>,
): ModuleRefOfTag<Id, Sh>

export function useModule<Id extends string, Sh extends Logix.AnyModuleShape, Ext extends object, R = never>(
  handle: Logix.Program.Program<Id, Sh, Ext, R>,
  options?: ProgramInstanceOptions,
): ModuleRefOfProgram<Id, Sh, Ext, R>
```

- [ ] **Step 2: Keep internal normalization small and explicit**

```ts
const normalizedHandle =
  isProgram(handle) ? getProgramRuntimeBlueprint(handle) :
  handle
```

Expected shape: public docs teach two routes, internal normalization remains thin, and no canonical path depends on `Module` handles.

- [x] **Step 3: Update tests and examples to use `ModuleTag` or `Program` explicitly where they form the canonical path**

```ts
const singleton = useModule(Counter.tag)
const local = useModule(CounterProgram, { key: 'counter:1' })
```

- [x] **Step 4: Run dts and focused tests**

Run:

```bash
pnpm -C packages/logix-react exec tsc -p test-dts/tsconfig.json --noEmit
pnpm -C packages/logix-react exec vitest run \
  test/Hooks/useModule.test.tsx \
  test/Hooks/useModule.module.test.tsx
```

Expected: PASS. Canonical docs/tests no longer depend on `useModule(Module)`.

- [ ] **Step 5: Commit**

```bash
git add \
  packages/logix-react/src/internal/hooks/useModule.ts \
  packages/logix-react/src/internal/hooks/useModuleRuntime.ts \
  packages/logix-react/test/Hooks/useModule.test.tsx \
  packages/logix-react/test/Hooks/useModule.module.test.tsx \
  packages/logix-react/test-dts/canonical-hooks.surface.ts \
  packages/logix-react/test-dts/tsconfig.json
git commit -m "refactor: shrink canonical react hook surface"
```

### Task 6: Align `ModuleScope.useImported` with parent-scope child resolution

**Files:**
- Modify: `packages/logix-react/src/ModuleScope.ts`
- Modify: `packages/logix-react/test/Hooks/moduleScope.test.tsx`

- [ ] **Step 1: Make the docs and comments say “parent instance scope” everywhere**

- [ ] **Step 1: Keep `host.imports.get(tag)` and `ModuleScope.useImported(tag)` on the same resolver**

```ts
const useImported = (module) => {
  const host = use()
  return host.imports.get(module)
}
```

- [ ] **Step 2: Add or update tests that prove both APIs resolve the same child instance**

```ts
expect(a.runtime.instanceId).toBe(b.runtime.instanceId)
```

- [ ] **Step 3: Run the focused tests**

Run:

```bash
pnpm -C packages/logix-react exec vitest run \
  test/Hooks/moduleScope.test.tsx
```

Expected: PASS. Parent-scope resolution stays single and stable.

- [ ] **Step 4: Commit**

```bash
git add \
  packages/logix-react/src/ModuleScope.ts \
  packages/logix-react/test/Hooks/moduleScope.test.tsx
git commit -m "refactor: unify parent-scope imported module resolution"
```

## Chunk 5: Reposition RuntimeProvider And Sweep Docs

### Task 7: Reposition `RuntimeProvider` as runtime scope provider only

**Files:**
- Modify: `packages/logix-react/src/internal/provider/RuntimeProvider.tsx`
- Modify: `packages/logix-react/src/RuntimeProvider.ts`
- Modify: `packages/logix-react/test/RuntimeProvider/RuntimeProvider.ControlPlaneBoundary.test.tsx`
- Modify: `packages/logix-react/README.md`
- Modify: `docs/ssot/runtime/01-public-api-spine.md`
- Modify: `docs/ssot/runtime/03-canonical-authoring.md`
- Modify: `docs/ssot/runtime/07-standardized-scenario-patterns.md`

- [x] **Step 1: Rewrite provider comments and public types to match the new positioning**

```ts
// RuntimeProvider only projects an already-built runtime into a React subtree.
// It does not choose programs, build business assemblies, or define a second control plane.
```

- [x] **Step 2: Update README and SSoT examples**

```tsx
<RuntimeProvider runtime={appRuntime}>
  <Page />
</RuntimeProvider>

const globalCounter = useModule(Counter.tag)
const localEditor = useModule(EditorProgram, { key: 'editor:42' })
```

- [x] **Step 3: Remove canonical teaching for `useModule(Module)`**

Expected docs wording:

```md
- React 全局实例默认读 `ModuleTag`
- React 局部实例默认按 `Program` 语义组织
```

- [x] **Step 4: Run the provider/docs-focused tests and scans**

Run:

```bash
pnpm -C packages/logix-react exec vitest run test/RuntimeProvider/RuntimeProvider.ControlPlaneBoundary.test.tsx
rg -n "useModule\\(.*Module\\)|useModule\\(.*\\.impl\\)|全局实例默认读 `Module`" \
  packages/logix-react/README.md \
  docs/ssot/runtime/01-public-api-spine.md \
  docs/ssot/runtime/03-canonical-authoring.md \
  docs/ssot/runtime/07-standardized-scenario-patterns.md \
  examples/logix-react \
  -g '!**/dist/**'
```

Expected: tests pass; canonical files no longer teach `Module` handle lookup or public runtime-blueprint access, and `useImportedModule` is described only as a parent-scope helper.

- [ ] **Step 5: Commit**

```bash
git add \
  packages/logix-react/src/internal/provider/RuntimeProvider.tsx \
  packages/logix-react/src/RuntimeProvider.ts \
  packages/logix-react/test/RuntimeProvider/RuntimeProvider.ControlPlaneBoundary.test.tsx \
  packages/logix-react/README.md \
  docs/ssot/runtime/01-public-api-spine.md \
  docs/ssot/runtime/03-canonical-authoring.md \
  docs/ssot/runtime/07-standardized-scenario-patterns.md
git commit -m "docs: reposition runtime provider and canonical react usage"
```

### Task 8: Run the final verification sweep

**Files:**
- Modify: `specs/134-react-runtime-scope-unification/quickstart.md`
- Modify: `specs/134-react-runtime-scope-unification/checklists/requirements.md`

- [x] **Step 1: Update quickstart commands with the final file names**

```md
- dts: `pnpm -C packages/logix-react exec tsc -p test-dts/tsconfig.json --noEmit`
- focused tests: `pnpm -C packages/logix-react exec vitest run ...`
```

- [x] **Step 2: Run package-level focused verification**

Run:

```bash
pnpm -C packages/logix-react exec tsc -p test-dts/tsconfig.json --noEmit
pnpm -C packages/logix-react exec vitest run \
  test/Hooks/useModule.program-blueprint-identity.test.tsx \
  test/Hooks/useImportedModule.duplicate-binding.test.tsx \
  test/Hooks/useImportedModule.test.tsx \
  test/Hooks/useImportedModule.hierarchical.test.tsx \
  test/Hooks/moduleScope.test.tsx \
  test/RuntimeProvider/RuntimeProvider.ControlPlaneBoundary.test.tsx
```

Expected: PASS.

- [x] **Step 3: Run repo-level gates**

Run:

```bash
pnpm typecheck
pnpm lint
pnpm test:turbo
```

Expected: PASS.

- [x] **Step 4: Update the checklist to reflect execution readiness**

```md
- [x] canonical docs only teach ModuleTag lookup + Program instantiate
- [x] useImportedModule is documented only as parent-scope sugar
- [x] duplicate binding fail-fast is covered by tests
- [x] blueprint identity is covered by tests
```

- [ ] **Step 5: Commit**

```bash
git add \
  specs/134-react-runtime-scope-unification/quickstart.md \
  specs/134-react-runtime-scope-unification/checklists/requirements.md
git commit -m "chore: finalize react runtime scope verification plan"
```
