# S1-R3 Diagnostics Host-Side Proof

**Role**: `S1-R2` 的 residual 子挑战 brief  
**Status**: Freeze Recorded  
**Feature**: [spec.md](./spec.md)  
**Parent Challenge**: [challenge-s1-r2-owner-binding-carrier.md](./challenge-s1-r2-owner-binding-carrier.md)  
**Parent Candidate**: [candidate-ac3.3.md](./candidate-ac3.3.md)

## Why Now

`S1` 的 read side 已经补出了：

- sanctioned read route
- selector recipe
- row-heavy carrier admissibility

当前剩下的最小缺口之一，是 host-side diagnostics proof。

如果这一层不补，维护者仍然难以稳定解释：

- 当前读到的 companion fact 来自哪一条 owner
- 它对应哪一次 bundle patch
- `replace / cleanup / stale` 后为什么现在还是这个解释

## Challenge Target

在固定 `S1.1`、`S1-R1.1`、`S1-R2.1` 的前提下，评估下面这个问题：

> host 侧需要什么最小 diagnostics proof，才能解释 companion read side，而不长第二 diagnostics truth 或 companion 专属 helper

## Current Freeze

- adopted subcandidate：`S1-R3.1 evidence-envelope host backlink law`
- current verdict：当前存在 strictly better diagnostics proof law
- frozen law：
  - diagnostics proof 继续停在同一个 evidence envelope 内
  - host 侧不新增 explain object、report shell、helper family、ui path readback
  - 对任一 companion selector read，host-side proof 至少要能 backlink：
    1. `ownerRef`
    2. 当前 read 的 sanctioned slot
    3. `canonicalRowIdChain?`
    4. `bundlePatchRef`
    5. `reasonSlotId?`
    6. `sourceRef?`
  - `stale / cleanup` 只允许作为 retirement backlink 或 cleanup receipt backlink
  - `stale / cleanup` 不得形成继续参与读取的残留 truth
  - 当前不冻结 exact object shape、字段名、direct reader、helper noun、path grammar
- current residual：
  - `bundlePatchRef` 如何稳定覆盖 bundle clear / retirement 仍需更强 proof
  - 若未来出现 per-slot patch cadence 或分离的 `sourceRef` 主线，bundle-level proof 可能需要重开
- ledger：`../../docs/review-plan/runs/2026-04-22-form-api-shape-s1-r3-diagnostics-proof.md`

## Fixed Baseline

下面这些内容在 `S1-R3` 内全部冻结：

- canonical read route 继续只认 `useModule + useSelector(handle, selectorFn)`
- selector recipe 继续固定为 owner-first / slot-only / rowId-first law
- row-heavy carrier 继续只冻结 admissibility law
- 不新增 helper noun、token、path grammar、第二 diagnostics family
- 不重开 `source / companion / rule / submit / host` owner split
- 不重开 `field-only` owner scope
- 不重开 `availability / candidates` slot inventory
- 不冻结 `field.companion` projection bucket

## Success Bar

要想在 `S1-R3` 内形成 strictly better candidate，必须同时满足：

1. diagnostics proof 能解释 `source -> lower -> bundle patch -> selector read`
2. 不新增第二 diagnostics truth
3. 不新增 companion 专属 helper family
4. 不暴露 `ui` 内部 path
5. 与 `153` reason / evidence authority 一致
6. 与 `S1-R1.1`、`S1-R2.1` 的 owner-first / rowId-chain / stale-cleanup law 一致

## Required Proof Set

### W1. Bundle Patch Readback

- 需要解释当前 `availability / candidates` 来自哪一次 owner-local atomic bundle patch

### W2. Row-Heavy Backlink

- nested list / byRowId / reorder 下，需要解释当前 read 对应哪条 canonical rowId chain

### W3. Cleanup / Stale

- `delete / hide / replace / active exit` 后，需要解释 stale / cleanup backlink
- 这些解释不得形成新的可读取 truth

### W4. Reason Authority Alignment

- diagnostics proof 必须能回链到 `reasonSlotId / sourceRef / evidence envelope`
- 不允许 host 自建第二解释对象

## Allowed Search Space

本轮允许搜索的方向：

- 冻结 diagnostics proof law
- 冻结最小 backlink 集合
- 给出 candidate-level pseudo evidence shape
- 继续把 exact helper / object view / report shell 保持 deferred

## Rejected-by-Default Directions

下面这些方向默认拒绝：

- companion 专属 diagnostics helper
- 第二 explain object / 第二 report truth
- 暴露 `ui` path 作为解释面
- 为 diagnostics 顺手重开 read-side helper family

## Key Questions

本轮 reviewer 必须回答：

1. diagnostics proof 现在是否应该冻结
2. 如果冻结，最小 backlink 集合是什么
3. 如果不冻结，当前 no-better verdict 应如何表述
4. cleanup / stale proof 如何保持 subordinate，不形成第二 truth
5. `153` 的 reason authority 如何与 read side 机械对齐

## Expected Outputs

本轮允许两种输出：

- 一个 strictly better 的 diagnostics proof candidate
- 一个 `no strictly better candidate` verdict，并把 residual 再收紧

## Writeback Targets

- parent challenge：`challenge-s1-r2-owner-binding-carrier.md`
- challenge queue：`discussion.md`
- parent candidate：`candidate-ac3.3.md`
- child ledger：`../../docs/review-plan/runs/2026-04-22-form-api-shape-s1-r3-diagnostics-proof.md`

## Backlinks

- stable principles / gates：`[spec.md](./spec.md)`
- reason authority：`../153-form-reason-projection/spec.md`
- host law：`../../docs/ssot/runtime/10-react-host-projection-boundary.md`
- current strongest candidate：`[candidate-ac3.3.md](./candidate-ac3.3.md)`
