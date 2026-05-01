# Form Reason Projection Discussion

> Stop Marker: 2026-04-22 起，本 discussion 停止承接 active challenge。后续 Form API 主线转入 [../155-form-api-shape](../155-form-api-shape/spec.md)，本页仅作历史讨论来源。迁入 `155` 的候选要点见 [../155-form-api-shape/proposal-149-154-carryover.md](../155-form-api-shape/proposal-149-154-carryover.md)。

**Purpose**: 承接 `153` 下尚未冻结进 `spec.md` 的讨论材料。  
**Status**: Working  
**Feature**: [spec.md](./spec.md)

## Open Questions

- [ ] path explain 的 exact read surface
- [ ] evidence envelope 与 materialized report 的边界
- [ ] `reasonSlotId.subjectRef` 的扩展门槛
- [ ] submit summary / compare feed 是否还需要额外 companion noun

## Candidate API Shapes

- [ ] path explain selector
- [ ] compare / repair focus carrier

## Recommended Candidates

### 当前推荐

- **推荐候选：不先冻结 path explain exact noun**

理由：

- `153` 当前要先关的是 reason / evidence 单线化
- 先定 selector noun，容易把 explain API 提前做成第二 helper family
- 当前更重要的是：
  - path explain / trial / compare / repair 共享同一 authority
  - materialized report 不反客为主

### evidence / report 的当前推荐

- **推荐候选：evidence envelope 是 authority，materialized report 只是 on-demand view**

理由：

- 这和 `runtime/09` 的 control-plane admissibility 一致
- 如果反过来让 report object 成为主对象，reason contract 会重新长第二真相层

### `reasonSlotId.subjectRef` 的当前推荐

- **推荐候选：继续只允许 `row / task / cleanup`**

理由：

- 这三类已经覆盖当前语义主缺口
- 过早扩展只会让 reason family 的 grammar 重新失控

### 不推荐

- path explain / compare feed 各自产生不同 reason family
- 为 submit summary / compare feed 再长额外 companion noun
- 在 reason contract 还没闭环前冻结完整 helper family

## Default Terminal Choice

- `path explain`
  - day-one 默认终局：先不冻结 exact noun
- `evidence envelope`
  - day-one 默认终局：作为 authority
- `materialized report`
  - day-one 默认终局：只作为 on-demand view
- `reasonSlotId.subjectRef`
  - day-one 默认终局：继续只允许 `row | task | cleanup`

## Must Cut

- 第二 explain object
- 第二 issue tree / report truth
- path explain / compare feed 各自产生不同 reason family
- 为 submit summary / compare feed 再长额外 companion noun
- 在 reason contract 未闭环前冻结完整 helper family

## Deferred

- path explain 的 exact read surface
- compare / repair focus carrier 的 exact shape
- `reasonSlotId.subjectRef` 的扩展集合

## Concrete Witness Bundle

`153` 后续若进入 plan / tasks，至少要绑定下面 2 组强 witness：

### Bundle A: same path

- invalid
- pending
- cleanup
- stale

要求：

- 它们都能通过同一 authority 被解释
- 不得为任一状态单独长第二 reason family

### Bundle B: same submit failure

- compare feed
- repair focus
- trial feed

要求：

- 三者共享同一 reason / evidence authority
- materialized report 只作为 view，不反向成为 owner

## Reopen Evidence

只有出现下面证据时，才允许推翻默认终局：

- 不冻结 path explain noun 会直接伤害用户或 Agent 的可操作性
- envelope 不能独自承接 compare / repair / trial 的 machine-comparable truth
- `row | task | cleanup` 无法覆盖真实 locality 主缺口

## Suggested Discussion Order

1. 先拍板 evidence envelope > materialized report
2. 再拍板 path explain 是否继续不冻结 noun
3. 最后才讨论 compare / repair focus carrier 的 exact shape

## Decision Backlinks

- [spec.md](./spec.md)
- [plan.md](./plan.md)
