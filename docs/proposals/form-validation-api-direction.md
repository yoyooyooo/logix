---
title: Form Validation API Direction
status: consumed
owner: form-validation-api-direction
target-candidates:
  - docs/ssot/form/02-gap-map-and-target-direction.md
  - docs/ssot/form/03-kernel-form-host-split.md
  - docs/ssot/form/06-capability-scenario-api-support-map.md
last-updated: 2026-04-16
---

# Form Validation API Direction

## 目标

把 form validation 的 future planning 收成一份单一 authority proposal。

本轮只回答三件事：

1. 当前实现离未来 validation 终局还差什么
2. Effect Schema、Form Rule、Schema bridge 的边界该怎么切
3. 哪些 validation delta 值得进入 form SSoT 的未来规划

本轮不做：

- competitor survey 常驻 authority
- exact surface reopen
- 第二 schema world
- 第二 parse/result contract
- 第二 transform contract

## 角色

- 本页已被消费，只保留 adopted delta
- 当前权威事实已回写到目标 SSoT
- 当前实现评估只作为 drift snapshot，不进入 SSoT snapshot authority

## Imported Freezes

这份 proposal 直接继承下面这些已冻结输入：

- semantic closure：
  - [form-semantic-closure-contract.md](./form-semantic-closure-contract.md)
- static IR / trial：
  - [form-static-ir-trial-contract.md](./form-static-ir-trial-contract.md)
- rule x i18n carrier：
  - [form-rule-i18n-message-contract.md](./form-rule-i18n-message-contract.md)
- RHF harvest：
  - [form-rhf-capability-harvest.md](./form-rhf-capability-harvest.md)
- react exact host law：
  - [../ssot/runtime/10-react-host-projection-boundary.md](../ssot/runtime/10-react-host-projection-boundary.md)

因此本轮默认继续拒绝：

- resolver-first 成为 Form 主模型
- string message 成为 canonical validation contract
- Form 自己再长一套 schema world
- Form 自己再长一套 metadata / parse / transform 世界
- 第二 hook family
- 第二 host truth

## Current Drift Snapshot

当前代码层已经成立的 validation 主线：

- field / list.item / list.list / root 同一 Rule DSL
- `deps`
- `validateOn / reValidateOn`
- RHF-like builtins
- schema decode bridge
- row identity 相关 validation 场景测试

当前代码层还没收口的点也很明确：

- `RuleFn` 仍是：
  - `(input, ctx) => unknown | undefined`
- builtins 仍主要返回 string message
- `SchemaErrorMapping.toLeaf` 默认写 raw schema error
- `commands.validate / handleSubmit` 默认走同步 `Schema.decodeUnknownSync`
- `setError(path, error)` 当前实现仍接受 `unknown`
- error 计数仍承认 string leaf 和 `{ message, code?, details? }`

这说明 validation 现在的真实状态是：

- 语义方向已经明显领先
- 代码合同仍带着 sync-first、string-first、unknown-first residue

## Validation Adoption Gate

每个 future delta 都必须先冻结下面 5 项：

| gate | 说明 |
| --- | --- |
| authority bucket | 它落在 `form semantic planning`、`owner split corollary`、还是 `witness coverage` |
| canonical-or-derived | 它是 canonical truth，还是既有 truth 的派生视图 |
| proof obligation | 它要补哪条 witness / lifecycle / lowering / ownership 证明 |
| exact-surface reopen bar | 它是否触碰 exact surface；若触碰，当前是否 blocked |
| writeback owner | 它最后只允许写回哪一页 |

这轮额外多一条 Effect-first 硬门：

- 只要 Effect Schema 或 Effect 现有 API 已经足以承接某项能力，Form 就不能再发明第二套同类 contract

## Adopted Candidate

本轮 adopted candidate 只保留 5 个 delta：

### D1. validation ownership overlay

这轮不再把 `Schema lane / Rule lane / Bridge lane` 写成新的 root grammar。
它们只是一条附着于既有 root grammar 的 validation routing law：

