# Resource Query Owner Relocation Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 `Resource` 迁到 `@logixjs/query` owner，自持 query-side contracts，关闭 core workspace `repo-internal` 路线，并按 relocation proof matrix 完整落证。

**Architecture:** 这一批只消费 [resource-query-owner-relocation-contract.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/proposals/resource-query-owner-relocation-contract.md) 的冻结结果，不混 `ReadQuery` 与 `ExternalStore` 的 seam 收口。执行顺序固定为：先把 query self-host 与 core repo-internal closure 改成红灯，再实现 `Query.Engine.Resource` family landing 与 query-owned contracts，随后拆开 `Layer` 注入和 runtime middleware slot，清扫 docs/examples/tests residue，最后按 relocation proof matrix 做 focused verification 和总清单回写。

**Tech Stack:** TypeScript, pnpm, Vitest, Effect V4, query package exports, runtime layer/middleware split, Markdown docs

**Execution Status:** 2026-04-21 已完成 code / docs / verification。所有非 git 步骤已实际执行并通过验证；计划中的 `Commit` 步骤未执行，原因是当前未获用户明确授权做 `git add / commit / push`。

---

## Chunk 1: Closure Red Tests

### Task 1: 先把 `Resource` relocation closure 改成红灯

**Files:**
- Modify: `packages/logix-core/test/PublicSurface/Core.InternalContractsBoundary.test.ts`
- Modify: `packages/logix-query/test/Query/Query.RootSurfaceBoundary.test.ts`
- Modify: `packages/logix-query/test/Query/Query.PackageExportsBoundary.test.ts`

- [x] **Step 1: 写失败断言**

要求：
- workspace core `repo-internal` 不再允许暴露 `Resource`
- `@logixjs/query` root 继续只保留 `make + Engine`
- 若有 `Query.Engine.Resource` d.ts witness，先写成红灯

- [x] **Step 2: 运行红灯**

Run:
```bash
pnpm -C packages/logix-core exec vitest run test/PublicSurface/Core.InternalContractsBoundary.test.ts
pnpm -C packages/logix-query exec vitest run test/Query/Query.RootSurfaceBoundary.test.ts test/Query/Query.PackageExportsBoundary.test.ts
```

Expected:
- FAIL
- 失败点指向 core repo-internal 或 query package 仍未对齐 relocation contract

- [ ] **Step 3: Commit**

```bash
git add packages/logix-core/test/PublicSurface/Core.InternalContractsBoundary.test.ts packages/logix-query/test/Query/Query.RootSurfaceBoundary.test.ts packages/logix-query/test/Query/Query.PackageExportsBoundary.test.ts
git commit -m "test: add resource relocation closure red tests"
```

## Chunk 2: Query Self-Host

### Task 2: 让 query package 自持 `Resource` contracts

**Files:**
- Create: `packages/logix-query/src/internal/resource.ts`
- Modify: `packages/logix-query/src/Engine.ts`
- Modify: `packages/logix-query/src/Query.ts`
- Modify: `packages/logix-query/src/internal/query-declarations.ts`
- Modify: `packages/logix-query/src/internal/logics/auto-trigger.ts`
- Modify: `packages/logix-core/src/internal/read-contracts.ts`
- Modify: `packages/logix-core/src/internal/InternalContracts.ts`

- [x] **Step 1: 写失败测试**

要求：
- `packages/logix-query/src/**` 的 public type、internal declaration、runtime integration 不再依赖 core `ReadContracts.Resource` lineage

- [x] **Step 2: 运行红灯**

Run:
```bash
pnpm -C packages/logix-query exec tsc -p tsconfig.json --noEmit
```

Expected:
- FAIL
- 错误点指向 `ReadContracts.Resource` 仍在 query package 内部存活

- [x] **Step 3: 实现最小 query self-host**

要求：
- query 自持 `ResourceSpec / ResourceSnapshot / keyHash / registry / resolver`
- `Engine` 暴露 `Query.Engine.Resource` family landing
- child members 只保留本批必须的 owner entrypoint，不额外扩张 support family
- core `repo-internal` 不再向 workspace 暴露 `Resource` noun

- [x] **Step 4: 复跑类型与边界**

Run:
```bash
pnpm -C packages/logix-query exec tsc -p tsconfig.json --noEmit
pnpm -C packages/logix-query exec vitest run test/Query/Query.RootSurfaceBoundary.test.ts test/Query/Query.PackageExportsBoundary.test.ts
pnpm -C packages/logix-core exec vitest run test/PublicSurface/Core.InternalContractsBoundary.test.ts
```

Expected:
PASS

- [ ] **Step 5: Commit**

```bash
git add packages/logix-query/src/internal/resource.ts packages/logix-query/src/Engine.ts packages/logix-query/src/Query.ts packages/logix-query/src/internal/query-declarations.ts packages/logix-query/src/internal/logics/auto-trigger.ts packages/logix-core/src/internal/read-contracts.ts packages/logix-core/src/internal/InternalContracts.ts
git commit -m "feat: relocate resource contracts to query owner"
```

## Chunk 3: Injection Boundary

### Task 3: 把资源注入拆成 `Layer` 注入和 runtime middleware slot

