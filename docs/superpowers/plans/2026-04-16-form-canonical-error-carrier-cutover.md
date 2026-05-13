# Form Canonical Error Carrier Cutover Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 `FormErrorLeaf` 真正落成唯一 canonical error carrier，并直接清掉 string/raw leaf、`errors.$schema` canonical role 与 error counting 旧 residue，不留兼容路径。

**Architecture:** 这次改造只切 error carrier 主线，不重开 validation bridge、submit verdict 或 active-shape/locality。执行顺序固定为：先写失败测试锁住 canonical leaf 与 counting 规则，再把 `errors.ts`、`reducer.ts`、`commands.ts`、必要的 schema lowering residue 收成同一条 carrier 逻辑。`errors.$schema` 不在这一波彻底删除存储位，但要退出 canonical truth 与计数真相。零兼容、单轨实施，不保留 dual-write 或旧 leaf 共存。

**Tech Stack:** TypeScript, Effect v4 beta, @logixjs/form, Vitest

---

## References

- [spec.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/143-form-canonical-error-carrier-cutover/spec.md)
- [plan.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/143-form-canonical-error-carrier-cutover/plan.md)
- [research.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/143-form-canonical-error-carrier-cutover/research.md)
- [data-model.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/143-form-canonical-error-carrier-cutover/data-model.md)
- [contracts/README.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/143-form-canonical-error-carrier-cutover/contracts/README.md)
- [quickstart.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/143-form-canonical-error-carrier-cutover/quickstart.md)
- [02-gap-map-and-target-direction.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/form/02-gap-map-and-target-direction.md)
- [03-kernel-form-host-split.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/form/03-kernel-form-host-split.md)
- [06-capability-scenario-api-support-map.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/form/06-capability-scenario-api-support-map.md)
- [AGENTS.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/AGENTS.md)

## File Structure

- `packages/logix-form/src/internal/form/errors.ts`
  - 统一 canonical leaf 识别与 `errorCount` 逻辑。这里必须把 string/raw/object-first leaf 的 canonical 身份删掉。
- `packages/logix-form/src/internal/form/reducer.ts`
  - 所有写入 `errors.*` 的地方都回到 canonical leaf 语义。`errors.$schema` 仍可存在为 residue 存储位，但不能再被视为 canonical tree。
- `packages/logix-form/src/internal/form/commands.ts`
  - 对齐 `handleSubmit / setError / clearErrors` 的 canonical carrier 路径。不能再借命令边界把旧 leaf 重新带回来。
- `packages/logix-form/src/internal/schema/SchemaErrorMapping.ts`
  - 若当前 lowering 仍默认生成非 canonical leaf，这里要一并对齐，但不能重新扩回 bridge scope。
- `packages/logix-form/src/Error.ts`
  - 若这里的 helper 与 canonical leaf 目标冲突，需要同步对齐，避免 public helper 继续输出旧 patch 形状。
- `packages/logix-form/test/Form/Form.Refactor.Regression.test.ts`
  - 已有一条回归测试，适合扩成 canonical carrier 主证明。
- `packages/logix-form/test/Form/Form.Commands.DefaultActions.test.ts`
  - 锁住 `setError / clearErrors / handleSubmit` 在新 carrier 下的行为。
- `packages/logix-form/test/SchemaErrorMapping.test.ts`
  - 锁住 decode residue 不再写 raw schema object。
- 必要时新增：
  - `packages/logix-form/test/Form/Form.ErrorCarrier.Canonical.test.ts`
    只测试 canonical leaf / count / residue 降级，不混入其他 lane。
- `specs/143-form-canonical-error-carrier-cutover/tasks.md`
  - 薄索引与状态面。

## Execution Rules

- 零兼容、单轨实施。
- 不保留 string leaf canonical 计数。
- 不保留 raw object leaf canonical 计数。
- `errors.$schema` 允许暂时继续作为 residue 存储位，但它不能继续是 canonical tree 的真相槽。
- 不在这波顺手切 submit verdict 或 locality。
- 每个 chunk 结束都要先跑 focused tests，再继续。

## Chunk 1: Canonical Leaf Definition

### Task 1: 锁住 canonical leaf 与 counting 行为

**Files:**
- Modify: `packages/logix-form/test/Form/Form.Refactor.Regression.test.ts`
- Create: `packages/logix-form/test/Form/Form.ErrorCarrier.Canonical.test.ts`
- Modify: `packages/logix-form/src/internal/form/errors.ts`

- [ ] **Step 1: 写失败测试，固定 canonical leaf 与 count 规则**

新增或补充这些断言：

```ts
expect(countErrorLeaves('legacy')).toBe(0)
expect(countErrorLeaves({ message: 'legacy' })).toBe(0)
expect(
  countErrorLeaves({
    origin: 'manual',
    severity: 'error',
    message: 'required',
  }),
).toBe(1)
```

再补一个树级断言：

```ts
expect(
  countErrorLeaves({
    name: {
      origin: 'rule',
      severity: 'error',
      message: 'required',
    },
    $schema: {
      name: 'legacy-schema',
    },
  }),
).toBe(1)
```

- [ ] **Step 2: 跑 focused tests，确认当前实现失败**

Run:

```bash
pnpm exec vitest run \
  packages/logix-form/test/Form/Form.Refactor.Regression.test.ts \
  packages/logix-form/test/Form/Form.ErrorCarrier.Canonical.test.ts \
  --reporter=dot
```

Expected: FAIL，因为当前 `countErrorLeaves` 仍承认 string 和 `{ message }` 形状。

- [ ] **Step 3: 写最小实现**

