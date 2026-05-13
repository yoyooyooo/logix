# Runtime Causal-Links Summary Law

**Role**: `TRACE` 的后续子挑战 brief  
**Status**: Freeze Recorded  
**Feature**: [spec.md](./spec.md)  
**Parent Challenge**: [challenge-implementation-trace-evidence-pack.md](./challenge-implementation-trace-evidence-pack.md)

## Why Now

`TRACE` 当前 `not-ready` 的最小 blocker 已经很清楚：

- 缺 `causal-links` evidence summary canonical law

这比继续泛泛讨论 `runtime.trial(mode="scenario")` 或 `runtime.compare` 更小，也更接近真正能解锁 proof 的单点。

## Challenge Target

在固定 `AC3.3`、`S1 / S2 / C003` law 的前提下，冻结 `causal-links` 的最小 summary law：

> 这个 summary 至少要收哪些字段、怎样排序、怎样做 digest normalization、怎样映射到 `focusRef`

## Current Freeze

- adopted subcandidate：`TRACE-S1 causal-links summary law`
- current verdict：当前可以冻结 summary law
- frozen law：
  - summary row 粒度固定为 “一个 bundle lineage 节点”
  - 每条 row 必带 `retention` 轴：
    - `live`
    - `terminal`
    - `subordinate`
  - row 最小字段：
    - `transition`
    - `retention`
    - `ownerRef`
    - `sourceReceiptRef?`
    - `derivationReceiptRef?`
    - `bundlePatchRef?`
    - `supersedesBundlePatchRef?`
    - `reasonSlotId?`
    - `linkedBundlePatchRef?`
    - `terminalBacklinkRef?`
    - `canonicalRowIdChainDigest?`
    - `declSliceId?`
    - `scenarioStepId?`
  - `transition` 只收：
    - `write`
    - `clear`
    - `retire`
    - `cleanup`
    - `reason-link`
  - row-scoped bundle 时，`canonicalRowIdChainDigest` 为必填
  - 排序规则：
    - `declSliceId`
    - `ownerRef`
    - `canonicalRowIdChainDigest`
    - `transitionRank`
    - `bundlePatchRef`
    - `supersedesBundlePatchRef`
    - `sourceReceiptRef`
    - `derivationReceiptRef`
    - `reasonSlotId`
    - `linkedBundlePatchRef`
    - `terminalBacklinkRef`
    - `scenarioStepId`
  - digest normalization：
    - canonical JSON
    - object key 排序
    - 缺省字段省略
    - raw trace / rendered string / artifact digest / environment fingerprint 不进 summary digest
    - 若 `sourceReceiptRef / derivationReceiptRef / bundlePatchRef` 仍是 run-local 非确定 id，它们退出 `evidenceSummaryDigest`，只保留在 summary row 供下钻
  - `focusRef` mapping：
    - `declSliceId` 直接复制
    - `scenarioStepId` 直接复制
    - `reasonSlotId` 只在 `reason-link` row 复制
    - `sourceRef` 使用 typed opaque id，优先级：
      - `bundlePatch:<linkedBundlePatchRef|bundlePatchRef>`
      - `terminal:<terminalBacklinkRef>`
      - `derivationReceipt:<derivationReceiptRef>`
      - `sourceReceipt:<sourceReceiptRef>`
      - `rowChain:<canonicalRowIdChainDigest>`
  - negative proof：
    - `write / clear / retire` row 保留进 summary
    - `cleanup` 只在作为 terminal backlink 或 stale proof 目标时保留
    - `clear / retire` 后的 reason 只能 `reason-link -> terminalBacklinkRef`
  - retention class：
    - `live` 只允许当前生效 bundle head
    - `subordinate` 只允许 `cleanup | stale`
    - `terminal` 只允许 `clear | retire`，以及被它们终止的旧 live row
- current residual：
  - 若要求每条 row-heavy summary row 都必须无损投影到非空 `focusRef`，当前仍会卡住
  - compare 仍需 row-level evidence summary diff substrate 才能真正 ready
  - `sourceReceiptRef / derivationReceiptRef / bundlePatchRef` 是否为 deterministic opaque stable id，仍需单独裁决
- ledger：`../../docs/review-plan/runs/2026-04-22-form-api-shape-runtime-causal-links-summary-law.md`

## Fixed Baseline

下面这些内容在本轮全部冻结：

- `runtime.compare` 主轴只认 `declarationDigest / scenarioPlanDigest / evidenceSummaryDigest`
- `reasonSlotId / sourceRef / evidence envelope` 的 owner 不重开
- `C003-R2.1 single-live-bundle-head supersession law` 不重开
- `C003-R3.1 exact evidence shape deferred, opaque-ref law` 不重开

## Success Bar

要想本轮通过，必须同时满足：

1. 能稳定承住 `sourceReceiptRef / derivationReceiptRef / bundlePatchRef / reasonSlotId`
2. 能承住 `write / clear / retire`
3. 能承住 `canonicalRowIdChain` 的 row-heavy 情况
4. 能定义 stable ordering 与 digest normalization
5. 能定义 `focusRef` projection
6. 不引入第二 diagnostics object

## Required Questions

### Q1. Row Schema

- `causal-links` 的 row 最小字段集是什么

### Q2. Stable Ordering

- summary row 如何排序

### Q3. Digest Normalization

- 哪些字段进 `evidenceSummaryDigest`

### Q4. FocusRef Projection

- summary row 如何投影到 `focusRef`

### Q5. Negative Proof

- clear / retire / cleanup 后，哪些 summary row 仍保留，哪些只作为终止 backlink

## Expected Outputs

- 一个最小 summary law
- 一个 `focusRef` mapping law
- 一个是否 still not-ready 的 verdict

## Writeback Targets

- challenge queue：`discussion.md`
- parent challenge：`challenge-implementation-trace-evidence-pack.md`
- child ledger：`../../docs/review-plan/runs/2026-04-22-form-api-shape-runtime-causal-links-summary-law.md`
