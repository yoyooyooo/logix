# Runtime Control Plane Report Shell Cutover Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 `runtime/09` 已冻结的 report shell contract 真正落到 core contract、CLI emit path 和 contract tests，并以零兼容、单轨实施完成 `141` 的第一波 cutover。

**Architecture:** 这次改造只切 control plane 的 exact shell，不碰 Form truth 本体。核心策略是先把 `packages/logix-core/src/ControlPlane.ts` 收成唯一 canonical shell，再让 CLI emit path 全部回到这条 contract，最后用 core contract test 和 CLI integration output contract tests 锁住漂移。旧 report naming、旧 repair hint shape 和 `artifact.role` 直接删除，不保留兼容层或 dual-write。

**Tech Stack:** TypeScript, Effect v4 beta, Vitest, pnpm workspace, @logixjs/core, @logixjs/cli

---

## References

- [spec.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/141-runtime-control-plane-report-shell-cutover/spec.md)
- [plan.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/141-runtime-control-plane-report-shell-cutover/plan.md)
- [research.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/141-runtime-control-plane-report-shell-cutover/research.md)
- [data-model.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/141-runtime-control-plane-report-shell-cutover/data-model.md)
- [contracts/README.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/141-runtime-control-plane-report-shell-cutover/contracts/README.md)
- [quickstart.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/141-runtime-control-plane-report-shell-cutover/quickstart.md)
- [09-verification-control-plane.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/runtime/09-verification-control-plane.md)
- [runtime-control-plane-materializer-report-contract.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/proposals/runtime-control-plane-materializer-report-contract.md)
- [AGENTS.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/AGENTS.md)

## File Structure

- `packages/logix-core/src/ControlPlane.ts`
  - 唯一 canonical report shell contract owner。收口 `kind`、`focusRef`、`relatedArtifactOutputKeys`、alias law 和 guard。
- `packages/logix-core/test/Contracts/VerificationControlPlaneContract.test.ts`
  - core contract 级证明：builder、guard、alias law 都按新 shell 工作。
- `packages/logix-cli/src/internal/result.ts`
  - CLI artifact output 到 control plane artifact ref 的 mapping。保持 generic artifact shell，不回流第二 taxonomy。
- `packages/logix-cli/src/internal/commands/check.ts`
  - `runtime.check` 的 emit path。
- `packages/logix-cli/src/internal/commands/trial.ts`
  - `runtime.trial` 的 emit path。
- `packages/logix-cli/src/internal/commands/compare.ts`
  - `runtime.compare` 的 emit path。
- `packages/logix-cli/test/Integration/output-contract.test.ts`
  - shared shell 集成校验。
- `packages/logix-cli/test/Integration/check.command.test.ts`
  - check report 专项校验。
- `packages/logix-cli/test/Integration/trial.command.test.ts`
  - trial report 专项校验。
- `packages/logix-cli/test/Integration/compare.command.test.ts`
  - compare report 专项校验。
- `docs/ssot/runtime/09-verification-control-plane.md`
  - living authority。若执行中发现文案和落地 contract 有小偏差，只能回写这里，不得在代码注释中另起口径。
- `specs/141-runtime-control-plane-report-shell-cutover/tasks.md`
  - 薄索引与状态面，链接回本计划。

## Execution Rules

- 零兼容、单轨实施。
- 禁止 dual-write、shadow path、兼容模式。
- 任何旧 shape、旧 naming、旧 hint contract，一旦新 contract 落地，同 chunk 结束前必须删掉。
- 先改 contract 和 tests，再改 CLI emit path。
- 每个 chunk 完成后跑 focused tests；最后跑 `pnpm typecheck`。
- 不用 watch 命令。

## Chunk 1: Core Contract Shell

### Task 1: 收口 canonical report shell

**Files:**
- Modify: `packages/logix-core/src/ControlPlane.ts`
- Test: `packages/logix-core/test/Contracts/VerificationControlPlaneContract.test.ts`

- [ ] **Step 1: 先写失败断言，固定新的 report shell**

```ts
const report = makeVerificationControlPlaneReport({
  kind: 'VerificationControlPlaneReport',
  stage: 'check',
  mode: 'static',
  verdict: 'PASS',
  errorCode: null,
  summary: 'ok',
  environment: { host: 'node' },
  artifacts: [],
  repairHints: [],
  nextRecommendedStage: 'trial',
})

expect(report.kind).toBe('VerificationControlPlaneReport')
expect(isVerificationControlPlaneReport(report)).toBe(true)
```

- [ ] **Step 2: 跑 focused test，确认当前实现失败或断言不全**

Run: `pnpm exec vitest run packages/logix-core/test/Contracts/VerificationControlPlaneContract.test.ts --reporter=dot`

Expected: FAIL，或当前断言尚未覆盖 `kind` 常量、alias law、new hint shape。