| overlay | 角色 | 挂靠位置 |
| --- | --- | --- |
| Schema owner | 外部 structural authority | 外部，不升为 Form root lane |
| Rule owner | form-specific validation semantics | `settlement lane + reason contract` |
| schema bridge | decode-origin lowering + path mapping | `reason contract` 的 cross-source lowering corollary |

额外限制：

- `validating projection obligation` 继续归 React host
- canonical reasons / evidence 继续归 field-kernel 与 runtime control plane
- Form 只持有：
  - rule semantics
  - cross-source lower authority
  - submit summary / lifetime 语义

### D2. schema bridge 只认 Effect Schema canonical outputs

本轮把 schema interop funnel 写死成：

```text
external schema
  -> adapter
  -> Effect Schema contract
  -> schema bridge
  -> FormErrorLeaf / reason inputs
```

这里的关键点是：

- bridge 不再直接认识多个 parse/result vocabulary
- bridge 只消费 Effect Schema canonical output family
- Zod 等外部 schema 只允许停在 adapter 层

这意味着：

- `SchemaErrorMapping` 的 future 角色是 schema-lane canonical bridge entry
- second schema world 的入口被封死

### D3. effectful rule lowering law

本轮不再冻结新的 `RuleOutcome / RuleEffect` noun。
只冻结一条 lowering law：

- internal validator 一律 lower 到 Effect
- 同步 builtins 和同步自定义规则只作为 sugar lift 进入同一 internal contract
- internal contract 的输出必须直接 lower 到：
  - canonical `FormErrorLeaf`
  - 或既有 reason / evidence 输入

额外要求：

- async validation 必须继续 lower 到既有 `settlement contributor`
- 继续显式绑定：
  - `submitImpact`
  - `task locality`
  - keyed concurrency
  - stale/drop witness
  - submit-gate witness

这意味着：

- Effect-first 不等于公开 surface 返回新的 machine issue object
- Effect-first 只要求执行路径 effectful、lowering 单线化

### D4. derived issue projection

本轮不再引入独立 `ValidationIssue` noun。

若 diagnostics、export、repair、control-plane 需要扁平 issue 视图，只允许从下面这些既有 truth 纯派生：

- `FormErrorLeaf`
- `ReasonSlotId`
- `sourceRef`
- canonical evidence envelope

这条派生视图：

- 不进入 state
- 不进入 reason truth
- 不进入 rule authoring return
- 不进入 compare 主轴

### D5. annotation routing law

Form validation 当前继续持有 0 个新的 annotation noun。

这轮只补一条 routing law：

- 当 Effect Schema annotations 存在时，Form 可以消费它们
- Form 不新增自己的 annotation family

这意味着：

- `identifier / title / description / examples` 若需要进入 validation planning，只能作为 Effect Schema annotations 的 read-profile
- Form 不再落一份 metadata 名单

## Writeback Owners

### [02-gap-map-and-target-direction.md](../ssot/form/02-gap-map-and-target-direction.md)

只回写：

- validation ownership overlay 的 gap 与映射
- schema bridge funnel
- effectful rule lowering law
- annotation routing law

### [03-kernel-form-host-split.md](../ssot/form/03-kernel-form-host-split.md)

只回写：

- validation owner split 的一致性 corollary
- schema owner / rule owner / schema bridge 的 owner overlay

不在本页新增：

- validating projection 的新 owner
- canonical evidence 的新 owner

### [06-capability-scenario-api-support-map.md](../ssot/form/06-capability-scenario-api-support-map.md)

只回写 witness：

- schema bridge witness
- effectful rule witness
- submit contributor witness
- derived issue projection witness

本轮明确不写回：

- [01-current-capability-map.md](../ssot/form/01-current-capability-map.md)

原因很简单：

- 01 只做 current snapshot
- drift、future delta、lane split 都继续留在 02/03/06

## 当前一句话结论

form validation 的 future direction 现在可以收成一条更小的 Effect-first planning law：Effect Schema 继续持有 structural validation authority，Form 继续持有 form-specific rule semantics，schema bridge 继续只做 decode-origin lowering；effectful rule 只作为既有 settlement contributor 的 lowering law，任何 diagnostics/export 需要的 issue 视图都只能从既有 truth 纯派生。
