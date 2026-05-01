# TRACE-I1 Gap Ledger

## Meta

- target: `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/155-form-api-shape/trace-i1-evidence-map.md`
- source_kind: `file-spec`
- challenge_scope: `implementation-baseline`
- baseline: `AC3.3`
- current_phase: `TRACE-I1 implementation witness execution`

## Baseline Decision

- `AC3.3` 作为唯一 implementation baseline 往下实施
- `AC4.1` 只保留为 parked lexical challenger
- `H007` 只保留为 review overlay / admission overlay
- 顶层 public 方向当前停止并行竞争
- reopen 只按 implementation hard failure 理解

## Confirmed Reusable Seeds

- R1:
  - summary: `trialRunModule + proofKernel + RunSession + EvidenceCollector` 已经存在，可作为 `TRACE-I1` 的共享执行底座
  - evidence:
    - [trialRunModule.ts](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/src/internal/observability/trialRunModule.ts)
    - [proofKernel.ts](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/src/internal/verification/proofKernel.ts)
    - [runSession.ts](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/src/internal/verification/runSession.ts)
    - [evidenceCollector.ts](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/src/internal/verification/evidenceCollector.ts)
- R2:
  - summary: `WF2 / WF3 / WF5` 的 state-level 语义种子已经具备，适合作为第一波 witness implementation seed
  - evidence:
    - [Form.RowIdentityProjectionWitness.test.ts](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/test/Form/Form.RowIdentityProjectionWitness.test.ts)
    - [Form.CleanupReceipt.Witness.test.ts](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/test/Form/Form.CleanupReceipt.Witness.test.ts)
    - [Form.ReasonContract.Witness.test.ts](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/test/Form/Form.ReasonContract.Witness.test.ts)
- R3:
  - summary: `VerificationControlPlaneReport` 壳层已存在，可以复用
  - evidence:
    - [ControlPlane.ts](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/src/ControlPlane.ts)

## Hard Gaps

- G1:
  - summary: `Runtime.trial` 当前还没有 scenario-capable 入口
  - evidence:
    - [Runtime.ts](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/src/Runtime.ts) 当前固定回 `mode="startup"`
  - impact:
    - `W1 .. W5` 都还进不了目标控制面
  - reuse:
    - `trialRunModule`
    - `proofKernel`
  - must_add:
    - scenario-capable trial entry
    - witness case admission

- G2:
  - summary: 当前还没有 witness-aware compare hook
  - evidence:
    - core 包没有 public `Runtime.compare`
    - [compare.ts](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-cli/src/internal/commands/compare.ts) 当前只包装 CLI `ir.diff`
  - impact:
    - `W1 .. W5` 还不能进入 `declarationDigest / witnessDigest / evidenceSummaryDigest`
  - must_add:
    - compare hook over trial evidence
    - `firstProjectableDiff` / `repairHints.focusRef` 映射

- G3:
  - summary: 当前 evidence feed 还是 generic debug/event 包，没有 form-specific refs
  - evidence:
    - 当前代码搜索没有 `sourceReceiptRef / derivationReceiptRef / bundlePatchRef / canonicalRowIdChainDigest`
  - impact:
    - `WF2 / WF3 / WF5` 还不能机械回链
  - must_add:
    - form witness emit points
    - ref normalization contract

- G4:
  - summary: `W2 clear-while-active` 缺 direct semantic seed
  - evidence:
    - [Form.CleanupReceipt.Witness.test.ts](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/test/Form/Form.CleanupReceipt.Witness.test.ts) 只覆盖 structural cleanup receipt
  - impact:
    - 第一波不适合先做 `W2`
  - must_add:
    - dedicated scenario
    - 可能还要补 focused semantic seed

## Wave Recommendation

### Wave 1

- `W3 row-reorder-byRowId`
- `W4 row-replace-active-exit`
- `W5 rule-submit-backlink`

原因：

- 当前 reusable semantic seeds 最强
- 直接命中 `WF2 / WF3 / WF5`
- 最容易暴露 row-heavy、cleanup、diagnostics causal chain 的真实闭环问题

### Wave 2

- `W1 source-refresh-multi-lower`
- `W2 clear-while-active`

原因：

- 当前缺的更多是 explicit witness seed 和 feed spine
- 等第一波把 scenario entry、compare hook、feed spine 打通后再补更稳

## Next Action

下一刀建议固定为：

1. 先以 `W3 / W4 / W5` 建 scenario case skeleton
2. 再给它们补最小 evidence emit points
3. 最后再接 compare hook

benchmark empirical lane 当前继续后置，不与这波并行。