- [ ] **Step 3: 写最小实现，收口 `VerificationControlPlaneReport`**

```ts
export interface VerificationControlPlaneFocusRef {
  readonly declSliceId?: string
  readonly reasonSlotId?: string
  readonly witnessStepId?: string
  readonly sourceRef?: string
}

export interface VerificationControlPlaneRepairHint {
  readonly code: string
  readonly canAutoRetry: boolean
  readonly upgradeToStage: VerificationControlPlaneStage | 'done' | null
  readonly focusRef?: VerificationControlPlaneFocusRef | null
  readonly relatedArtifactOutputKeys?: ReadonlyArray<string>
  readonly reason?: string
  readonly suggestedAction?: string
}

export interface VerificationControlPlaneReport {
  readonly schemaVersion: 1
  readonly kind: 'VerificationControlPlaneReport'
  ...
}

export type TrialReport = VerificationControlPlaneReport
```

- [ ] **Step 4: 更新 guard 和 builder**

```ts
if (value.kind !== 'VerificationControlPlaneReport') return false
```

同时去掉旧的宽松 `kind: string`。

- [ ] **Step 5: 跑 core contract test**

Run: `pnpm exec vitest run packages/logix-core/test/Contracts/VerificationControlPlaneContract.test.ts --reporter=dot`

Expected: PASS

### Task 2: 固定 `focusRef` 和 linking law

**Files:**
- Modify: `packages/logix-core/src/ControlPlane.ts`
- Test: `packages/logix-core/test/Contracts/VerificationControlPlaneContract.test.ts`

- [ ] **Step 1: 写失败断言，固定 coordinate-first `focusRef`**

```ts
const hint = {
  code: 'E1',
  canAutoRetry: false,
  upgradeToStage: 'check',
  focusRef: {
    declSliceId: 'settlementSlice',
    reasonSlotId: 'submit:decode',
  },
} satisfies VerificationControlPlaneRepairHint
```

- [ ] **Step 2: 再加一条失败断言，确保 `artifact.role` 不存在**

```ts
expect('role' in (report.artifacts[0] ?? {})).toBe(false)
```

- [ ] **Step 3: 修改 type 与 guard**

要求：

- `focusRef` 只包含四类稳定坐标
- `relatedArtifactOutputKeys` 独立存在
- `artifact.role` 不在 contract 中出现

- [ ] **Step 4: 跑 core contract test**

Run: `pnpm exec vitest run packages/logix-core/test/Contracts/VerificationControlPlaneContract.test.ts --reporter=dot`

Expected: PASS

## Chunk 2: CLI Shared Adapter

### Task 3: 收口 artifact ref mapping

**Files:**
- Modify: `packages/logix-cli/src/internal/result.ts`
- Test: `packages/logix-cli/test/Integration/output-contract.test.ts`

- [ ] **Step 1: 写失败断言，固定 artifact ref 仍是 generic shell**

```ts
expect(report.artifacts.every((artifact: any) => 'role' in artifact === false)).toBe(true)
```

- [ ] **Step 2: 跑 shared output contract test**

Run: `pnpm exec vitest run packages/logix-cli/test/Integration/output-contract.test.ts --reporter=dot`

Expected: FAIL，当前 contract 还没对齐新的 report shell。

- [ ] **Step 3: 修改 `toArtifactRefs` 与 shared report builder adapter**

要求：

- 不引入 `artifact.role`
- 保留 `outputKey / kind / file / digest / reasonCodes`
- 只把 generic artifact shell 映射进 control plane

- [ ] **Step 4: 跑 shared output contract test**

Run: `pnpm exec vitest run packages/logix-cli/test/Integration/output-contract.test.ts --reporter=dot`

Expected: PASS

## Chunk 3: Stage Emit Paths

### Task 4: 收口 `runtime.check` emit path

**Files:**
- Modify: `packages/logix-cli/src/internal/commands/check.ts`
- Test: `packages/logix-cli/test/Integration/check.command.test.ts`

- [ ] **Step 1: 写失败断言**

要求固定：

- `kind === "VerificationControlPlaneReport"`
- `repairHints` 至少满足新 machine core
- 旧 stage-specific report shape 不再存在

- [ ] **Step 2: 跑 test**

Run: `pnpm exec vitest run packages/logix-cli/test/Integration/check.command.test.ts --reporter=dot`

Expected: FAIL

- [ ] **Step 3: 修改 `runCheck`**

要求：

- emit 新 shell
- 让 existing infer hints 至少补齐：
  - `code`
  - `canAutoRetry`
  - `upgradeToStage`
  - `focusRef: null`
- `reason / suggestedAction` 保留为消费层字段

- [ ] **Step 4: 再跑 test**

Run: `pnpm exec vitest run packages/logix-cli/test/Integration/check.command.test.ts --reporter=dot`

