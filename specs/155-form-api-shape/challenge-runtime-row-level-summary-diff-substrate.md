# Runtime Row-Level Summary Diff Substrate

**Role**: `TRACE-S1` 后续子挑战  
**Status**: Freeze Recorded  
**Feature**: [spec.md](./spec.md)  
**Parent**: [challenge-runtime-causal-links-summary-law.md](./challenge-runtime-causal-links-summary-law.md)

## Why Now

`TRACE-S1` 已冻结 `causal-links` summary law。  
这一层已经完成其职责：把 compare truth 从 digest-only 拉到 row-level diff substrate。

## Current Freeze

- adopted subcandidate：`TRACE-S2 row-level summary diff substrate law`
- current verdict：当前可以冻结 diff substrate，但 execution route 仍未 ready
- frozen law：
  - diff unit 固定为 `SummaryDiffEntry`
  - compare 先按 `rowStableKey` key-join，再产出 `added | removed | changed`
  - `rowStableKey` 只允许使用稳定字段；run-local refs 退出 key 与 ordering
  - `rowComparablePayload` 只保留 canonical JSON 的结构字段
  - `evidenceSummaryDigest` 由排序后的 `rowComparablePayload` 计算
  - compare 必须同时产出 `firstDiff` 与 `firstProjectableDiff`
  - `repairHints.focusRef` 绑定 `firstProjectableDiff`
  - negative proof atoms 最小集合：
    - `noLiveHead`
    - `noContribution`
    - `staleRef`
    - `reasonSlotMustNotLink`
  - `reorder` 不得制造 diff；`replace` 只表达 old bucket 消失与 new bucket 出现
- current residual：
  - compare 仍缺 row-level diff execution substrate
  - `focusRef` 仍不能无损承载所有 row-heavy summary row
  - unstable refs admission 继续由 `TRACE-S3` 与后续 `compare truth substrate` 收口
- ledger：`../../docs/review-plan/runs/2026-04-22-form-api-shape-runtime-row-level-summary-diff-substrate.md`

## Fixed Baseline

下面这些内容在本轮全部冻结：

- `TRACE-S1 causal-links summary law`
- `runtime.compare` 主轴仍只认 `declarationDigest / scenarioPlanDigest / evidenceSummaryDigest`
- `focusRef` 字段仍只允许 `declSliceId / reasonSlotId / scenarioStepId / sourceRef`
- 不新增第二 diagnostics object / report shell / helper family

## Success Bar

要想本轮通过，必须同时满足：

1. 能按 row 级比较 normalized summary
2. 能输出首个 diff row 或最小 diff set
3. 能把 diff row 投影成合法 `focusRef`
4. 能表达 clear / retire / cleanup / stale 的 negative proof
5. 不把 raw trace 直接推成 compare truth

## Writeback Targets

- challenge queue：`discussion.md`
- parent：`challenge-runtime-causal-links-summary-law.md`
- child ledger：`../../docs/review-plan/runs/2026-04-22-form-api-shape-runtime-row-level-summary-diff-substrate.md`
