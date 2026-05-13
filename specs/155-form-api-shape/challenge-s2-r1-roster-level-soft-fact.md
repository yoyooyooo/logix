# S2-R1 Roster-Level Soft Fact Proof

**Role**: `S2` 的后续子挑战 brief  
**Status**: Freeze Recorded  
**Feature**: [spec.md](./spec.md)  
**Parent Candidate**: [candidate-ac3.3.md](./candidate-ac3.3.md)

## Why Now

主线和 `S2` 已经确认当前没有必须重开 `list/root companion` 的 owner-scope proof。

剩余最可能推翻 `field-only companion` 的触发器只剩一个：

- 不可分解的 roster-level soft fact

如果它存在，最可能逼出 `list().companion`。
如果它不存在，`AC3.3` 的 owner-scope 基线会更稳。

## Challenge Target

在固定 `AC3.3` 与 `S1/S2/C003` 已有 freeze 的前提下，评估下面这个问题：

> 是否存在一个 roster-level soft fact，无法拆回 field-only companion，也无法交给 list DSL / rule / settlement / reason / source，且必须作为 list-level companion 事实存在

## Current Freeze

- adopted subcandidate：`S2-R1.1 no irreducible roster-level soft fact`
- current verdict：当前没有 strictly better roster-level companion candidate
- frozen law：
  - row chrome 继续归 `field availability`、`reason`、`renderer` 或 `host projection`
  - roster pool 继续归 `source + field candidates`，互斥/配额失败归 `rule / reason`
  - batch remote fact 继续归 Query-owned `source`，pending/blocking 归 `settlement`，explain 归 `reason`
  - add/remove/move/swap availability 继续归 list DSL / active-shape / settlement
  - cross-row summary 继续归 `reason / renderer / host projection`
  - 当前不重开 `list().companion` 或 `root().companion`
- current residual：
  - 仍缺一个稳定、不可 field-local 化、无法归 existing owner 的 roster-level soft slice
  - 当前最接近的候选是 list operation availability，但 owner 仍更接近 list DSL / active-shape / settlement
- ledger：`../../docs/review-plan/runs/2026-04-22-form-api-shape-s2-r1-roster-level-soft-fact.md`

## Fixed Baseline

下面这些内容在 `S2-R1` 内全部冻结：

- `field-only companion` 是当前 day-one public contract
- `list().companion`、`root().companion` 当前关闭
- `availability / candidates` 是当前 day-one slot inventory
- row identity / cleanup / settlement / reason / source 各自 owner 不重开
- `S1` read-side laws 与 `C003` diagnostics laws 不重开

## Success Bar

要想在 `S2-R1` 内形成 strictly better candidate，必须同时满足：

1. 给出单一 roster-level soft fact
2. 证明它不能拆成多个 field-level `availability / candidates`
3. 证明它不是 list DSL、rule、settlement、reason、source 的 owner
4. 证明 host selector 临时推导会丢 cleanup 或 diagnostics backlink
5. 证明重开 `list().companion` 不会复制第二 row truth / cleanup truth / remote truth
6. 在 dominance axes 上严格改进，而不是只是写法更方便

## Required Proof Candidates

### W1. Row Chrome Fact

- 行级 badge / warning / row action availability
- 问题：它是否可拆回该行内某个 field 的 availability

### W2. Roster Pool Fact

- 多行共享一个候选池、配额池、互斥池
- 问题：它是否只是多个 field candidates 的共同来源

### W3. Batch Remote Fact

- 单批 remote receipt 同时约束多行多列
- 问题：它是否仍应归 Query-owned source + settlement/reason

### W4. Roster-Level Affordance

- add/remove/move/swap availability
- 问题：它是否应归 list DSL / active-shape / settlement，而不是 companion

### W5. Cross-Row Summary Fact

- 行组摘要、聚合 hint、soft warning
- 问题：它是否应归 reason / renderer / host projection

## Allowed Search Space

本轮允许搜索的方向：

- 继续维持 `field-only`
- 给出 `list().companion` 的 irreducible proof
- 给出更窄的 roster-level law，但不冻结 exact public contract

## Rejected-by-Default Directions

下面这些方向默认拒绝：

- 因为 UI 更方便就重开 `list().companion`
- 把 rule / reason / source 已有 owner 的东西搬到 companion
- 把 renderer-only row chrome 当 owner truth
- 为单个 widget 长专用 list soft fact noun

## Key Questions

本轮 reviewer 必须回答：

1. 是否存在不可分解的 roster-level soft fact
2. 若存在，它最小 owner 是 `list().companion` 还是别的 existing owner
3. 若不存在，当前 no-better verdict 应如何冻结
4. 哪些 proof 明确归 existing owner，不进入 companion
5. 未来触发 `list().companion` reopen 的最小条件是什么

## Expected Outputs

本轮允许两种输出：

- 一个 strictly better 的 roster-level companion candidate
- 一个 `no strictly better candidate` verdict，并把 roster-level trigger 再收紧

## Writeback Targets

- challenge queue：`discussion.md`
- parent candidate：`candidate-ac3.3.md`
- child ledger：`../../docs/review-plan/runs/2026-04-22-form-api-shape-s2-r1-roster-level-soft-fact.md`

## Backlinks

- stable principles / gates：`[spec.md](./spec.md)`
- parent challenge：`[challenge-s2-row-heavy-proof-pack.md](./challenge-s2-row-heavy-proof-pack.md)`
- current strongest candidate：`[candidate-ac3.3.md](./candidate-ac3.3.md)`
