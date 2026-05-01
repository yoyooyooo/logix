# F1 Form Exact Surface Cutover Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把已冻结的 `F1` 结论真正消费到 `@logixjs/form` 的 root exports、`./locales`、repo consumers、长期 witness tests 与相关 docs promise 中。

**Architecture:** 这一批只消费 [13-exact-surface-contract.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/form/13-exact-surface-contract.md) 已冻结的 exact surface，不重开 freeze。执行顺序固定为：先把 Batch 5 planning 状态写进总提案，再把 root/public witness 改成红灯，随后收口 package exports 与 root barrel，把 `Form.Path / Form.SchemaPathMapping / Form.SchemaErrorMapping` 的 repo consumers 改到 app-local 或 direct-owner 路径，最后做 focused verification 与总提案回写。迁移期不新增 migration-only 测试文件，断言优先折回现有长期测试文件。

**Tech Stack:** TypeScript, pnpm, Vitest, Effect V4, package exports, Markdown docs, repo-local example helpers

**Batch Scope:** 只消费 [13-exact-surface-contract.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/form/13-exact-surface-contract.md) 与 `docs/review-plan/runs/2026-04-18-f1-form-exact-surface-review.md` 的冻结结果。本批不进入 `C2A* / C2B`、不重写 Form runtime 内核，也不自动执行 `git commit`。

---

## Chunk 1: Batch Frame

### Task 1: 把 Batch 5 planning 状态写进总提案

**Files:**
- Modify: `docs/proposals/public-api-surface-inventory-and-disposition-plan.md`

- [ ] **Step 1: 回写 Batch 5 条目**

要求：
- 新增 `Batch 5`
- 名称固定为 `F1 Form Exact Surface Cutover`
- `status=planning`
- 范围写清：
  - 消费已冻结的 `F1`
  - 收口 `@logixjs/form` root exact surface
  - 保留 `./locales` 作为 optional plain locale asset subpath

- [ ] **Step 2: 运行最小 diff 检查**

Run:
```bash
git diff --check -- docs/proposals/public-api-surface-inventory-and-disposition-plan.md
```

Expected:
`无输出`

## Chunk 2: Root Surface

### Task 2: 先把 Form root/public witness 改成红灯

**Files:**
- Modify: `packages/logix-form/test/Form/Form.RootExportsBoundary.test.ts`
- Modify: `packages/logix-form/test/Form/Form.DomainBoundary.test.ts`
- Modify: `packages/logix-form/test/Form/Form.PackageExportsBoundary.test.ts`
- Modify: `packages/logix-form/test/smoke.test.ts`

- [ ] **Step 1: 改 root exact surface witness**

要求：
- root 只承认：
  - `Form.make`
  - `Form.Rule`
  - `Form.Error`
- `Form.Path / Form.SchemaPathMapping / Form.SchemaErrorMapping` 从 root survivor set 移除
- `./locales` 继续承认为唯一公开 subpath

- [ ] **Step 2: 先跑红灯**

Run:
```bash
pnpm -C packages/logix-form exec vitest run test/Form/Form.RootExportsBoundary.test.ts test/Form/Form.DomainBoundary.test.ts test/Form/Form.PackageExportsBoundary.test.ts test/smoke.test.ts
```

Expected:
- 至少一项失败
- 失败原因指向 root 仍过宽或 root 仍泄漏 support primitives

### Task 3: 消费 F1 合同到 form package

**Files:**
- Modify: `packages/logix-form/package.json`
- Modify: `packages/logix-form/src/index.ts`
- Modify: `packages/logix-form/src/Form.ts`
- Modify: `docs/proposals/public-api-surface-inventory-and-disposition-plan.md`

- [ ] **Step 1: 收口 package root exports**

要求：
- root 只保留 `make / Rule / Error`
- `./locales` 继续保留
- 不新增其他公开 subpath

- [ ] **Step 2: 收口 root barrel**

要求：
- `packages/logix-form/src/index.ts` 移除：
  - `Path`
  - `SchemaPathMapping`
  - `SchemaErrorMapping`
- 若 `Form.ts` 仍经由 root 间接暴露 support primitive，要一并收口

- [ ] **Step 3: 再跑 root-focused tests**

Run:
```bash
pnpm -C packages/logix-form exec vitest run test/Form/Form.RootExportsBoundary.test.ts test/Form/Form.DomainBoundary.test.ts test/Form/Form.PackageExportsBoundary.test.ts test/smoke.test.ts
```

Expected:
PASS

## Chunk 3: Support Residue Relocation

### Task 4: 把 support primitive 的长期 tests 改到 direct owner

**Files:**
- Modify: `packages/logix-form/test/Path/Form.Path.test.ts`
- Modify: `packages/logix-form/test/SchemaPathMapping.test.ts`
- Modify: `packages/logix-form/test/SchemaErrorMapping.test.ts`
- Modify: `packages/logix-form/test/Form/Form.Commands.DefaultActions.test.ts`

- [ ] **Step 1: 改 direct-owner imports**

