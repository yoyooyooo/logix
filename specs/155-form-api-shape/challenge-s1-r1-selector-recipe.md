# S1-R1 Canonical Selector Recipe

**Role**: `S1` 的 residual 子挑战 brief  
**Status**: Freeze Recorded  
**Feature**: [spec.md](./spec.md)  
**Parent Challenge**: [challenge-s1-sanctioned-read-route.md](./challenge-s1-sanctioned-read-route.md)  
**Parent Candidate**: [candidate-ac3.3.md](./candidate-ac3.3.md)

## Why Now

`S1` 已经冻结到 `selector-only, helper-deferred sanctioned law`。

当前剩下的最小缺口只剩一件事：

- 在不新增 helper、token、path grammar、第二 read family 的前提下
- `selectorFn` 里到底怎样才算 companion fact 的 sanctioned recipe

如果这一层不补，`S1` 仍然缺一个可教学、可审计、可复用的最小落点。

## Challenge Target

在固定 `S1.1` 的前提下，评估下面这个问题：

> `useSelector(handle, selectorFn)` 内部，对 companion facts 的合法读取 recipe 应该如何表述，才能既可教学，又不偷渡新的 read contract

## Current Freeze

- adopted subcandidate：`S1-R1.1 owner-first slot projection law`
- current verdict：当前存在 strictly better candidate-level selector law
- frozen law：
  - selector 先 resolve current owner，再读取该 owner-local companion fact
  - 单字段 owner 由 canonical field path 唯一确定
  - list / nested list owner 只允许经 canonical `rowId` 链式重入定位
  - selector 只投影 sanctioned slots，当前只允许 `availability / candidates`
  - diagnostics 当前只要求回链 `(ownerRef, slot)` 与 atomic bundle，不新增 companion 专属 helper
  - 当前不冻结 projection bucket、helper noun、token、path grammar、fieldHandle family
- current residual：
  - row-heavy owner binding carrier 已冻结到 `S1-R2.1 row-heavy carrier admissibility law`
  - exact carrier noun / import shape 仍未冻结
  - diagnostics proof 已冻结到 `S1-R3.1 evidence-envelope host backlink law`
  - exact diagnostics object shape 仍未冻结
- ledger：`../../docs/review-plan/runs/2026-04-22-form-api-shape-s1-r1-selector-recipe.md`

## Fixed Baseline

下面这些内容在 `S1-R1` 内全部冻结：

- canonical read route 继续只认 `useModule + useSelector(handle, selectorFn)`
- 不新增任何公开 helper noun、slot helper、path grammar、token、fieldHandle family
- exact companion read contract 继续 deferred
- `source / companion / rule / submit / host` owner split 不重开
- `field-only` owner scope 不重开
- `availability / candidates` slot inventory 不重开
- exact `ui` path encoding 继续 deferred

## Success Bar

要想在 `S1-R1` 内形成 strictly better candidate，必须同时满足：

1. 不新增公开 noun
2. 不新增第二 read family
3. 不泄露 `ui` 内部 path
4. 不要求组件 glue
5. 对 `W1 candidates`、`W2 availability`、`W3 nested list / row identity` 给出统一教学口径
6. 对 `W4 diagnostics readability` 至少不恶化

## Required Proof Set

### W1. Candidates Recipe

- select / combobox 在 selector 内读取 `candidates`
- 不能依赖公开 `ui` path

### W2. Availability Recipe

- host 在 selector 内读取 `availability`
- 读到的是 fact，不是 UI policy

### W3. Row-Heavy Recipe

- nested list / byRowId / reorder 下的当前 row companion 读取
- 不得引入 index-based 教学

### W4. Diagnostics Readability

- 维护者要能解释 selector 读到的 companion fact 从哪里来
- 不得提前长 companion 专属 diagnostics helper

## Allowed Search Space

本轮允许搜索的方向：

- 只冻结 route law 下的 sanctioned selector recipe 写法
- 写“允许读什么、不允许读什么”的 selector law
- 写 row-heavy 场景下的最小教学法则
- 允许给出 candidate-level pseudo recipe

## Rejected-by-Default Directions

下面这些方向默认拒绝：

- 冻结 `field.companion` 作为 exact public projection bucket
- 引入新的 selector builder / descriptor / opaque token
- 把 `fieldValue(path)` 扩写成 companion recipe
- 暴露 `ui.$companion...`
- 通过组件 glue 补教学缺口

## Key Questions

本轮 reviewer 必须回答：

1. sanctioned selector recipe 是否应该被冻结
2. 如果冻结，它应是“写法 law”还是“projection bucket”
3. row-heavy 场景下，recipe 如何避免退回 index 或 path teaching
4. diagnostics 如何沿这条 recipe 保持可解释
5. 如果当前仍不该冻结，最小 no-better verdict 应如何表述

## Expected Outputs

本轮允许两种输出：

- 一个 strictly better 的 selector-recipe candidate
- 一个 `no strictly better candidate` verdict，并把 residual 再收紧

## Writeback Targets

- parent challenge：`challenge-s1-sanctioned-read-route.md`
- challenge queue：`discussion.md`
- parent candidate：`candidate-ac3.3.md`
- child ledger：`../../docs/review-plan/runs/2026-04-22-form-api-shape-s1-r1-selector-recipe.md`

## Backlinks

- stable principles / gates：`[spec.md](./spec.md)`
- parent challenge：`[challenge-s1-sanctioned-read-route.md](./challenge-s1-sanctioned-read-route.md)`
- current strongest candidate：`[candidate-ac3.3.md](./candidate-ac3.3.md)`
