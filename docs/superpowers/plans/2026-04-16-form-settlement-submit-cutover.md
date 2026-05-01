# Form Settlement Submit Cutover Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 `submitAttempt`、decode residue blocking、base-fact submit summary 与 submit output 路径收成单线实现，不再依赖第二 verdict tree 或 `errorCount` 对 schema residue 的偶然行为。

**Architecture:** 这次改造不重开 bridge，也不再动 canonical error carrier。核心策略是先锁死最容易漂移的 submit gate：`handleSubmit` 必须在 rule/manual error 与 decode residue 两条事实上阻塞 `onValid`。随后再把 `submitAttempt` 视作唯一观察边界，把 valid submit 的 output 路径收成单线。整个过程零兼容、单轨实施，不保留第二 verdict tree、第二 blocker leaf 或 dual lifetime path。

**Tech Stack:** TypeScript, Effect v4 beta, @logixjs/form, Vitest

---

## References

- [spec.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/144-form-settlement-submit-cutover/spec.md)
- [plan.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/144-form-settlement-submit-cutover/plan.md)
- [research.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/144-form-settlement-submit-cutover/research.md)
- [quickstart.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/144-form-settlement-submit-cutover/quickstart.md)
- [02-gap-map-and-target-direction.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/form/02-gap-map-and-target-direction.md)
- [03-kernel-form-host-split.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/form/03-kernel-form-host-split.md)
- [06-capability-scenario-api-support-map.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/form/06-capability-scenario-api-support-map.md)

## File Structure

- `packages/logix-form/src/internal/form/commands.ts`
  - `submitAttempt` 触发、rules validate、decode、blocking verdict、onValid/onInvalid 路径都在这里。
- `packages/logix-form/src/internal/form/reducer.ts`
  - `$form.submitCount`、`$form.isSubmitting` 以及后续若需要补最小 submit summary，就落在这里。
- `packages/logix-form/test/Form/Form.Commands.DefaultActions.test.ts`
  - 适合加 decode residue blocking 和 submitCount 断言。
- `packages/logix-form/test/Form/Form.ValidateOnStrategy.test.ts`
  - 可作为 submit 后 revalidate gate 的回归证明。
- `packages/logix-form/test/Form/Form.ListScope.ReValidateGate.test.ts`
  - 可作为 submitCount 行为的回归证明。
- 如现有测试不足，再新增：
  - `packages/logix-form/test/Form/Form.Submit.DecodeVerdict.test.ts`
    只测 submit + decode residue，不混入其他 lane。
- `specs/144-form-settlement-submit-cutover/tasks.md`
  - 薄索引与状态面。

## Execution Rules

- 零兼容、单轨实施。
- 不保留第二 blocker leaf。
- 不保留第二 verdict tree。
- decode residue 是否阻塞 submit，必须由 submit path 显式决定，不能依赖 `errorCount` 的偶然行为。
- decoded payload 不进入第二状态树。
- 每个 chunk 结束都要跑 focused tests。

## Chunk 1: Decode Residue Blocking

### Task 1: 锁住 decode residue 必须阻塞 submit

**Files:**
- Modify: `packages/logix-form/test/Form/Form.Commands.DefaultActions.test.ts`
- Modify: `packages/logix-form/src/internal/form/commands.ts`

- [ ] **Step 1: 写失败测试**

补一段没有 rule error、只有 decode residue 的 submit 场景：

```ts
const DecodeSchema = Schema.Struct({
  name: Schema.String.pipe(
    Schema.refine((value): value is string => value.startsWith('A'), {
      message: 'must-start-with-a',
    }),
  ),
})

const decodeOnlyForm = Form.make('Form.Submit.DecodeOnly', {
  values: DecodeSchema,
  initialValues: { name: 'Bob' },
})
```

断言：

- `handleSubmit` 后 `onValid` 不触发
- `onInvalid` 触发
- `errors.$schema` 有值
- `$form.submitCount` 递增

