# C004 Concrete Spelling Under Fixed Hard Law

**Role**: `AC3.3` concrete spelling challenge brief  
**Status**: Freeze Recorded  
**Feature**: [spec.md](./spec.md)  
**Parent Candidate**: [candidate-ac3.3.md](./candidate-ac3.3.md)

## Why Now

`155` 的硬原则已经基本冻结：

- `AC3.3` 继续作为唯一 implementation baseline
- `P10 carrier-neutral atomic bundle law` 已冻结
- `P11 single host gate and read-input taxonomy` 已冻结
- owner law / read law / diagnostics law 暂不重开

当前剩余的 planning-phase 优化点，已经从顶层骨架收缩到 concrete spelling：

- `field(path).companion(...)` 这个 noun 是否还是最优
- `lower(ctx)` 这个 callback 名是否还是最优
- 当前 baseline sketch 是否还需要更顺手的 authoring 入口表述

## Challenge Target

在固定 `AC3.3` 顶层骨架、`P10`、`P11`、`S1`、`S2`、`C003` 已有 freeze 的前提下，评估下面这个问题：

> local-soft-fact lane 的 concrete spelling，当前是否仍应保持 `field(path).companion({ deps, lower })`，还是存在一个 strictly better 的 exact spelling，能在不重开硬原则的前提下提升 authoring 手感、Agent first 生成质量与教学清晰度。

## Current Baseline

- current baseline sketch：`field(path).companion({ deps, lower })`
- current freeze：`C004.1 no strictly better concrete spelling under fixed hard law`
- current hard law：
  - 只冻结 carrier-neutral 语义，不冻结 exact authoring carrier
  - 单 owner
  - 单 frame
  - 单 input authority：`value / deps / source?`
  - 单语义结果：`clear` 或 `bundle`
  - 单次 owner-local atomic bundle commit
  - 单 evidence envelope
- current defers：
  - exact read carrier noun
  - exact diagnostics object
  - exact `ui` landing path
  - `list().companion / root().companion`

## Fixed Baseline

下面这些内容在 `C004` 内全部冻结：

- `source / local-soft-fact lane / rule / submit / host` 的 owner split
- `field-only local-soft-fact lane`
- day-one slot 继续只认 `availability / candidates`
- canonical host gate 继续只认 `useModule + useSelector(handle, selectorFn)`
- 不新增第二 read family、第二 diagnostics truth、第二 workflow
- 不把 exact carrier shape 重新抬回 hard contract
- 当前 reopen surface 继续服从 [spec.md](./spec.md)

## Success Bar

要想形成 strictly better candidate，必须同时满足：

1. 不重开 hard law
2. 不扩大 public surface
3. 不新增第二 helper family 或第二 authoring lane
4. 不把 read-side noun 倒灌回 authoring side
5. 对 Agent first 生成、教学与 author 手感形成明确严格改进
6. 在 `concept-count / public-surface / proof-strength / future-headroom` 上形成严格改进，或在核心轴不恶化时显著提高 `proof-strength`

## Required Questions

本轮 reviewer 必须回答：

1. `companion` 是否仍是当前最优 noun
2. `lower` 是否仍是当前最优 callback spelling
3. 当前 baseline sketch 是否已经足够作为 implementation baseline
4. 是否存在更小、更顺手、误导更少的 exact spelling
5. 若不存在，当前 no-better verdict 应如何冻结

## Allowed Search Space

本轮允许搜索的方向：

- 保持 `companion / lower`
- 只替换 noun
- 只替换 callback spelling
- 在不重开 hard law 的前提下，改写 baseline sketch 的 authoring carrier 表达
- 给出 `no strictly better candidate` verdict

## Rejected-by-Default Directions

下面这些方向默认拒绝：

- 重开 `watch / computed / derive` family
- 把本地协调塞回 `source`
- 倒灌 read-side `projection`、selector noun、path grammar
- 打开 `list/root` local-soft-fact lane
- 用 patch / emit / builder 语言把 evidence 层直接抬成 day-one public contract
- 仅凭词面喜好发起 reopen

## Expected Outputs

本轮允许两种输出：

- 一个 strictly better concrete spelling candidate
- 一个 `no strictly better candidate` verdict，并把 residual 再收紧

## Writeback Targets

- challenge queue：`discussion.md`
- parent candidate：`candidate-ac3.3.md`
- user-facing summary：`signoff-brief.md`
- ledger：`../../docs/review-plan/runs/2026-04-23-form-api-shape-c004-concrete-spelling.md`

## Backlinks

- stable principles / gates：`[spec.md](./spec.md)`
- current strongest candidate：`[candidate-ac3.3.md](./candidate-ac3.3.md)`
- user-facing snapshot：`[signoff-brief.md](./signoff-brief.md)`
