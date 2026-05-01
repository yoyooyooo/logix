# Form Active Shape Locality Cutover Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 active-shape / locality 这条线真正落成最终版，优先交付 exact surface 已冻结的 `insert / update / replace / byRowId.update/remove`，并让 row ownership、aux trees、cleanup/remap 行为继续围绕稳定 rowId 收口。

**Architecture:** 这次改造围绕 `packages/logix-form/src/internal/form/{arrays,reducer,rowid}.ts` 展开。执行顺序固定为：先写失败测试锁住数组操作语义和 row-local continuity，再扩 `FormActions`、`commands.make(...).fieldArray(...)` 与 reducer，最后补 `byRowId` 的命令辅助。`useFieldArray` 暂不扩面，留到 `146`。全过程零兼容、单轨实施，不保留 index-first 作为默认 locality 心智，也不做 dual path 数组命令。

**Tech Stack:** TypeScript, Effect v4 beta, @logixjs/form, Vitest

---

## References

- [spec.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/145-form-active-shape-locality-cutover/spec.md)
- [plan.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/145-form-active-shape-locality-cutover/plan.md)
- [research.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/145-form-active-shape-locality-cutover/research.md)
- [data-model.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/145-form-active-shape-locality-cutover/data-model.md)
- [contracts/README.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/145-form-active-shape-locality-cutover/contracts/README.md)
- [quickstart.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/145-form-active-shape-locality-cutover/quickstart.md)
- [13-exact-surface-contract.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/form/13-exact-surface-contract.md)
- [02-gap-map-and-target-direction.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/form/02-gap-map-and-target-direction.md)
- [03-kernel-form-host-split.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/form/03-kernel-form-host-split.md)
- [06-capability-scenario-api-support-map.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/form/06-capability-scenario-api-support-map.md)

## File Structure

- `packages/logix-form/src/internal/form/impl.ts`
  - `FormActions` schema、handle type 与 `fieldArray` command 面。要把 `insert / update / replace` 补进 exact runtime handle。
- `packages/logix-form/src/internal/form/commands.ts`
  - 实际命令实现。这里补 `insert / update / replace / byRowId`.
- `packages/logix-form/src/internal/form/reducer.ts`
  - 真正的数组结构编辑语义、aux tree 对齐、cleanup/remap 行为。
- `packages/logix-form/src/internal/form/arrays.ts`
  - aux arrays 对齐工具，如有必要扩展支持 roster replacement。
- `packages/logix-form/src/internal/form/rowid.ts`
  - rowIdStore 访问与 `byRowId` 解析辅助。
- `packages/logix-form/test/Form/FormBlueprint.fieldArray.test.ts`
  - 适合锁 positional edit 与 aux tree alignment。
- `packages/logix-form/test/Form/Form.RowIdErrorOwnership.test.ts`
  - 适合锁 row-local continuity。
- `packages/logix-form/test/internal/Internal.RowId.test.ts`
  - 适合锁 `getIndex` 读取和 `byRowId` 解析辅助。
- 如现有测试不够，再新增：
  - `packages/logix-form/test/Form/Form.FieldArray.ExactSurface.test.ts`
    只测 exact runtime handle 的新方法面。
- `specs/145-form-active-shape-locality-cutover/tasks.md`
  - 薄索引与状态面。

## Execution Rules

- 零兼容、单轨实施。
- `insert / update / replace / byRowId` 一旦落地，同波次不保留“旧 surface 暂不支持”的借口。
- `replace(nextItems)` 固定为 roster replacement，不做隐式 identity 猜测。
- `byRowId` 解析必须优先依赖稳定 rowIdStore，不引入第二 side refs。
- `useFieldArray` 暂不扩面，留给 `146` 的 host/examples/dogfooding 一并处理。

## Chunk 1: Exact Runtime Handle Surface

### Task 1: 补 `insert / update / replace / byRowId` 的 failing tests

**Files:**
- Modify: `packages/logix-form/test/Form/FormBlueprint.fieldArray.test.ts`
- Modify: `packages/logix-form/test/internal/Internal.RowId.test.ts`
- Create: `packages/logix-form/test/Form/Form.FieldArray.ExactSurface.test.ts`

- [ ] **Step 1: 写失败测试**

在 `FormBlueprint.fieldArray.test.ts` 里补：

```ts
yield* commands.fieldArray('items').insert(1, 'x')
yield* commands.fieldArray('items').update(2, 'y')
yield* commands.fieldArray('items').replace(['r0', 'r1'])
```

断言：

- `items`
- `errors.items.rows`
- `ui.items`

都按同一 roster 语义重排或截断。

再在 `Form.FieldArray.ExactSurface.test.ts` 里锁：

```ts
const api = commands.fieldArray('items')
expect(typeof api.insert).toBe('function')
expect(typeof api.update).toBe('function')
expect(typeof api.replace).toBe('function')
expect(typeof api.byRowId).toBe('function')
```

在 `Internal.RowId.test.ts` 里补：

```ts
expect(typeof (rowIdStore as any).getIndex).toBe('function')
```

- [ ] **Step 2: 跑 focused tests，确认当前实现失败**

Run:

```bash
pnpm exec vitest run \
  packages/logix-form/test/Form/FormBlueprint.fieldArray.test.ts \
  packages/logix-form/test/Form/Form.FieldArray.ExactSurface.test.ts \
  packages/logix-form/test/internal/Internal.RowId.test.ts \
  --reporter=dot
```

