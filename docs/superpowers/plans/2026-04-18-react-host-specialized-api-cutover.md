# React Host Specialized API Cutover Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 `useLocalModule`、`useLayerModule`、`ModuleScope family` 与 `useModule(ModuleImpl)` 从 `@logixjs/react` 的全 public contract 中切干净，并把 live docs、README、proposal lane 与 package public reachability 一次性回写到同一口径。

**Architecture:** 先用 public surface gate 把“哪些入口必须消失”钉死，再收缩 `@logixjs/react` 的 barrel、subpath、aggregator 与 `useModule` overload，使代码面达到 `full public reachability` 闭合。随后把 repo 内还在使用这些 residue 的 examples、tests 与 internal callers 迁移到 canonical `Program / Runtime / host law` 或 internal-only helper，最后回写 SSoT、guardrails、README 与 proposal lifecycle，避免出现新旧并行真相源。

**Tech Stack:** TypeScript, React 19, Effect V4, Vitest, pnpm, Markdown docs

---

## Chunk 1: Public Surface Gates

### Task 1: 先把“这些入口必须消失”写成失败中的 public surface gate

**Files:**
- Create: `packages/logix-react/test/PublicSurface/publicReachability.test.ts`
- Modify: `packages/logix-react/test-dts/canonical-hooks.surface.ts`
- Create: `packages/logix-react/test-dts/public-subpaths.surface.ts`
- Modify: `packages/logix-react/test-dts/tsconfig.json`
- Modify: `packages/logix-react/test/Hooks/useModule.legacy-inputs.test.tsx`
- Modify: `packages/logix-react/test/ReactPlatform/ReactPlatform.test.tsx`
- Reference: `docs/proposals/react-host-specialized-api-cut-contract.md`

- [ ] **Step 1: 在 dts surface 里加入 removed-route 断言**

在 `packages/logix-react/test-dts/canonical-hooks.surface.ts` 增加这些断言：

```ts
import * as Logix from '@logixjs/core'
import { useModule } from '../src/index.js'

const ProgramOnly = Logix.Program.make(Counter, { initial: { count: 0 } })
const ImplOnly = ProgramOnly.impl

// @ts-expect-error removed from public root surface
import { useLocalModule } from '../src/index.js'

// @ts-expect-error removed from public root surface
import { useLayerModule } from '../src/index.js'

// @ts-expect-error removed from public root surface
import { ModuleScope } from '../src/index.js'

// @ts-expect-error ModuleImpl no longer belongs to public useModule contract
useModule(ImplOnly)
```

- [ ] **Step 2: 在子路径层补 removed-route dts gate**

新增 `packages/logix-react/test-dts/public-subpaths.surface.ts`：

```ts
// @ts-expect-error removed from Hooks subpath
import { useLocalModule, useLayerModule } from '../src/Hooks.js'

import { ReactPlatform } from '../src/ReactPlatform.js'

// @ts-expect-error removed from ReactPlatform aggregator
ReactPlatform.useLocalModule

// @ts-expect-error ModuleScope subpath must disappear from public contract
import '../src/ModuleScope.js'
```

并把 `packages/logix-react/test-dts/tsconfig.json` 的 `include` 改成：

```json
["./canonical-hooks.surface.ts", "./public-subpaths.surface.ts"]
```

- [ ] **Step 3: 跑 dts 编译，确认它当前失败**

Run:

```bash
pnpm -C packages/logix-react exec tsc -p test-dts/tsconfig.json --noEmit
```

Expected:

- 当前会因为 `useLocalModule` / `useLayerModule` / `ModuleScope` 仍能从 public surface 导入，或 `useModule(Impl)` 仍被接受而失败

- [ ] **Step 4: 给 runtime test 加入 removed-route 行为断言**

在 `packages/logix-react/test/Hooks/useModule.legacy-inputs.test.tsx` 增加一个 public-route rejection 用例，目标是：

```ts
const ImplOnly = Logix.Program.make(Counter, {
  initial: { count: 0 },
}).impl

expect(() => renderHook(() => useModule(ImplOnly as any), { wrapper })).toThrow(/Program/)
```

同时把报错文案预期写成面向 `Program` 的 guidance，而不是容忍 `ModuleImpl`。

- [ ] **Step 5: 给 ReactPlatform 加入 aggregator reachability 断言**

在 `packages/logix-react/test/ReactPlatform/ReactPlatform.test.tsx` 加入：

