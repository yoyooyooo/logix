# AC4 Top-Level Direction Scan

**Role**: `155` 的顶层候选发散扫描  
**Status**: Freeze Recorded  
**Feature**: [spec.md](./spec.md)  
**Current Main Candidate**: [candidate-ac3.3.md](./candidate-ac3.3.md)

## Why Now

`AC3.3` 已经过多轮收敛，当前仍是最强主线。

但继续沿 `AC3.3` 内部下钻，会越来越接近 authority / implementation 细节。
在进入更重的 exact authority 准备前，需要做一次顶层方向扫描，确认是否存在能和 `AC3.3` 并列、甚至严格支配它的新主方向。

这轮不是回到旧候选，不复活已经拒绝的方向。

这轮目标是：

- 发散出一批新的 `AC4.*` 顶层候选
- 每个候选必须有完整 public contract sketch
- 每个候选必须和 `AC3.3` 做 strict-dominance 对比
- 失败候选也要留下失败原因，供后续复用

## Current Baseline

当前主线是：

- `AC3.3 companion-residual-closed`
- day-one public contract：`field(path).companion({ deps?, lower(ctx) })`
- owner scope：`field-only`
- slots：`availability / candidates`
- read side：canonical selector route
- diagnostics：evidence-envelope causal chain
- `list/root companion` 关闭，等待 irreducible proof

已吸收的可复用 law：

- `S1.1 selector-only, helper-deferred sanctioned law`
- `S1-R1.1 owner-first slot projection law`
- `S1-R2.1 row-heavy carrier admissibility law`
- `S1-R3.1 evidence-envelope host backlink law`
- `S1-R4.1 exact carrier deferred, byRowId-first reopen bias, no half-freeze`
- `S2.1 no irreducible owner-scope proof`
- `C003.1 evidence-envelope derivation-link causal-chain law`
- `C003-R1.1 exact diagnostics object deferred, no second-system shape`
- `C003-R2.1 single-live-bundle-head supersession law`
- `C003-R3.1 exact evidence shape deferred, opaque-ref law`

## Hard Constraints

任何 `AC4.*` 候选都必须遵守：

- 不复活 generic `watch / computed`
- 不把本地协调塞回 `source`
- 不把组件 glue 作为 canonical owner
- 不把 `choices / candidates / options / lookup` 作为总骨架
- 不默认打开 `field/list/root` 全量 companion family
- 不新增 slot registry / selector family / 多次 merge
- 不引入第二 remote truth、第二 read law、第二 diagnostics truth
- 不暴露 `ui` 内部 path
- 不以成熟生态 feature parity 作为胜出理由
- 不锁死后续 runtime hot path / trace / benchmark 优化空间

## Search Goal

本轮允许大胆挑战：

- `companion` 这个顶层 noun 是否仍是最优
- `field-only` 是否仍是最优 owner scope
- `availability / candidates` 是否仍是最小 slot skeleton
- `lower` 是否仍是最优 callback phase name
- read law 是否应反过来重塑 authoring law
- diagnostics / settlement / reason 是否暗示更高层主骨架

但任何挑战都必须给出比 `AC3.3` 更强的完整候选，而不是只指出局部不顺手。

## Candidate Output Contract

每个 reviewer 必须输出至少一个 `AC4.*` 顶层候选。

候选必须包含：

1. `name`
2. `core idea`
3. `public contract sketch`
4. `what it deletes from AC3.3`
5. `what it reuses from AC3.3`
6. `dominance axes`
7. `failure modes`
8. `verdict`

如果候选不能严格支配 `AC3.3`，也必须保留为 rejected candidate。

## Suggested Perspective Seeds

本轮建议从这些方向发散，但不限定于它们：

- `AC4 fact-lane`
  - 把 `companion` 上提为 field-owned fact lane
- `AC4 owner-view`
  - 从 read route / owner projection 反推 authoring
- `AC4 affordance`
  - 从交互可达性事实组织 API
- `AC4 policy-slice`
  - 从 settlement / reason 边界反推 soft fact
- `AC4 no-new-public-surface`
  - 保持 Form public surface 不新增，把能力留在 Program / Module 内部
- `AC4 field-capability`
  - 把 source / companion / rule 聚合成 field capability grammar

## Strict-Dominance Bar

`AC4.*` 要胜出，必须满足：

1. 在 `concept-count / public-surface` 至少一个核心轴上不差于 `AC3.3`
2. 在 `proof-strength / future-headroom / runtime clarity` 至少一个轴上严格强于 `AC3.3`
3. 不破坏 `source / rule / submit / reason / host` 既有 owner truth
4. 能吸收 `S1 / S2 / C003` 已冻结的 law
5. 不能把已拒绝方向换名复活
6. 能减少系统分裂或 glue，而不是只补更多零件
7. 能保留实现期性能优化与 trace 证据空间

## Writeback Targets

- active queue：`discussion.md`
- current candidate：`candidate-ac3.3.md`
- child ledger：`../../docs/review-plan/runs/2026-04-22-form-api-shape-ac4-top-level-direction-scan.md`
- 若出现严格更优候选：新增 `candidate-ac4-*.md`

## Backlinks

- stable principles / gates：`[spec.md](./spec.md)`
- current candidate：`[candidate-ac3.3.md](./candidate-ac3.3.md)`
- challenge queue：`[discussion.md](./discussion.md)`
