# ExternalStore Runtime Seam Cutover Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 `ExternalStore` 完整收回 runtime / field / React seam internal，关闭 workspace repo-internal noun 路线，并按 closure proof matrix 做完整落证。

**Architecture:** 这一批只消费 [external-store-runtime-seam-cutover-contract.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/proposals/external-store-runtime-seam-cutover-contract.md) 的冻结结果，不混 `ReadQuery` 与 `Resource` 的 owner relocation。执行顺序固定为：先把 workspace repo-internal 路线改成红灯，再把 authoring / injection boundary 落成更窄 owner，随后清扫 docs/examples/tests 中的 `ExternalStore` canonical residue，最后按 proof matrix 跑 focused verification 与总提案回写。

**Tech Stack:** TypeScript, pnpm, Vitest, Effect V4, runtime scheduler, package exports, Markdown docs

**Execution Status:** 2026-04-21 已完成 code / docs / verification。所有非 git 步骤已实际执行并通过验证；计划中的 `Commit` 步骤未执行，原因是当前未获用户明确授权做 `git add / commit / push`。

---

## Chunk 1: Repo-Internal Closure

### Task 1: 先把 `ExternalStore` 的 workspace repo-internal 泄漏改成红灯

**Files:**
- Modify: `packages/logix-core/test/PublicSurface/Core.InternalContractsBoundary.test.ts`
- Modify: `packages/logix-core/test/PublicSurface/Core.RootExportsBoundary.test.ts`

- [x] **Step 1: 写失败断言**

要求：
- `./repo-internal/read-contracts` 不再允许暴露 `ExternalStore`
- `./repo-internal/InternalContracts` 不再允许暴露 `ExternalStore`
- root / exports 继续不允许出现 `ExternalStore`

- [x] **Step 2: 运行红灯**

Run:
```bash
pnpm -C packages/logix-core exec vitest run test/PublicSurface/Core.InternalContractsBoundary.test.ts test/PublicSurface/Core.RootExportsBoundary.test.ts
```

Expected:
- FAIL
- 失败点指向 `ExternalStore` 仍从 workspace repo-internal 泄漏

- [x] **Step 3: 最小实现**

**Files:**
- Modify: `packages/logix-core/src/internal/read-contracts.ts`
- Modify: `packages/logix-core/src/internal/InternalContracts.ts`
- Modify: `packages/logix-core/package.json`

要求：
- workspace `repo-internal` 不再暴露 `ExternalStore` noun
- 需要的 seam contract 下沉到更窄 owner

- [x] **Step 4: 复跑边界测试**

Run:
```bash
pnpm -C packages/logix-core exec vitest run test/PublicSurface/Core.InternalContractsBoundary.test.ts test/PublicSurface/Core.RootExportsBoundary.test.ts
```

Expected:
PASS

- [ ] **Step 5: Commit**

```bash
git add packages/logix-core/src/internal/read-contracts.ts packages/logix-core/src/internal/InternalContracts.ts packages/logix-core/package.json packages/logix-core/test/PublicSurface/Core.InternalContractsBoundary.test.ts packages/logix-core/test/PublicSurface/Core.RootExportsBoundary.test.ts
git commit -m "feat: close workspace externalstore routes"
```

## Chunk 2: Seam Narrowing

### Task 2: 把 seam contract 落到更窄 owner，并写死 authoring / injection boundary

**Files:**
- Modify: `packages/logix-core/src/ExternalStore.ts`
- Modify: `packages/logix-core/src/internal/runtime-contracts.ts`
- Modify: `packages/logix-core/src/internal/field-contracts.ts`
- Modify: `packages/logix-react/src/internal/store/{RuntimeExternalStore,ModuleRuntimeSelectorExternalStore}.ts`
- Modify: `packages/logix-core/test/internal/ExternalStore/ExternalStore.Sugars.test.ts`
- Modify: `packages/logix-core/test/internal/Runtime/ModuleAsSource*.test.ts`

- [x] **Step 1: 写失败测试**

要求：
- `ExternalStore` 不再作为 workspace repo consumer family 存活
- 但 module-as-source、stream/service/subscription ingest、tick/notify/no-tearing 仍成立

- [x] **Step 2: 跑红灯**

Run:
```bash
pnpm -C packages/logix-core exec vitest run test/internal/ExternalStore/ExternalStore.Sugars.test.ts test/internal/Runtime/ModuleAsSource.recognizability.test.ts test/internal/Runtime/ModuleAsSource.tick.test.ts
```

Expected:
- FAIL
- 失败点指向 seam contract 仍依赖旧 grouped route

