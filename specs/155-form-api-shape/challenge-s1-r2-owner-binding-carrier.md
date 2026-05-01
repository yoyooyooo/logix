# S1-R2 Row-Heavy Owner Binding Carrier

**Role**: `S1-R1` 的 residual 子挑战 brief  
**Status**: Freeze Recorded  
**Feature**: [spec.md](./spec.md)  
**Parent Challenge**: [challenge-s1-r1-selector-recipe.md](./challenge-s1-r1-selector-recipe.md)  
**Parent Candidate**: [candidate-ac3.3.md](./candidate-ac3.3.md)

## Why Now

`S1-R1` 已经冻结了 `owner-first slot projection law`。

当前剩下的最小缺口只剩一件事：

- row-heavy 场景里，组件到底靠什么 exact 载体稳定拿到 owner binding

如果这一层不补，selector law 虽然成立，但在真实 nested list / byRowId / reorder proof 下，作者仍可能退回：

- index teaching
- path teaching
- 组件 glue
- render residue

## Challenge Target

在固定 `S1.1` 与 `S1-R1.1` 的前提下，评估下面这个问题：

> row-heavy 场景里，owner-first selector law 所需的 owner binding carrier 应该由什么 exact 载体承接，才能既稳定，又不长第二 family

## Current Freeze

- adopted subcandidate：`S1-R2.1 row-heavy carrier admissibility law`
- current verdict：当前没有 strictly better exact carrier candidate
- frozen law：
  - 当前不冻结 exact carrier noun / import shape / path grammar / token / helper noun / fieldHandle family
  - 任何 row-heavy owner binding carrier，若未来进入公开面，必须 fresh resolve against current roster + active set
  - 单字段 owner 由 canonical field path 唯一确定
  - `byRowId / trackBy / rowIdStore / render key` 只允许回链同一条 canonical row truth
  - list / nested list 只允许 canonical `rowId` chain 重入
  - 禁止 index、object ref、render history、local synthetic id、path teaching
  - synthetic local id 不得回流成公开 truth
  - index fallback 只算 residue 或 proof failure
  - `replace` / delete / hide / active exit 后旧 binding 不再贡献事实，只允许进入 stale / cleanup diagnostics backlink
  - diagnostics 至少回链 `(ownerRef, slot, canonicalRowId chain)`，且 stale / cleanup diagnostics 不得形成可继续参与读取的残留 truth
- current residual：
  - exact carrier noun / import shape 仍未冻结
  - 既有 handle family 是否能安全承接这套 law，仍待更强 proof
  - roster-level companion aggregation 是否需要更强 read story，仍待 proof
- ledger：`../../docs/review-plan/runs/2026-04-22-form-api-shape-s1-r2-owner-binding-carrier.md`

## Fixed Baseline

下面这些内容在 `S1-R2` 内全部冻结：

- canonical read route 继续只认 `useModule + useSelector(handle, selectorFn)`
- selector recipe 继续固定为 owner-first / slot-only / rowId-first law
- 不新增 helper noun、token、path grammar
- 不暴露 `ui` 内部 path
- 不重开 `source / companion / rule / submit / host` owner split
- 不重开 `field-only` owner scope
- 不重开 `availability / candidates` slot inventory
- 不冻结 `field.companion` projection bucket

## Core Tension

当前 tension 只有一条：

- row-heavy 读取需要 stable owner binding
- 公开面又不能为了这个直接长出第二 read family

因此本轮只比较三类方向：

1. exact 载体继续 deferred
2. 复用既有 handle family 的最小延伸
3. 极窄的新 carrier，但必须证明它不会变第二 family

## Success Bar

要想在 `S1-R2` 内形成 strictly better candidate，必须同时满足：

1. row-heavy 场景不退回 index 或 path teaching
2. 不新增第二 read family
3. 不暴露 `ui` 内部 path
4. 与 `149` 的 row identity theorem 一致
5. 与 `151` 的 roster replacement / cleanup law 一致
6. diagnostics 至少不恶化

## Required Proof Set

### W1. `byRowId` After Reorder

- reorder 后继续命中同一条 canonical row identity
- owner binding 不得退回 index

### W2. `replace(nextItems)` As Roster Replacement

- `replace` 后旧 row binding 不得被隐式保留
- carrier 必须与 roster replacement 语义一致

### W3. Nested List

- parent/child list 嵌套时，carrier 必须支持按层级 row identity 重入
- 不允许 path 拼接教学

### W4. Cleanup / Retention

- owner binding 与 cleanup law 不能断链
- 删除、隐藏、replace 后不能残留陈旧 carrier truth

### W5. `trackBy` Missing / Synthetic Id Rejection

- `trackBy` 缺失时不能用 synthetic local id 偷渡公开 owner truth
- local synthetic id、index teaching、render key residue 只能进入 proof failure 或 diagnostics residue

## Allowed Search Space

本轮允许搜索的方向：

- 把 carrier 继续留在 candidate-level law，不冻结 exact 载体
- 在既有 `fieldArray(...).byRowId(...)` 语义附近寻找最小承接点
- 冻结“carrier 必须满足什么”，而不是立刻冻结“它叫什么”
- 若必须引入新 carrier，必须证明它不构成第二 family

## Rejected-by-Default Directions

下面这些方向默认拒绝：

- index-based row teaching
- path 拼接或 `items.0.xxx` 一类 recipe
- render residue / local synthetic id 充当 owner carrier
- companion 专属 row helper family
- 现在就冻结完整 row handle projection bucket

## Key Questions

本轮 reviewer 必须回答：

1. row-heavy owner binding carrier 现在是否应该冻结 exact 载体
2. 如果冻结，最小承接点是什么
3. 如果不冻结，当前 no-better verdict 应如何表述
4. carrier 如何与 `replace`、cleanup、nested list 一致
5. diagnostics 如何沿 carrier 保持可解释

## Expected Outputs

本轮允许两种输出：

- 一个 strictly better 的 carrier candidate
- 一个 `no strictly better candidate` verdict，并把 residual 再收紧

## Writeback Targets

- parent challenge：`challenge-s1-r1-selector-recipe.md`
- challenge queue：`discussion.md`
- parent candidate：`candidate-ac3.3.md`
- child ledger：`../../docs/review-plan/runs/2026-04-22-form-api-shape-s1-r2-owner-binding-carrier.md`

## Backlinks

- stable principles / gates：`[spec.md](./spec.md)`
- row identity theorem：`../149-list-row-identity-public-projection/spec.md`
- cleanup law：`../151-form-active-set-cleanup/spec.md`
- current strongest candidate：`[candidate-ac3.3.md](./candidate-ac3.3.md)`
