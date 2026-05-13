# Form Error Decode Render Closure Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 把 Form 的 error / decode / render 链收口到单一 truth，使 authority、witness / proof 与 live implementation 对齐到同一套 canonical carrier 与 render formula。

**Architecture:** 这批工作分三段推进。先做 `W1`，收 carrier 与 exact handle surface；再做 `W2`，收 decode-origin lowering、live implementation 与 precedence owner；最后做 `W3`，把 declaration / witness / evidence 三坐标接到既有 control plane。demo-local helper residue 不在本 plan 共管，只通过 live residue plan 的 handoff proof 接入。

**Tech Stack:** TypeScript, Effect v4 beta, Vitest, Markdown docs

**Bound Inputs:**
- [Form Error Decode Render Closure Contract](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/next/form-error-decode-render-closure-contract.md)
- [error/decode/render review ledger](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/review-plan/runs/2026-04-21-form-error-decode-render-closure-review.md)
- [Form Live Residue Cutover Plan](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/next/form-live-residue-cutover-plan.md)
- [Form Exact Surface Contract](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/form/13-exact-surface-contract.md)
- [Kernel Form Host Split](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/form/03-kernel-form-host-split.md)

---

## File Structure

- `packages/logix-form/src/internal/form/errors.ts`
  - canonical carrier 识别、count 与 truth 入口。
- `packages/logix-form/src/internal/form/reducer.ts`
  - error tree 写回、`errorCount` 更新与 `$schema` residue 行为。
- `packages/logix-form/src/internal/form/commands.ts`
  - exact handle、submit-lane 与 decode-origin 行为入口。
- `packages/logix-form/src/internal/schema/SchemaErrorMapping.ts`
  - decode-origin lowering 的实现见证。
- `packages/logix-form/src/Error.ts`
  - `Form.Error` support role、selector primitive 与 data-support helper。
- `packages/logix-form/test/Form/Form.ErrorCarrier.Canonical.test.ts`
- `packages/logix-form/test/Form/Form.Handle.ExactSurface.test.ts`
- `packages/logix-form/test/Form/Form.ErrorSelectorPrimitive.test.ts`
- `packages/logix-form/test/SchemaErrorMapping.test.ts`
- `packages/logix-form/test/Form/Form.Commands.DefaultActions.test.ts`
  - 当前最直接的 proof tests。
- `docs/ssot/form/13-exact-surface-contract.md`
- `docs/ssot/form/03-kernel-form-host-split.md`
- `docs/ssot/form/06-capability-scenario-api-support-map.md`
- `docs/ssot/runtime/09-verification-control-plane.md`
- `docs/ssot/runtime/10-react-host-projection-boundary.md`
  - authority / witness / proof / host owner writeback。

## Chunk 1: W1 Canonical Carrier And Handle

### Task 1: 锁住 canonical carrier 与 exact handle

**Files:**
- Modify: `packages/logix-form/src/internal/form/errors.ts`
- Modify: `packages/logix-form/src/internal/form/reducer.ts`
- Modify: `packages/logix-form/src/internal/form/commands.ts`
- Modify: `packages/logix-form/test/Form/Form.ErrorCarrier.Canonical.test.ts`
- Modify: `packages/logix-form/test/Form/Form.Handle.ExactSurface.test.ts`
- Modify: `packages/logix-form/test/Form/Form.Commands.DefaultActions.test.ts`

- [x] **Step 1: 先写红灯断言**

要求：
- string / legacy leaf 不再被 canonical count 认定
- `getState`、getter 面不再属于 exact handle
- `setError / submit` 只围绕 canonical carrier 计数

- [x] **Step 2: 跑 focused tests，确认现状仍有旧 residue**

Run:
```bash
pnpm -C packages/logix-form exec vitest run \
  test/Form/Form.ErrorCarrier.Canonical.test.ts \
  test/Form/Form.Handle.ExactSurface.test.ts \
  test/Form/Form.Commands.DefaultActions.test.ts
```

Expected:
- 至少一项失败
- 失败原因指向 raw string leaf 或 handle live extras

- [x] **Step 3: 写最小实现**

要求：
- `errors.ts` 与 `reducer.ts` 只承认 canonical leaf
- `commands.ts` 的公开 handle surface 与 exact contract 对齐
- 不顺手扩 render / reason scope

- [x] **Step 4: 再跑 focused tests**

Run same command as Step 2

Expected:
PASS

## Chunk 2: W2 Decode Lowering And Precedence

### Task 2: 锁住 decode-origin lowering 与 precedence owner

**Files:**
- Modify: `packages/logix-form/src/internal/schema/SchemaErrorMapping.ts`
- Modify: `packages/logix-form/src/internal/form/commands.ts`
- Modify: `packages/logix-form/src/Error.ts`
- Modify: `packages/logix-form/test/SchemaErrorMapping.test.ts`
- Modify: `packages/logix-form/test/Form/Form.ErrorSelectorPrimitive.test.ts`
- Modify: `packages/logix-form/test/Form/Form.Commands.DefaultActions.test.ts`
- Reference: `docs/next/form-live-residue-cutover-plan.md`

- [x] **Step 1: 写 decode lowering 红灯断言**

