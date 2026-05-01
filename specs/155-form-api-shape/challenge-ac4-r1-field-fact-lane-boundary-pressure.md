# AC4.1 Field Fact Lane Boundary Pressure Test

**Role**: `AC4.1` 的首轮压测 brief  
**Status**: Freeze Recorded  
**Feature**: [spec.md](./spec.md)  
**Candidate**: [candidate-ac4-field-fact-lane.md](./candidate-ac4-field-fact-lane.md)  
**Against**: [candidate-ac3.3.md](./candidate-ac3.3.md)

## Why Now

`AC4.1 field-fact-lane` 已经成为当前最值得继续压测的 parked challenger。

它的最大风险也很明确：

- `fact` 是否过宽
- `derive` 是否会把心智拉回 `watch / computed`
- 它是否会侵蚀 `source / rule / submit / reason / settlement / meta / values` 的 owner split

如果这三条压不住，`AC4.1` 会直接淘汰。
如果能压住，它才有资格继续挑战 `AC3.3`。

## Challenge Target

在固定 `AC3.3`、`S1 / S2 / C003` 已有 law 的前提下，评估下面这个问题：

> `AC4.1 field-fact-lane` 是否能把 `fact` 稳定压成“field-owned local sealed soft facts only”，而不滑向 `watch / computed / meta / reason / settlement / values`

## Fixed Baseline

下面这些内容在 `AC4.1 pressure test` 内全部冻结：

- `source / companion / rule / submit / host` owner split
- Query 继续单点持有 `Resource / load / remote fact`
- `rule / submit / UI` 只消费 lowered snapshot，不直接做 IO
- `target / scope / slot / reset` 一类第二声明体系继续拒绝
- canonical selector route
- `availability / candidates` 仍是当前唯一 day-one slot skeleton
- 所有 `S1 / S2 / C003` law 都视为必须复用
- 不复活 generic `watch / computed`

## Success Bar

要想通过这一轮，`AC4.1` 必须同时满足：

1. `fact` 的边界可以被写成可审计的封闭集合
2. `derive` 不会回到 generic computed primitive
3. `fact` 不吸收 `values / errors / reason / settlement / meta / submit truth`
4. `field-only` owner scope 不被放大
5. 对 `AC3.3` 至少在一条主轴上形成清晰严格改进
6. 在 `docs/ssot/form/06-capability-scenario-api-support-map.md` 的同一组 `SC-*` 主场景下，不弱于 `AC3.3`

## Required Pressure Points

### P1. Boundary Sharpness

- `fact` 到底只包含什么
- 什么必须明确不属于 `fact`

### P2. Anti-Computed

- `derive` 如何不退化成 `watch / computed`

### P3. Owner Integrity

- `source / rule / settlement / reason / meta / values` 是否仍能单点持有

### P4. Slot Discipline

- `availability / candidates` 是否仍是唯一 day-one fact slots
- 第三个 slot 是否会更容易被放进来

### P5. Source Boundary Conservation

- `fact` 是否侵蚀 Query-owned remote fact owner
- `derive` 是否偷偷长出第二 remote declaration 或 direct IO 通道

## Allowed Outcomes

- `survive`
- `park`
- `reject`

## Writeback Targets

- challenge queue：`discussion.md`
- candidate：`candidate-ac4-field-fact-lane.md`
- child ledger：`../../docs/review-plan/runs/2026-04-22-form-api-shape-ac4-r1-field-fact-lane-boundary-pressure.md`

## Backlinks

- main candidate：`[candidate-ac3.3.md](./candidate-ac3.3.md)`
- challenger：`[candidate-ac4-field-fact-lane.md](./candidate-ac4-field-fact-lane.md)`
