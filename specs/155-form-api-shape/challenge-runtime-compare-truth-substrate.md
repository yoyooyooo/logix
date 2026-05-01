# Runtime Compare Truth Substrate

**Role**: `TRACE` 的 residual 子挑战  
**Status**: Freeze Recorded  
**Feature**: [spec.md](./spec.md)  
**Parent**: [challenge-runtime-scenario-compare-substrate.md](./challenge-runtime-scenario-compare-substrate.md)

## Why Now

`TRACE-S4 scenario execution carrier law` 已冻结。  
这一层负责把 compare side 的 truth contract 一次收口：

- `ScenarioCarrierEvidenceFeed` 的 stable admission
- `runtime.compare` 输入输出 contract
- `declarationDigest / scenarioPlanDigest / evidenceSummaryDigest` 的 assembly
- `firstDiff / firstProjectableDiff / repairHints.focusRef`
- negative proof atoms
- `bundlePatchRef constructor / sourceReceiptRef digest admissibility / focusRef.sourceRef priority`

## Current Freeze

- adopted subcandidate：`TRACE-S5 compare truth substrate law`
- current verdict：`freeze-ready`
- frozen law：
  - compare pipeline 固定为：
    - `stableAdmissionGate`
    - `digestAssembly`
    - `rowKeyJoinAndDiff`
    - `firstProjectableSelection`
    - `reportProjection`
    - `drillDownLinking`
  - `ScenarioCarrierEvidenceFeed` 的 compare-side admission 固定为：
    - `admitted`
    - `excluded`
    - `drill-down-only`
  - compare 主轴继续只认：
    - `declarationDigest`
    - `scenarioPlanDigest`
    - `evidenceSummaryDigest`
  - row-heavy 场景下，`focusRef.sourceRef` 主锚点固定为 `rowChain:<canonicalRowIdChainDigest>`
  - `stableSourceToken` 只允许作为不破坏 row truth 的次级 stable locus
  - `bundlePatchRef` 默认不进入：
    - `rowStableKey`
    - ordering
    - `evidenceSummaryDigest`
    - `focusRef.sourceRef`
    - 直到后续有更强 implementation proof 证明 deterministic stable constructor
  - `sourceReceiptRef` 默认不进入：
    - `rowStableKey`
    - ordering
    - `evidenceSummaryDigest`
    - `focusRef.sourceRef`
    - 直到后续有更强 implementation proof 证明 stable digest admissibility
  - `derivationReceiptRef` 继续只留在 debug / backlink 层
  - compare 继续只回到单一 `VerificationControlPlaneReport`
  - compare-specific machine-readable outputs 只允许通过 `artifacts[] + outputKey` 暴露
  - `repairHints[].relatedArtifactOutputKeys` 只允许引用 `artifacts[]` 中的 `outputKey`
  - 一旦 `firstProjectableDiffRef` 存在，至少一个 `repairHints.focusRef` 必须绑定到它
  - `INCONCLUSIVE` gate 已闭合，且当前唯一 `nextRecommendedStage = "trial"`
  - compare 不重开：
    - public API
    - scenario carrier
    - source owner split
    - 第二 diagnostics truth
    - 第二 report shell
    - 第二 pending / blocker / verdict system
- current residual：
  - actual compare route code 与 proof pack implementation 仍待实现期验证
  - exact internal type shape 继续 deferred
  - `bundlePatchRef / sourceReceiptRef` 若未来要进入 compare truth，必须拿出更强 implementation proof
- ledger：`../../docs/review-plan/runs/2026-04-22-form-api-shape-runtime-compare-truth-substrate.md`

## Fixed Baseline

下面这些内容在本轮冻结：

- `AC3.3` public contract
- `S1 / S2 / C003` 已冻结 law
- `TRACE-S1 causal-links summary law`
- `TRACE-S2 row-level summary diff substrate law`
- `TRACE-S3 deterministic opaque id admission law`
- `TRACE-S4 scenario execution carrier law`
- `runtime.compare` 顶层继续只认单一 `VerificationControlPlaneReport`
- top-level `verdict` 继续只认 `PASS / FAIL / INCONCLUSIVE`
- compare 主轴继续只认 `declarationDigest / scenarioPlanDigest / evidenceSummaryDigest`
- `focusRef` 壳层继续只允许 `declSliceId / reasonSlotId / scenarioStepId / sourceRef`
- `source / companion / rule / submit / host` owner split 不重开
- compare 只在 evidence side 选择 stable locus，不重写 Query-owned remote fact owner
- `pending / stale / blocking` 继续落在同一 submit truth
- negative proof atoms 只能在既有 report / focusRef / artifacts 内表达
- 不冻结 exact proof object
- 不新增 helper family

## Writeback Targets

- challenge queue：`discussion.md`
- parent challenge：`challenge-runtime-scenario-compare-substrate.md`
- child ledger：`../../docs/review-plan/runs/2026-04-22-form-api-shape-runtime-compare-truth-substrate.md`
