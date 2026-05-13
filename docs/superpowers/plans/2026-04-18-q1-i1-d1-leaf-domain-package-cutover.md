# Q1 I1 D1 Leaf Domain Package Cutover Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把已冻结的 `Q1 + I1 + D1` 结论真正消费到 `@logixjs/query`、`@logixjs/i18n`、`@logixjs/domain` 的 package exports、root barrel、witness tests 与相关 docs promise 中。

**Architecture:** 这一批只消费已冻结的 exact surface contract，不重开任何 freeze。实施顺序固定为：先更新 boundary tests 形成红灯，再收 package exports 与 root barrel，随后迁移 repo 内受影响 imports，最后做定向验证并把总提案进度回写为已实施。迁移期不新增最终残留的 migration-only test file，断言一律优先折回现有长期测试文件。

**Tech Stack:** TypeScript, pnpm, Vitest, Markdown docs, package exports, root barrels

**Batch Scope:** 只消费 [query-exact-surface-contract.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/proposals/query-exact-surface-contract.md)、[i18n-exact-surface-contract.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/proposals/i18n-exact-surface-contract.md)、[domain-exact-surface-contract.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/proposals/domain-exact-surface-contract.md) 与对应 review ledgers 的冻结结果。本批不进入 `F1`、`T1-T4`、`C2*` 实现，也不自动执行 `git commit`。

---

## Chunk 1: Batch Frame

### Task 1: 把 Batch 3 planning 状态写进总提案

**Files:**
- Modify: `docs/proposals/public-api-surface-inventory-and-disposition-plan.md`

- [ ] **Step 1: 核对 Batch 3 范围**

确认本批次字段写清：
- `Q1 + I1 + D1 Leaf Domain Package Cutover`
- `status=planning`
- 只消费 leaf domain packages 的 frozen contract

- [ ] **Step 2: 运行最小 diff 检查**

Run:
```bash
git diff --check -- docs/proposals/public-api-surface-inventory-and-disposition-plan.md
```

Expected:
`无输出`

## Chunk 2: Q1 Query

### Task 2: 先把 Query 边界 witness 改成红灯

**Files:**
- Modify: `packages/logix-query/test/Query/Query.RootSurfaceBoundary.test.ts`
- Modify: `packages/logix-query/test/Query/Query.OutputModeBoundary.test.ts`
- Modify: `packages/logix-query/test/Query/Query.PackageExportsBoundary.test.ts`
- Modify: `packages/logix-query/test/Engine.combinations.test.ts`

- [ ] **Step 1: 改 root surface boundary**

要求：
- root 只承认 `make` 与 `Engine`
- `TanStack` 从 root survivor set 移除

- [ ] **Step 2: 改 package exports boundary**

要求：
- 继续断言没有 wildcard subpath
- 不新增新的公开 subpath

- [ ] **Step 3: 把 `Engine.combinations` 改成 internal/consumer witness**

要求：
- 不再通过 root `Query.TanStack` 取 engine
- 改成直接从 `../src/internal/engine/tanstack.js` 或未来 package 内部落点读取
- 该测试文件继续作为长期行为 proof，不新建迁移专用文件

- [ ] **Step 4: 先跑红灯**

Run:
```bash
pnpm -C packages/logix-query exec vitest run test/Query/Query.RootSurfaceBoundary.test.ts test/Query/Query.OutputModeBoundary.test.ts test/Query/Query.PackageExportsBoundary.test.ts test/Engine.combinations.test.ts
```

Expected:
- 至少一项失败
- 失败原因指向 `TanStack` 仍在 root

### Task 3: 消费 Q1 合同到 query package

**Files:**
- Modify: `packages/logix-query/package.json`
- Modify: `packages/logix-query/src/index.ts`
- Modify: `docs/ssot/runtime/08-domain-packages.md`
- Modify: `docs/proposals/public-api-surface-inventory-and-disposition-plan.md`

- [ ] **Step 1: 移除 root `TanStack`**

要求：
- `src/index.ts` 去掉 `export * as TanStack`
- package root 只留 `make` 与 `Engine`

- [ ] **Step 2: 保持 package 无新 subpath**

要求：
- `package.json` 继续只有 `.`
- 不新增 `./TanStack`

- [ ] **Step 3: 回写 runtime/08**

要求：
- Query package root 当前只保留 `Query.make / Query.Engine`
- `TanStack` 回收到 query internal owner

- [ ] **Step 4: 再跑 Query focused tests**

Run:
```bash
pnpm -C packages/logix-query exec vitest run test/Query/Query.RootSurfaceBoundary.test.ts test/Query/Query.OutputModeBoundary.test.ts test/Query/Query.PackageExportsBoundary.test.ts test/Engine.combinations.test.ts
```

