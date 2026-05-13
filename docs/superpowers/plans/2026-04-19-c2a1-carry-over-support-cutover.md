# C2A1 Carry-Over Support Cutover Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把已冻结的 `C2A1` 结论真正消费到 `@logixjs/core`，让 `Action / Actions / Bound / Handle / Logic / ModuleTag / State` 完全退出 public core，并把 repo 内依赖这些旧 support surface 的代码、docs 和 tests 迁到当前 owner。

**Architecture:** 这一批只消费 `C2A1 Public-Zero Carry-Over Support Contract`，不混 `C2A2 / C2A3 / C2B`。执行顺序固定为：先把 Batch 6 planning 状态写进总提案，再改 core root/subpath witness 形成红灯，随后收口 `packages/logix-core` 的 exports 与 root barrel，再按“内部包 → examples → docs”顺序迁移 consumers，最后做 focused verification 与总提案回写。迁移期不新增 migration-only 测试文件，断言优先折回现有长期测试文件。

**Tech Stack:** TypeScript, pnpm, Vitest, Effect V4, package exports, Markdown docs

**Batch Scope:** 只消费 [core-carry-over-support-contract.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/proposals/core-carry-over-support-contract.md) 的冻结结果。本批不进入 `ReadQuery / ExternalStore / Resource`、`MatchBuilder / ScopeRegistry / Root / Env / Platform / Middleware / InternalContracts / EffectOp`、`ControlPlane / Debug / Observability / Reflection / Kernel` 的实现，也不自动执行 `git commit`。

---

## Chunk 1: Batch Frame

### Task 1: 把 Batch 6 planning 状态写进总提案

**Files:**
- Modify: `docs/proposals/public-api-surface-inventory-and-disposition-plan.md`

- [ ] **Step 1: 回写 Batch 6 条目**

要求：
- 新增 `Batch 6`
- 名称固定为 `C2A1 Carry-Over Support Cutover`
- `status=planning`
- 范围写清：
  - 消费已冻结的 `C2A1`
  - 收口 `@logixjs/core` 的 carry-over support surface
  - 迁移 repo 内依赖旧 support surface 的 packages / examples / docs

- [ ] **Step 2: 运行最小 diff 检查**

Run:
```bash
git diff --check -- docs/proposals/public-api-surface-inventory-and-disposition-plan.md
```

Expected:
`无输出`

## Chunk 2: Core Surface

### Task 2: 先把 core root/subpath witness 改成红灯

**Files:**
- Modify: `packages/logix-core/test/PublicSurface/Core.RootExportsBoundary.test.ts`
- Modify: `packages/logix-core/test/Contracts/CoreRootBarrel.allowlist.test.ts`
- Modify: `packages/logix-core/test/types/ActionSurface.d.ts.test.ts`

- [ ] **Step 1: 改 root barrel witness**

要求：
- root 不再承认：
  - `Action`
  - `Bound`
  - `Handle`
  - `Logic`
  - `ModuleTag`
  - `State`
- `CoreRootBarrel.allowlist` 只保留当前 survivor set

- [ ] **Step 2: 改 support-type witness**

要求：
- `ActionSurface.d.ts.test.ts` 不再通过 root `Logix.ActionOf` 路由类型
- 改成当前 owner：
  - `Logix.Module.ActionOf`
  - `Logix.Module.StateOf`
  - 或 module-local alias

- [ ] **Step 3: 先跑红灯**

Run:
```bash
pnpm -C packages/logix-core exec vitest run test/PublicSurface/Core.RootExportsBoundary.test.ts test/Contracts/CoreRootBarrel.allowlist.test.ts test/types/ActionSurface.d.ts.test.ts
```

Expected:
- 至少一项失败
- 失败原因指向 root 仍泄漏 carry-over support，或 type witness 仍依赖旧 surface

### Task 3: 消费 C2A1 合同到 core package

**Files:**
- Modify: `packages/logix-core/package.json`
- Modify: `packages/logix-core/src/index.ts`
- Modify: `docs/proposals/public-api-surface-inventory-and-disposition-plan.md`

- [ ] **Step 1: 收口 package exports**

要求：
- `package.json` 与 `publishConfig.exports` 删除：
  - `./Actions`
  - `./Bound`
  - `./Handle`
  - `./Logic`
  - `./ModuleTag`
  - `./State`
- 不为这组 support surface 新增任何替代公开 subpath

- [ ] **Step 2: 收口 root barrel**

要求：
- `src/index.ts` 删除这组 carry-over support 的 root 暴露
- root 注释与 public contract 文案同步切到当前 survivor set
- 若某些 support type 仍需 repo 内部使用，改到 `Module.*` 或 internal owner，不继续停在 root

- [ ] **Step 3: 再跑 core-focused tests**

Run:
```bash
pnpm -C packages/logix-core exec vitest run test/PublicSurface/Core.RootExportsBoundary.test.ts test/Contracts/CoreRootBarrel.allowlist.test.ts test/types/ActionSurface.d.ts.test.ts
pnpm -C packages/logix-core exec tsc --noEmit
```

Expected:
PASS

## Chunk 3: Internal Package Fallout

### Task 4: 迁移 repo 内部 packages 对旧 support surface 的依赖

**Files:**
- Modify: `packages/logix-query/src/internal/logics/auto-trigger.ts`
- Modify: `packages/logix-form/src/internal/form/commands.ts`
- Modify: `packages/logix-form/test/Form/Form.FieldBehavior.Guardrails.test.ts`
- Modify: `packages/logix-test/src/internal/api/{TestApi,ExecutionResult,TestProgram}.ts`
- Modify: `packages/logix-test/test/Execution/ExecutionResult.test.ts`
- Modify: `packages/logix-react/src/internal/store/{ModuleRef,resolveImportedModuleRef}.ts`
- Modify: `packages/logix-react/src/internal/hooks/{useModuleRuntime,useSelector,useDispatch,useImportedModule}.ts`
- Modify: `packages/logix-react/test/{Hooks/useDispatch.test.tsx,Hooks/useSelector.test.tsx,internal/integration/reactConfigRuntimeProvider.test.tsx}`

