# AC4.4 Field Slot Projection Boundary Pressure

**Role**: `AC4.4` 的首轮压测 brief  
**Status**: Freeze Recorded  
**Feature**: [spec.md](./spec.md)  
**Candidate**: [candidate-ac4-field-slot-projection-lane.md](./candidate-ac4-field-slot-projection-lane.md)  
**Against**: [candidate-ac3.3.md](./candidate-ac3.3.md)

## Why Now

`AC4.4 field-slot-projection-lane` 是 wave 2 唯一保留下来的新 challenger。

它的最大风险也很明确：

- `projection` 是否会和 host projection 冲撞
- 它是否只是 `AC3.3` 的读侧命名变体
- 它是否真的减少了解释层，而不只是换了一个更贴近 read side 的词

## Challenge Target

在固定 `AC3.3`、`S1 / S2 / C003` law 的前提下，评估下面这个问题：

> `AC4.4 field-slot-projection-lane` 是否真能在不放松 owner split 的前提下，提高 read/diagnostics 对齐；还是只是把 `companion` 换成更易与 host 混淆的 `projection`

## Fixed Baseline

下面这些内容在 `AC4.4 pressure test` 内全部冻结：

- `field-only` owner scope
- `availability / candidates` 仍是 day-one slot skeleton
- canonical selector route
- 所有 `S1 / S2 / C003` law 继续视为必须复用
- 不复活 host projection family

## Success Bar

要想通过这一轮，`AC4.4` 必须同时满足：

1. `projection` 不和 host projection truth 混淆
2. 不放大 second-system 风险
3. 不削弱 slot inflation guard
4. 至少在一条主轴上清晰强于 `AC3.3`

## Required Pressure Points

### P1. Host Projection Collision

- `projection` 词是否会直接撞上 React host projection law

### P2. Owner Integrity

- `projection` 是否仍能保住 field-owned local soft fact 的 owner 位置

### P3. Slot Discipline

- `availability / candidates` 是否仍是唯一 day-one slot

### P4. Diagnostics Readability

- 它是否真能减少 `authoring -> read -> diagnostics` 的翻译层

## Allowed Outcomes

- `survive`
- `park`
- `reject`

## Writeback Targets

- challenge queue：`discussion.md`
- candidate：`candidate-ac4-field-slot-projection-lane.md`
- child ledger：`../../docs/review-plan/runs/2026-04-22-form-api-shape-ac4-r5-field-slot-projection-boundary-pressure.md`

## Backlinks

- main candidate：`[candidate-ac3.3.md](./candidate-ac3.3.md)`
- challenger：`[candidate-ac4-field-slot-projection-lane.md](./candidate-ac4-field-slot-projection-lane.md)`
