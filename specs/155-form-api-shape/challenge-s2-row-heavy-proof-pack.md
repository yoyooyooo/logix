# S2 Row-Heavy Proof Pack

**Role**: `155` 的独立子挑战 brief  
**Status**: Freeze Recorded  
**Feature**: [spec.md](./spec.md)  
**Parent Candidate**: [candidate-ac3.3.md](./candidate-ac3.3.md)

## Why Now

`S1` 已经把 read side 主线收出四层 freeze：

- `S1.1` sanctioned read route law
- `S1-R1.1` selector recipe law
- `S1-R2.1` row-heavy carrier admissibility law
- `S1-R3.1` diagnostics backlink law

当前最值得继续补的，是 `S2 row-heavy proof pack`。

因为 `AC3.3` 还没有 authority promotion，另一条核心缺口就是：

- row-heavy 复杂场景是否真的持续支撑 `field-only companion`
- 如果不支撑，最早会在什么 proof 上破功

## Challenge Target

在固定 `AC3.3` 与 `S1` 已有 freeze 的前提下，评估下面这个问题：

> 复杂 row-heavy ToB proof 是否继续支撑 `field-only companion`，还是已经出现必须重开 `list/root` 级 soft slice 的强证据

## Current Freeze

- adopted subcandidate：`S2.1 no irreducible owner-scope proof`
- current verdict：当前没有 strictly better owner-scope candidate
- frozen law：
  - 当前 row-heavy proof 仍不足以证明必须重开 `list().companion` 或 `root().companion`
  - `field-only companion + list DSL + source + rule + submit` 仍是当前最小且足够的 owner map
  - `reorder / replace / byRowId / nested list / cleanup / async source / async rule / submit gate` 继续优先回链 `149 / 151 / 152 / 153 / 154`
  - `replace(nextItems)` 继续按 roster replacement 解释
  - active exit 后，`errors / ui / pending / blocking` 一起退出；允许残留的只剩 cleanup receipt
  - `minItems / maxItems` 继续是 canonical list cardinality basis
  - synthetic local id 不得成为 row-heavy 公开真相，也不得偷偷保留 hidden stale identity
  - ergonomics 或 perf 猜测不构成 owner-level reopen 证据
- current residual：
  - 仍缺一个不可分解的 roster-level soft fact proof
  - 仍缺一个证明 `field-only` 重复下沉会造成原子性、diagnostics backlink 或可测性能失真的 proof
- ledger：`../../docs/review-plan/runs/2026-04-22-form-api-shape-s2-row-heavy-proof-pack.md`

## Fixed Baseline

下面这些内容在 `S2` 内全部冻结：

- `source / companion / rule / submit / host` owner split
- `field(path).companion(...)` 作为当前 day-one public contract
- `availability / candidates` 作为当前 day-one slot inventory
- exact `ui` path encoding 继续 deferred
- `list().companion`、`root().companion` 仍是关闭状态
- `S1` 的 read-route / selector / carrier / diagnostics law 已作为 imported freezes

## Success Bar

要想在 `S2` 内形成 strictly better candidate，必须同时满足：

1. 给出不可分解的 row-heavy proof
2. 证明现有 `field-only companion + list DSL + source + rule + submit` 无法承接
3. 不只是组件写法不顺手，必须是 owner-level 失配
4. 在 `concept-count / public-surface / proof-strength / future-headroom` 上形成严格改进，或在核心轴不恶化时显著提高 `proof-strength`

## Required Proof Set

### W1. Reorder

- reorder 后跨行互斥、候选排除、availability explainability 继续成立

### W2. Replace

- `replace(nextItems)` 作为 roster replacement 时，old row companion truth 不得被误保留

### W3. Nested List

- 两层及以上 nested list 下，field-only companion 是否仍能清楚承接本地 soft fact

### W4. Async Source + Async Rule

- row-heavy 场景中，remote source receipt、async rule、submit gate 是否仍能沿 owner split 解释

### W5. Cross-Row + Cross-Column

- 同时存在跨行互斥、跨列联动、跨行唯一、远程 options shaping 时，field-only 是否仍足够

### W6. Cleanup / Retention

- hidden / delete / replace / reorder 后 companion lifecycle 是否仍清晰

### W7. `trackBy` Present / Missing

- `trackBy` 存在时，row truth 是否继续沿 canonical row identity 保持
- `trackBy` 缺失时，系统是否正确退回 proof failure 或 diagnostics residue，而不是制造 synthetic local id 公开真相

## Allowed Search Space

本轮允许搜索的方向：

- 继续为 `field-only` 提供更强 proof 证明
- 给出必须重开 `list().companion` 的 irreducible proof
- 给出必须重开 `root().companion` 的 irreducible proof
- 给出仍然维持 `field-only` 的 no-better verdict

## Rejected-by-Default Directions

下面这些方向默认拒绝：

- 因为实现麻烦就直接放大 owner scope
- 因为渲染方便就把逻辑打回组件 glue
- 把 `list/root companion` 当成更顺手的兜底层
- 为单个 proof 直接长专用 noun family

## Key Questions

本轮 reviewer 必须回答：

1. row-heavy 场景是否已出现不可被 `field-only` 消化的 proof
2. 若有，最小需要重开的 owner scope 是 `list` 还是 `root`
3. 若没有，当前最强 no-better verdict 应如何表述
4. 这些 proof 与 `149 / 151 / 152 / 153 / 154` 的 owner map 是否仍一致
5. diagnostics 与 read-side law 是否还能保持单一真相

## Expected Outputs

本轮允许两种输出：

- 一个 strictly better 的 row-heavy owner-scope candidate
- 一个 `no strictly better candidate` verdict，并写清 irreducible proof 仍不存在

## Writeback Targets

- challenge queue：`discussion.md`
- parent candidate：`candidate-ac3.3.md`
- child ledger：`../../docs/review-plan/runs/2026-04-22-form-api-shape-s2-row-heavy-proof-pack.md`

## Backlinks

- stable principles / gates：`[spec.md](./spec.md)`
- current strongest candidate：`[candidate-ac3.3.md](./candidate-ac3.3.md)`
- row identity theorem：`../149-list-row-identity-public-projection/spec.md`
- cleanup law：`../151-form-active-set-cleanup/spec.md`
- source boundary：`../154-form-resource-source-boundary/spec.md`