```ts
expect('useLocalModule' in ReactPlatform).toBe(false)
```

如果 `ReactPlatform` 最终也去掉其他 residue 属性，同步把它们一并断言掉。

- [ ] **Step 6: 新建 package public reachability 测试**

在 `packages/logix-react/test/PublicSurface/publicReachability.test.ts` 读取 `packages/logix-react/package.json`，断言：

```ts
expect(pkg.exports['./*']).toBeUndefined()
expect(pkg.exports['./ModuleScope']).toBeUndefined()
expect(pkg.publishConfig.exports['./*']).toBeUndefined()
expect(pkg.publishConfig.exports['./ModuleScope']).toBeUndefined()
```

并把 allowlist 直接写死：

```ts
expect(Object.keys(pkg.exports).sort()).toEqual([
  '.',
  './ExpertHooks',
  './FormProjection',
  './Hooks',
  './Platform',
  './ReactPlatform',
  './RuntimeProvider',
  './package.json',
])
```

- [ ] **Step 7: 跑 surface gate，确认当前仓库确实还没达标**

Run:

```bash
pnpm -C packages/logix-react exec tsc -p test-dts/tsconfig.json --noEmit
pnpm -C packages/logix-react exec vitest run \
  test/Hooks/useModule.legacy-inputs.test.tsx \
  test/ReactPlatform/ReactPlatform.test.tsx \
  test/PublicSurface/publicReachability.test.ts
```

Expected:

- dts 或 vitest 至少有一项失败
- 失败原因应直接指向当前 public surface 仍暴露 residue

- [ ] **Step 8: 记录失败快照，不提交**

Run:

```bash
git diff -- packages/logix-react/test-dts/canonical-hooks.surface.ts \
  packages/logix-react/test-dts/public-subpaths.surface.ts \
  packages/logix-react/test-dts/tsconfig.json \
  packages/logix-react/test/Hooks/useModule.legacy-inputs.test.tsx \
  packages/logix-react/test/ReactPlatform/ReactPlatform.test.tsx \
  packages/logix-react/test/PublicSurface/publicReachability.test.ts
```

Expected:

- 只出现本 task 的测试改动

### Task 2: 实现 public surface cut，让 surface gate 转绿

**Files:**
- Modify: `packages/logix-react/src/Hooks.ts`
- Modify: `packages/logix-react/src/index.ts`
- Modify: `packages/logix-react/src/ReactPlatform.ts`
- Modify: `packages/logix-react/src/internal/hooks/useModule.ts`
- Create: `packages/logix-react/src/internal/hooks/useModuleImpl.ts`
- Modify: `packages/logix-react/package.json`
- Reference: `docs/proposals/react-host-specialized-api-cut-contract.md`

- [ ] **Step 1: 抽出 ModuleImpl internal-only helper**

把 `packages/logix-react/src/internal/hooks/useModule.ts` 里的 ModuleImpl-specific 路径抽到新的：

```ts
packages/logix-react/src/internal/hooks/useModuleImpl.ts
```

目标职责：

- 只服务 `Program` 的内部实现与 repo 内部测试
- 接收 `ModuleImpl` 与现有 `ModuleImplOptions`
- 不经由任何 public barrel 暴露

- [ ] **Step 2: 收紧 public useModule contract**

在 `packages/logix-react/src/internal/hooks/useModule.ts`：

- 删除 `ModuleImpl` 的 public overload
- 删除“`useModule(handle, options) 仅支持 ModuleImpl 句柄`”这类 public 文案前提
- 对 raw `ModuleImpl` 输入改成明确抛错，文案引导到 `useModule(Program, options?)`
- 保留 `Program | ModuleTag | ModuleRuntime | ModuleRef` 的 public contract
- 内部继续通过新的 `useModuleImpl.ts` 支撑 `Program` 路径

- [ ] **Step 3: 砍掉 public barrel 对 specialized residue 的 reachability**

修改：

- `packages/logix-react/src/Hooks.ts`
- `packages/logix-react/src/index.ts`
- `packages/logix-react/src/ReactPlatform.ts`

目标：

- `Hooks.ts` 不再导出 `useLocalModule` / `useLayerModule`
- `index.ts` 不再导出 `ModuleScope`
- `ReactPlatform` 不再重新挂出 `useLocalModule`

- [ ] **Step 4: 把 package export map 从 wildcard 改成 exact allowlist**

修改 `packages/logix-react/package.json` 的 `exports` 与 `publishConfig.exports`，把：

