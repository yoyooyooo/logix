# C2A2 Read Projection Protocol Cutover Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把已冻结的 `C2A2` 结论真正消费到 `@logixjs/core`，让 `ReadQuery / ExternalStore / Resource` 完全退出 public core，并把 repo 内依赖这组三件套旧 public surface 的实现、examples、docs 和长期 witness 迁到当前 owner。

**Architecture:** 这一批只消费 `C2A2 Public-Zero Read Projection Cut Contract`，不混 `C2A1 / C2A3 / C2B`。执行顺序固定为：先把 Batch 7 planning 状态写进总提案，再改 core root/subpath witness 形成红灯，随后收口 `packages/logix-core` 的 exports 与 root barrel，再按“内部 packages → examples → docs”顺序迁移 consumers，最后做 focused verification 与总提案回写。迁移期不新增 migration-only 测试文件，断言优先折回现有长期测试文件。

**Tech Stack:** TypeScript, pnpm, Vitest, Effect V4, package exports, Markdown docs

**Batch Scope:** 只消费 [core-read-projection-protocol-contract.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/proposals/core-read-projection-protocol-contract.md) 的冻结结果。本批不进入 `Action / Bound / Handle / Logic / ModuleTag / State`、`MatchBuilder / ScopeRegistry / Root / Env / Platform / Middleware / InternalContracts / EffectOp`、`ControlPlane / Debug / Observability / Reflection / Kernel` 的实现，也不自动执行 `git commit`。

---

## Chunk 1: Batch Frame

### Task 1: 把 Batch 7 planning 状态写进总提案

**Files:**
- Modify: `docs/proposals/public-api-surface-inventory-and-disposition-plan.md`

- [ ] **Step 1: 核对 Batch 7 条目**

要求：
- 名称固定为 `C2A2 Read Projection Protocol Cutover`
- `status=planning`
- 范围明确写：
  - 消费已冻结的 `C2A2`
  - 收口 `ReadQuery / ExternalStore / Resource`
  - 迁移 repo 内依赖旧 read/projection public surface 的 packages / examples / docs

- [ ] **Step 2: 运行最小 diff 检查**

Run:
```bash
git diff --check -- docs/proposals/public-api-surface-inventory-and-disposition-plan.md
```

Expected:
`无输出`

## Chunk 2: Core Surface

### Task 2: 先把 core read/projection witness 改成红灯

**Files:**
- Modify: `packages/logix-core/test/PublicSurface/Core.RootExportsBoundary.test.ts`
- Modify: `packages/logix-core/test/Contracts/CoreRootBarrel.allowlist.test.ts`
- Modify: `packages/logix-core/test/ReadQuery/ReadQuery.buildGate.test.ts`
- Modify: `packages/logix-core/test/ReadQuery/ReadQuery.compile.test.ts`
- Modify: `packages/logix-core/test/ReadQuery/ReadQuery.strictGate.test.ts`
- Modify: `packages/logix-core/test/ReadQuery/ReadQuery.runtimeConsumption.test.ts`
- Modify: `packages/logix-core/test/Resource.test.ts`
- Modify: `packages/logix-core/test/internal/ExternalStore/{ExternalStore.RuntimeBoundary,ExternalStore.Sugars}.test.ts`

- [ ] **Step 1: 改 root/public witness**

要求：
- root 不再承认：
  - `ReadQuery`
  - `ExternalStore`
  - `Resource`
- `CoreRootBarrel.allowlist` 删除这 3 项

- [ ] **Step 2: 改 package boundary witness**

要求：
- `package.json` 不再允许：
  - `./ReadQuery`
  - `./ExternalStore`
  - `./Resource`
- 对应 boundary 测试直接表达“public-zero read projection contract”

- [ ] **Step 3: 先跑红灯**