- [ ] **Step 1: 迁移 `StateOf / ActionOf / ModuleTagType`**

要求：
- 不再通过 root `Logix.StateOf / ActionOf / ModuleTagType`
- 改到当前 owner：
  - `Logix.Module.StateOf`
  - `Logix.Module.ActionOf`
  - `Logix.Module.ModuleTagType`
  - 或 module-local alias

- [ ] **Step 2: 迁移 `Bound / Logic` 相关类型**

要求：
- 不再通过 `@logixjs/core/Logic`、`@logixjs/core/Bound`
- 优先改到：
  - callback inference
  - repo-local type alias
  - 或 direct owner / internal file
- 不把这些旧 support family 伪装成新的公开 contract

- [ ] **Step 3: 跑内部包 typecheck**

Run:
```bash
pnpm -C packages/logix-query exec tsc -p tsconfig.json --noEmit
pnpm -C packages/logix-form exec tsc -p tsconfig.test.json --noEmit
pnpm -C packages/logix-test exec tsc -p tsconfig.test.json --noEmit
pnpm -C packages/logix-react exec tsc -p tsconfig.test.json --noEmit
```

Expected:
PASS

## Chunk 4: Examples And Docs Fallout

### Task 5: 迁移 examples/docs 对旧 support surface 的依赖

**Files:**
- Modify: `examples/logix/src/scenarios/file-import-flow.ts`
- Modify: `examples/logix/src/scenarios/batch-archive-flow.ts`
- Modify: `examples/logix/src/patterns/cascade.ts`
- Modify: `examples/logix/src/scenarios/{approval-flow,bulk-operations,job-runner-service-config,pattern-composition}.ts`
- Modify: `examples/logix-form-poc/src/{address-form,user-profile,global-search,domain}.ts`
- Modify: `examples/logix-sandbox-mvp/src/modules/SandboxRuntime.ts`
- Modify: `apps/docs/content/docs/guide/recipes/{unified-api.md,unified-api.cn.md}`
- Modify: `docs/ssot/runtime/03-canonical-authoring.md`
- Modify: `docs/ssot/runtime/10-react-host-projection-boundary.md`
- Modify: `docs/proposals/public-api-surface-inventory-and-disposition-plan.md`

- [ ] **Step 1: 改 example code**

要求：
- 不再 import `@logixjs/core/Logic` / `@logixjs/core/Bound`
- 不再通过 root `Logix.BoundApi / Logix.StateOf / Logix.ActionOf / Logix.ModuleTagType`
- 优先改到：
  - callback inference
  - `Logix.Module.*`
  - module-local alias

- [ ] **Step 2: 改 docs 教学口径**

要求：
- `unified-api.*` 不再教学 `@logixjs/core/Logic`
- `runtime/03` 与 `runtime/10` 不再让这组 support surface 残留为 sanctioned public route
- 若 docs 仍需要提到它们，只能作为 residue 或 internal background，不再作为当前 public contract

- [ ] **Step 3: 跑 examples/docs fallout verification**

Run:
```bash
pnpm -C examples/logix typecheck
pnpm -C examples/logix-react typecheck
```

Expected:
PASS

## Chunk 5: Final Verification

### Task 6: 做 C2A1 批次收口

**Files:**
- Modify: `docs/proposals/public-api-surface-inventory-and-disposition-plan.md`

- [ ] **Step 1: 跑批次 focused verification**

Run:
```bash
pnpm -C packages/logix-core exec vitest run test/PublicSurface/Core.RootExportsBoundary.test.ts test/Contracts/CoreRootBarrel.allowlist.test.ts test/types/ActionSurface.d.ts.test.ts
pnpm -C packages/logix-core exec tsc --noEmit
pnpm -C packages/logix-query exec tsc -p tsconfig.json --noEmit
pnpm -C packages/logix-form exec tsc -p tsconfig.test.json --noEmit
pnpm -C packages/logix-test exec tsc -p tsconfig.test.json --noEmit
pnpm -C packages/logix-react exec tsc -p tsconfig.test.json --noEmit
pnpm -C examples/logix typecheck
pnpm -C examples/logix-react typecheck
pnpm typecheck
```

Expected:
- 全部 PASS

- [ ] **Step 2: 回写总提案**

要求：
- `Batch 6` 状态改成 `implemented`
- `C2A1` 从“已冻结但未完全落实”移出
- `@logixjs/core` 对应 manifest 行改成当前真实 disposition
- “已实施”部分补上本批实际完成项

- [ ] **Step 3: 运行最小 diff 检查**

Run:
```bash
git diff --check -- docs/proposals/public-api-surface-inventory-and-disposition-plan.md docs/ssot/runtime/03-canonical-authoring.md docs/ssot/runtime/10-react-host-projection-boundary.md packages/logix-core/package.json packages/logix-core/src/index.ts packages/logix-core/test/PublicSurface/Core.RootExportsBoundary.test.ts packages/logix-core/test/Contracts/CoreRootBarrel.allowlist.test.ts packages/logix-core/test/types/ActionSurface.d.ts.test.ts apps/docs/content/docs/guide/recipes/unified-api.md apps/docs/content/docs/guide/recipes/unified-api.cn.md
```

Expected:
`无输出`
