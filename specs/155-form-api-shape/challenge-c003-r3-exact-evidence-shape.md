# C003-R3 Exact Evidence Shape

**Role**: `C003-R2` 的后续子挑战 brief  
**Status**: Freeze Recorded  
**Feature**: [spec.md](./spec.md)  
**Parent Candidate**: [candidate-ac3.3.md](./candidate-ac3.3.md)

## Why Now

`C003-R2.1` 已经把 bundle-level proof 的 law 冻到：

- single live head
- supersession
- clear / retire
- row-scoped chain

当前 diagnostics 侧剩下的最小缺口，是：

- `derivationReceiptRef`
- `bundlePatchRef`

这两个 proof 到底是否已经值得获得 exact shape。

## Challenge Target

在固定 `C003.1`、`C003-R1.1`、`C003-R2.1` 的前提下，评估下面这个问题：

> bundle-level proof 是否已经值得冻结 exact shape；若值得，最小 evidence shape 是什么；若不值得，当前 no-better verdict 应如何冻结

## Current Freeze

- adopted subcandidate：`C003-R3.1 exact evidence shape deferred, opaque-ref law`
- current verdict：当前没有 strictly better exact evidence shape candidate
- frozen law：
  - 当前不冻结 exact evidence shape
  - `derivationReceiptRef` 与 `bundlePatchRef` 继续只作为 evidence envelope 内部 opaque refs
  - 当前不冻结 `Opaque<...>`、`BundleKey`、`DerivationWitness`、`BundlePatchWitness` 这类 exact object / typing shape
  - `C003-R2.1` 的 single-live-bundle-head supersession law 已足够约束：
    - single live head
    - supersession
    - `write / clear / retire`
    - row-scoped bundle 必填 `canonicalRowIdChain`
  - `internal scoped-seq evidence shape` 只作为 future implementation candidate / reopen bias，不构成半冻结
  - exact shape 进入 freeze 的条件：现有 opaque refs 无法对 W1-W4 与 `C003-R2.1` 所需 proof 提供机械可区分性，且补 law 仍无法解决
- current residual：
  - exact evidence shape 仍未冻结
  - internal scoped-seq evidence shape 是否更适合实现，仍待实现期或更强 proof
- ledger：`../../docs/review-plan/runs/2026-04-22-form-api-shape-c003-r3-exact-proof-shape.md`

## Fixed Baseline

下面这些内容在 `C003-R3` 内全部冻结：

- diagnostics truth 继续只认 `153` evidence envelope
- `C003.1` 已冻结的 derivation-link causal-chain law
- `C003-R1.1` 已冻结的 no-second-system diagnostics object verdict
- `C003-R2.1` 已冻结的 single-live-bundle-head supersession law
- 不新增 explain object、report shell、helper family、ui path readback

## Success Bar

要想在 `C003-R3` 内形成 strictly better candidate，必须同时满足：

1. 不长第二 diagnostics truth
2. 不引入第二 diagnostics family
3. exact shape 必须直接服务现有 law，不新增第二套解释面
4. clear / retire / stale / cleanup 的 subordinate 位置不被破坏
5. row-heavy `reorder / replace` 仍可机械解释
6. 在 `concept-count / public-surface / proof-strength / future-headroom` 上形成严格改进，或在核心轴不恶化时显著提高 `proof-strength`

## Required Proof Set

### W1. Derivation Receipt

- 同一 `sourceReceiptRef` 多次 `lower` 的区分必须可解释

### W2. Bundle Patch

- `write / clear / retire` 的 patch 必须稳定可区分

### W3. Supersession

- 新旧 head 的 supersede 关系必须可机械回链

### W4. Row-Heavy

- row-scoped bundle 下 `canonicalRowIdChain` 与 evidence shape 的关系必须可机械解释

## Allowed Search Space

本轮允许搜索的方向：

- 继续维持 no-better verdict
- 冻结极窄的 exact evidence shape
- 冻结 no-better verdict 并把 shape 进入门槛再收紧

## Rejected-by-Default Directions

下面这些方向默认拒绝：

- 第二 diagnostics object
- 第二 report truth
- helper family
- ui path readback
- per-slot causal refs

## Key Questions

本轮 reviewer 必须回答：

1. 现在是否已经值得冻结 exact evidence shape
2. 若值得，最小 shape 是什么
3. 若不值得，当前 no-better verdict 应如何表述
4. `clear / retire / supersede / rowIdChain` 是否能仅靠 law 维持，不必冻结 object
5. exact shape 一旦冻结，是否会放大 second-system 风险

## Expected Outputs

本轮允许两种输出：

- 一个 strictly better 的 exact evidence shape candidate
- 一个 `no strictly better candidate` verdict，并把 residual 再收紧

## Writeback Targets

- challenge queue：`discussion.md`
- parent candidate：`candidate-ac3.3.md`
- child ledger：`../../docs/review-plan/runs/2026-04-22-form-api-shape-c003-r3-exact-proof-shape.md`

## Backlinks

- stable principles / gates：`[spec.md](./spec.md)`
- parent challenge：`[challenge-c003-r2-bundle-level-proof-refinement.md](./challenge-c003-r2-bundle-level-proof-refinement.md)`
- current strongest candidate：`[candidate-ac3.3.md](./candidate-ac3.3.md)`
