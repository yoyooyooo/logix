# Form P0 Semantic Closure Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 把 Form 的 `P0` 主战场压成可执行的三波实施路线，依次关闭 `active-shape lane`、`settlement lane`、`reason contract`，并让三波都接入既有 verification control plane。

**Architecture:** 这批工作只处理 `Wave A/B/C`。执行顺序固定为：先做 `Wave A`，关 active-set / cleanup / remap / row-local compare；再做 `Wave B`，关 contributor / submitAttempt / decoded verdict / blocking basis；最后做 `Wave C`，关 explain / submit summary / compare feed。所有 post-`P0` reopen 只通过 external routing 记录，不参与当前实施。

**Tech Stack:** TypeScript, Effect v4 beta, Vitest, Markdown docs, verification control plane

**Bound Inputs:**
- [Form P0 Semantic Closure Wave Plan](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/next/form-p0-semantic-closure-wave-plan.md)
- [P0 wave review ledger](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/review-plan/runs/2026-04-21-form-p0-semantic-closure-wave-review.md)
- [Form Problem Contract](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/form/02-gap-map-and-target-direction.md)
- [Kernel Form Host Split](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/form/03-kernel-form-host-split.md)
- [Verification Control Plane](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/runtime/09-verification-control-plane.md)

---

## File Structure

- `packages/logix-form/src/internal/form/arrays.ts`
- `packages/logix-form/src/internal/form/rowid.ts`
- `packages/logix-form/src/internal/form/reducer.ts`
- `packages/logix-form/src/internal/form/commands.ts`
- `packages/logix-form/src/internal/form/rules.ts`
- `packages/logix-form/src/internal/form/errors.ts`
- `packages/logix-form/src/internal/form/impl.ts`
  - `Wave A/B/C` 的主要实现锚点。
- `packages/logix-form/test/Form/Form.RowIdentityProjectionWitness.test.ts`
- `packages/logix-form/test/internal/Internal.RowId.test.ts`
- `packages/logix-form/test/Form/Form.FieldBehavior.Guardrails.test.ts`
  - `Wave A` 的 witness tests。
- `packages/logix-form/test/Form/Form.ListScope.ReValidateGate.test.ts`
- `packages/logix-form/test/Form/Form.ListScopeUniqueWarehouse.test.ts`
- `packages/logix-form/test/Form/Form.Commands.DefaultActions.test.ts`
  - `Wave B` 的 submit / contributor / verdict witness。
- `packages/logix-form/test/Form/Form.ErrorSelectorPrimitive.test.ts`
- Create: `packages/logix-form/test/Form/Form.ReasonContract.Witness.test.ts`
  - `Wave C` 的 explain / summary / compare feed witness。
- `docs/ssot/form/02-gap-map-and-target-direction.md`
- `docs/ssot/form/03-kernel-form-host-split.md`
- `docs/ssot/form/04-convergence-direction.md`
- `docs/ssot/form/06-capability-scenario-api-support-map.md`
- `docs/ssot/form/07-kernel-upgrade-opportunities.md`
- `docs/ssot/runtime/09-verification-control-plane.md`
  - 三波 docs writeback。

## Chunk 1: Wave A Active-Shape

### Task 1: 锁住 active-set / cleanup / remap / row-local compare

**Files:**
- Modify: `packages/logix-form/src/internal/form/arrays.ts`
- Modify: `packages/logix-form/src/internal/form/rowid.ts`
- Modify: `packages/logix-form/src/internal/form/reducer.ts`
- Modify: `packages/logix-form/test/Form/Form.RowIdentityProjectionWitness.test.ts`
- Modify: `packages/logix-form/test/internal/Internal.RowId.test.ts`
- Modify: `packages/logix-form/test/Form/Form.FieldBehavior.Guardrails.test.ts`

- [x] **Step 1: 先补 Wave A 红灯 witness**

要求：
- active set 退出后，`errors / ui / pending / blocking` 一起退出
- row-local compare 不再被 index 漂移污染
- `replace(nextItems)` 明确按 roster replacement 处理

- [x] **Step 2: 跑 Wave A focused tests**

Run:
```bash
pnpm -C packages/logix-form exec vitest run \
  test/Form/Form.RowIdentityProjectionWitness.test.ts \
  test/internal/Internal.RowId.test.ts \
  test/Form/Form.FieldBehavior.Guardrails.test.ts
```

