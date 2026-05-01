---
title: Form Semantic Closure Contract
status: consumed
owner: form-semantic-closure-contract
target-candidates:
  - docs/ssot/form/02-gap-map-and-target-direction.md
  - docs/ssot/form/03-kernel-form-host-split.md
  - docs/ssot/form/05-public-api-families.md
  - docs/ssot/form/06-capability-scenario-api-support-map.md
  - docs/ssot/form/07-kernel-upgrade-opportunities.md
  - docs/ssot/form/13-exact-surface-contract.md
last-updated: 2026-04-16
---

# Form Semantic Closure Contract

> superseded / stale hazard
>
> 本页保留作历史 planning 材料，不再作为当前 authority 输入。
> 当前 `P0` 主链统一回 `docs/next/form-p0-semantic-closure-wave-plan.md`，
> exact carrier / decode bridge 统一回 `docs/next/form-error-decode-render-closure-contract.md` 与对应 SSoT 页。

## 目标

把 Form 还没完全冻结的终局问题压成一份最小 authority proposal。
本轮只补 semantic closure 的 delta，不重写已冻结事实。

本页覆盖的用户关切仍然是这 7 项：

1. 全错误源统一 carrier
2. 错误渲染边界正式合同
3. `reason contract` 的 exact shape
4. async validation 和 submit gate 的终局模型
5. 动态结构编辑的终局模型
6. declaration carrier 与命名关系
7. 最小组合体验

其中第 7 项在本轮只作为 corollary，不再作为一级 closure target。

## 角色

- 本页已被消费，只保留 adopted delta
- 当前权威事实已回写到目标 SSoT
- 没变化的合同继续只链接，不重述

一旦收口，优先回写：

- [02-gap-map-and-target-direction.md](../ssot/form/02-gap-map-and-target-direction.md)
- [03-kernel-form-host-split.md](../ssot/form/03-kernel-form-host-split.md)
- [05-public-api-families.md](../ssot/form/05-public-api-families.md)
- [06-capability-scenario-api-support-map.md](../ssot/form/06-capability-scenario-api-support-map.md)
- [07-kernel-upgrade-opportunities.md](../ssot/form/07-kernel-upgrade-opportunities.md)
- [13-exact-surface-contract.md](../ssot/form/13-exact-surface-contract.md)

## Imported Freezes

本轮直接继承下面这些已冻结口径：

- 单一 declaration authority、单一 evidence authority、三类 verification coordinates：
  - [form-static-ir-trial-contract.md](./form-static-ir-trial-contract.md)
- rule-originated failure 只承认 token carrier，rendered string 退出 canonical truth：
  - [form-rule-i18n-message-contract.md](./form-rule-i18n-message-contract.md)
- public composition law 继续只有一条：
  - [2026-04-16-form-public-composition-law-review.md](../review-plan/runs/2026-04-16-form-public-composition-law-review.md)

因此本轮不再重审：

- `FormProgram` 是否还是唯一公开组合单元
- `FormDeclarationContract` 是否还是唯一 declaration authority
- compare 的 digest 主轴
- i18n service 的 owner 身份

## 本轮新增 adopted delta

### D1. cross-source error 继续只有一个 leaf，但必须补显式 lower authority

本轮新增冻结：

```ts
type FormErrorLeaf = {
  origin: "rule" | "decode" | "manual" | "submit"
  severity: "error" | "warning"
  code?: string
  message: I18nMessageToken
}
```

这条 leaf 现在继续作为唯一错误 carrier。
新增的闭环点不是“再给它加字段”，是把四类来源的 lower authority 写死：

- `rule`
  - 继续走 `Form.Rule` declaration
- `decode`
  - 继续走 `Form.SchemaErrorMapping`
- `manual`
  - 只允许写入已经成形的 `FormErrorLeaf`
- `submit`
  - 只允许走显式 submit error mapper

这意味着：

- `decode / manual / submit` 不再允许靠隐式字符串或隐式 token 推断进入 leaf
- `Form.SchemaErrorMapping` 在 future 口径中升为 decode-origin canonical mapper
- `handle.setError(...)` 的 future contract 只接 `FormErrorLeaf`