- [x] **Step 3: 最小实现**

要求：
- 把 declaration-side seam 落到 `field-contracts`
- 把 runtime-side seam 落到 `runtime-contracts`
- React internal store contract 留在 `packages/logix-react/internal/**`
- 不新增 `capabilities.externalStores`
- 不新增 `ExternalStoreProvider`

- [x] **Step 4: 复跑 seam tests**

Run:
```bash
pnpm -C packages/logix-core exec vitest run test/internal/ExternalStore/ExternalStore.Sugars.test.ts test/internal/Runtime/ModuleAsSource.recognizability.test.ts test/internal/Runtime/ModuleAsSource.tick.test.ts test/internal/FieldKernel/FieldKernel.ExternalStore.Runtime.test.ts test/internal/FieldKernel/FieldKernel.ExternalStore.TxnWindow.test.ts
```

Expected:
PASS

- [ ] **Step 5: Commit**

```bash
git add packages/logix-core/src/ExternalStore.ts packages/logix-core/src/internal/runtime-contracts.ts packages/logix-core/src/internal/field-contracts.ts packages/logix-react/src/internal/store/RuntimeExternalStore.ts packages/logix-react/src/internal/store/ModuleRuntimeSelectorExternalStore.ts packages/logix-core/test/internal/ExternalStore/ExternalStore.Sugars.test.ts packages/logix-core/test/internal/Runtime/ModuleAsSource.recognizability.test.ts packages/logix-core/test/internal/Runtime/ModuleAsSource.tick.test.ts
git commit -m "feat: narrow externalstore seam owners"
```

## Chunk 3: Residue Cleanup

### Task 3: 清扫 `ExternalStore` canonical residue

**Files:**
- Modify: `examples/logix/src/scenarios/external-store-tick.ts`
- Modify: `docs/proposals/core-residual-surface-contract.md`
- Modify: `docs/proposals/core-residual-adjunct-contract.md`
- Modify: `docs/proposals/public-api-surface-inventory-and-disposition-plan.md`

- [x] **Step 1: residue grep**

Run:
```bash
rg -n "ExternalStore" docs/proposals examples/logix packages/logix-core/test packages/logix-react/test --glob '!docs/archive/**'
```

Expected:
- 有 canonical residue 命中

- [x] **Step 2: 清扫或去权威**

要求：
- examples 不再把 `ExternalStore` 当 day-one family 教学
- 旧 proposal 里的 residual witness 改成 stale/residue/pointer

- [x] **Step 3: 复跑 residue grep**

Run:
```bash
rg -n "ExternalStore" docs/proposals examples/logix packages/logix-core/test packages/logix-react/test --glob '!docs/archive/**'
```

Expected:
- 只剩 internal/background/stale 合理残留

- [ ] **Step 4: Commit**

```bash
git add examples/logix/src/scenarios/external-store-tick.ts docs/proposals/core-residual-surface-contract.md docs/proposals/core-residual-adjunct-contract.md docs/proposals/public-api-surface-inventory-and-disposition-plan.md
git commit -m "docs: clear externalstore canonical residue"
```

## Chunk 4: Final Proof

### Task 4: 按 `ExternalStore` proof matrix 收口

**Files:**
- Modify: `docs/proposals/public-api-surface-inventory-and-disposition-plan.md`

- [x] **Step 1: 跑 focused verification**

Run:
```bash
pnpm -C packages/logix-core exec vitest run test/PublicSurface/Core.InternalContractsBoundary.test.ts test/PublicSurface/Core.RootExportsBoundary.test.ts test/internal/ExternalStore/ExternalStore.Sugars.test.ts test/internal/FieldKernel/FieldKernel.ExternalStore.Runtime.test.ts test/internal/FieldKernel/FieldKernel.ExternalStore.TxnWindow.test.ts test/internal/Runtime/ModuleAsSource.recognizability.test.ts test/internal/Runtime/ModuleAsSource.tick.test.ts
pnpm -C packages/logix-react exec vitest run test/browser/perf-boundaries/external-store-ingest.test.tsx
pnpm -C packages/logix-core exec tsc --noEmit
pnpm -C packages/logix-react exec tsc -p tsconfig.test.json --noEmit
```

Expected:
PASS

- [x] **Step 2: 回写总清单**

要求：
- 标记 `ExternalStore` proof matrix 已落实
- 若 `C2A2` 批次说明仍存在，补齐 `ExternalStore` 实现状态

- [ ] **Step 3: Commit**

```bash
git add docs/proposals/public-api-surface-inventory-and-disposition-plan.md
git commit -m "docs: close externalstore implementation proof"
```