Expected:
- 至少一项失败
- 失败原因指向 cleanup / remap / row-local compare 缺口

- [x] **Step 3: 写最小实现**

要求：
- 只切 `Wave A` 所需 active-shape 语义
- 不顺手重开 `settlement`、`reason`、adjunct noun

- [x] **Step 4: 再跑 Wave A focused tests**

Run same command as Step 2

Expected:
PASS

## Chunk 2: Wave B Settlement

### Task 2: 锁住 contributor / submitAttempt / decoded verdict / blocking basis

**Files:**
- Modify: `packages/logix-form/src/internal/form/commands.ts`
- Modify: `packages/logix-form/src/internal/form/rules.ts`
- Modify: `packages/logix-form/src/internal/form/reducer.ts`
- Modify: `packages/logix-form/src/internal/form/impl.ts`
- Modify: `packages/logix-form/test/Form/Form.ListScope.ReValidateGate.test.ts`
- Modify: `packages/logix-form/test/Form/Form.ListScopeUniqueWarehouse.test.ts`
- Modify: `packages/logix-form/test/Form/Form.Commands.DefaultActions.test.ts`

- [x] **Step 1: 先补 Wave B 红灯 witness**

要求：
- contributor vocabulary 与 `submitAttempt` snapshot 可观察
- decoded verdict 与 blocking basis 单值可解释
- stale / pending 不再各走各的 truth

- [x] **Step 2: 跑 Wave B focused tests**

Run:
```bash
pnpm -C packages/logix-form exec vitest run \
  test/Form/Form.ListScope.ReValidateGate.test.ts \
  test/Form/Form.ListScopeUniqueWarehouse.test.ts \
  test/Form/Form.Commands.DefaultActions.test.ts
```

Expected:
- 至少一项失败
- 失败原因指向 submit / pending / verdict 真相未闭环

- [x] **Step 3: 写最小实现**

要求：
- 只切 `Wave B` 的 contributor / submit semantics
- 继续把 `Wave C` 所需 explain / summary 留到下一波

- [x] **Step 4: 再跑 Wave B focused tests**

Run same command as Step 2

Expected:
PASS

## Chunk 3: Wave C Reason Contract

### Task 3: 锁住 explain / submit summary / compare feed

**Files:**
- Modify: `packages/logix-form/src/internal/form/errors.ts`
- Modify: `packages/logix-form/src/internal/form/rules.ts`
- Modify: `packages/logix-form/src/internal/form/impl.ts`
- Create: `packages/logix-form/test/Form/Form.ReasonContract.Witness.test.ts`
- Modify: `packages/logix-form/test/Form/Form.ErrorSelectorPrimitive.test.ts`

- [x] **Step 1: 写 Wave C 红灯 witness**

要求：
- path-level explain、submit summary、compare feed 共用同一 authority
- `Form.Error.field(path)` 与 reason / evidence 读法不分叉

- [x] **Step 2: 跑 Wave C focused tests**

Run:
```bash
pnpm -C packages/logix-form exec vitest run \
  test/Form/Form.ReasonContract.Witness.test.ts \
  test/Form/Form.ErrorSelectorPrimitive.test.ts
```

Expected:
- 至少一项失败
- 失败原因指向 explain / summary / compare feed 未闭环

- [x] **Step 3: 写最小实现**

要求：
- 只切 `Wave C` 的 explain / summary / compare feed
- 不顺手吸收 post-`P0` reopen 主题

- [x] **Step 4: 再跑 Wave C focused tests**

Run same command as Step 2

Expected:
PASS

## Chunk 4: Wave Docs And Proof

### Task 4: 同步三波 authority / witness / proof 页面

**Files:**
- Modify: `docs/ssot/form/02-gap-map-and-target-direction.md`
- Modify: `docs/ssot/form/03-kernel-form-host-split.md`
- Modify: `docs/ssot/form/04-convergence-direction.md`
- Modify: `docs/ssot/form/06-capability-scenario-api-support-map.md`
- Modify: `docs/ssot/form/07-kernel-upgrade-opportunities.md`
- Modify: `docs/ssot/runtime/09-verification-control-plane.md`
- Modify: `docs/next/form-p0-semantic-closure-wave-plan.md`

- [x] **Step 1: 对齐 Wave Ledger 的 docs owner**