Run:
```bash
pnpm -C packages/logix-core exec vitest run test/PublicSurface/Core.RootExportsBoundary.test.ts test/Contracts/CoreRootBarrel.allowlist.test.ts test/ReadQuery/ReadQuery.buildGate.test.ts test/ReadQuery/ReadQuery.compile.test.ts test/ReadQuery/ReadQuery.strictGate.test.ts test/ReadQuery/ReadQuery.runtimeConsumption.test.ts test/Resource.test.ts test/internal/ExternalStore/ExternalStore.RuntimeBoundary.test.ts test/internal/ExternalStore/ExternalStore.Sugars.test.ts
```

Expected:
- 至少一项失败
- 失败原因指向 root 或 package exports 仍泄漏 `ReadQuery / ExternalStore / Resource`

### Task 3: 消费 C2A2 合同到 core package

**Files:**
- Modify: `packages/logix-core/package.json`
- Modify: `packages/logix-core/src/index.ts`
- Modify: `docs/proposals/public-api-surface-inventory-and-disposition-plan.md`

- [ ] **Step 1: 收口 package exports**

要求：
- `package.json` 与 `publishConfig.exports` 删除：
  - `./ReadQuery`
  - `./ExternalStore`
  - `./Resource`
- 不为这三项新开任何替代公开 subpath

- [ ] **Step 2: 收口 root barrel**

要求：
- `src/index.ts` 删除：
  - `export * as ReadQuery`
  - `export * as ExternalStore`
  - `export * as Resource`
- root 注释与 public contract 文案同步切到当前 survivor set

- [ ] **Step 3: 再跑 core-focused verification**

Run:
```bash
pnpm -C packages/logix-core exec vitest run test/PublicSurface/Core.RootExportsBoundary.test.ts test/Contracts/CoreRootBarrel.allowlist.test.ts test/ReadQuery/ReadQuery.buildGate.test.ts test/ReadQuery/ReadQuery.compile.test.ts test/ReadQuery/ReadQuery.strictGate.test.ts test/ReadQuery/ReadQuery.runtimeConsumption.test.ts test/Resource.test.ts test/internal/ExternalStore/ExternalStore.RuntimeBoundary.test.ts test/internal/ExternalStore/ExternalStore.Sugars.test.ts
pnpm -C packages/logix-core exec tsc --noEmit
```

Expected:
PASS

## Chunk 3: Internal Package Fallout

### Task 4: 迁移内部 packages 对旧 read/projection public surface 的依赖

**Files:**
- Modify: `packages/logix-react/src/FormProjection.ts`
- Modify: `packages/logix-react/src/internal/hooks/useSelector.ts`
- Modify: `packages/logix-react/src/internal/store/{RuntimeExternalStore,ModuleRuntimeSelectorExternalStore}.ts`
- Modify: `packages/logix-react/test/integration/runtime-yield-to-host.integration.test.tsx`
- Modify: `packages/logix-query/src/{Query.ts,internal/query-declarations.ts,internal/logics/auto-trigger.ts}`
- Modify: `packages/logix-query/test/**`

- [ ] **Step 1: 迁移 `ReadQuery`**

要求：
- `packages/logix-react` 不再通过旧 root read/projection 入口取读侧协议
- `fieldValue / rawFormMeta / useSelector` 改到 direct owner 或 repo-internal helper
- `packages/logix-query` 不再通过旧 root read/projection 入口取类型或 builder

- [ ] **Step 2: 迁移 `ExternalStore / Resource`**

要求：
- `packages/logix-react` 与 `packages/logix-query` 不再通过旧 root read/projection 入口取宿主桥接与资源协议
- 若仍需能力，改到 direct owner、repo-internal helper，或 query owner
- 不为了过编译把这组三件套偷偷保回 root

- [ ] **Step 3: 跑内部包 verification**

Run:
```bash
pnpm -C packages/logix-react exec tsc -p tsconfig.test.json --noEmit
pnpm -C packages/logix-query exec tsc -p tsconfig.json --noEmit
```

Expected:
PASS

## Chunk 4: Examples And Docs Fallout

