# AC4 Champion Challenger Compare

**Role**: `AC4` 停车候选对撞比较  
**Status**: Freeze Recorded  
**Feature**: [spec.md](./spec.md)  
**Current Main Candidate**: [candidate-ac3.3.md](./candidate-ac3.3.md)

## Why Now

`AC4` 顶层扫描已经产出三条停车候选：

- `AC4.1 field-fact-lane`
- `AC4.2 field capability block`
- `AC4.3 no-public-companion-program-lowered`

如果继续并行保留三条，后续成本会升高。
现在最自然的下一步，是把它们拉进同一轮比较，看看：

- 哪条是当前最强 challenger
- 哪些候选可以直接淘汰
- 哪些候选只值得 park，不值得继续投入

## Compare Target

在固定 `AC3.3` 与 `S1 / S2 / C003` 已冻结 law 的前提下，比较下面三条停车候选：

- `[candidate-ac4-field-fact-lane.md](./candidate-ac4-field-fact-lane.md)`
- `[candidate-ac4-field-capability-block.md](./candidate-ac4-field-capability-block.md)`
- `[candidate-ac4-no-public-companion-program-lowered.md](./candidate-ac4-no-public-companion-program-lowered.md)`

核心问题是：

> 谁是当前最值得继续压测的 challenger，谁应该被淘汰，谁应继续作为 parked alternative

## Fixed Baseline

下面这些内容在 `AC4 compare` 内全部冻结：

- `AC3.3` 仍是当前 active candidate
- `S1 / S2 / C003` law 全部视为复用约束
- 不复活已拒绝方向
- 不用局部 DX、命名偏好、helper 便利性单独挑战主线

## Success Bar

要想在本轮胜出，候选必须同时满足：

1. 在 `concept-count / public-surface` 至少不弱于另两条 parked challenger
2. 在 `proof-strength / runtime clarity / future-headroom` 至少一个轴上明显更强
3. 不放松 owner split
4. 不放大 second-system 风险
5. 能吸收 `S1 / S2 / C003` law

## Allowed Outcomes

本轮只允许三种结果：

- `preferred challenger`
- `park`
- `reject`

## Writeback Targets

- challenge queue：`discussion.md`
- current candidate：`candidate-ac3.3.md`
- child ledger：`../../docs/review-plan/runs/2026-04-22-form-api-shape-ac4-champion-challenger-compare.md`

## Backlinks

- current main candidate：`[candidate-ac3.3.md](./candidate-ac3.3.md)`
- parked challengers：
  - `[candidate-ac4-field-fact-lane.md](./candidate-ac4-field-fact-lane.md)`
  - `[candidate-ac4-field-capability-block.md](./candidate-ac4-field-capability-block.md)`
  - `[candidate-ac4-no-public-companion-program-lowered.md](./candidate-ac4-no-public-companion-program-lowered.md)`
