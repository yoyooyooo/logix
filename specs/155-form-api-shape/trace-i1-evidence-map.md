# TRACE-I1 Evidence Map

**Role**: `TRACE-I1` 的 implementation evidence map  
**Status**: Working  
**Feature**: [spec.md](./spec.md)  
**Parent**: [challenge-runtime-scenario-proof-execution.md](./challenge-runtime-scenario-proof-execution.md)

## Purpose

把 `W1 .. W5` 和仓库里当前可复用的测试种子、control-plane 入口、evidence emit 点盘成一张静态地图。

`W1 .. W5` 的主来源统一是 [docs/ssot/form/06-capability-scenario-api-support-map.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/form/06-capability-scenario-api-support-map.md) 的 `SC-*` 主矩阵；本页只记录实现期证据现状。

这份地图只回答四件事：

1. 哪些语义种子已经存在
2. 哪些 control-plane 入口已经存在
3. 哪些 compare / feed 仍然缺
4. 哪一簇 proof 最适合作为第一波实施切口

## Fixed Baseline

- `AC3.3` 是当前唯一 implementation baseline
- `AC4.1` 只保留为 parked lexical challenger
- `H007` 只保留为 review overlay / admission overlay
- `TRACE-I1` 当前是 implementation 主线程
- benchmark empirical lane 后置到 executable proof 跑通之后

## Current Control-Plane Reality

- `Runtime.trial` 已存在，当前 route 固定经：
  - [Runtime.ts](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/src/Runtime.ts)
  - [trialRunModule.ts](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/src/internal/observability/trialRunModule.ts)
  - [proofKernel.ts](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/src/internal/verification/proofKernel.ts)
- 现有 `Runtime.trial` 报告当前固定回 `mode="startup"`，还没有 scenario-capable route
- core 包里还没有 public `Runtime.compare` 路由；当前 compare 只在 CLI 命令侧存在：
  - [compare.ts](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-cli/src/internal/commands/compare.ts)
- `EvidenceCollector` 与 `RunSession` 已存在，但当前导出的还是 generic `debug:event` 包与 runtime/converge summary：
  - [evidenceCollector.ts](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/src/internal/verification/evidenceCollector.ts)
  - [evidence.ts](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/src/internal/verification/evidence.ts)
- 现有 form 语义种子大多走：
  - `Runtime.make(...).runPromise(...)`
  - `materializeExtendedHandle(...)`
  - 还没有接到 `runtime.trial(mode="scenario") -> compare` 这条控制面

## Scenario Proof Roster Mapping