**Files:**
- Modify: `packages/logix-query/src/Engine.ts`
- Modify: `examples/logix-react/src/modules/querySearchDemo.ts`
- Modify: `packages/logix-query/test/**`

- [x] **Step 1: 写失败测试**

要求：
- `Query.Engine.Resource.layer(...)` 与 `Query.Engine.layer(...)` 只作为 `Layer`
- `Query.Engine.middleware()` 不再混入 `Program.capabilities.services`

- [x] **Step 2: 运行红灯**

Run:
```bash
pnpm -C packages/logix-query exec vitest run test/Engine.combinations.test.ts test/Query/Query.MissingClient.test.ts test/Query.invalidate.test.ts
```

Expected:
- FAIL
- 失败点指向 layer/middleware slot 仍混写

- [x] **Step 3: 实现最小边界**

要求：
- resources 与 engine layer 进入 `Program.capabilities.services` 或 runtime layer
- middleware 只走 runtime middleware slot
- 不新增 `capabilities.resources`
- 不新增 `ResourceProvider`

- [x] **Step 4: 复跑边界测试**

Run:
```bash
pnpm -C packages/logix-query exec vitest run test/Engine.combinations.test.ts test/Query/Query.MissingClient.test.ts test/Query.invalidate.test.ts test/Query/Query.CacheReuse.test.ts test/Query/Query.Race.test.ts
```

Expected:
PASS

- [ ] **Step 5: Commit**

```bash
git add packages/logix-query/src/Engine.ts examples/logix-react/src/modules/querySearchDemo.ts packages/logix-query/test
git commit -m "feat: split resource layer and runtime middleware injection"
```

## Chunk 4: Residue Cleanup

### Task 4: 清扫 `Resource` 旧路线 residue

**Files:**
- Modify: `examples/logix-react/src/modules/querySearchDemo.ts`
- Modify: `examples/logix-react/src/demos/form/cases/case05-unique-code.tsx`
- Modify: `examples/logix-react/src/demos/form/cases/case06-attachments-upload.tsx`
- Modify: `examples/logix-react/src/demos/form/cases/case08-region-cascading.tsx`
- Modify: `examples/logix-react/src/demos/form/cases/case11-dynamic-list-cascading-exclusion.tsx`
- Modify: `docs/proposals/core-residual-surface-contract.md`
- Modify: `docs/proposals/core-residual-adjunct-contract.md`

- [x] **Step 1: residue grep**

Run:
```bash
rg -n "ReadContracts\\.Resource|@logixjs/core/repo-internal/read-contracts.*Resource|Query\\.Engine\\.Resource\\.\\*" examples docs/proposals packages/logix-query --glob '!docs/archive/**'
```

Expected:
- 有 residue 命中

- [x] **Step 2: 实施最小清扫**

要求：
- examples 改到 query owner 路线
- 旧 proposal 改成 stale / residue / pointer
- 不把 `Query.Engine.Resource` child members 教成自动公开的稳定 support family

- [x] **Step 3: 复跑 residue grep**

Run:
```bash
rg -n "ReadContracts\\.Resource|@logixjs/core/repo-internal/read-contracts.*Resource|Query\\.Engine\\.Resource\\.\\*" examples docs/proposals packages/logix-query --glob '!docs/archive/**'
```

Expected:
- 只剩合理的 internal/background/stale 残留

- [ ] **Step 4: Commit**

```bash
git add examples/logix-react/src/modules/querySearchDemo.ts examples/logix-react/src/demos/form/cases/case05-unique-code.tsx examples/logix-react/src/demos/form/cases/case06-attachments-upload.tsx examples/logix-react/src/demos/form/cases/case08-region-cascading.tsx examples/logix-react/src/demos/form/cases/case11-dynamic-list-cascading-exclusion.tsx docs/proposals/core-residual-surface-contract.md docs/proposals/core-residual-adjunct-contract.md
git commit -m "docs: clear resource relocation residue"
```

## Chunk 5: Final Proof

### Task 5: 按 relocation proof matrix 收口

**Files:**
- Modify: `docs/proposals/public-api-surface-inventory-and-disposition-plan.md`

- [x] **Step 1: 跑 focused verification**

Run:
```bash
pnpm -C packages/logix-query exec vitest run test/Query/Query.RootSurfaceBoundary.test.ts test/Query/Query.PackageExportsBoundary.test.ts test/Engine.combinations.test.ts test/Query/Query.MissingClient.test.ts test/Query.invalidate.test.ts test/Query/Query.CacheReuse.test.ts test/Query/Query.Race.test.ts
pnpm -C packages/logix-query exec tsc -p tsconfig.json --noEmit
pnpm -C packages/logix-core exec vitest run test/PublicSurface/Core.InternalContractsBoundary.test.ts
pnpm -C examples/logix-react typecheck
```

Expected:
PASS

- [x] **Step 2: 回写总清单**

要求：
- 标记 `Resource` relocation proof 已落实
- 若 `C2A2` 批次说明仍存在，补齐 `Resource` 分支状态

- [ ] **Step 3: Commit**

```bash
git add docs/proposals/public-api-surface-inventory-and-disposition-plan.md
git commit -m "docs: close resource relocation proof"
```