### D2. render boundary 只冻结边界公式，不冻结 member 细节

本轮新增冻结：

- render boundary 只认三元公式：
  - `leaf`
  - `snapshot`
  - render-only context

本轮明确不冻结：

- `label / rich / fallback` 的 exact member shape
- render helper 的参数对象 spelling
- snapshot 的 owner

本轮只补一条 owner law：

- `Form.Error` 最多只能生成 render input
- render execution 继续归 i18n service

### D3. `reason contract` 从字符串 slot 升为结构化 `reasonSlotId`

本轮新增冻结：

```ts
type ReasonSlotId = {
  scope: "field" | "list" | "root" | "submit"
  path?: string
  subjectRef?: {
    kind: "row" | "task" | "cleanup"
    id: string
  }
}
```

这里的关键变化是：

- row identity 不再藏在 side ref
- task locality 不再藏在 side ref
- cleanup receipt locality 不再藏在 side ref

`reasonSlotId` 继续是现有 noun。
本轮不新增第二个 address noun。

### D4. reason leaf family 收紧到 base facts，blocking 改成 submit summary

本轮新增冻结：

```ts
type ReasonLeaf =
  | { kind: "error"; error: FormErrorLeaf }
  | { kind: "pending"; submitImpact: "block" | "advisory" }
  | { kind: "cleanup"; cause: "inactive" | "remove" | "replace" | "remap" }
  | { kind: "stale" }
```

本轮直接删除 canonical `blocking` leaf。

新的规则是：

- `error / pending / cleanup / stale` 才是 base facts
- submit gate 只从同一份 base facts 纯归约 blocker summary
- blocker summary 不再和 leaf family 并列持有第二真相
- task identity 只允许落在 `reasonSlotId.subjectRef.kind="task"`

### D5. async submit gate 必须基于单一 `submitAttempt` snapshot

本轮新增冻结：

- submit 的 step 1 收敛对象，必须是一份显式 `submitAttempt` snapshot
- contributor explanation 只回链 `reasonSlotId`

这意味着：

- pending 在 submit 期间 later resolve 时，若越过该 snapshot，就继续按 `stale` 解释
- blocked-by explanation 不再靠运行时时序故事闭合
- async submit gate 现在可以被 compare 和 repair 稳定引用

### D6. 动态结构编辑正式区分 positional edit 和 identity edit

本轮新增冻结：

- positional edit：
  - `append / prepend / insert / remove / swap / move / replace`
- identity edit：
  - `byRowId(rowId).update(...)`
  - `byRowId(rowId).remove(...)`

本轮还新增两条硬规则：

1. `replace(nextItems)` 继续视为 roster replacement
2. row-sensitive continuity 只能显式走 `byRowId(...)` 与 `reasonSlotId.subjectRef.kind="row"`

这意味着：

- runtime 不再靠隐式 identity 猜测替用户补语义
- cleanup / remap / compare / repair 都能共用同一 row 坐标

### D7. declaration carrier 本轮只补 residual decision，不重开 naming

本轮新增冻结：

- `FormDeclarationContract` 继续保留现有命名
- `RulesManifest` 退出 future vocabulary
- `activeShapeSlice / settlementSlice / reasonProjectionSlice` 继续保留现有命名

这轮的判断是：

- naming churn 当前换不来更强 proof
- 真正要补的是这些 slice 如何吸收 D1 到 D6 的新合同

### D8. `Form.Error` 缩成 data-support only

本轮新增冻结：

- `Form.Error` 只允许承接：
  - canonical leaf constructor
  - selector descriptor factory
  - `toRenderInput` 这类纯数据 normalizer

本轮明确禁止：

- host acquisition
- subscription helper
- render execution
- snapshot ownership
- package-local projection family

这条负约束用于防止 `Form.Error` 漂成第三 route。

### D9. 最小组合体验只作为 corollary

本轮新增冻结：