要求：

- 在 `errors.ts` 定义最小 canonical leaf guard
- 只认：
  - `origin`
  - `severity`
  - `message`
  - optional `code`
- string 和旧 `{ message, code?, details? }` 形状退出 canonical 身份

- [ ] **Step 4: 再跑 focused tests**

Run same command as Step 2

Expected: PASS

## Chunk 2: Reducer Write Path

### Task 2: 锁住 `setValue / setError / clearErrors` 回到 canonical carrier

**Files:**
- Modify: `packages/logix-form/test/Form/Form.Refactor.Regression.test.ts`
- Modify: `packages/logix-form/test/Form/Form.Commands.DefaultActions.test.ts`
- Modify: `packages/logix-form/src/internal/form/reducer.ts`

- [ ] **Step 1: 写失败测试**

扩展回归与 commands 测试：

```ts
yield* commands.setError('name', {
  origin: 'manual',
  severity: 'error',
  message: 'manual',
})
const s1: any = yield* commands.getState
expect(s1.errors?.$manual?.name).toEqual({
  origin: 'manual',
  severity: 'error',
  message: 'manual',
})
```

再锁住旧 string leaf 不再计数：

```ts
yield* commands.dispatch({
  _tag: 'setValue',
  payload: { path: 'errors.$schema.name', value: 'legacy-schema' },
} as any)
const sLegacy: any = yield* commands.getState
expect(sLegacy.$form.errorCount).toBe(0)
```

- [ ] **Step 2: 跑 focused tests，确认当前实现失败**

Run:

```bash
pnpm exec vitest run \
  packages/logix-form/test/Form/Form.Refactor.Regression.test.ts \
  packages/logix-form/test/Form/Form.Commands.DefaultActions.test.ts \
  --reporter=dot
```

Expected: FAIL，因为 reducer 仍把旧 leaf 计入 errorCount，且 `setError` 还接受 legacy shape。

- [ ] **Step 3: 写最小实现**

要求：

- reducer 的 `errorCount` 只围绕 canonical leaf 变化
- `errors.$schema` 中的 legacy residue 不再推动 canonical count
- `setError` 继续能写，但 canonical 路径只认 canonical leaf
- `clearErrors / setValue` 继续清理 manual/schema residue

- [ ] **Step 4: 再跑 focused tests**

Run same command as Step 2

Expected: PASS

## Chunk 3: Decode Residue and Public Helper Alignment

### Task 3: 锁住 decode residue 不再生成 raw canonical leaf

**Files:**
- Modify: `packages/logix-form/test/SchemaErrorMapping.test.ts`
- Modify: `packages/logix-form/src/internal/schema/SchemaErrorMapping.ts`
- Modify: `packages/logix-form/src/Error.ts`

- [ ] **Step 1: 写失败测试**

补充断言：

```ts
const writes = Form.SchemaErrorMapping.toSchemaErrorWrites({ path: ['name'], code: 'invalid' } as any)
expect(writes[0]?.error).toEqual(expect.any(String))
expect(writes[0]?.error).not.toEqual({ path: ['name'], code: 'invalid' })
```

如果 `Form.Error.leaf(...)` 仍输出旧 patch 形状，也补一个失败断言，要求它能直接表达 canonical leaf。

- [ ] **Step 2: 跑 focused test，确认当前实现失败或不完整**

Run:

```bash
pnpm exec vitest run packages/logix-form/test/SchemaErrorMapping.test.ts --reporter=dot
```

Expected: FAIL 或当前覆盖不足。

- [ ] **Step 3: 写最小实现**

要求：

- `SchemaErrorMapping` 的默认 leaf 继续只产出 residue-safe 值，不再回流 raw schema object
- 若 `Form.Error` helper 仍与 canonical leaf 目标冲突，同步对齐

- [ ] **Step 4: 再跑 focused test**

Run same command as Step 2

Expected: PASS

## Chunk 4: Cross-Contract Lock

### Task 4: 跑 143 focused suite

**Files:**
- Test only

- [ ] **Step 1: 跑 focused suite**

Run:

```bash
pnpm exec vitest run \
  packages/logix-form/test/Form/Form.Refactor.Regression.test.ts \
  packages/logix-form/test/Form/Form.Commands.DefaultActions.test.ts \
  packages/logix-form/test/Form/Form.ErrorCarrier.Canonical.test.ts \
  packages/logix-form/test/SchemaErrorMapping.test.ts \
  --reporter=dot
```

Expected: PASS

- [ ] **Step 2: 跑 typecheck**

Run: `pnpm typecheck`

Expected: PASS

## Chunk 5: Thin Index

### Task 5: 更新 `143/tasks.md`

**Files:**
- Modify: `specs/143-form-canonical-error-carrier-cutover/tasks.md`

- [ ] **Step 1: 更新状态与剩余 residue**

要求：

- 只更新 chunk 状态
- 记下是否还残留 `errors.$schema` 存储位
- 不复制 detailed steps

- [ ] **Step 2: 自检**

Expected:

- `tasks.md` 仍是薄索引
- 详细实施真相只有这一份 plan

## Verification Summary

- focused suite:

```bash
pnpm exec vitest run \
  packages/logix-form/test/Form/Form.Refactor.Regression.test.ts \
  packages/logix-form/test/Form/Form.Commands.DefaultActions.test.ts \
  packages/logix-form/test/Form/Form.ErrorCarrier.Canonical.test.ts \
  packages/logix-form/test/SchemaErrorMapping.test.ts \
  --reporter=dot
```

- final gate:

```bash
pnpm typecheck
```