- [ ] **Step 2: 跑 focused test，确认当前实现失败**

Run:

```bash
pnpm exec vitest run packages/logix-form/test/Form/Form.Commands.DefaultActions.test.ts --reporter=dot
```

Expected: FAIL，因为当前 `errorCount` 不再统计 `$schema` residue，submit 会错误地走到 `onValid`。

- [ ] **Step 3: 写最小实现**

要求：

- `handleSubmit` 明确区分：
  - rule/manual canonical error blocking
  - decode residue blocking
- 不引入第二 verdict tree
- 不改 public surface

- [ ] **Step 4: 再跑 focused test**

Run same command as Step 2

Expected: PASS

## Chunk 2: Valid Submit Output Path

### Task 2: 锁住 valid submit 的 output-only 路径

**Files:**
- Modify: `packages/logix-form/test/Form/Form.Commands.DefaultActions.test.ts`
- Modify: `packages/logix-form/src/internal/form/commands.ts`

- [ ] **Step 1: 写失败测试**

补一条 valid submit 场景断言：

- `onValid` 只在 decode 成功后触发
- `onInvalid` 不触发
- `isSubmitting` 最终回到 false
- 不新增第二状态树

如果当前实现已经满足，保留为回归证明。

- [ ] **Step 2: 跑 focused test**

Run same command as Chunk 1

- [ ] **Step 3: 写最小实现**

如果需要：

- 明确 success path 的 decoded payload 变量
- 继续只把 payload 作为 callback/output，不写回 state

- [ ] **Step 4: 再跑 focused test**

Expected: PASS

## Chunk 3: Submit Count and Revalidate Gates

### Task 3: 回归验证 submitAttempt 主线

**Files:**
- Test only:
  - `packages/logix-form/test/Form/Form.ValidateOnStrategy.test.ts`
  - `packages/logix-form/test/Form/Form.ListScope.ReValidateGate.test.ts`

- [ ] **Step 1: 跑 focused regression tests**

Run:

```bash
pnpm exec vitest run \
  packages/logix-form/test/Form/Form.ValidateOnStrategy.test.ts \
  packages/logix-form/test/Form/Form.ListScope.ReValidateGate.test.ts \
  --reporter=dot
```

Expected: PASS

## Chunk 4: Cross-Contract Lock

### Task 4: 跑 144 focused suite

**Files:**
- Test only

- [ ] **Step 1: 跑 focused suite**

Run:

```bash
pnpm exec vitest run \
  packages/logix-form/test/Form/Form.Commands.DefaultActions.test.ts \
  packages/logix-form/test/Form/Form.ValidateOnStrategy.test.ts \
  packages/logix-form/test/Form/Form.ListScope.ReValidateGate.test.ts \
  --reporter=dot
```

Expected: PASS

- [ ] **Step 2: 跑 typecheck**

Run: `pnpm typecheck`

Expected: PASS

## Chunk 5: Thin Index

### Task 5: 更新 `144/tasks.md`

**Files:**
- Modify: `specs/144-form-settlement-submit-cutover/tasks.md`

- [ ] **Step 1: 更新状态与 residue**

要求：

- 只记录 chunk 状态
- 如果还没切到 decoded payload type-level exactness，要明确记为后续 residue
- 不复制 detailed steps

- [ ] **Step 2: 自检**

Expected:

- `tasks.md` 仍是薄索引
- 详细实施真相只有这一份 plan

## Verification Summary

- focused suite:

```bash
pnpm exec vitest run \
  packages/logix-form/test/Form/Form.Commands.DefaultActions.test.ts \
  packages/logix-form/test/Form/Form.ValidateOnStrategy.test.ts \
  packages/logix-form/test/Form/Form.ListScope.ReValidateGate.test.ts \
  --reporter=dot
```

- final gate:

```bash
pnpm typecheck
```