要求：
- 这些 tests 不再通过 `../../src/index.js` 或 package root 读取 `Path / SchemaPathMapping / SchemaErrorMapping`
- 直接改到：
  - `../../src/Path.js`
  - `../src/SchemaPathMapping.js`
  - `../src/SchemaErrorMapping.js`
  - 或更窄的 direct owner file

- [ ] **Step 2: 保持这些 tests 的长期意义**

要求：
- 这些文件继续表达稳定源码 contract
- 不把它们改成 migration-only witness
- 若某个 support primitive 已不值得保留，才删除对应 test；否则一律改到 direct owner

- [ ] **Step 3: 再跑 support-focused tests**

Run:
```bash
pnpm -C packages/logix-form exec vitest run test/Path/Form.Path.test.ts test/SchemaPathMapping.test.ts test/SchemaErrorMapping.test.ts test/Form/Form.Commands.DefaultActions.test.ts
```

Expected:
PASS

## Chunk 4: Repo Consumers And Docs

### Task 5: 把 repo consumers 从旧 root support surface 迁出去

**Files:**
- Modify: `examples/logix-react/src/form-support.ts`
- Modify: `examples/logix-react/src/demos/form/cases/case09-schema-decode.tsx`
- Modify: `apps/docs/content/docs/form/introduction.md`
- Modify: `apps/docs/content/docs/form/introduction.cn.md`
- Modify: `apps/docs/content/docs/form/schema.md`
- Modify: `apps/docs/content/docs/form/schema.cn.md`
- Modify: `apps/docs/content/docs/form/validation.md`
- Modify: `apps/docs/content/docs/form/validation.cn.md`
- Modify: `docs/proposals/public-api-surface-inventory-and-disposition-plan.md`

- [ ] **Step 1: 改 example helper**

要求：
- `examples/logix-react/src/form-support.ts` 不再从 `@logixjs/form` root 取 `Path`
- 如仍需要 path helper，收口到 example-local helper 或 direct-owner import
- `@logixjs/form/locales` 继续允许保留

- [ ] **Step 2: 改 schema decode demo**

要求：
- `case09-schema-decode.tsx` 不再通过 root `SchemaErrorMapping` 教用户
- 迁到 example-local helper、direct-owner import，或改写成只讲 Form carrier/submit 语义
- 避免继续在公开 example 中教授已退出 root exact surface 的心智

- [ ] **Step 3: 回写 form docs**

要求：
- `introduction* / schema* / validation*` 不再把 `Form.Path / SchemaPathMapping / SchemaErrorMapping` 写成 root public surface
- `./locales` 继续只按 optional plain locale asset subpath 描述
- root 口径统一到 `Form.make / Form.Rule / Form.Error`

- [ ] **Step 4: 跑 repo-consumer verification**

Run:
```bash
pnpm -C examples/logix-react typecheck
pnpm -C packages/logix-form exec tsc -p tsconfig.test.json --noEmit
```

Expected:
PASS

## Chunk 5: Final Verification

### Task 6: 做 F1 批次收口

**Files:**
- Modify: `docs/proposals/public-api-surface-inventory-and-disposition-plan.md`

- [ ] **Step 1: 跑 F1 focused verification**

Run:
```bash
pnpm -C packages/logix-form exec vitest run test/Form/Form.RootExportsBoundary.test.ts test/Form/Form.DomainBoundary.test.ts test/Form/Form.PackageExportsBoundary.test.ts test/Form/Form.Handle.ExactSurface.test.ts test/Form/Form.ErrorCarrier.Canonical.test.ts test/Form/Form.ErrorSelectorPrimitive.test.ts test/Form/Form.Authoring.ExactSurface.test.ts test/Path/Form.Path.test.ts test/SchemaPathMapping.test.ts test/SchemaErrorMapping.test.ts test/Rule/Form.Rule.BuiltinLocales.test.ts test/Rule/Form.Rule.BuiltinLocalesRegistration.test.ts test/Rule/Form.Rule.BuiltinLocalesCollision.test.ts
pnpm -C examples/logix-react typecheck
pnpm typecheck
```

Expected:
- 全部 PASS

- [ ] **Step 2: 回写总提案**

要求：
- `Batch 5` 状态改成 `implemented`
- `F1` 从“已冻结但未完全落实”移出
- `@logixjs/form` 的 manifest 行改成当前真实 disposition
- “已实施”部分补上本批实际完成项

- [ ] **Step 3: 运行最小 diff 检查**

Run:
```bash
git diff --check -- docs/proposals/public-api-surface-inventory-and-disposition-plan.md apps/docs/content/docs/form/introduction.md apps/docs/content/docs/form/introduction.cn.md apps/docs/content/docs/form/schema.md apps/docs/content/docs/form/schema.cn.md apps/docs/content/docs/form/validation.md apps/docs/content/docs/form/validation.cn.md packages/logix-form/package.json packages/logix-form/src/index.ts examples/logix-react/src/form-support.ts examples/logix-react/src/demos/form/cases/case09-schema-decode.tsx
```

Expected:
`无输出`
