# Form Helper Selector Landing Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 `fieldValue(valuePath)`、`rawFormMeta()`、`Form.Error.field(path)` 和 `FormErrorLeaf.message` 的 exact token contract 真正落到公开实现、example 消费和验证里。

**Architecture:** 这轮直接沿已冻结 SSoT 落地，不重开 owner。`fieldValue/rawFormMeta` 落在 `@logixjs/react` 的 core-owned optional helper layer，`Form.Error.field` 继续停在 `@logixjs/form` 的 companion primitive，manual error token exactness 只先收口 `FormErrorLeaf` 与相关 public helper，不顺手扩成第二轮 rule/i18n 全量重写。

**Tech Stack:** TypeScript、Effect V4、Vitest、React Hooks、Logix ReadQuery、Markdown

---

## Scope And Freeze Line

- 本计划处理 4 个已冻结但未完全落地的缺口：
  - `fieldValue(valuePath)`
  - `rawFormMeta()`
  - `Form.Error.field(path)`
  - `FormErrorLeaf.message` 的 `I18nMessageToken` exact contract
- 本计划同时要求：
  - example 迁到官方 read helper
  - 清掉 `examples/logix-react/src/form-support.ts` 里的 internal import 穿透
- 本计划不处理：
  - field-ui exact leaf shape
  - write-side sugar
  - list sugar public contract
  - `Form.Error.root/item/list/submit`
  - rule builtins 的全量 i18n token 升级

## File Structure And Responsibilities

### React optional helper layer

- Create: `packages/logix-react/src/FormProjection.ts`
  - 持有 `fieldValue(valuePath)` 与 `rawFormMeta()` 的公开 builder
  - 只依赖 core `ReadQuery`，不穿透 form internal
- Modify: `packages/logix-react/src/index.ts`
  - 从 root 公开 named exports
- Modify: `packages/logix-react/src/internal/hooks/useSelector.ts`
  - 让 `useSelector` 接受显式 `ReadQuery`
  - 保持 selector route 与 explicit ReadQuery route 共存

### Form companion primitive and token contract

- Modify: `packages/logix-form/src/Error.ts`
  - 将 `FormErrorLeaf.message` 收成 `I18nMessageToken`
  - 增加 `Form.Error.field(path)`
- Modify: `packages/logix-form/src/internal/form/errors.ts`
  - canonical leaf guard 同步改成 `I18nMessageToken`
- Modify: `packages/logix-form/package.json`
  - 补 `@logixjs/i18n` 依赖

### Tests

- Create: `packages/logix-react/test/Hooks/useSelector.readQueryInput.test.tsx`
  - 锁定 explicit `ReadQuery` 路径
- Modify: `packages/logix-react/test-dts/canonical-hooks.surface.ts`
  - 锁定 `fieldValue/rawFormMeta` 的 day-one 类型面
- Create: `packages/logix-form/test/Form/Form.ErrorSelectorPrimitive.test.ts`
  - 锁定 `Form.Error.field(path)` surface
- Modify: `packages/logix-form/test/Form/Form.ErrorCarrier.Canonical.test.ts`
  - manual leaf 改成 token
- Modify: `packages/logix-form/test/Form/Form.Commands.DefaultActions.test.ts`
  - `setError` 改成 token
- Modify: `packages/logix-form/test/Form/Form.Refactor.Regression.test.ts`
  - `setError` 改成 token
- Modify: `packages/logix-form/test/Form/Form.RootExportsBoundary.test.ts`
  - 锁定 `Form.Error.field`

### Example / docs

- Modify: `examples/logix-react/src/form-support.ts`
  - 切到 `fieldValue/rawFormMeta`
  - 本地化 path read 与 list key helper
  - 删除 internal import 穿透
- Modify: `docs/internal/form-api-tutorial.md`
  - 补真实落地后的 helper 用法与边界说明

## Verification Matrix

- React helper focused:
  - `pnpm vitest run packages/logix-react/test/Hooks/useSelector.readQueryInput.test.tsx`
- Form focused:
  - `pnpm vitest run packages/logix-form/test/Form/Form.ErrorSelectorPrimitive.test.ts`
  - `pnpm vitest run packages/logix-form/test/Form/Form.ErrorCarrier.Canonical.test.ts`
  - `pnpm vitest run packages/logix-form/test/Form/Form.Commands.DefaultActions.test.ts`
  - `pnpm vitest run packages/logix-form/test/Form/Form.Refactor.Regression.test.ts`
