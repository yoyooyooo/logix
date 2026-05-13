# Form Validation Bridge Cutover Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 `submit-only decode gate`、`decode-origin canonical bridge`、`normalized decode facts`、`path-first lowering` 与 `submit fallback` 从当前 SSoT 落成实际实现主线，为后续 `143 / 144` 提供稳定 bridge 基线。

**Architecture:** 这次改造只切 `packages/logix-form` 内的 schema bridge 路径，不重开 control plane shell，也不顺手清理 canonical error carrier。执行顺序固定为：先锁住 tests，收口 `SchemaPathMapping` 的输入面，再收口 `commands.validate / handleSubmit` 的 decode gate，最后把 `SchemaErrorMapping` 的 lowering 统一成 path-first + submit fallback。旧 bridge 路径和多 vocabulary 猜测直接删除，不保留兼容层或 dual-write。

**Tech Stack:** TypeScript, Effect v4 beta, @logixjs/form, Vitest

---

## References

- [spec.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/142-form-validation-bridge-cutover/spec.md)
- [plan.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/142-form-validation-bridge-cutover/plan.md)
- [research.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/142-form-validation-bridge-cutover/research.md)
- [data-model.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/142-form-validation-bridge-cutover/data-model.md)
- [contracts/README.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/142-form-validation-bridge-cutover/contracts/README.md)
- [quickstart.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/142-form-validation-bridge-cutover/quickstart.md)
- [02-gap-map-and-target-direction.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/form/02-gap-map-and-target-direction.md)
- [03-kernel-form-host-split.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/form/03-kernel-form-host-split.md)
- [06-capability-scenario-api-support-map.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/form/06-capability-scenario-api-support-map.md)
- [AGENTS.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/AGENTS.md)

## File Structure

- `packages/logix-form/src/internal/schema/SchemaPathMapping.ts`
  - 收口 normalized decode facts 输入面，删除 `.errors / .issues / path` 多 vocabulary 猜测。
- `packages/logix-form/src/internal/schema/SchemaErrorMapping.ts`
  - 收口 path-first lowering 与 submit fallback。当前允许继续使用 residue writeback，但不得保留 raw schema issue 直写默认值。
- `packages/logix-form/src/internal/form/commands.ts`
  - 收口 `submit-only decode gate`。`validatePaths` 只能走 field-scoped validate，不再激活 structural decode。
- `packages/logix-form/test/SchemaPathMapping.test.ts`
  - 固定 path normalization 和“不再猜多 vocabulary”。
- `packages/logix-form/test/SchemaErrorMapping.test.ts`
  - 固定 path-first lowering 和 submit fallback。
- `packages/logix-form/test/Form/Form.Commands.DefaultActions.test.ts`
  - 固定 `validatePaths` 不触发 structural decode、`handleSubmit` 才触发 decode。
- `specs/142-form-validation-bridge-cutover/tasks.md`
  - 薄索引与状态面。

## Execution Rules

- 零兼容、单轨实施。
- 不保留 pre-submit structural decode route。
- 不保留 `.errors / .issues / path` 多 vocabulary 猜测。
- 不在本波次顺手切 canonical error carrier；若需要真正 canonical leaf，再交给 `143`。
- 每个 chunk 结束都要先跑 focused tests，再继续。

## Chunk 1: Normalized Input Surface

### Task 1: 锁住 `SchemaPathMapping` 的输入面

**Files:**
- Modify: `packages/logix-form/test/SchemaPathMapping.test.ts`
- Modify: `packages/logix-form/src/internal/schema/SchemaPathMapping.ts`

- [ ] **Step 1: 写失败测试，固定只认 normalized decode facts**

补两条测试：

```ts
it('does not infer paths from legacy issues arrays', () => {
  const out = Form.SchemaPathMapping.mapSchemaErrorToFieldPaths({
    issues: [{ path: ['profile', 'email'] }],
  } as any)
  expect(out).toEqual([])
})

it('maps only explicit path from normalized decode fact', () => {
  const out = Form.SchemaPathMapping.mapSchemaErrorToFieldPaths({
    path: ['profile', 'email'],
    code: 'invalid_email',
  } as any)
  expect(out).toEqual(['profile.email'])
})
```

- [ ] **Step 2: 跑 focused test，确认当前实现失败**

Run: `pnpm exec vitest run packages/logix-form/test/SchemaPathMapping.test.ts --reporter=dot`

Expected: FAIL，因为当前实现还会从 `issues` 数组里猜 path。

- [ ] **Step 3: 写最小实现**

要求：

- `SchemaError` 输入面收口为 normalized decode fact
- 默认只读取 `schemaError.path`
- `errorMap` escape hatch 继续保留
- 删除 `.errors / .issues` 猜测

