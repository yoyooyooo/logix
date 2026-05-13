# ReadQuery Selector Law Internalization Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 `ReadQuery` 完整退回 selector law internal owner，关闭 workspace `repo-internal` 路线，并清掉公开类型、docs、examples 中的 `ReadQuery` noun 残留。

**Architecture:** 这一批只消费 [read-query-selector-law-internalization-contract.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/proposals/read-query-selector-law-internalization-contract.md) 的冻结结果，不混 `ExternalStore` 和 `Resource` 的 owner relocation。执行顺序固定为：先把 repo-internal closure 做成红灯，再收紧 `@logixjs/react` helper 与 selector route 的公开类型，随后清扫 docs/examples/tests 的 noun residue，最后按 proof matrix 跑 focused verification 和总提案回写。

**Tech Stack:** TypeScript, pnpm, Vitest, Effect V4, package exports, dts witness, Markdown docs

**Execution Status:** 2026-04-21 已完成 code / docs / verification。所有非 git 步骤已实际执行并通过验证；计划中的 `Commit` 步骤未执行，原因是当前未获用户明确授权做 `git add / commit / push`。

---

## Chunk 1: Repo-Internal Closure

### Task 1: 先把 `ReadQuery` repo-internal closure 改成红灯

**Files:**
- Modify: `packages/logix-core/test/PublicSurface/Core.InternalContractsBoundary.test.ts`
- Modify: `packages/logix-core/test/PublicSurface/Core.RootExportsBoundary.test.ts`
- Modify: `packages/logix-core/test/Contracts/CoreRootBarrel.allowlist.test.ts`

- [x] **Step 1: 写失败断言**

要求：
- `./repo-internal/read-contracts` 不再允许暴露 `ReadQuery`
- `./repo-internal/InternalContracts` 不再允许暴露 `ReadQuery`
- root / exports 继续不允许出现 `ReadQuery`

- [x] **Step 2: 运行红灯**

Run:
```bash
pnpm -C packages/logix-core exec vitest run test/PublicSurface/Core.InternalContractsBoundary.test.ts test/PublicSurface/Core.RootExportsBoundary.test.ts test/Contracts/CoreRootBarrel.allowlist.test.ts
```

Expected:
- FAIL
- 失败点指向 `ReadQuery` 仍从 repo-internal 或 exports 泄漏

- [x] **Step 3: 实现最小收口**

**Files:**
- Modify: `packages/logix-core/src/internal/read-contracts.ts`
- Modify: `packages/logix-core/src/internal/InternalContracts.ts`
- Modify: `packages/logix-core/package.json`

要求：
- workspace `repo-internal/read-contracts` 不再导出 `ReadQuery`
- workspace `repo-internal/InternalContracts` 不再导出 `ReadQuery`
- 如需内部桥接，仅允许 internal owner 自用，不得继续对 workspace repo consumer 暴露

- [x] **Step 4: 复跑边界测试**

Run:
```bash
pnpm -C packages/logix-core exec vitest run test/PublicSurface/Core.InternalContractsBoundary.test.ts test/PublicSurface/Core.RootExportsBoundary.test.ts test/Contracts/CoreRootBarrel.allowlist.test.ts
```

Expected:
PASS

- [ ] **Step 5: Commit**

```bash
git add packages/logix-core/package.json packages/logix-core/src/internal/read-contracts.ts packages/logix-core/src/internal/InternalContracts.ts packages/logix-core/test/PublicSurface/Core.InternalContractsBoundary.test.ts packages/logix-core/test/PublicSurface/Core.RootExportsBoundary.test.ts packages/logix-core/test/Contracts/CoreRootBarrel.allowlist.test.ts
git commit -m "feat: close repo-internal readquery routes"
```

## Chunk 2: Public Type Closure

### Task 2: 清掉 `@logixjs/react` 对 `ReadQuery` noun 的公开类型暴露

**Files:**
- Modify: `packages/logix-react/src/FormProjection.ts`
- Modify: `packages/logix-react/src/internal/hooks/useSelector.ts`
- Modify: `packages/logix-react/test/Hooks/useSelector.readQueryInput.test.tsx`
- Test: `packages/logix-react/test-dts/canonical-hooks.surface.ts`

- [x] **Step 1: 写 dts / API 失败断言**

要求：
- `fieldValue / rawFormMeta` 的公开类型不再出现 `ReadQuery` noun
- `useSelector` 的公开签名不再通过 `ReadQuery` noun 解释 selector input

- [x] **Step 2: 运行类型红灯**