- semantic closure 不再把教学路径当一级 target
- 教学主线只作为 downstream acceptance proof

当前唯一 corollary 继续是：

1. `Form.make(...)`
2. `useModule(formProgram, options?)`
3. `useSelector(handle, selector, equalityFn?)`
4. `Form.Error` 只做 data-support

这条 corollary 只允许回写到：

- [05-public-api-families.md](../ssot/form/05-public-api-families.md)
- [13-exact-surface-contract.md](../ssot/form/13-exact-surface-contract.md)

## Surface Impact Matrix

| delta | public exact contract | internal support | residue / rejected |
| --- | --- | --- | --- |
| D1 `FormErrorLeaf` | `FormErrorLeaf` shape、`handle.setError` future carrier | source-specific lower adapters | raw string error、`unknown` error |
| D2 render boundary | 只有 `leaf + snapshot + render-only context` 公式 | `Form.Error.toRenderInput` | package-local render executor |
| D3 structured `reasonSlotId` | path、scope、`subjectRef` 合同 | normalization、repair、machine report | row/task/cleanup 藏进 side refs |
| D4 base reason leaves | `error / pending / cleanup / stale` | submit summary reducer | canonical `blocking` leaf |
| D5 `submitAttempt` snapshot | submit gate explanation contract | settlement snapshot capture | 纯时序解释的 blocked-by |
| D6 `byRowId` | identity edit exact surface | owner remap、cleanup receipts | `replace` 做隐式 identity 猜测 |
| D8 `Form.Error` negative contract | data-support only | selector descriptor factory | hook family、projection family、render façade |

## Semantic Closure Freeze Gate

只有同时满足下面条件，才允许把本轮 delta 写回 SSoT：

1. cross-source error lower authority 已明确
   - `rule / decode / manual / submit` 各有唯一 lower owner
2. row ownership coordinate 已明确
   - row / task / cleanup 都能进入稳定 `reasonSlotId.subjectRef`
3. async submit gate 已可比较
   - `submitAttempt` snapshot、`reasonSlotId` explanation 已成立
4. public surface 已结算
   - `Form.Error` 的 exact budget 与负约束明确
5. blocker truth 已单一
   - canonical `blocking` leaf 不回流

## Writeback Owners

### [02-gap-map-and-target-direction.md](../ssot/form/02-gap-map-and-target-direction.md)

- D1 `FormErrorLeaf`
- D3 structured `reasonSlotId`
- D4 base reason leaves
- D5 `submitAttempt`
- D6 positional edit / identity edit

### [03-kernel-form-host-split.md](../ssot/form/03-kernel-form-host-split.md)

- D2 render boundary owner split
- D5 submit gate owner split
- D6 row ownership owner split
- D8 `Form.Error` negative contract

### [05-public-api-families.md](../ssot/form/05-public-api-families.md)

- D9 minimal composition corollary
- D8 `Form.Error` route budget

### [06-capability-scenario-api-support-map.md](../ssot/form/06-capability-scenario-api-support-map.md)

- D1 cross-source error witness
- D5 async submit gate witness
- D6 identity edit witness

### [07-kernel-upgrade-opportunities.md](../ssot/form/07-kernel-upgrade-opportunities.md)

- D3 structured `reasonSlotId`
- D4 base leaf normalization
- D5 `submitAttempt` snapshot
- D6 row ownership continuity

### [13-exact-surface-contract.md](../ssot/form/13-exact-surface-contract.md)

- D1 future `setError` carrier
- D6 `fieldArray(...).byRowId(...)`
- D8 `Form.Error` exact support role
- D9 teaching corollary

## 当前一句话结论

Form 剩余终局问题现在可以压成一条真正可写回的 closure delta：跨 source 错误仍只用一条 `FormErrorLeaf`，但必须补显式 lower authority；reason 与动态结构编辑继续共用结构化 `reasonSlotId`；async submit gate 继续只从 base facts 和单一 `submitAttempt` snapshot 归约；`Form.Error` 只做 data-support，不再向 host 或 render 扩张。