Expected: PASS

### Task 5: 收口 `runtime.trial` emit path

**Files:**
- Modify: `packages/logix-cli/src/internal/commands/trial.ts`
- Test: `packages/logix-cli/test/Integration/trial.command.test.ts`

- [ ] **Step 1: 写失败断言**

要求固定：

- `kind === "VerificationControlPlaneReport"`
- `RuntimeTrialReport` 不再出现在 report payload `kind`

- [ ] **Step 2: 跑 test**

Run: `pnpm exec vitest run packages/logix-cli/test/Integration/trial.command.test.ts --reporter=dot`

Expected: FAIL

- [ ] **Step 3: 修改 `runTrial`**

要求：

- payload `kind` 收成常量
- file / output artifact 名可继续叫 `trial.report.json` 和 `trialReport`

- [ ] **Step 4: 再跑 test**

Run: `pnpm exec vitest run packages/logix-cli/test/Integration/trial.command.test.ts --reporter=dot`

Expected: PASS

### Task 6: 收口 `runtime.compare` emit path

**Files:**
- Modify: `packages/logix-cli/src/internal/commands/compare.ts`
- Test: `packages/logix-cli/test/Integration/compare.command.test.ts`

- [ ] **Step 1: 写失败断言**

要求固定：

- `kind === "VerificationControlPlaneReport"`
- compare 仍只认现有 digest 主轴

- [ ] **Step 2: 跑 test**

Run: `pnpm exec vitest run packages/logix-cli/test/Integration/compare.command.test.ts --reporter=dot`

Expected: FAIL

- [ ] **Step 3: 修改 `runCompare`**

要求：

- payload `kind` 收成常量
- `repairHints` 满足 machine core
- 不引入 materializer rows

- [ ] **Step 4: 再跑 test**

Run: `pnpm exec vitest run packages/logix-cli/test/Integration/compare.command.test.ts --reporter=dot`

Expected: PASS

## Chunk 4: Cross-Contract Lock

### Task 7: 重新锁 shared output contract

**Files:**
- Modify: `packages/logix-cli/test/Integration/output-contract.test.ts`

- [ ] **Step 1: 扩展 shared assertions**

要求断言：

- `kind === "VerificationControlPlaneReport"`
- `repairHints` machine core 字段存在
- `artifact.role` 不存在

- [ ] **Step 2: 跑 shared output contract test**

Run: `pnpm exec vitest run packages/logix-cli/test/Integration/output-contract.test.ts --reporter=dot`

Expected: PASS

### Task 8: 跑完整 focused suite

**Files:**
- Test only

- [ ] **Step 1: 跑 core contract + CLI integration suite**

Run:

```bash
pnpm exec vitest run \
  packages/logix-core/test/Contracts/VerificationControlPlaneContract.test.ts \
  packages/logix-cli/test/Integration/output-contract.test.ts \
  packages/logix-cli/test/Integration/check.command.test.ts \
  packages/logix-cli/test/Integration/trial.command.test.ts \
  packages/logix-cli/test/Integration/compare.command.test.ts \
  --reporter=dot
```

Expected: PASS

- [ ] **Step 2: 跑 typecheck**

Run: `pnpm typecheck`

Expected: PASS

## Chunk 5: Thin Index

### Task 9: 建立 `141/tasks.md` 薄索引

**Files:**
- Create: `specs/141-runtime-control-plane-report-shell-cutover/tasks.md`
- Reference: `docs/superpowers/plans/2026-04-16-runtime-control-plane-report-shell-cutover.md`

- [ ] **Step 1: 创建薄索引**

要求：

- 不复制 detailed steps
- 只保留：
  - chunk 列表
  - 当前状态
  - 依赖顺序
  - quickstart / acceptance 入口
  - implementation plan 链接

- [ ] **Step 2: 自检**

Expected:

- `tasks.md` 不再承载第二套详细任务真相源
- `141` 的 detailed plan 只有这一份 implementation plan

## Execution Strategy

1. 先改 core contract
2. 再改 CLI shared adapter
3. 再改 stage emit path
4. 最后统一锁 tests 和 thin tasks index

这条顺序必须保持单轨：

- 不允许旧 shell 与新 shell 并存
- 不允许旧 tests 与新 tests 双口径共存
- 每个 chunk 结束前必须删掉旧残留

## Verification Summary

- focused suite:

```bash
pnpm exec vitest run \
  packages/logix-core/test/Contracts/VerificationControlPlaneContract.test.ts \
  packages/logix-cli/test/Integration/output-contract.test.ts \
  packages/logix-cli/test/Integration/check.command.test.ts \
  packages/logix-cli/test/Integration/trial.command.test.ts \
  packages/logix-cli/test/Integration/compare.command.test.ts \
  --reporter=dot
```

- final gate:

```bash
pnpm typecheck
```