```json
"./*": "./src/*.ts"
```

改成显式 allowlist。

allowlist 直接冻结为：

- `.`
- `./package.json`
- `./RuntimeProvider`
- `./Hooks`
- `./FormProjection`
- `./Platform`
- `./ReactPlatform`
- `./ExpertHooks`

并确保：

- `./ModuleScope` 不再可达
- `./*` wildcard 不再存在
- `publishConfig.exports` 与 `exports` 完全同构

- [ ] **Step 5: 跑 dts 与 surface gate，确认 public cut 生效**

Run:

```bash
pnpm -C packages/logix-react exec tsc -p test-dts/tsconfig.json --noEmit
pnpm -C packages/logix-react exec vitest run \
  test/Hooks/useModule.legacy-inputs.test.tsx \
  test/ReactPlatform/ReactPlatform.test.tsx \
  test/PublicSurface/publicReachability.test.ts
```

Expected:

- dts 通过
- legacy input test 通过
- ReactPlatform 与 package exports gate 通过

- [ ] **Step 6: 检查 surface diff，不提交**

Run:

```bash
git diff -- packages/logix-react/src/Hooks.ts \
  packages/logix-react/src/index.ts \
  packages/logix-react/src/ReactPlatform.ts \
  packages/logix-react/src/internal/hooks/useModule.ts \
  packages/logix-react/src/internal/hooks/useModuleImpl.ts \
  packages/logix-react/package.json
```

Expected:

- 只出现本 task 的 surface 收缩改动

## Chunk 2: Repo Caller Migration

### Task 3: 迁移 repo 内对 removed routes 的真实调用与 tests

**Files:**
- Modify: `packages/logix-react/test/Hooks/useModule.impl-vs-tag.test.tsx`
- Modify: `packages/logix-react/test/Hooks/useModule.impl-keyed.test.tsx`
- Modify: `packages/logix-react/test/RuntimeProvider/runtime-bootresolve-phase-trace.test.tsx`
- Modify: `packages/logix-react/test/browser/perf-boundaries/react-boot-resolve-phase-probe.test.tsx`
- Modify: `packages/logix-react/test/browser/perf-boundaries/react-boot-resolve.test.tsx`
- Modify: `packages/logix-react/test/integration/runtimeProviderSuspendSyncFastPath.test.tsx`
- Create: `packages/logix-react/test/internal/hooks/useModuleImpl.internal.test.tsx`
- Delete: `packages/logix-react/test/Hooks/useLocalModule.test.tsx`
- Delete: `packages/logix-react/test/Hooks/moduleScope.test.tsx`
- Delete: `packages/logix-react/test/Hooks/moduleScope.bridge.test.tsx`
- Reference: `packages/logix-react/src/internal/hooks/useModuleImpl.ts`

- [ ] **Step 1: 新建 internal-only ModuleImpl test 锚点**

在 `packages/logix-react/test/internal/hooks/useModuleImpl.internal.test.tsx` 覆盖 repo 仍需要的 internal ModuleImpl 语义，例如：

- keyed local instance reuse
- ModuleImpl 不与 root singleton 混用
- subtree layer scope 不共享 runtime

把这些行为从 public `useModule(ModuleImpl)` 测试迁到 internal-only helper 测试。

- [ ] **Step 2: 跑 internal helper 测试，确认当前仍失败**

Run:

```bash
pnpm -C packages/logix-react exec vitest run \
  test/internal/hooks/useModuleImpl.internal.test.tsx
```

Expected:

- 因 internal helper 还未接好或测试尚未完成而失败

- [ ] **Step 3: 迁移保留价值的 impl coverage**

先处理 public hook 测试：

- `packages/logix-react/test/Hooks/useModule.impl-vs-tag.test.tsx`
- `packages/logix-react/test/Hooks/useModule.impl-keyed.test.tsx`

准则：

- 这两个文件不再经过 public `useModule(ModuleImpl)`
- 若仍有行为价值，把断言搬到 `test/internal/hooks/useModuleImpl.internal.test.tsx`
- 若只剩 public rejection 价值，就改成 rejection coverage

- [ ] **Step 4: 迁移 runtime / browser / integration 的 impl callers**

再处理这些仍需要 internal ModuleImpl 语义的测试：