Expected: FAIL，因为当前 exact runtime handle 还没有这些方法。

## Chunk 2: Commands and Actions

### Task 2: 扩 `FormActions` 与 `commands.fieldArray(...)`

**Files:**
- Modify: `packages/logix-form/src/internal/form/impl.ts`
- Modify: `packages/logix-form/src/internal/form/commands.ts`
- Modify: `packages/logix-form/src/internal/form/rowid.ts`

- [ ] **Step 1: 最小实现 actions schema 与 command signatures**

要求：

- 新增：
  - `arrayInsert`
  - `arrayUpdate`
  - `arrayReplace`
- `fieldArray(path)` 新增：
  - `insert`
  - `update`
  - `replace`
  - `byRowId(rowId).update/remove`

- [ ] **Step 2: 为 `byRowId` 补辅助**

要求：

- `RowIdStoreLike` 补 `getIndex(listPath, rowId)`
- `getRowIdStore(...)` 继续只暴露 stable rowIdStore，不长第二路由

- [ ] **Step 3: 回跑 focused tests**

Run same command as Chunk 1

Expected: 仍可能红在 reducer 语义，但 surface 与辅助应基本齐。

## Chunk 3: Reducer Semantics

### Task 3: 实现 `insert / update / replace` 的 aux tree alignment

**Files:**
- Modify: `packages/logix-form/src/internal/form/reducer.ts`
- Modify: `packages/logix-form/src/internal/form/arrays.ts`
- Modify: `packages/logix-form/test/Form/FormBlueprint.fieldArray.test.ts`

- [ ] **Step 1: 写最小 reducer 语义**

要求：

- `insert`
  - values 插入
  - `ui` / `errors.rows` / `$manual.rows` / `$schema.rows` 同步插入 `undefined`
- `update`
  - values 替换指定 index
  - 同 index 的 manual/schema residue 清理
- `replace`
  - values 直接 roster replacement
  - `ui` / aux rows 按新长度重建
  - schema residue 清空

- [ ] **Step 2: 锁行为**

断言：

- `replace` 不做 identity 猜测
- `update` 不重排其他 row
- `insert` 后原有 error/ui 跟着后移

- [ ] **Step 3: 回跑 focused tests**

Run:

```bash
pnpm exec vitest run \
  packages/logix-form/test/Form/FormBlueprint.fieldArray.test.ts \
  packages/logix-form/test/Form/Form.FieldArray.ExactSurface.test.ts \
  --reporter=dot
```

Expected: PASS

## Chunk 4: Row Locality

### Task 4: `byRowId` 与 continuity

**Files:**
- Modify: `packages/logix-form/test/Form/Form.RowIdErrorOwnership.test.ts`
- Modify: `packages/logix-form/src/internal/form/commands.ts`

- [ ] **Step 1: 写失败测试**

补两段：

```ts
yield* commands.fieldArray('items').byRowId('row-0').update({ id: 'row-0', warehouseId: 'WH-NEW' })
yield* commands.fieldArray('items').byRowId('row-1').remove()
```

断言：

- 命中的 row 按 rowId 更新或删除
- 其他 row 的 continuity 不漂移

- [ ] **Step 2: 最小实现**

要求：

- `byRowId` 只通过 rowIdStore `getIndex` 解析
- 找不到 rowId 时静默 no-op 或抛错二选一，保持单一口径

- [ ] **Step 3: 回跑 focused tests**

Run:

```bash
pnpm exec vitest run \
  packages/logix-form/test/Form/Form.RowIdErrorOwnership.test.ts \
  packages/logix-form/test/internal/Internal.RowId.test.ts \
  --reporter=dot
```

Expected: PASS

## Chunk 5: Final Verification and Thin Index

### Task 5: 跑 145 focused suite

**Files:**
- Test only

- [ ] **Step 1: 跑 focused suite**

Run:

```bash
pnpm exec vitest run \
  packages/logix-form/test/Form/FormBlueprint.fieldArray.test.ts \
  packages/logix-form/test/Form/Form.FieldArray.ExactSurface.test.ts \
  packages/logix-form/test/Form/Form.RowIdErrorOwnership.test.ts \
  packages/logix-form/test/internal/Internal.RowId.test.ts \
  --reporter=dot
```

Expected: PASS

- [ ] **Step 2: 跑 typecheck**

Run: `pnpm typecheck`

Expected: PASS

### Task 6: 更新 `145/tasks.md`

**Files:**
- Modify: `specs/145-form-active-shape-locality-cutover/tasks.md`

- [ ] **Step 1: 更新状态与 residue**

要求：

- 只记录 chunk 状态
- 若 `useFieldArray` hook 仍未扩到新 surface，明确记为 `146` residue

- [ ] **Step 2: 自检**

Expected:

- `tasks.md` 仍是薄索引
- 详细实施真相只有这一份 plan

## Verification Summary

- focused suite:

```bash
pnpm exec vitest run \
  packages/logix-form/test/Form/FormBlueprint.fieldArray.test.ts \
  packages/logix-form/test/Form/Form.FieldArray.ExactSurface.test.ts \
  packages/logix-form/test/Form/Form.RowIdErrorOwnership.test.ts \
  packages/logix-form/test/internal/Internal.RowId.test.ts \
  --reporter=dot
```

- final gate:

```bash
pnpm typecheck
```