| proof | scenario ids | family | current semantic seeds | current control-plane entry | current compare hook | current feed refs | current verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `W1 source-refresh-multi-lower` | `SC-C`, `SC-D` | `WF1`, `WF5` | partial: [Form.Source.StaleSubmitSnapshot.test.ts](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/test/Form/Form.Source.StaleSubmitSnapshot.test.ts), [Form.Source.SubmitImpact.test.ts](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/test/Form/Form.Source.SubmitImpact.test.ts) | generic only: [Runtime.trial.runId.test.ts](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/test/Runtime/Runtime.trial.runId.test.ts) proves trial route exists, but no scenario proof case | none | none for `sourceReceiptRef / derivationReceiptRef / bundlePatchRef` | semantic seed 可复用，scenario / compare / feed 都要新补 |
| `W2 clear-while-active` | `SC-C`, `SC-E` | `WF3`, `WF5` | weak-partial: [Form.CleanupReceipt.contract.test.ts](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/test/Form/Form.CleanupReceipt.contract.test.ts) only covers structural cleanup receipt, not exact `lower -> undefined` active clear | generic only | none | partial state truth only via `ui.$cleanup`; no `clear` live-head evidence feed | 需要新补 dedicated scenario，feed 也要新补 |
| `W3 row-reorder-byRowId` | `SC-E` | `WF2`, `WF3` | strong: [Form.RowIdentityContinuity.contract.test.ts](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/test/Form/Form.RowIdentityContinuity.contract.test.ts) covers reorder, byRowId, store-mode fallback, nested namespace | generic only | none | none for `canonicalRowIdChainDigest / transition / retention / staleRef` | 第一波实施优先项，语义种子已可复用 |
| `W4 row-replace-active-exit` | `SC-E` | `WF3`, `WF5` | strong-partial: [Form.RowIdentityContinuity.contract.test.ts](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/test/Form/Form.RowIdentityContinuity.contract.test.ts), [Form.CleanupReceipt.contract.test.ts](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/test/Form/Form.CleanupReceipt.contract.test.ts) | generic only | none | none for `retire / noLiveHead / noContribution / cleanup subordinate backlink` | 第一波实施优先项，语义种子已可复用 |
| `W5 rule-submit-backlink` | `SC-D`, `SC-F` | `WF4`, `WF5` | strong-partial: [Form.ReasonEvidence.contract.test.ts](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/test/Form/Form.ReasonEvidence.contract.test.ts), [Form.Source.StaleSubmitSnapshot.test.ts](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/test/Form/Form.Source.StaleSubmitSnapshot.test.ts), [Form.ListCardinalityBasis.test.ts](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/test/Form/Form.ListCardinalityBasis.test.ts), [Form.EffectfulRule.Submit.test.ts](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/test/Form/Form.EffectfulRule.Submit.test.ts), [Form.EffectfulListRule.Submit.test.ts](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/test/Form/Form.EffectfulListRule.Submit.test.ts), [Form.EffectfulListItemRule.Submit.test.ts](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/test/Form/Form.EffectfulListItemRule.Submit.test.ts), [Form.EffectfulRootRule.Submit.test.ts](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/test/Form/Form.EffectfulRootRule.Submit.test.ts) | generic only | none | partial state truth has `reasonSlotId`; no `reasonSlotId -> bundlePatchRef` evidence feed | 第一波实施优先项，语义种子已可复用 |

## Reusable Seed Notes

### Strongest Reusable Cluster

当前最适合作为第一波实施切口的是：

- `W3 row-reorder-byRowId`
- `W4 row-replace-active-exit`
- `W5 rule-submit-backlink`

原因很直接：

- `WF2 / WF3 / WF5` 的 state-level 语义种子已经存在
- 它们正好命中当前最危险的 reopen 面
- 它们都还缺同一层控制面接线：
  - scenario entry
  - compare hook
  - evidence refs

### Weaker Seeds

- `W1` 有 source / submit truth 种子，但离 `multi-lower` 还差一层 explicit proof
- `W2` 目前只有 cleanup structural seed，离 `active owner lower -> undefined` 还差 dedicated scenario

## Control-Plane Reuse vs New Work

### Reusable Today

- `trialRunModule`
- `proofKernel`
- `RunSession`
- `EvidenceCollector`
- `VerificationControlPlaneReport`

### Must Be Added

- scenario-capable `Runtime.trial` 路由或等价入口
- proof-aware compare hook
- form-specific evidence emit points，至少覆盖：
  - `sourceReceiptRef`
  - `derivationReceiptRef`
  - `bundlePatchRef`
  - `canonicalRowIdChainDigest`
  - `reasonSlotId` backlink
  - `transition`
  - `retention`

## Recommended First Wave

当前建议的第一波实施顺序：

1. `W3 row-reorder-byRowId`
2. `W4 row-replace-active-exit`
3. `W5 rule-submit-backlink`

`W1 / W2` 暂放第二波，等第一波把 scenario entry、compare hook、feed spine 打通后再补。

## Backlinks

- [challenge-runtime-scenario-proof-execution.md](./challenge-runtime-scenario-proof-execution.md)
- [challenge-runtime-benchmark-evidence.md](./challenge-runtime-benchmark-evidence.md)
- [docs/ssot/form/06-capability-scenario-api-support-map.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/form/06-capability-scenario-api-support-map.md)
- [scenario-proof-family.md](./scenario-proof-family.md)