Expected:
PASS

## Chunk 3: I1 I18n

### Task 4: 先把 I18n 边界 witness 改成红灯

**Files:**
- Modify: `packages/i18n/test/I18n/I18n.RootSurfaceBoundary.test.ts`
- Modify: `packages/i18n/test/I18n/I18n.ServiceFirstBoundary.test.ts`
- Modify: `packages/i18n/test/Token/MessageToken.test.ts`

- [ ] **Step 1: 改 root surface boundary**

要求：
- root 只承认：
  - `I18n`
  - `I18nTag`
  - `token`
  - token contract types
- 去掉：
  - `I18nSnapshotSchema`
  - `InvalidI18nMessageTokenError`

- [ ] **Step 2: 保留 service-first 行为 proof**

要求：
- `I18n.ServiceFirstBoundary` 继续证明 service-first contract
- 不新增 migration-only 测试文件

- [ ] **Step 3: 先跑红灯**

Run:
```bash
pnpm -C packages/i18n exec vitest run test/I18n/I18n.RootSurfaceBoundary.test.ts test/I18n/I18n.ServiceFirstBoundary.test.ts test/Token/MessageToken.test.ts
```

Expected:
- 至少一项失败
- 失败原因指向 root 仍过宽或 wildcard 仍存在

### Task 5: 消费 I1 合同到 i18n package

**Files:**
- Modify: `packages/i18n/package.json`
- Modify: `packages/i18n/src/index.ts`
- Modify: `docs/ssot/runtime/08-domain-packages.md`
- Modify: `docs/proposals/public-api-surface-inventory-and-disposition-plan.md`

- [ ] **Step 1: 删除 wildcard 与 subpath**

要求：
- `package.json` 删除 `./*`
- 不保留 `./I18n`
- 不保留 `./Token`

- [ ] **Step 2: 收窄 root barrel**

要求：
- root 只保留 `I18n`、`I18nTag`、`token(...)`
- 仅保留最小 token contract types
- `I18nSnapshotSchema`、`InvalidI18nMessageTokenError` 与相关辅助类型退出 root

- [ ] **Step 3: 回写 runtime/08**

要求：
- i18n root 当前只保留最小 service-first contract
- wildcard 与 subpath contract 已退出

- [ ] **Step 4: 再跑 I18n focused tests**

Run:
```bash
pnpm -C packages/i18n exec vitest run test/I18n/I18n.RootSurfaceBoundary.test.ts test/I18n/I18n.ServiceFirstBoundary.test.ts test/Token/MessageToken.test.ts
```

Expected:
PASS

## Chunk 4: D1 Domain

### Task 6: 先把 Domain 边界 witness 改成红灯

**Files:**
- Modify: `packages/domain/test/Crud/Crud.PatternKitBoundary.test.ts`
- Modify: `packages/domain/test/Crud/Crud.basic.test.ts`

- [ ] **Step 1: 改 boundary 测试**

要求：
- `@logixjs/domain` root 不再承认 thin type barrel
- 只承认 `@logixjs/domain/Crud`
- `Crud.PatternKitBoundary.test.ts` 不再期待 root 上存在 CRUD 相关类型

- [ ] **Step 2: 保留 `Crud.basic` 行为 proof**

要求：
- `Crud.basic.test.ts` 继续证明 `./Crud` 的最小 kit contract
- 若需要改 imports，只改到 `../../src/Crud.js`

- [ ] **Step 3: 先跑红灯**

Run:
```bash
pnpm -C packages/domain exec vitest run test/Crud/Crud.PatternKitBoundary.test.ts test/Crud/Crud.basic.test.ts
```

Expected:
- 至少一项失败
- 失败原因指向 root barrel 或 wildcard 仍过宽

### Task 7: 消费 D1 合同到 domain package

**Files:**
- Modify: `packages/domain/package.json`
- Modify: `packages/domain/src/index.ts`
- Modify: `docs/ssot/runtime/08-domain-packages.md`
- Modify: `docs/proposals/public-api-surface-inventory-and-disposition-plan.md`

- [ ] **Step 1: 删 root 与 wildcard**

要求：
- `package.json` 删除 root `.` 或把 root 面收成零公开 contract
- 删除 `./*`
- 只保留 `./Crud`

- [ ] **Step 2: 收窄 `./Crud`**

要求：
- `packages/domain/src/Crud.ts` 只保留：
  - `make`
  - `CrudProgram`
  - `CrudSpec`
  - `CrudApi`
- `CrudCommandsHandle`、`CrudHandleExt` 与其余宽类型退出 exact public surface

