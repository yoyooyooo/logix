# Form Active Set Cleanup Discussion

> Stop Marker: 2026-04-22 起，本 discussion 停止承接 active challenge。后续 Form API 主线转入 [../155-form-api-shape](../155-form-api-shape/spec.md)，本页仅作历史讨论来源。迁入 `155` 的候选要点见 [../155-form-api-shape/proposal-149-154-carryover.md](../155-form-api-shape/proposal-149-154-carryover.md)。

**Purpose**: 承接 `151` 下尚未冻结进 `spec.md` 的讨论材料。  
**Status**: Working  
**Feature**: [spec.md](./spec.md)

## Open Questions

- [ ] presence policy 的 exact vocabulary
- [ ] cleanup receipt 的最小可观察 shape
- [ ] active-set entry / exit 是否需要独立 noun，还是继续作为语义规则存在

## Candidate API Shapes

- [ ] active set entry / exit nouns
- [ ] cleanup receipt read surface

## Recommended Candidates

### 当前推荐

- **推荐候选：presence policy 走最小 declarative policy，不开新的 root family**

建议方向：

- 在现有 declaration act 内补一个最小 presence policy
- 只先区分：
  - `retain`
  - `drop`

理由：

- `151` 的主目标是关 active-set / cleanup truth，不是发明新 authoring 主链
- 先把 value retention 显式化，比先定 noun 更重要

### cleanup receipt 的当前推荐

- **推荐候选：cleanup receipt 只作为 reason / evidence 可观察对象**

理由：

- cleanup receipt 主要服务 explain / compare / repair
- 现在把它做成独立用户态对象，太容易长第二 receipt family
- 更稳的做法是先让它进入 reason/evidence truth，再决定要不要暴露 reader

### 不推荐

- `keepErrors / keepPending / keepBlocking` 这类零碎布尔开关
- `onHide / onExit` 这类 imperative callback
- 给 conditional subtree 单独长一套特殊 cleanup API

## Default Terminal Choice

- `presence policy`
  - day-one 默认终局：只保留 `retain | drop`
- `cleanup receipt`
  - day-one 默认终局：只进入 reason / evidence truth，不提供独立 direct reader
- `active-set entry / exit`
  - day-one 默认终局：继续按语义规则存在，不先冻结独立 noun

这些默认终局只有在出现明确反证时才允许重开。

## Must Cut

- `keepErrors / keepPending / keepBlocking` 一类零碎布尔开关
- `onHide / onExit` 一类 imperative callback
- 给 conditional subtree 单独长一套 cleanup API
- 任何会让 cleanup truth 脱离 active-set owner 的 reader/helper

## Deferred

- active-set entry / exit 的 exact noun
- cleanup receipt 的 direct read surface
- 更细粒度的 presence policy vocabulary

## Reopen Evidence

只有出现下面证据时，才允许推翻上面的默认终局：

- `retain | drop` 无法覆盖真实 active-set / compare / repair 场景
- cleanup receipt 只停在 reason / evidence 会伤害 diagnostics 或 machine-comparability
- 不发 active-set noun 会直接伤害用户对 close gate 的理解或实现约束

## Suggested Discussion Order

1. 先拍板 presence policy 是否只保留 `retain / drop`
2. 再决定 cleanup receipt 是不是只停在 reason/evidence
3. 最后才讨论 active-set noun 是否值得冻结

## Decision Backlinks

- [spec.md](./spec.md)
- [plan.md](./plan.md)
