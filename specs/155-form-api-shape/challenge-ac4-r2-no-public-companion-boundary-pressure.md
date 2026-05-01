# AC4.3 No Public Companion Boundary Pressure

**Role**: `AC4.3` 的首轮压测 brief  
**Status**: Freeze Recorded  
**Feature**: [spec.md](./spec.md)  
**Candidate**: [candidate-ac4-no-public-companion-program-lowered.md](./candidate-ac4-no-public-companion-program-lowered.md)  
**Against**: [candidate-ac3.3.md](./candidate-ac3.3.md)

## Why Now

`AC4.3` 是当前剩下的另一条 parked challenger。

它的价值很明确：

- public surface 更小
- 直接对齐现有 exact authority

它的最大风险也同样明确：

- internal lane 会不会长成第二系统
- `dsl` 会不会变成隐性垃圾槽位
- diagnostics / read-route 证据会不会因此变弱

## Challenge Target

在固定 `AC3.3`、`S1 / S2 / C003` law 的前提下，评估下面这个问题：

> `AC4.3 no-public-companion-program-lowered` 是否会把本地 soft fact 收成 internal second-system，还是它真的能换来更小、更一致的主线

## Fixed Baseline

下面这些内容在 `AC4.3 pressure test` 内全部冻结：

- `source / companion / rule / submit / host` owner split
- canonical selector route
- `availability / candidates` 仍是当前唯一 day-one slot skeleton
- 所有 `S1 / S2 / C003` law 都视为必须复用
- 不复活组件 glue

## Success Bar

要想通过这一轮，`AC4.3` 必须同时满足：

1. internal lane 不长成第二系统
2. `dsl` 不变成隐性垃圾槽位
3. diagnostics / read-route 证据不弱于 `AC3.3`
4. public surface 的减少是真实收益，不是把复杂度藏进 internal
5. 至少在一条主轴上对 `AC3.3` 形成清晰严格改进

## Required Pressure Points

### P1. Internal Second-System Risk

- internal lane 是否拥有独立 owner / trace / contract

### P2. DSL Abuse

- `dsl` 是否会因为承载 soft fact 而变成黑箱

### P3. Read-Route Evidence

- 去掉 public companion 后，read side 是否仍然可解释

### P4. Diagnostics Cost

- internal soft fact lane 是否会让 diagnostics chain 变深、变隐蔽

## Allowed Outcomes

- `survive`
- `park`
- `reject`

## Writeback Targets

- challenge queue：`discussion.md`
- candidate：`candidate-ac4-no-public-companion-program-lowered.md`
- child ledger：`../../docs/review-plan/runs/2026-04-22-form-api-shape-ac4-r2-no-public-companion-boundary-pressure.md`

## Backlinks

- main candidate：`[candidate-ac3.3.md](./candidate-ac3.3.md)`
- challenger：`[candidate-ac4-no-public-companion-program-lowered.md](./candidate-ac4-no-public-companion-program-lowered.md)`