要求：
- raw string leaf 不再进入 canonical truth
- decode-origin facts 能接到既有 witness / compare truth

- [x] **Step 2: 写 precedence owner 红灯断言**

要求：
- `Form.Error.field(path)` 继续是唯一 sanctioned field error selector primitive
- helper-side precedence 只能通过 live residue handoff 清理，不在这里共管

- [x] **Step 3: 跑 focused tests**

Run:
```bash
pnpm -C packages/logix-form exec vitest run \
  test/SchemaErrorMapping.test.ts \
  test/Form/Form.ErrorSelectorPrimitive.test.ts \
  test/Form/Form.Commands.DefaultActions.test.ts
```

Expected:
- 至少一项失败
- 失败原因指向 decode leaf / precedence owner 旧行为

- [x] **Step 4: 写最小实现**

要求：
- `SchemaErrorMapping`、`commands.ts`、`Error.ts` 的实现见证与 authority 对齐
- handoff consumer 只作为外部依赖，不在本计划内直接清 example helper

- [x] **Step 5: 再跑 focused tests**

Run same command as Step 3

Expected:
PASS

## Chunk 3: W3 Witness And Control Plane

### Task 3: 接 declaration / witness / evidence 三坐标

**Files:**
- Modify: `docs/ssot/form/13-exact-surface-contract.md`
- Modify: `docs/ssot/form/03-kernel-form-host-split.md`
- Modify: `docs/ssot/form/06-capability-scenario-api-support-map.md`
- Modify: `docs/ssot/runtime/09-verification-control-plane.md`
- Modify: `docs/ssot/runtime/10-react-host-projection-boundary.md`
- Modify: `docs/next/form-error-decode-render-closure-contract.md`

- [x] **Step 1: 对齐 owner truth**

要求：
- `form/13`、`form/03`、`runtime/10` 对 carrier / precedence / render-formula 读法一致

- [x] **Step 2: 对齐 witness / proof**

要求：
- `form/06` 的 witness 行能支撑 `EC1-EC5`
- `runtime/09` 的 control-plane 坐标与 `W3` proof bundle 一致

- [x] **Step 3: 跑 docs parity scan**

Run:
```bash
rtk rg -n "FormErrorLeaf|render-only context|Form.Error.field|decode-origin|precedence" \
  docs/ssot/form/13-exact-surface-contract.md \
  docs/ssot/form/03-kernel-form-host-split.md \
  docs/ssot/form/06-capability-scenario-api-support-map.md \
  docs/ssot/runtime/09-verification-control-plane.md \
  docs/ssot/runtime/10-react-host-projection-boundary.md
```

Expected:
- 五页口径无冲突

## Chunk 4: Closeout

### Task 4: 做 close proof 与 handoff gate

**Files:**
- Modify: `docs/next/form-error-decode-render-closure-contract.md`
- Modify: `docs/review-plan/runs/2026-04-21-form-error-decode-render-closure-review.md`

- [x] **Step 1: 跑 code + docs focused verification**

Run:
```bash
pnpm -C packages/logix-form exec vitest run \
  test/Form/Form.ErrorCarrier.Canonical.test.ts \
  test/Form/Form.Handle.ExactSurface.test.ts \
  test/Form/Form.ErrorSelectorPrimitive.test.ts \
  test/SchemaErrorMapping.test.ts \
  test/Form/Form.Commands.DefaultActions.test.ts

rtk rg -n "manualError \\?\\? ruleError \\?\\? schemaError|useFormField|useFormList|useFormMeta" \
  docs/next/form-live-residue-cutover-plan.md \
  docs/ssot/runtime/10-react-host-projection-boundary.md
```

Expected:
- tests PASS
- live residue handoff route 清晰

- [x] **Step 2: 跑最终 diff 检查**

Run:
```bash
rtk git diff --check -- \
  packages/logix-form/src/internal/form/errors.ts \
  packages/logix-form/src/internal/form/reducer.ts \
  packages/logix-form/src/internal/form/commands.ts \
  packages/logix-form/src/internal/schema/SchemaErrorMapping.ts \
  packages/logix-form/src/Error.ts \
  packages/logix-form/test/Form/Form.ErrorCarrier.Canonical.test.ts \
  packages/logix-form/test/Form/Form.Handle.ExactSurface.test.ts \
  packages/logix-form/test/Form/Form.ErrorSelectorPrimitive.test.ts \
  packages/logix-form/test/SchemaErrorMapping.test.ts \
  packages/logix-form/test/Form/Form.Commands.DefaultActions.test.ts \
  docs/ssot/form/13-exact-surface-contract.md \
  docs/ssot/form/03-kernel-form-host-split.md \
  docs/ssot/form/06-capability-scenario-api-support-map.md \
  docs/ssot/runtime/09-verification-control-plane.md \
  docs/ssot/runtime/10-react-host-projection-boundary.md \
  docs/next/form-error-decode-render-closure-contract.md \
  docs/review-plan/runs/2026-04-21-form-error-decode-render-closure-review.md
```

Expected:
`无输出`

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-21-form-error-decode-render-closure-implementation.md`. Ready to execute?