- `packages/logix-react/test/RuntimeProvider/runtime-bootresolve-phase-trace.test.tsx`
- `packages/logix-react/test/browser/perf-boundaries/react-boot-resolve-phase-probe.test.tsx`
- `packages/logix-react/test/browser/perf-boundaries/react-boot-resolve.test.tsx`
- `packages/logix-react/test/integration/runtimeProviderSuspendSyncFastPath.test.tsx`

准则：

- public 测试不再经过 public `useModule(ModuleImpl)`
- internal 语义若仍要保留，统一走 `src/internal/hooks/useModuleImpl.ts`

- [ ] **Step 5: 删除 public residue tests**

删除：

- `packages/logix-react/test/Hooks/useLocalModule.test.tsx`
- `packages/logix-react/test/Hooks/moduleScope.test.tsx`
- `packages/logix-react/test/Hooks/moduleScope.bridge.test.tsx`

删除前确认这些行为不再属于 sanctioned public contract。

- [ ] **Step 6: 跑迁移后的 targeted tests**

Run:

```bash
pnpm -C packages/logix-react exec vitest run \
  test/Hooks/useModule.legacy-inputs.test.tsx \
  test/internal/hooks/useModuleImpl.internal.test.tsx \
  test/RuntimeProvider/runtime-bootresolve-phase-trace.test.tsx \
  test/browser/perf-boundaries/react-boot-resolve-phase-probe.test.tsx \
  test/browser/perf-boundaries/react-boot-resolve.test.tsx \
  test/integration/runtimeProviderSuspendSyncFastPath.test.tsx
```

Expected:

- public rejection coverage 通过
- internal impl coverage 通过

- [ ] **Step 7: 检查 repo 内已无 public residue test 锚点**

Run:

```bash
rg -n "useLocalModule|useLayerModule|ModuleScope\\.make|useModule\\([^)]*Impl" \
  packages/logix-react/test \
  --glob '!test/internal/**'
```

Expected:

- 不再命中 public test 目录下的 removed-route 调用

### Task 4: 把 examples 和 repo callers 迁回 canonical Program 路线

**Files:**
- Modify: `examples/logix-sandbox-mvp/src/pages/_shared/useStableBusy.ts`
- Modify: `examples/logix-sandbox-mvp/src/components/Editor.tsx`
- Delete: `packages/logix-react/src/internal/hooks/useLocalModule.ts`
- Delete: `packages/logix-react/src/internal/hooks/useLayerModule.ts`
- Delete: `packages/logix-react/src/ModuleScope.ts`
- Modify: `packages/logix-react/src/internal/hooks/useModuleList.ts`

- [ ] **Step 1: 在 examples 里先写 canonical 替代实现**

对 `useStableBusy.ts` 与 `Editor.tsx` 的替代方向固定为：

```ts
const stableBusyProgram = useMemo(
  () =>
    Logix.Program.make(StableBusyDef, {
      initial: { shown: false },
    }),
  [],
)

const stableBusy = useModule(stableBusyProgram, {
  key: 'examples.logix-sandbox-mvp:StableBusy',
})

const editorUiProgram = useMemo(
  () =>
    Logix.Program.make(EditorUiDef, {
      initial: {
        mode: 'textarea',
        inputReadyMs: null,
        typeSense: { status: 'idle' },
        fallbackError: null,
        fallbackUi: enableTypeSense ? 'skeleton' : 'textarea',
      },
    }),
  [enableTypeSense],
)

const editorUi = useModule(editorUiProgram, {
  key: 'examples.logix-sandbox-mvp:EditorUI',
})
```

不要把新的 local recipe noun 先造出来。

- [ ] **Step 2: 在 public cut 之后跑 example typecheck，确认 live caller 已坏掉**

Run:

```bash
pnpm -C examples/logix-sandbox-mvp typecheck
```

Expected:

- 因 `@logixjs/react` 已不再导出 `useLocalModule` 而失败

- [ ] **Step 3: 只迁移 `useStableBusy.ts`**

完成：

- 删掉 `useLocalModule` import
- 改成 `stableBusyProgram + useModule(program, { key })`
- 不改其它文件

- [ ] **Step 4: 只迁移 `Editor.tsx`**

完成：

- 删掉 `useLocalModule` import
- 改成 `editorUiProgram + useModule(program, { key })`
- 只让 `enableTypeSense` 参与 program memo

- [ ] **Step 5: 删掉已无 live caller 的 residue source files**

完成：

- 删除 `useLocalModule.ts`
- 删除 `useLayerModule.ts`
- 删除 `ModuleScope.ts`
- 顺手清理 `useModuleList.ts` 里对 removed hooks 的注释残留