- [ ] **Step 4: 再跑 test**

Run: `pnpm exec vitest run packages/logix-form/test/SchemaPathMapping.test.ts --reporter=dot`

Expected: PASS

## Chunk 2: Submit-Only Decode Gate

### Task 2: 锁住 `validatePaths` 不触发 structural decode

**Files:**
- Modify: `packages/logix-form/test/Form/Form.Commands.DefaultActions.test.ts`
- Modify: `packages/logix-form/src/internal/form/commands.ts`

- [ ] **Step 1: 写失败测试**

在现有 command test 里补一段：

```ts
yield* form.reset({ name: '' } as any)
yield* form.validatePaths(['name'])
const sDecodeByValidatePaths: any = yield* form.getState
expect(sDecodeByValidatePaths.errors?.$schema).toBeUndefined()
```

同时保留 `handleSubmit` 触发 decode 的断言。

- [ ] **Step 2: 跑 focused test，确认当前实现失败**

Run: `pnpm exec vitest run packages/logix-form/test/Form/Form.Commands.DefaultActions.test.ts --reporter=dot`

Expected: FAIL，因为当前 `validate()` 路径还会直接 decode 并写回 `errors.$schema`。

- [ ] **Step 3: 写最小实现**

要求：

- `validatePaths` 只做 field-scoped validate
- `validate()` 只做 root rules validate，不做 structural decode
- `handleSubmit()` 继续作为当前唯一 structural decode 触发点

- [ ] **Step 4: 再跑 test**

Run: `pnpm exec vitest run packages/logix-form/test/Form/Form.Commands.DefaultActions.test.ts --reporter=dot`

Expected: PASS

## Chunk 3: Path-First Lowering

### Task 3: 锁住 path-first + submit fallback

**Files:**
- Modify: `packages/logix-form/test/SchemaErrorMapping.test.ts`
- Modify: `packages/logix-form/src/internal/schema/SchemaErrorMapping.ts`

- [ ] **Step 1: 写失败测试**

补两条测试：

```ts
it('falls back to submit slot when path is unmappable', () => {
  const tree = Form.SchemaErrorMapping.toSchemaErrorTree(
    { code: 'invalid_payload' } as any,
    { toLeaf: () => 'E3' },
  )
  expect(tree).toEqual({ $self: 'E3' })
})

it('does not write raw schema object by default', () => {
  const writes = Form.SchemaErrorMapping.toSchemaErrorWrites({ path: ['name'] } as any)
  expect(writes[0]?.error).not.toEqual({ path: ['name'] })
})
```

- [ ] **Step 2: 跑 focused test，确认当前实现失败**

Run: `pnpm exec vitest run packages/logix-form/test/SchemaErrorMapping.test.ts --reporter=dot`

Expected: FAIL，因为当前默认 `toLeaf` 还是 raw object，且 unmappable 不会回收到 submit slot。

- [ ] **Step 3: 写最小实现**

要求：

- unmappable decode issue 回收到 submit slot
- 默认 leaf 不再是 raw schema object
- `toLeaf` escape hatch 继续保留

- [ ] **Step 4: 再跑 test**

Run: `pnpm exec vitest run packages/logix-form/test/SchemaErrorMapping.test.ts --reporter=dot`

Expected: PASS

## Chunk 4: Cross-Contract Lock

### Task 4: 回跑 142 focused suite

**Files:**
- Test only

- [ ] **Step 1: 跑 142 focused suite**

Run:

```bash
pnpm exec vitest run \
  packages/logix-form/test/SchemaPathMapping.test.ts \
  packages/logix-form/test/SchemaErrorMapping.test.ts \
  packages/logix-form/test/Form/Form.Commands.DefaultActions.test.ts \
  --reporter=dot
```

Expected: PASS

- [ ] **Step 2: 跑 typecheck**

Run: `pnpm typecheck`

Expected: PASS

## Chunk 5: Thin Index

### Task 5: 更新 `142/tasks.md`

**Files:**
- Modify: `specs/142-form-validation-bridge-cutover/tasks.md`

- [ ] **Step 1: 把已完成 chunk 打勾，并记录当前剩余 residue**

要求：

- 不复制 detailed steps
- 只更新状态和当前 blocker

- [ ] **Step 2: 自检**

Expected:

- `tasks.md` 仍保持薄索引
- detailed implementation truth 只有这一份 plan

## Verification Summary

- focused suite:

```bash
pnpm exec vitest run \
  packages/logix-form/test/SchemaPathMapping.test.ts \
  packages/logix-form/test/SchemaErrorMapping.test.ts \
  packages/logix-form/test/Form/Form.Commands.DefaultActions.test.ts \
  --reporter=dot
```

- final gate:

```bash
pnpm typecheck
```
