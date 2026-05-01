# List Row Identity Public Projection Discussion

> Stop Marker: 2026-04-22 起，本 discussion 停止承接 active challenge。后续 Form API 主线转入 [../155-form-api-shape](../155-form-api-shape/spec.md)，本页仅作历史讨论来源。迁入 `155` 的候选要点见 [../155-form-api-shape/proposal-149-154-carryover.md](../155-form-api-shape/proposal-149-154-carryover.md)。

**Purpose**: 承接 `149` 下尚未冻结进 `spec.md` 的讨论材料。  
**Status**: Working  
**Feature**: [spec.md](./spec.md)

## Open Questions

- [ ] exact noun 是否需要独立冻结
- [ ] import shape 是否需要单独开 follow-up
- [ ] lawful projection 是否需要独立 companion token，还是继续停在 theorem 级约束

## Candidate API Shapes

- [ ] `rowId`
- [ ] `projectionKey`
- [ ] no exact noun yet

## Recommended Candidates

### 当前推荐

- **推荐候选：不冻结 exact noun**

理由：

- `149` 当前持有的是 theorem / proof gate，不是 public API 命名 spec
- 现在直接定 noun，容易把 row roster projection theorem 错误地冻结成 host-side helper family
- 当前最重要的是守住两条：
  - render key 必须回链 canonical row identity
  - lawful projection 不得长成第二 identity

### 若未来必须冻结 noun

- **第一推荐：`rowId`**

理由：

- 它最接近 canonical truth
- 不会天然鼓励“render-only key”心智
- 与 `149` 当前 theorem 更一致

- **不推荐：`projectionKey` 作为 day-one noun**

理由：

- 太容易把“公开投影义务”误学成第二 identity object
- 会把 host-side render concern 提前抬成 owner truth

## Rejected Directions

- [x] `localId`
  - 拒绝原因：会把 synthetic local id residue 重新合法化
- [x] `renderKey` 作为 Form owner noun
  - 拒绝原因：过早把 host concern 提升为 domain owner truth
- [x] 完整 `useFormList` helper family 先于 theorem 落盘
  - 拒绝原因：会绕过 row roster projection theorem 与 legality gate

## Suggested Discussion Order

1. 先确认是否继续保持“no exact noun yet”
2. 若必须落 noun，再比较 `rowId` 与 projection companion token
3. 最后才讨论 import shape / host-side helper

## Decision Backlinks

- [spec.md](./spec.md)
- [plan.md](./plan.md)
- [checklists/requirements.md](./checklists/requirements.md)
- [../150-form-semantic-closure-group/spec.md](../150-form-semantic-closure-group/spec.md)