- [ ] **Step 6: 跑 example 真实验证**

Run:

```bash
pnpm -C examples/logix-sandbox-mvp typecheck
pnpm -C examples/logix-sandbox-mvp build
```

Expected:

- typecheck 通过
- build 通过

- [ ] **Step 7: 确认 repo 内已无 live caller**

Run:

```bash
rg -n "useLocalModule|useLayerModule|ModuleScope\\.make|ModuleScope\\.|useModule\\([^)]*Impl" \
  packages examples docs \
  --glob '!docs/archive/**' \
  --glob '!docs/review-plan/**' \
  --glob '!docs/superpowers/plans/**'
```

Expected:

- 只剩 proposal / review ledger / plan 等历史或规划文档
- 不再命中 live SSoT、README、examples 与 public source

- [ ] **Step 8: 跑受影响 examples / react package targeted verification**

Run:

```bash
pnpm -C packages/logix-react exec vitest run \
  test/Hooks/useModule.keep-surface-contract.test.tsx \
  test/Hooks/useImportedModule.test.tsx \
  test/ReactPlatform/ReactPlatform.test.tsx
```

Expected:

- canonical host routes 仍然通过

- [ ] **Step 9: 检查删除 diff，不提交**

Run:

```bash
git diff -- examples/logix-sandbox-mvp/src/pages/_shared/useStableBusy.ts \
  examples/logix-sandbox-mvp/src/components/Editor.tsx \
  packages/logix-react/src/internal/hooks/useLocalModule.ts \
  packages/logix-react/src/internal/hooks/useLayerModule.ts \
  packages/logix-react/src/ModuleScope.ts \
  packages/logix-react/src/internal/hooks/useModuleList.ts
```

Expected:

- 只出现本 task 的 canonical migration 与 file deletion

## Chunk 3: Authority Writeback And Closure

### Task 5: 把 live docs、README 与 proposal lifecycle 一次性回写到 C'

**Files:**
- Modify: `docs/ssot/runtime/01-public-api-spine.md`
- Modify: `docs/ssot/runtime/03-canonical-authoring.md`
- Modify: `docs/ssot/runtime/07-standardized-scenario-patterns.md`
- Modify: `docs/ssot/runtime/10-react-host-projection-boundary.md`
- Modify: `docs/ssot/runtime/11-toolkit-layer.md`
- Modify: `docs/ssot/runtime/12-toolkit-candidate-intake.md`
- Modify: `docs/standards/logix-api-next-guardrails.md`
- Modify: `packages/logix-react/README.md`
- Modify: `docs/proposals/react-host-specialized-api-cut-contract.md`
- Modify: `docs/proposals/public-api-surface-inventory-and-disposition-plan.md`
- Modify: `docs/proposals/README.md`

- [ ] **Step 1: 先写 docs-side failing grep gate**

Run:

```bash
rg -n "useLocalModule|useLayerModule|ModuleScope|\\.impl\\b|useModule\\(ModuleImpl\\)|specialized|non-canonical" \
  docs/ssot/runtime/01-public-api-spine.md \
  docs/ssot/runtime/03-canonical-authoring.md \
  docs/ssot/runtime/07-standardized-scenario-patterns.md \
  docs/ssot/runtime/10-react-host-projection-boundary.md \
  docs/ssot/runtime/11-toolkit-layer.md \
  docs/ssot/runtime/12-toolkit-candidate-intake.md \
  docs/standards/logix-api-next-guardrails.md \
  packages/logix-react/README.md
```

Expected:

- 当前还能命中旧 specialized / non-canonical 口径

- [ ] **Step 2: 只回写 `runtime/01` 与 `runtime/03`**

- 把“只允许停在 specialized / expert route”改成明确的 delete / future-authority 口径
- 不顺手改其它页

- [ ] **Step 3: 只回写 `runtime/07` 与 `runtime/10`**

- `runtime/07` 删除 `ModuleScope.useImported(ModuleTag)` 作为标准场景
- `runtime/10` 改写为 `C'` 的 full public reachability 与 future-authority 口径

- [ ] **Step 4: 只回写 `runtime/11`、`runtime/12` 与 `guardrails`**

- `runtime/11`、`runtime/12` 承接 intake / reopen authority，明确不得继承历史 noun lineage
- `guardrails` 改成明确去向，不再写 specialized 停靠位