Run:
```bash
pnpm -C packages/logix-react exec tsc -p tsconfig.test.json --noEmit
```

Expected:
- FAIL
- 失败点显示公开类型仍引用 `ReadQuery`

- [x] **Step 3: 实现最小类型收口**

要求：
- `FormProjection.ts` 只暴露 selector input 语义
- `useSelector.ts` 不再把 `ReadQuery` noun 作为公开签名的一部分
- 若内部仍需判断 / compile `ReadQuery`，保持在 internal owner

- [x] **Step 4: 跑类型与行为验证**

Run:
```bash
pnpm -C packages/logix-react exec tsc -p tsconfig.test.json --noEmit
pnpm -C packages/logix-react exec vitest run test/Hooks/useSelector.readQueryInput.test.tsx test/Hooks/useSelector.test.tsx test/Hooks/useSelector.structMemo.test.tsx
```

Expected:
PASS

- [ ] **Step 5: Commit**

```bash
git add packages/logix-react/src/FormProjection.ts packages/logix-react/src/internal/hooks/useSelector.ts packages/logix-react/test/Hooks/useSelector.readQueryInput.test.tsx packages/logix-react/test-dts/canonical-hooks.surface.ts
git commit -m "feat: remove readquery noun from public selector types"
```

## Chunk 3: Residue Cleanup

### Task 3: 清扫 non-archive docs/examples/tests 里的 `ReadQuery` canonical residue

**Files:**
- Modify: `examples/logix/src/scenarios/external-store-tick.ts`
- Modify: `docs/proposals/form-react-sugar-factory-api-candidate.md`
- Modify: `docs/proposals/core-residual-surface-contract.md`
- Modify: `docs/proposals/core-residual-adjunct-contract.md`
- Modify: `docs/proposals/public-api-surface-inventory-and-disposition-plan.md`

- [x] **Step 1: 写 residue grep 红灯**

Run:
```bash
rg -n "ReadQuery" docs/proposals examples/logix packages/logix-react packages/logix-core/test --glob '!docs/archive/**'
```

Expected:
- 有残留命中
- 命中点需要被清扫、降为 stale/residue，或明确去权威

- [x] **Step 2: 实施最小清扫**

要求：
- non-archive docs 不再把 `ReadQuery` 当 canonical authoring noun
- examples 不再教学 explicit `ReadQuery` 路线
- 若历史 reasoning 必须保留，明确标记为 stale / residue / background

- [x] **Step 3: 复跑 residue grep**

Run:
```bash
rg -n "ReadQuery" docs/proposals examples/logix packages/logix-react packages/logix-core/test --glob '!docs/archive/**'
```

Expected:
- 只剩 internal/background/stale 合理残留
- 不再出现 canonical/active authority 路线

- [ ] **Step 4: Commit**

```bash
git add examples/logix/src/scenarios/external-store-tick.ts docs/proposals/form-react-sugar-factory-api-candidate.md docs/proposals/core-residual-surface-contract.md docs/proposals/core-residual-adjunct-contract.md docs/proposals/public-api-surface-inventory-and-disposition-plan.md
git commit -m "docs: clear readquery canonical residue"
```

## Chunk 4: Final Proof

### Task 4: 按 `ReadQuery` proof matrix 收口

**Files:**
- Modify: `docs/proposals/public-api-surface-inventory-and-disposition-plan.md`

- [x] **Step 1: 跑 focused verification**

Run:
```bash
pnpm -C packages/logix-core exec vitest run test/PublicSurface/Core.InternalContractsBoundary.test.ts test/PublicSurface/Core.RootExportsBoundary.test.ts test/Contracts/CoreRootBarrel.allowlist.test.ts test/ReadQuery/ReadQuery.buildGate.test.ts test/ReadQuery/ReadQuery.compile.test.ts test/ReadQuery/ReadQuery.strictGate.test.ts test/ReadQuery/ReadQuery.runtimeConsumption.test.ts test/Runtime/ModuleRuntime/SelectorGraph.test.ts
pnpm -C packages/logix-core exec tsc --noEmit
pnpm -C packages/logix-react exec tsc -p tsconfig.test.json --noEmit
```

Expected:
PASS

- [x] **Step 2: 回写总清单**

要求：
- 把 `ReadQuery` 子 proposal 的 proof matrix 对应 witness 标为已落实
- 若 `C2A2` 仍有批次说明，补齐 `ReadQuery` 这一支的实现状态

- [ ] **Step 3: Commit**

```bash
git add docs/proposals/public-api-surface-inventory-and-disposition-plan.md
git commit -m "docs: close readquery implementation proof"
```
