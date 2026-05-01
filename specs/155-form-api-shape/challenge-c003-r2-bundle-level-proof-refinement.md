# C003-R2 Bundle-Level Proof Refinement

**Role**: `C003` 的后续子挑战 brief  
**Status**: Freeze Recorded  
**Feature**: [spec.md](./spec.md)  
**Parent Candidate**: [candidate-ac3.3.md](./candidate-ac3.3.md)

## Why Now

主线 plateau 已经重确认。

当前最可能真正改变 authority readiness 的，不再是 noun，而是 trace strength：

- `sourceReceiptRef`
- `derivationReceiptRef`
- `bundlePatchRef`
- `clear / retire`
- `row-heavy reorder / replace`

如果这条 proof 仍然不够硬，`AC3.3` 继续只能停在“强候选，不升 authority”。

## Challenge Target

在固定 `C003.1`、`C003-R1.1` 与 `S1/S2` 已有 freeze 的前提下，评估下面这个问题：

> bundle-level proof 还需要补到什么程度，才能让 `source -> lower -> patch -> outcome` 的机械链路足够硬，进而接近 authority promotion

## Current Freeze

- adopted subcandidate：`C003-R2.1 single-live-bundle-head supersession law`
- current verdict：当前存在 strictly better bundle-level proof candidate
- frozen law：
  - diagnostics truth 继续只认同一个 evidence envelope；不新增 explain object / report shell / helper family / ui path readback
  - 对任一 companion bundle `B`，任一时刻最多只允许一个 live `bundlePatchRef` head
  - `B` 的最小绑定为：
    - non-row bundle：`(ownerRef)`
    - row-scoped bundle：`(ownerRef, canonicalRowIdChain)`，此时 `canonicalRowIdChain` 为必填
  - 每次 `lower` 求值都生成一个内部 `derivationReceiptRef`；同一 `sourceReceiptRef` 可以触发多次 `lower`，但每次 `lower` 都必须可区分
  - 每次提交的 `write | clear | retire` patch，都必须在 envelope 内部回链 `{ sourceReceiptRef?, derivationReceiptRef, bundlePatchRef, supersedesBundlePatchRef?, ownerRef, canonicalRowIdChain? }`
  - `write` 安装新的 live head
  - `clear` 只有在它 supersede 当前 live head 时才合法，并安装一个 empty live head
  - `retire` 只有在它 supersede 当前 live head 时才合法，并在该 bundle 上留下 no live head
  - `cleanupReceiptRef` 只允许终止当前或前一 live head；`stale / cleanup` 不形成继续参与读取或 blocking 的残留 truth
  - source refresh / source turnover 只允许触发新的 `write` 或 `clear`；不能单独触发 `retire`
  - `reorder` 不生成新 head，只搬运 host projection；`replace / delete / hide / active exit` 必须 retire 旧 head，之后新 row 或重新进入 active set 才能生成新 head
  - `reasonSlotId` 只允许指向当前 live head，或指向终止它的 `clear / retire / cleanup` backlink
  - 只有当一个当前 state 需要两个彼此独立的 live heads 去解释不同 sanctioned slots 时，才 reopen 到 split bundle 或 per-slot causal refs
- current residual：
  - `derivationReceiptRef` 与 `bundlePatchRef` 的 exact shape 仍需更强 proof
  - 若 future 出现 slot-level diverging patch cadence 或分离的 `sourceRef` 主线，bundle atomicity 可能需要重开
  - exact evidence shape 已冻结到 `C003-R3.1 exact evidence shape deferred, opaque-ref law`
- ledger：`../../docs/review-plan/runs/2026-04-22-form-api-shape-c003-r2-bundle-level-proof-refinement.md`

## Fixed Baseline

下面这些内容在 `C003-R2` 内全部冻结：

- diagnostics truth 继续只认 `153` evidence envelope
- `C003.1` 已冻结的 derivation-link causal-chain law
- `C003-R1.1` 已冻结的 no-second-system exact object verdict
- `S1` read-side laws 与 `S2` no-better owner-scope verdict
- 不新增 explain object、report shell、helper family、ui path readback

## Success Bar

要想在 `C003-R2` 内形成 strictly better candidate，必须同时满足：

1. 能稳定解释 `write / clear / retire`
2. 能稳定解释 row-heavy `reorder / replace / delete / hide / active exit`
3. 不引入第二 diagnostics truth
4. 不引入 per-slot diagnostics family，除非给出严格支配证据
5. 与 `153` / `151` / `149` / `154` 机械对齐
6. 在 `proof-strength` 上形成明确严格改进，且不恶化核心轴

## Required Proof Set

### W1. Clear / Retire

- `bundlePatchRef` 必须稳定覆盖 `clear` 与 `retire`
- cleanup / stale 必须能回链旧 patch

### W2. Row-Heavy Reorder / Replace

- row-heavy `reorder / replace` 后，bundle-level proof 仍能解释当前链路

### W3. Multi-Lower One Source

- 同一 `sourceReceiptRef` 触发多次 `lower` 时，`derivationReceiptRef` 如何保持稳定可解释

### W4. Diverging Patch Cadence

- `availability / candidates` 若出现不同 patch cadence，当前 bundle-level proof 是否仍足够

## Allowed Search Space

本轮允许搜索的方向：

- 继续只冻结 proof law
- 给出更强的 bundle-level backlink obligation
- 给出 candidate-level pseudo evidence shape
- 继续把 exact object shape 与 per-slot refs 保持 deferred

## Rejected-by-Default Directions

下面这些方向默认拒绝：

- 第二 diagnostics family
- 第二 report truth
- companion 专属 diagnostics helper
- ui path readback
- 为解决 proof strength顺手重开 exact object

## Key Questions

本轮 reviewer 必须回答：

1. bundle-level proof 现在还缺什么
2. 是否需要更强的 `derivationReceiptRef / bundlePatchRef` law
3. 什么时候才需要 per-slot refs
4. cleanup / retire / stale 如何继续保持 subordinate backlink
5. row-heavy `replace / reorder` 下如何保持单一 diagnostics truth

## Expected Outputs

本轮允许两种输出：

- 一个 strictly better 的 bundle-level proof candidate
- 一个 `no strictly better candidate` verdict，并把 residual 再收紧

## Writeback Targets

- challenge queue：`discussion.md`
- parent candidate：`candidate-ac3.3.md`
- child ledger：`../../docs/review-plan/runs/2026-04-22-form-api-shape-c003-r2-bundle-level-proof-refinement.md`

## Backlinks

- stable principles / gates：`[spec.md](./spec.md)`
- reason authority：`../153-form-reason-projection/spec.md`
- source boundary：`../154-form-resource-source-boundary/spec.md`
- cleanup law：`../151-form-active-set-cleanup/spec.md`
- current strongest candidate：`[candidate-ac3.3.md](./candidate-ac3.3.md)`
