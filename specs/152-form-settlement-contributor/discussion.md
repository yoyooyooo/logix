# Form Settlement Contributor Discussion

> Stop Marker: 2026-04-22 起，本 discussion 停止承接 active challenge。后续 Form API 主线转入 [../155-form-api-shape](../155-form-api-shape/spec.md)，本页仅作历史讨论来源。迁入 `155` 的候选要点见 [../155-form-api-shape/proposal-149-154-carryover.md](../155-form-api-shape/proposal-149-154-carryover.md)。

**Purpose**: 承接 `152` 下尚未冻结进 `spec.md` 的讨论材料。  
**Status**: Working  
**Feature**: [spec.md](./spec.md)

## Open Questions

- [ ] contributor grammar 的 exact noun
- [ ] `submitImpact` 的取值集合
- [ ] cardinality basis 是否需要额外 companion object
- [ ] async field/list/root declaration 是否共用同一 shape

## Candidate API Shapes

- [ ] async field/list/root declaration noun
- [ ] pending / stale / block summary surface

## Recommended Candidates

### 当前推荐

- **推荐候选：field / list.item / list.list / root 共用同一 contributor grammar**

最小字段建议保持为：

- `deps`
- `key`
- `concurrency`
- `debounce`
- `submitImpact`

理由：

- `152` 的目标是 settlement contributor 单线化
- 分 scope 另开不同 grammar，会马上长第二套 settlement truth

### `submitImpact` 当前推荐

- **推荐候选：最小二值**
  - `block`
  - `observe`

说明：

- `observe` 表示参与 evidence / summary，但不阻塞 submit
- 若未来确实只需要默认非阻塞，也可以退回“只有 `block` 是显式值，其余隐式 observe”

### cardinality basis 当前推荐

- **推荐候选：不长额外 companion object**

理由：

- `minItems / maxItems` 更像 list-level declaration 的 canonical part
- 如果额外长一个 cardinality object，容易把 presence / settlement 再拆成第二对象

### 不推荐

- field async / list async / root async 分别定义不同 noun
- `submitImpact` 一开始就做大枚举
- 为 cardinality 单独长 summary carrier

## Grammar Ceiling

在没有新证据前，`152` 当前只讨论下面 5 个 contributor 维度：

- `deps`
- `key`
- `concurrency`
- `debounce`
- `submitImpact`

当前明确不扩张：

- retry family
- 更细的 task lifecycle noun
- 第二 blocker taxonomy
- 额外的 settlement summary object
- 为不同 scope 复制 grammar

## Default Terminal Choice

- `contributor grammar`
  - day-one 默认终局：field / list.item / list.list / root 共用同一 grammar
- `submitImpact`
  - day-one 默认终局：先只讨论 `block | observe`
- `cardinality basis`
  - day-one 默认终局：`minItems / maxItems` 继续停在 list-level declaration，不长 companion object

## Must Cut

- field / list / root 各自定义不同 contributor grammar
- 把 `submitImpact` 提前扩成大枚举
- 为 cardinality 再长 summary / state object
- 任何把 pending / stale / blocking 重新拆成第二 settlement taxonomy 的对象

## Deferred

- async declaration 的 exact noun
- retry / refresh / retry-window 等 richer policy
- 更细的 contributor lifecycle surface

## Reopen Evidence

只有出现下面证据时，才允许突破 grammar ceiling：

- 单一 grammar 无法覆盖 field / list / root 的真实 submit gate 差异
- `block | observe` 无法表达实际 blocking truth
- `minItems / maxItems` 仅停在 declaration 会损害 submit truth 或 compare proof

## Suggested Discussion Order

1. 先拍板 contributor grammar 是否跨 field/list/root 共用
2. 再拍板 `submitImpact` 的最小值集
3. 最后才讨论 async declaration 的 exact noun

## Decision Backlinks

- [spec.md](./spec.md)
- [plan.md](./plan.md)
