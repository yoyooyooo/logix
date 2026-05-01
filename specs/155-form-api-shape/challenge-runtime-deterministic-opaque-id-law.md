# Runtime Deterministic Opaque Id Law

**Role**: `TRACE` 的后续子挑战  
**Status**: Freeze Recorded  
**Feature**: [spec.md](./spec.md)  
**Parent**: [challenge-runtime-row-level-summary-diff-substrate.md](./challenge-runtime-row-level-summary-diff-substrate.md)

## Why Now

`TRACE-S1` 已冻结 `causal-links` summary law。  
`TRACE-S2` 已冻结 row-level summary diff substrate。

当前 compare / focusRef / digest 还缺的最小 blocker是：

- `sourceReceiptRef`
- `derivationReceiptRef`
- `bundlePatchRef`

到底哪些必须是 deterministic opaque stable ids，哪些只能留在 row payload 做下钻。

## Challenge Target

在固定 `TRACE-S1 / TRACE-S2` law 的前提下，冻结最小的 deterministic opaque id law：

> 哪些 ref 必须稳定可比、哪些 ref 只能下钻、以及它们如何进入 `sourceRef`、digest 与 rowStableKey

## Current Freeze

- adopted subcandidate：`TRACE-S3 deterministic opaque id admission law`
- current verdict：可以冻结 admission law，但仍保留实现 blocker
- frozen law：
  - stable core id 集合：
    - `declSliceId`
    - `ownerRef`
    - `reasonSlotId`
    - `scenarioStepId`
    - `canonicalRowIdChainDigest`
  - `rowStableKey` 必须以 row identity truth 为主锚点：
    - `declSliceId?`
    - `ownerRef`
    - `canonicalRowIdChainDigest?`
    - `transition`
    - `retention`
    - `reasonSlotId?`
    - `stableSourceToken?`
  - row-heavy 行上，`canonicalRowIdChainDigest` 为事实主锚点；缺它直接视为 proof failure
  - `sourceReceiptRef / bundlePatchRef` 只有在证明为 deterministic opaque stable id 后，才允许进入：
    - `sourceRef`
    - `rowStableKey`
    - `evidenceSummaryDigest`
  - `derivationReceiptRef` 当前只允许做 debug/backlink，不进：
    - `sourceRef`
    - `rowStableKey`
    - `evidenceSummaryDigest`
  - 任何 run-local ref 一旦非稳定，就必须同时退出：
    - key
    - ordering
    - digest
    - `focusRef.sourceRef`
  - `sourceRef` 只允许从 stable source locus 派生，不允许直接吃 run-local receipt/patch refs
  - row-heavy 场景下，`sourceRef` 的优先锚点是 `rowChain:<canonicalRowIdChainDigest>`；其余稳定 source locus 只能在不破坏 row truth 时作为次级选择
- current residual：
  - `bundlePatchRef` constructor 不再单独开页，后续并入 `compare truth substrate`
  - `sourceReceiptRef` 是否稳定到可入 key/digest，后续并入 `compare truth substrate`
  - `focusRef.sourceRef` 的最终优先级，后续并入 `compare truth substrate`
- ledger：`../../docs/review-plan/runs/2026-04-22-form-api-shape-runtime-deterministic-opaque-id-law.md`

## Fixed Baseline

下面这些内容在本轮全部冻结：

- `TRACE-S1 causal-links summary law`
- `TRACE-S2 row-level summary diff substrate law`
- `focusRef` 仍只允许 `declSliceId / reasonSlotId / scenarioStepId / sourceRef`
- 不新增 diagnostics object / helper family / ui path readback

## Success Bar

要想本轮通过，必须同时满足：

1. 明确列出 deterministic opaque stable id 的最小集合
2. 明确列出只能下钻、不得进 digest 的 refs
3. `sourceRef` 映射不再依赖 run-local id
4. `rowStableKey` 不再依赖 run-local id
5. 不引入第二 id grammar 或第二 truth

## Required Questions

### Q1. Stable Id Set

- 哪些 ref 必须 deterministic opaque stable

### Q2. Debug-Only Refs

- 哪些 ref 只能做 debug/backlink，不进 digest/key

### Q3. FocusRef Mapping

- `sourceRef` 如何从 stable opaque ids 派生

### Q4. Compare Key Safety

- `rowStableKey` 与 `evidenceSummaryDigest` 如何排除 run-local 漂移

## Expected Outputs

- 一个最小 deterministic opaque id law
- 一个 `sourceRef` mapping law
- 一个 `rowStableKey / digest` exclusion law
- 若仍不够，明确 blocker

## Writeback Targets

- challenge queue：`discussion.md`
- parent：`challenge-runtime-row-level-summary-diff-substrate.md`
- child ledger：`../../docs/review-plan/runs/2026-04-22-form-api-shape-runtime-deterministic-opaque-id-law.md`