### Task 5: 迁移 examples/docs 对旧 read/projection public surface 的依赖

**Files:**
- Modify: `examples/logix/src/scenarios/{external-store-tick,middleware-resource-query}.ts`
- Modify: `examples/logix-react/src/modules/querySearchDemo.ts`
- Modify: `examples/logix-react/src/demos/form/cases/{case05-unique-code,case06-attachments-upload,case08-region-cascading,case11-dynamic-list-cascading-exclusion}.tsx`
- Modify: `apps/docs/content/docs/api/core/{read-query,read-query.cn,external-store,external-store.cn}.md`
- Modify: `apps/docs/content/docs/guide/recipes/{external-store,external-store.cn}.md`
- Modify: `apps/docs/content/docs/guide/advanced/{resource-cancellation,resource-cancellation.cn}.md`
- Modify: `docs/proposals/public-api-surface-inventory-and-disposition-plan.md`

- [ ] **Step 1: 改 examples**

要求：
- examples 不再 import 或教学旧 root read/projection surface
- 若仍需演示能力，改到当前 owner 或 app-local helper
- `middleware-resource-query` 不再暗示旧资源协议仍属于 public core

- [ ] **Step 2: 改 docs**

要求：
- `api/core/read-query*` 与 `api/core/external-store*` 不再作为当前 public API 页面存活
- 迁移到 internal background、toolkit future note，或直接删除并从导航移除
- `guide/recipes/external-store*`、`advanced/resource-cancellation*` 同步改口，不继续教授这组旧 public surface

- [ ] **Step 3: 跑 examples/docs verification**

Run:
```bash
pnpm -C examples/logix typecheck
pnpm -C examples/logix-react typecheck
```

Expected:
PASS

## Chunk 5: Final Verification

### Task 6: 做 C2A2 批次收口

**Files:**
- Modify: `docs/proposals/public-api-surface-inventory-and-disposition-plan.md`

- [ ] **Step 1: 跑批次 focused verification**

Run:
```bash
pnpm -C packages/logix-core exec vitest run test/PublicSurface/Core.RootExportsBoundary.test.ts test/Contracts/CoreRootBarrel.allowlist.test.ts test/ReadQuery/ReadQuery.buildGate.test.ts test/ReadQuery/ReadQuery.compile.test.ts test/ReadQuery/ReadQuery.strictGate.test.ts test/ReadQuery/ReadQuery.runtimeConsumption.test.ts test/Resource.test.ts test/internal/ExternalStore/ExternalStore.RuntimeBoundary.test.ts test/internal/ExternalStore/ExternalStore.Sugars.test.ts
pnpm -C packages/logix-core exec tsc --noEmit
pnpm -C packages/logix-react exec tsc -p tsconfig.test.json --noEmit
pnpm -C packages/logix-query exec tsc -p tsconfig.json --noEmit
pnpm -C examples/logix typecheck
pnpm -C examples/logix-react typecheck
pnpm typecheck
```

Expected:
- 全部 PASS

- [ ] **Step 2: 回写总提案**

要求：
- `Batch 7` 状态改成 `implemented`
- `C2A2` 从“已冻结但未完全落实”移出
- `@logixjs/core` 对应 manifest 行改成当前真实 disposition
- “已实施”部分补上本批实际完成项

- [ ] **Step 3: 运行最小 diff 检查**

Run:
```bash
git diff --check -- docs/proposals/public-api-surface-inventory-and-disposition-plan.md packages/logix-core/package.json packages/logix-core/src/index.ts packages/logix-core/test/PublicSurface/Core.RootExportsBoundary.test.ts packages/logix-core/test/Contracts/CoreRootBarrel.allowlist.test.ts apps/docs/content/docs/api/core/meta.json apps/docs/content/docs/api/core/meta.cn.json apps/docs/content/docs/guide/recipes/meta.json apps/docs/content/docs/guide/recipes/meta.cn.json
```

Expected:
`无输出`