- [ ] **Step 3: 回写 runtime/08**

要求：
- domain package 当前只保留 rootless CRUD 入口
- future commands sugar / recipe / preset 明确交给 toolkit

- [ ] **Step 4: 再跑 Domain focused tests**

Run:
```bash
pnpm -C packages/domain exec vitest run test/Crud/Crud.PatternKitBoundary.test.ts test/Crud/Crud.basic.test.ts
```

Expected:
PASS

## Chunk 5: Cross-Package Fallout

### Task 8: 迁移 repo 内对 Q1/I1/D1 旧 surface 的引用

**Files:**
- Modify: `packages/logix-query/test/Query.edge-cases.test.ts`
- Modify: `packages/logix-query/test/Query/Query.CachePeekSkipLoading.test.ts`
- Modify: `packages/logix-query/test/Query/Query.CacheReuse.test.ts`
- Modify: `packages/logix-query/test/Query/Query.MissingClient.test.ts`
- Modify: `packages/logix-query/test/Query/Query.Race.test.ts`
- Modify: `packages/logix-query/test/Query.controller.refreshAll.test.ts`
- Modify: `packages/logix-query/test/TanStack.engine.cacheLimit.test.ts`
- Modify: `packages/i18n/test/I18n/ReadySemantics.test.ts`
- Modify: `packages/i18n/test/I18n/I18n.DriverLifecycleBoundary.test.ts`
- Modify: `packages/i18n/test/I18n/I18n.ServiceIsolation.test.ts`
- Modify: `packages/domain/demos/crud.business.program.ts`
- Modify: `packages/domain/demos/crud.business.ts`
- Modify: `packages/domain/demos/optimistic-crud/demo.ts`

- [ ] **Step 1: 把 query tests 的 root `TanStack` 引用迁到 internal**

要求：
- 不再用 root `Query.TanStack`
- 改为直接从内部 adapter 模块引用

- [ ] **Step 2: 把 i18n tests 的 root 宽类型断言迁到最小 root**

要求：
- 若有 `I18nSnapshotSchema` 或 error class 的 root 假设，全部删掉或改 internal import

- [ ] **Step 3: 把 domain demos 改为只用 `@logixjs/domain/Crud`**

要求：
- 不再从 `@logixjs/domain` root 取 CRUD 相关类型或构造入口

- [ ] **Step 4: 跑 cross-package grep**

Run:
```bash
rg -n "@logixjs/query(?!/internal)|Query\\.TanStack|@logixjs/i18n/(I18n|Token)|pkg\\.exports\\['\\.\\*'\\]|@logixjs/domain['\"]|from '../../src/index\\.js'" packages docs examples -g '!**/dist/**'
```

Expected:
- 不再有依赖已删除 root/subpath/wildcard 的命中
- 若有命中，只允许是更新后的 boundary witness

## Chunk 6: Batch Close

### Task 9: 定向验证与总提案进度回写

**Files:**
- Modify: `docs/proposals/public-api-surface-inventory-and-disposition-plan.md`

- [ ] **Step 1: 跑 leaf domain focused tests**

Run:
```bash
pnpm -C packages/logix-query exec vitest run test/Query/Query.RootSurfaceBoundary.test.ts test/Query/Query.OutputModeBoundary.test.ts test/Query/Query.PackageExportsBoundary.test.ts test/Engine.combinations.test.ts
pnpm -C packages/i18n exec vitest run test/I18n/I18n.RootSurfaceBoundary.test.ts test/I18n/I18n.ServiceFirstBoundary.test.ts test/Token/MessageToken.test.ts
pnpm -C packages/domain exec vitest run test/Crud/Crud.PatternKitBoundary.test.ts test/Crud/Crud.basic.test.ts
```

Expected:
PASS

- [ ] **Step 2: 跑 workspace typecheck**

Run:
```bash
pnpm typecheck
```

Expected:
PASS

- [ ] **Step 3: 回写总提案**

要求：
- Batch 3 状态改成 `implemented`
- `Q1 / I1 / D1` 从“已冻结但未完全落实”移到已实施
- `当前最可能的下一批` 改成 tooling / appendix cutover

- [ ] **Step 4: 跑最终格式检查**

Run:
```bash
git diff --check -- docs/proposals/public-api-surface-inventory-and-disposition-plan.md packages/logix-query/package.json packages/logix-query/src/index.ts packages/i18n/package.json packages/i18n/src/index.ts packages/domain/package.json packages/domain/src/index.ts packages/domain/src/Crud.ts docs/ssot/runtime/08-domain-packages.md
```

Expected:
`无输出`