- [ ] **Step 5: 只回写 `packages/logix-react/README.md`**

- 删除 specialized helper 残留口径
- 若 README 还提 `ReactPlatform`，只保留不含 residue 的对象说明

- [ ] **Step 6: 只回写 proposal lifecycle**

完成：

- `docs/proposals/react-host-specialized-api-cut-contract.md` 改成 `consumed` 并补 `## 去向`
- `docs/proposals/public-api-surface-inventory-and-disposition-plan.md` 把 C4 这块标记为已由该 proposal 收口
- `docs/proposals/README.md` 把该 proposal 从 active 移到最近消费

- [ ] **Step 7: 跑 docs grep gate，确认 live authority 已清干净**

Run:

```bash
rg -n "useLocalModule|useLayerModule|ModuleScope|\\.impl\\b|useModule\\(ModuleImpl\\)|specialized|non-canonical" \
  docs/ssot/runtime/01-public-api-spine.md \
  docs/ssot/runtime/03-canonical-authoring.md \
  docs/ssot/runtime/07-standardized-scenario-patterns.md \
  docs/ssot/runtime/10-react-host-projection-boundary.md \
  docs/ssot/runtime/11-toolkit-layer.md \
  docs/ssot/runtime/12-toolkit-candidate-intake.md \
  docs/standards/logix-api-next-guardrails.md \
  packages/logix-react/README.md
```

Expected:

- 不再命中 live authority 中的旧口径

- [ ] **Step 8: 检查 docs diff，不提交**

Run:

```bash
git diff -- \
  docs/ssot/runtime/01-public-api-spine.md \
  docs/ssot/runtime/03-canonical-authoring.md \
  docs/ssot/runtime/07-standardized-scenario-patterns.md \
  docs/ssot/runtime/10-react-host-projection-boundary.md \
  docs/ssot/runtime/11-toolkit-layer.md \
  docs/ssot/runtime/12-toolkit-candidate-intake.md \
  docs/standards/logix-api-next-guardrails.md \
  packages/logix-react/README.md \
  docs/proposals/react-host-specialized-api-cut-contract.md \
  docs/proposals/public-api-surface-inventory-and-disposition-plan.md \
  docs/proposals/README.md
```

Expected:

- docs 与 proposal lifecycle 改动都围绕 `C'`

### Task 6: 跑最终验证矩阵并记录执行残余风险

**Files:**
- Reference only: `docs/review-plan/runs/2026-04-18-react-host-specialized-api-cut-review.md`

- [ ] **Step 1: 跑 logix-react 定向验证矩阵**

Run:

```bash
pnpm -C packages/logix-react exec tsc -p test-dts/tsconfig.json --noEmit
pnpm -C packages/logix-react typecheck:test
pnpm -C packages/logix-react exec vitest run \
  test/PublicSurface/publicReachability.test.ts \
  test/Hooks/useModule.legacy-inputs.test.tsx \
  test/Hooks/useModule.keep-surface-contract.test.tsx \
  test/Hooks/useImportedModule.test.tsx \
  test/ReactPlatform/ReactPlatform.test.tsx \
  test/internal/hooks/useModuleImpl.internal.test.tsx \
  test/RuntimeProvider/runtime-bootresolve-phase-trace.test.tsx \
  test/browser/perf-boundaries/react-boot-resolve-phase-probe.test.tsx \
  test/browser/perf-boundaries/react-boot-resolve.test.tsx \
  test/integration/runtimeProviderSuspendSyncFastPath.test.tsx
```

Expected:

- 全绿

- [ ] **Step 2: 跑仓库级最小门**

Run:

```bash
pnpm typecheck
pnpm lint
```

Expected:

- 全绿

- [ ] **Step 3: 做 residue 扫描**

Run:

```bash
rg -n "useLocalModule|useLayerModule|ModuleScope\\.make|ModuleScope\\.|useModule\\([^)]*Impl" \
  packages examples docs \
  --glob '!docs/archive/**' \
  --glob '!docs/review-plan/**' \
  --glob '!docs/superpowers/plans/**'
```

Expected:

- 只剩 proposal / review ledger / historical planning / explicit internal-only files

- [ ] **Step 4: 记录 residual risk，不提交**

Run:

```bash
git status --short
git diff --stat
```

Expected:

- 变更只覆盖 plan 目标里的代码、测试、docs、proposal lifecycle
- 若还有未清理的 public reachability 或 authority drift，立即补回写
