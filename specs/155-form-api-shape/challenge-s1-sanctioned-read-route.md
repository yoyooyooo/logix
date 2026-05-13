# S1 Sanctioned Companion Read Route

**Role**: `155` 的子挑战 brief  
**Status**: Freeze Recorded  
**Feature**: [spec.md](./spec.md)  
**Parent Candidate**: [candidate-ac3.3.md](./candidate-ac3.3.md)

## Why Now

`AC3.3` 当前最接近 authority promotion 的缺口就是 read route 证据。

如果这一刀不补，后续 author 很容易重新滑回：

- 组件侧 glue
- 第二 selector family
- 暴露 `ui` 内部 path
- toolkit wrapper 反客为主

因此 `S1` 的目标很简单：

- 为 `companion` 找到一条 sanctioned read route
- 或证明当前没有 strictly better read story

## Challenge Target

在不破坏 `AC3.3` 其余边界的前提下，评估下面这个问题：

> companion facts 最终如何被读取，才能既足够可用，又不长第二 read family，也不泄露 `ui` 内部 path

## Current Freeze

- adopted subcandidate：`S1.1 selector-only, helper-deferred sanctioned law`
- current verdict：当前没有 strictly better candidate
- frozen law：
  - sanctioned read route 继续只认 `useModule + useSelector(handle, selectorFn)`
  - 当前不新增任何公开 helper noun、slot helper、path grammar、token、fieldHandle family
  - 当前不冻结 exact companion read contract，只冻结 route law
  - companion facts 若未来进入 sanctioned read story，必须留在 canonical selector route 内
- current residual：
  - `selectorFn` 内的 recipe 已冻结到 `S1-R1.1 owner-first slot projection law`
  - row-heavy owner binding carrier 已冻结到 `S1-R2.1 row-heavy carrier admissibility law`
  - diagnostics proof 已冻结到 `S1-R3.1 evidence-envelope host backlink law`
  - exact carrier noun / import shape 与 exact diagnostics object shape 仍未冻结
- ledger：`../../docs/review-plan/runs/2026-04-22-form-api-shape-s1-sanctioned-read-route.md`

## Fixed Baseline

下面这些内容在 `S1` 内默认冻结，不作为本轮主搜索空间：

- `source / companion / rule / submit / host` owner split
- `field(path).companion(...)` 作为当前 day-one public contract
- `field-only` owner scope
- slot inventory 只保留 `availability`、`candidates`
- exact `ui` path encoding 继续 deferred
- `list().companion`、`root().companion` 不在本轮重开
- 不重新讨论 generic `watch / computed`

## Success Bar

要想在 `S1` 内形成 strictly better candidate，必须同时满足：

1. 不引入第二 read family
2. 不要求组件侧 canonical glue
3. 不暴露 `ui` 内部 path 或 companion internal path
4. 不破坏 `useModule + useSelector(handle, selectorFn)` 作为 canonical read route target
5. 在 `concept-count / public-surface / proof-strength / runtime clarity` 上形成严格改进，或在核心轴不恶化时显著提高 `proof-strength`

## Required Proof Set

本轮至少要覆盖这四类 proof：

### W1. Candidates Read

- select / combobox 需要读取当前 field 的 `candidates`
- 场景包含远程 source、跨行互斥、keepCurrent

### W2. Availability Read

- 字段需要根据 `availability` 决定 `disabled / hidden / readonly`
- host 只能消费 fact，不能把 policy 倒灌回 owner

### W3. Nested List Read

- nested list / row identity 场景下读取当前 row field 的 companion facts
- 不允许通过公开 `ui` path 来教学

### W4. Diagnostics Readability

- 维护者需要解释“为什么当前看到的是这份 companion fact”
- read story 不能破坏后续 diagnostics causal chain

## Allowed Search Space

本轮允许搜索的方向：

- 继续只用 `useSelector(handle, selectorFn)`，配合 sanctioned selector recipe
- 在现有 core-owned adjunct route 上增加更窄的 sanctioned helper
- authority 暂不公开 read route，只在 candidate 中冻结“如何不误用”的 route law
- toolkit 只作为 bridge note，不得抢 exact owner

## Rejected-by-Default Directions

下面这些方向默认拒绝，除非出现严格支配证据：

- `companion.read(slot)` 一类新 read family
- 暴露 `ui.$companion...` 或等价内部 path
- 扩写 `fieldValue(path)` 让它承担 companion read
- 组件侧 `useEffect / useMemo` 重新成为 canonical glue
- 为 S1 顺手重开 `list/root companion`

## Key Questions

本轮 reviewer 必须回答：

1. sanctioned read route 是否应该存在
2. 若存在，它最小应该长什么样
3. 若不存在，当前最强 no-better verdict 应如何表述
4. companion facts 被 host 消费时，如何维持 single read law
5. diagnostics 未来如何沿这条 read story 保持可解释

## Expected Outputs

本轮允许两种输出：

- 一个 strictly better 的 read-route candidate
- 一个 `no strictly better candidate` verdict，并写清 reopen bar

## Writeback Targets

- 活跃挑战队列：`discussion.md`
- 当前最强候选：`candidate-ac3.3.md`
- 子问题 ledger：`../../docs/review-plan/runs/2026-04-22-form-api-shape-s1-sanctioned-read-route.md`
- 若本轮形成稳定 gate，再回写 `spec.md`

## Backlinks

- stable principles / gates：`[spec.md](./spec.md)`
- parent candidate：`[candidate-ac3.3.md](./candidate-ac3.3.md)`
- challenge queue：`[discussion.md](./discussion.md)`
