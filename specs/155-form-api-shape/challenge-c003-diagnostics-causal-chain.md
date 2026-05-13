# C003 Diagnostics Causal Chain

**Role**: `155` 的独立子挑战 brief  
**Status**: Freeze Recorded  
**Feature**: [spec.md](./spec.md)  
**Parent Candidate**: [candidate-ac3.3.md](./candidate-ac3.3.md)

## Why Now

`S1` 已经把 read side 主线收出了：

- sanctioned read route
- selector recipe
- row-heavy carrier admissibility
- evidence-envelope host backlink law

`S2` 也已经确认当前没有必须重开 `list/root companion` 的 owner-scope proof。

现在最适合继续补的，是 `C003 diagnostics causal chain`：

- `source receipt`
- `companion lower`
- `bundle patch`
- `rule / submit outcome`

这条链如果不能被稳定解释，`AC3.3` 还不能安心升 authority。

## Challenge Target

在固定 `AC3.3`、`S1`、`S2` 已有 freeze 的前提下，评估下面这个问题：

> `source -> companion -> rule / submit` 的 diagnostics causal chain 需要冻结到什么程度，才能既可解释，又不长第二 diagnostics system

## Current Freeze

- adopted subcandidate：`C003.1 evidence-envelope derivation-link causal-chain law`
- current verdict：当前存在 strictly better causal-chain law
- frozen law：
  - diagnostics truth 继续只认 `153` 的 evidence envelope
  - 同一 path explain 必须能解释 `error / pending / cleanup / stale`
  - `reasonSlotId.subjectRef` day-one 继续只允许 `row / task / cleanup`
  - canonical evidence envelope 继续喂给 `UI / Agent / trial / compare / repair`
  - materialized report 继续只允许 on-demand subordinate view
  - 当前不新增 explain object、report shell、helper family、ui path readback
  - 对任一 companion/source 驱动的 `rule / submit / pending / blocking` outcome，evidence envelope 必须能机械回链：
    1. `sourceReceiptRef?`
    2. `derivationReceiptRef`
    3. `bundlePatchRef`，kind 仅允许 `write | clear | retire`
    4. `ownerRef + sanctioned slot + canonicalRowIdChain?`
    5. `reasonSlotId`
  - `selectorRead` 若需要记录，只能作为可选 backlink，不能升为第二 authority
  - `stale / cleanup` 只允许通过 `retire` patch 或 `cleanupReceiptRef` 终止旧链，不形成继续参与读取或 blocking 的残留 truth
  - 当前不冻结 direct reader、字段名、exact shape、per-slot causal refs
- current residual：
  - `derivationReceiptRef` 必须保持 envelope 内部引用，不能外溢成公开 receipt API
  - per-slot patch cadence 或分离的 `sourceRef` 主线若出现，可能要求重开
- ledger：`../../docs/review-plan/runs/2026-04-22-form-api-shape-c003-diagnostics-causal-chain.md`

## Fixed Baseline

下面这些内容在 `C003` 内全部冻结：

- `source / companion / rule / submit / host` owner split
- `field-only companion` 作为当前 day-one public contract
- `availability / candidates` 作为当前 day-one slot inventory
- `S1-R3.1` 已冻结的 evidence-envelope host backlink law
- `S2.1` 已冻结的 no-better owner-scope verdict
- `153` 的 reason / evidence authority

## Success Bar

要想在 `C003` 内形成 strictly better candidate，必须同时满足：

1. 能解释 `source receipt -> lower -> bundle patch -> selector read -> rule / submit outcome`
2. 不引入第二 diagnostics truth
3. 不引入 host explain object / report shell / helper family
4. 不暴露 `ui` 内部 path
5. 与 `153` 的 reason / evidence envelope 机械对齐
6. 与 `S1-R3.1` 的最小 backlink law 一致

## Required Proof Set

### W1. Source Receipt To Companion

- 需要解释当前 companion fact 来自哪一次 source receipt

### W2. Bundle Patch To Read

- 需要解释当前 selector read 对应哪一次 owner-local atomic bundle patch

### W3. Rule / Submit Outcome

- 需要解释当前 invalid / pending / blocking / submit result 如何回链前面的 receipt 与 patch

### W4. Cleanup / Stale

- `delete / hide / replace / active exit` 后，需要解释 stale / cleanup backlink 如何退出真相面

## Allowed Search Space

本轮允许搜索的方向：

- 冻结 causal-chain law
- 冻结最小 backlink / envelope obligations
- 给出 candidate-level pseudo chain
- exact diagnostics object shape 继续 deferred

## Rejected-by-Default Directions

下面这些方向默认拒绝：

- 第二 explain object
- 第二 issue tree
- 第二 report truth
- companion 专属 diagnostics helper family
- ui path readback
- 为 C003 顺手重开 `list/root companion`

## Key Questions

本轮 reviewer 必须回答：

1. causal chain 现在是否应该冻结
2. 如果冻结，最小 obligation 集合是什么
3. 如果不冻结，当前 no-better verdict 应如何表述
4. cleanup / stale / submit gate 如何保持 subordinate，不形成第二 system
5. `153` 与 `S1-R3.1` 是否已经足够，还是还差一层 chain law

## Expected Outputs

本轮允许两种输出：

- 一个 strictly better 的 causal-chain candidate
- 一个 `no strictly better candidate` verdict，并把 residual 再收紧

## Writeback Targets

- challenge queue：`discussion.md`
- parent candidate：`candidate-ac3.3.md`
- child ledger：`../../docs/review-plan/runs/2026-04-22-form-api-shape-c003-diagnostics-causal-chain.md`

## Backlinks

- stable principles / gates：`[spec.md](./spec.md)`
- reason authority：`../153-form-reason-projection/spec.md`
- source boundary：`../154-form-resource-source-boundary/spec.md`
- current strongest candidate：`[candidate-ac3.3.md](./candidate-ac3.3.md)`