- Package suites:
  - `pnpm vitest run packages/logix-react/test/Hooks`
  - `pnpm vitest run packages/logix-form/test/Form`
- Typecheck:
  - `pnpm --filter @logixjs/react typecheck`
  - `pnpm --filter @logixjs/form typecheck`
  - `pnpm --filter @examples/logix-react typecheck`
- Repo gate:
  - `pnpm typecheck`
  - `git diff --check`
- Residue scan:
  - `rg -n "packages/logix-form/src/internal|packages/logix-form/src/internal/form/path|packages/logix-form/src/internal/form/rowid" examples/logix-react/src/form-support.ts`

## Done Definition

1. `@logixjs/react` root 可直接 named export `fieldValue` 与 `rawFormMeta`
2. `useSelector(handle, readQuery)` 在 React host 下可工作
3. `Form.Error.field(path)` 成为活实现
4. `FormErrorLeaf.message` 在公开面改成 `I18nMessageToken`
5. `examples/logix-react/src/form-support.ts` 不再穿透 `packages/logix-form/src/internal/**`
6. focused tests、typecheck 和 residue scan 通过

## Chunk 1: Red Tests First

### Task 1: 先写失败测试锁定 helper 与 selector primitive

**Files:**
- Create: `packages/logix-react/test/Hooks/useSelector.readQueryInput.test.tsx`
- Modify: `packages/logix-react/test-dts/canonical-hooks.surface.ts`
- Create: `packages/logix-form/test/Form/Form.ErrorSelectorPrimitive.test.ts`
- Modify: `packages/logix-form/test/Form/Form.RootExportsBoundary.test.ts`

- [ ] **Step 1: 为 `useSelector(handle, readQuery)` 写失败测试**
- [ ] **Step 2: 为 `fieldValue/rawFormMeta` 写 dts surface 断言**
- [ ] **Step 3: 为 `Form.Error.field(path)` 写失败测试**
- [ ] **Step 4: 跑 focused tests，确认当前报红**

## Chunk 2: Green The Helper Layer

### Task 2: 落 `fieldValue/rawFormMeta` 与 explicit ReadQuery route

**Files:**
- Create: `packages/logix-react/src/FormProjection.ts`
- Modify: `packages/logix-react/src/index.ts`
- Modify: `packages/logix-react/src/internal/hooks/useSelector.ts`

- [ ] **Step 1: 实现 `fieldValue(valuePath)`**
- [ ] **Step 2: 实现 `rawFormMeta()`**
- [ ] **Step 3: 让 `useSelector` 支持 explicit `ReadQuery`**
- [ ] **Step 4: 跑 React focused tests 与 typecheck**

## Chunk 3: Green The Form Primitive

### Task 3: 落 `Form.Error.field` 与 token exactness

**Files:**
- Modify: `packages/logix-form/src/Error.ts`
- Modify: `packages/logix-form/src/internal/form/errors.ts`
- Modify: `packages/logix-form/package.json`
- Modify: `packages/logix-form/test/Form/Form.ErrorCarrier.Canonical.test.ts`
- Modify: `packages/logix-form/test/Form/Form.Commands.DefaultActions.test.ts`
- Modify: `packages/logix-form/test/Form/Form.Refactor.Regression.test.ts`

- [ ] **Step 1: 把 `FormErrorLeaf.message` 改成 `I18nMessageToken`**
- [ ] **Step 2: 实现 `Form.Error.field(path)`**
- [ ] **Step 3: 把 manual error 测试全切到 token**
- [ ] **Step 4: 跑 Form focused tests 与 typecheck**

## Chunk 4: Example And Docs Cutover

### Task 4: 迁 example helper，删 internal 穿透

**Files:**
- Modify: `examples/logix-react/src/form-support.ts`
- Modify: `docs/internal/form-api-tutorial.md`

- [ ] **Step 1: 切 value/meta 读取到官方 helper**
- [ ] **Step 2: 用 example-local path/list helper 替掉 internal import**
- [ ] **Step 3: 更新 tutorial**
- [ ] **Step 4: 跑 example typecheck 与 residue scan**

## Chunk 5: Final Verification

### Task 5: 跑全套证明

**Files:**
- Test only

- [ ] **Step 1: 跑 focused tests**
- [ ] **Step 2: 跑 package typecheck**
- [ ] **Step 3: 跑 repo typecheck 与 `git diff --check`**
