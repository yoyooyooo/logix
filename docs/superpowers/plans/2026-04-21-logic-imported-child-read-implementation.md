# Logic Imported Child Read Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 Logic imported-child read 固定为 `$.imports.get(tag) -> child.read(selector)`，并清掉 `$.use / $.root.resolve / $.select / $.imports.select / $.imports.ref` 在 canonical imported-child read 上的残留口径。

**Architecture:** 这一批只消费 [logic-imported-child-read-contract.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/proposals/logic-imported-child-read-contract.md) 的冻结结果，不重开 `ReadQuery / ExternalStore / Resource`。执行顺序固定为：先把 imported-child resolution 与 phase safety 改成红灯，再为 `child.read(selector)` 对齐 handle contract 与 docs wording，随后清扫 docs/examples/tests 中旧路径 residue，最后按 proof matrix 做 focused verification 与 authority 回写。

**Tech Stack:** TypeScript, pnpm, Vitest, Effect V4, BoundApi runtime, React canonical host docs, Markdown docs

**Execution Status:** 2026-04-21 已完成 code / docs / verification。所有非 git 步骤已实际执行并通过验证；计划中的 `Commit` 步骤未执行，原因是当前未获用户明确授权做 `git add / commit / push`。

---

## Chunk 1: Red Tests

### Task 1: 先把 imported-child canonical pairing 改成红灯

**Files:**
- Modify: `packages/logix-core/test/internal/Bound/BoundApi.MissingImport.test.ts`
- Modify: `packages/logix-core/test/internal/Bound/Bound.test.ts`
- Modify: `packages/logix-react/test/Hooks/useImportedModule.test.tsx`

- [x] **Step 1: 写失败测试**

要求：
- Logic side canonical pairing 应落在 `$.imports.get(tag)` 与 `child.read(selector)`
- 未导入 child fail-fast
- duplicate-child fail-fast 要在 proof matrix 里有 witness

- [x] **Step 2: 运行红灯**

Run:
```bash
pnpm -C packages/logix-core exec vitest run test/internal/Bound/BoundApi.MissingImport.test.ts test/internal/Bound/Bound.test.ts
pnpm -C packages/logix-react exec vitest run test/Hooks/useImportedModule.test.tsx
```

Expected:
- FAIL
- 失败点指向 Logic imported-child read 仍靠旧路径或缺少 witness

- [ ] **Step 3: Commit**

```bash
git add packages/logix-core/test/internal/Bound/BoundApi.MissingImport.test.ts packages/logix-core/test/internal/Bound/Bound.test.ts packages/logix-react/test/Hooks/useImportedModule.test.tsx
git commit -m "test: add imported child read red tests"
```

## Chunk 2: Runtime / API Alignment

### Task 2: 对齐 `$.imports.get(tag)` 与 `child.read(selector)` 的 runtime / type 语义

**Files:**
- Modify: `packages/logix-core/src/internal/runtime/core/BoundApiRuntime.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/module.ts`
- Modify: `packages/logix-core/src/internal/authoring/programImports.ts`

- [x] **Step 1: 写最小实现**

要求：
- `$.imports.get(tag)` 只在 current parent scope 解析 imported child
- 继承 `ModuleTag` 单值绑定与 duplicate-child fail-fast
- `child.read(selector)` 作为 imported-child projection read 使用现有 handle 能力
- 不新增 `$.select` canonical 路径

- [x] **Step 2: 复跑红灯对应测试**

Run:
```bash
pnpm -C packages/logix-core exec vitest run test/internal/Bound/BoundApi.MissingImport.test.ts test/internal/Bound/Bound.test.ts
```

Expected:
PASS

- [x] **Step 3: 运行类型检查**

Run:
```bash
pnpm -C packages/logix-core exec tsc --noEmit
```

Expected:
PASS

- [ ] **Step 4: Commit**

```bash
git add packages/logix-core/src/internal/runtime/core/BoundApiRuntime.ts packages/logix-core/src/internal/runtime/core/module.ts packages/logix-core/src/internal/authoring/programImports.ts
git commit -m "feat: align logic imported child read runtime"
```

## Chunk 3: Docs / Residue Cleanup

### Task 3: 清扫 imported-child read 旧路径 residue

**Files:**
- Modify: `docs/ssot/runtime/03-canonical-authoring.md`
- Modify: `docs/ssot/runtime/07-standardized-scenario-patterns.md`
- Modify: `docs/ssot/runtime/10-react-host-projection-boundary.md`
- Modify: `docs/standards/logix-api-next-guardrails.md`
- Modify: `examples/logix-react/src/demos/DiShowcaseLayout.tsx`

- [x] **Step 1: residue grep**

Run:
```bash
rg -n "\\$\\.use\\(|\\$\\.root\\.resolve|\\$\\.select\\(|\\$\\.imports\\.select|\\$\\.imports\\.ref|imported-child read|child\\.read" docs examples --glob '!docs/archive/**'
```

Expected:
- 有旧路径 residue 命中

- [x] **Step 2: 清扫或改口径**

要求：
- canonical imported-child read 改成 `$.imports.get(tag) -> child.read(selector)`
- `$.use / $.root.resolve / $.select / $.imports.select / $.imports.ref` 不再被教成 canonical imported-child read
- React host law 不被误改成 Logic side law

- [x] **Step 3: 复跑 residue grep**

Run:
```bash
rg -n "\\$\\.use\\(|\\$\\.root\\.resolve|\\$\\.select\\(|\\$\\.imports\\.select|\\$\\.imports\\.ref|imported-child read|child\\.read" docs examples --glob '!docs/archive/**'
```

Expected:
- 只剩合理的 expert/background/stale 残留

- [ ] **Step 4: Commit**

```bash
git add docs/ssot/runtime/03-canonical-authoring.md docs/ssot/runtime/07-standardized-scenario-patterns.md docs/ssot/runtime/10-react-host-projection-boundary.md docs/standards/logix-api-next-guardrails.md examples/logix-react/src/demos/DiShowcaseLayout.tsx
git commit -m "docs: align imported child read canonical path"
```

## Chunk 4: Final Proof

### Task 4: 按 imported-child read proof matrix 收口

**Files:**
- Modify: `docs/proposals/logic-imported-child-read-contract.md`

- [x] **Step 1: 跑 focused verification**

Run:
```bash
pnpm -C packages/logix-core exec vitest run test/internal/Bound/BoundApi.MissingImport.test.ts test/internal/Bound/Bound.test.ts
pnpm -C packages/logix-react exec vitest run test/Hooks/useImportedModule.test.tsx
pnpm -C packages/logix-core exec tsc --noEmit
```

Expected:
PASS

- [x] **Step 2: 回写 proposal proof 完成状态**

要求：
- 若 `logic-imported-child-read-contract.md` 需要补去向或 proof 完成说明，一并回写
- 保持与 review ledger 一致

- [ ] **Step 3: Commit**

```bash
git add docs/proposals/logic-imported-child-read-contract.md
git commit -m "docs: close imported child read implementation proof"
```