要求：
- `02/03` 继续承接 canonical owner
- `06` 继续只做 witness
- `07` 继续只做 kernel enabler
- `runtime/09` 继续只做 proof owner

- [x] **Step 2: 对齐 proof bundle**

要求：
- `Wave A/B/C` 的 proof bundle 在 docs 页里都有对应支点
- `declaration / witness / evidence` 三坐标读法一致

- [x] **Step 3: 跑 docs parity scan**

Run:
```bash
rtk rg -n "active-shape lane|settlement lane|reason contract|submitAttempt|reasonSlotId|compare feed" \
  docs/ssot/form/02-gap-map-and-target-direction.md \
  docs/ssot/form/03-kernel-form-host-split.md \
  docs/ssot/form/04-convergence-direction.md \
  docs/ssot/form/06-capability-scenario-api-support-map.md \
  docs/ssot/form/07-kernel-upgrade-opportunities.md \
  docs/ssot/runtime/09-verification-control-plane.md
```

Expected:
- 各页对三波 owner / witness / proof 读法一致

## Chunk 5: Final Verification

### Task 5: 做 P0 三波 close proof

**Files:**
- Modify: `docs/next/form-p0-semantic-closure-wave-plan.md`
- Modify: `docs/review-plan/runs/2026-04-21-form-p0-semantic-closure-wave-review.md`

- [x] **Step 1: 跑三波 focused verification**

Run:
```bash
pnpm -C packages/logix-form exec vitest run \
  test/Form/Form.RowIdentityProjectionWitness.test.ts \
  test/internal/Internal.RowId.test.ts \
  test/Form/Form.FieldBehavior.Guardrails.test.ts \
  test/Form/Form.ListScope.ReValidateGate.test.ts \
  test/Form/Form.ListScopeUniqueWarehouse.test.ts \
  test/Form/Form.Commands.DefaultActions.test.ts \
  test/Form/Form.ReasonContract.Witness.test.ts \
  test/Form/Form.ErrorSelectorPrimitive.test.ts
```

Expected:
PASS

- [x] **Step 2: 跑 docs proof scan**

Run:
```bash
rtk rg -n "row-local compare|decoded verdict|compare feed|reasonSlotId|submit summary" \
  docs/ssot/form/06-capability-scenario-api-support-map.md \
  docs/ssot/form/07-kernel-upgrade-opportunities.md \
  docs/ssot/form/13-exact-surface-contract.md
```

Expected:
- 三波 proof bundle 的关键词都能在 witness / proof 页找到对应

- [x] **Step 3: 跑最终 diff 检查**

Run:
```bash
rtk git diff --check -- \
  packages/logix-form/src/internal/form/arrays.ts \
  packages/logix-form/src/internal/form/rowid.ts \
  packages/logix-form/src/internal/form/reducer.ts \
  packages/logix-form/src/internal/form/commands.ts \
  packages/logix-form/src/internal/form/rules.ts \
  packages/logix-form/src/internal/form/errors.ts \
  packages/logix-form/src/internal/form/impl.ts \
  packages/logix-form/test/Form/Form.RowIdentityProjectionWitness.test.ts \
  packages/logix-form/test/internal/Internal.RowId.test.ts \
  packages/logix-form/test/Form/Form.FieldBehavior.Guardrails.test.ts \
  packages/logix-form/test/Form/Form.ListScope.ReValidateGate.test.ts \
  packages/logix-form/test/Form/Form.ListScopeUniqueWarehouse.test.ts \
  packages/logix-form/test/Form/Form.Commands.DefaultActions.test.ts \
  packages/logix-form/test/Form/Form.ReasonContract.Witness.test.ts \
  packages/logix-form/test/Form/Form.ErrorSelectorPrimitive.test.ts \
  docs/ssot/form/02-gap-map-and-target-direction.md \
  docs/ssot/form/03-kernel-form-host-split.md \
  docs/ssot/form/04-convergence-direction.md \
  docs/ssot/form/06-capability-scenario-api-support-map.md \
  docs/ssot/form/07-kernel-upgrade-opportunities.md \
  docs/ssot/runtime/09-verification-control-plane.md \
  docs/next/form-p0-semantic-closure-wave-plan.md \
  docs/review-plan/runs/2026-04-21-form-p0-semantic-closure-wave-review.md
```

Expected:
`无输出`

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-21-form-p0-semantic-closure-implementation.md`. Ready to execute?
