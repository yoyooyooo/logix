# C003-R1 Exact Diagnostics Object Shape

**Role**: `C003` 的后续子挑战 brief  
**Status**: Freeze Recorded  
**Feature**: [spec.md](./spec.md)  
**Parent Candidate**: [candidate-ac3.3.md](./candidate-ac3.3.md)

## Why Now

`C003` 已冻结到 `evidence-envelope derivation-link causal-chain law`。

当前 diagnostics 侧最靠近 exact authority 的残余点，是：

- exact diagnostics object shape 是否值得冻结

如果这一层继续后置，law 足够强；如果现在就冻结 object，又很容易长出第二 diagnostics system。

## Challenge Target

在固定 `C003.1` 的前提下，评估下面这个问题：

> diagnostics object shape 现在是否已经值得冻结；若值得，最小 object shape 应如何落在既有 evidence envelope 下；若不值得，当前 no-better verdict 应如何冻结

## Current Freeze

- adopted subcandidate：`C003-R1.1 exact diagnostics object deferred, no second-system shape`
- current verdict：当前没有 strictly better exact diagnostics object candidate
- frozen law：
  - 当前不冻结 exact diagnostics object shape
  - 当前不新增 explain object、report shell、helper family、ui path readback
  - 若未来真的需要 exact object，它也只能作为 evidence envelope 之下的从属 backlink view，不能升为第二 diagnostics truth
  - exact object 若未来重开，候选 shape 只能承载最小 backlink 集合，优先限于：
    - `ownerRef`
    - `sanctioned slot`
    - `canonicalRowIdChain?`
    - `derivationReceiptRef`
    - `bundlePatchRef`
    - `reasonSlotId?`
    - `sourceRef?`
  - `status`、`cleanup/stale`、`selectorRead`、`ui path`、slot 级 causal refs 不得进入 exact object 的 day-one shape
- current residual：
  - `bundlePatchRef` 对 `clear/retire` 的稳定覆盖仍需更强 proof
  - `sourceRef` 是否会分主线并逼出 slot 级 cadence，仍需更强 proof
- ledger：`../../docs/review-plan/runs/2026-04-22-form-api-shape-c003-r1-exact-diagnostics-object-shape.md`

## Fixed Baseline

下面这些内容在 `C003-R1` 内全部冻结：

- diagnostics truth 继续只认 `153` evidence envelope
- `C003.1` 已冻结的 derivation-link causal-chain law
- `S1-R3.1` 已冻结的 evidence-envelope host backlink law
- 不新增 explain object、report shell、helper family、ui path readback

## Success Bar

要想在 `C003-R1` 内形成 strictly better candidate，必须同时满足：

1. 不长第二 diagnostics truth
2. 不新增 helper family
3. 不暴露 `ui` 内部 path
4. 与 `153` 的 reason/evidence authority 机械对齐
5. 与 `C003.1` 的 causal-chain law 一致
6. 在 `concept-count / public-surface / proof-strength / future-headroom` 上形成严格改进，或在核心轴不恶化时显著提高 `proof-strength`

## Required Proof Set

### W1. Host Explainability

- 维护者能解释当前 read side 看到的 companion fact 来源

### W2. Cleanup / Stale

- exact object 若存在，不能把 stale / cleanup 重新变成 active truth

### W3. Bundle Patch Trace

- object 若存在，必须能稳定回链 `bundlePatchRef`

### W4. Reason Alignment

- object 若存在，必须回链 `reasonSlotId / sourceRef / derivationReceiptRef`

## Allowed Search Space

本轮允许搜索的方向：

- 继续维持 no-better verdict
- 给出极窄的 exact object shape
- 给出 exact object 仍应 deferred 的 freeze record

## Rejected-by-Default Directions

下面这些方向默认拒绝：

- 第二 explain object
- 第二 report shell
- companion 专属 diagnostics helper
- ui path readback object
- 脱离 evidence envelope 的 host-side object

## Key Questions

本轮 reviewer 必须回答：

1. 现在是否已经值得冻结 exact diagnostics object shape
2. 若值得，最小 object shape 是什么
3. 若不值得，当前 no-better verdict 应如何表述
4. object 如何避免变第二 diagnostics truth
5. `bundlePatchRef / derivationReceiptRef / reasonSlotId / sourceRef` 是否足以支撑 exact object

## Expected Outputs

本轮允许两种输出：

- 一个 strictly better 的 exact object candidate
- 一个 `no strictly better candidate` verdict，并把 residual 再收紧

## Writeback Targets

- challenge queue：`discussion.md`
- parent candidate：`candidate-ac3.3.md`
- child ledger：`../../docs/review-plan/runs/2026-04-22-form-api-shape-c003-r1-exact-diagnostics-object-shape.md`

## Backlinks

- stable principles / gates：`[spec.md](./spec.md)`
- reason authority：`../153-form-reason-projection/spec.md`
- parent challenge：`[challenge-c003-diagnostics-causal-chain.md](./challenge-c003-diagnostics-causal-chain.md)`
- current strongest candidate：`[candidate-ac3.3.md](./candidate-ac3.3.md)`
