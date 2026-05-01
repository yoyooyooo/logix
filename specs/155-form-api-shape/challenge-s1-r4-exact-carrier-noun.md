# S1-R4 Exact Carrier Noun And Import Shape

**Role**: `S1-R2` 的后续子挑战 brief  
**Status**: Freeze Recorded  
**Feature**: [spec.md](./spec.md)  
**Parent Candidate**: [candidate-ac3.3.md](./candidate-ac3.3.md)

## Why Now

`S1 / S2 / C003` 已经把 law 层收得很紧：

- read route law
- selector recipe law
- row-heavy carrier admissibility law
- diagnostics backlink law
- diagnostics causal-chain law

当前最靠近 exact authority 的剩余点，是：

- row-heavy owner binding 到底是否需要一个 exact carrier noun / import shape

## Challenge Target

在固定 `S1`、`S2`、`C003` 已有 freeze 的前提下，评估下面这个问题：

> row-heavy owner binding 是否已经值得获得一个 exact 载体，若值得，它最小应该落在哪条既有 handle/import 主线；若不值得，当前 no-better verdict 应如何冻结

## Current Freeze

- adopted subcandidate：`S1-R4.1 exact carrier deferred, byRowId-first reopen bias, no half-freeze`
- current verdict：当前没有 strictly better exact carrier candidate
- frozen law：
  - 当前不冻结 exact carrier noun / import shape
  - 当前不把 `fieldArray(...).byRowId(...)` 视为已获 sanctioned read carrier 地位
  - 当前只冻结一条 reopen bias：若未来需要重开 exact carrier，必须先证明既有 `fieldArray(...).byRowId(...)` family 是否足以承接，再考虑任何新 noun / token / helper family
  - 任何 exact carrier 候选若不能同时说明：
    1. 如何与 `useModule + useSelector(handle, selectorFn)` 拼接
    2. 如何避免新增第二 read family
    3. 如何在 `replace / delete / hide / active exit` 后避免 stale carrier truth
    4. 如何与 diagnostics / cleanup law 保持单一真相
    就不能进入 exact freeze
  - nested list 的逐层 `fieldArray(...).byRowId(...)` 重入，目前只算未来 reopen 时的优先搜索方向，不构成已冻结的 exact 递进语法
- current residual：
  - row-heavy exact carrier noun / import shape 仍未闭合
  - 既有 `byRowId` family 能否安全升格为 sanctioned read carrier，仍待更强 proof
- ledger：`../../docs/review-plan/runs/2026-04-22-form-api-shape-s1-r4-exact-carrier-noun.md`

## Fixed Baseline

下面这些内容在 `S1-R4` 内全部冻结：

- canonical read route 继续只认 `useModule + useSelector(handle, selectorFn)`
- owner-first / slot-only / rowId-first selector law 已冻结
- row-heavy carrier admissibility law 已冻结
- diagnostics proof 与 causal chain law 已冻结
- `field-only companion` 仍是当前 day-one public contract
- 不重开 `list/root companion`

## Success Bar

要想在 `S1-R4` 内形成 strictly better candidate，必须同时满足：

1. 不新增第二 read family
2. 不暴露 `ui` 内部 path
3. 与 `149` row identity theorem 一致
4. 与 `151` cleanup law 一致
5. 不破坏当前 `useModule + useSelector` canonical route
6. 在 `concept-count / public-surface / proof-strength / future-headroom` 上形成严格改进，或在核心轴不恶化时显著提高 `proof-strength`

## Required Proof Set

### W1. Existing Handle Reuse

- 是否能由既有 handle family 极小延伸承接 owner binding

### W2. Nested Row Chain

- nested list 下是否能稳定表达 rowId chain

### W3. Replace / Cleanup

- exact carrier 若存在，如何保证 `replace / delete / hide / active exit` 后不残留 stale truth

### W4. Diagnostics Alignment

- exact carrier 若存在，如何与 `S1-R3.1`、`C003.1` 保持同一 diagnostics truth

## Allowed Search Space

本轮允许搜索的方向：

- 继续维持 no-better verdict
- 复用既有 handle family 的最小延伸
- 极窄的 exact carrier noun，但必须证明不会长第二 family

## Rejected-by-Default Directions

下面这些方向默认拒绝：

- 新 `rowBinding` helper family
- token / descriptor / opaque path object
- 暴露 `ui` 路径或 path grammar
- render residue / local synthetic id 充当 carrier
- 为承载 exact carrier 顺手重开 `list/root companion`

## Key Questions

本轮 reviewer 必须回答：

1. 现在是否已经值得冻结 exact carrier noun / import shape
2. 若值得，最小承接点是什么
3. 若不值得，当前 no-better verdict 应如何表述
4. 既有 handle family 是否足以安全承接
5. diagnostics / cleanup / row identity 是否还能保持单一真相

## Expected Outputs

本轮允许两种输出：

- 一个 strictly better 的 exact carrier candidate
- 一个 `no strictly better candidate` verdict，并把 residual 再收紧

## Writeback Targets

- challenge queue：`discussion.md`
- parent candidate：`candidate-ac3.3.md`
- child ledger：`../../docs/review-plan/runs/2026-04-22-form-api-shape-s1-r4-exact-carrier-noun.md`

## Backlinks

- stable principles / gates：`[spec.md](./spec.md)`
- row identity theorem：`../149-list-row-identity-public-projection/spec.md`
- cleanup law：`../151-form-active-set-cleanup/spec.md`
- current strongest candidate：`[candidate-ac3.3.md](./candidate-ac3.3.md)`
