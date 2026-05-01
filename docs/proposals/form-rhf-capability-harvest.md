---
title: Form RHF Capability Harvest
status: consumed
owner: form-rhf-capability-harvest
target-candidates:
  - docs/ssot/form/02-gap-map-and-target-direction.md
  - docs/ssot/form/03-kernel-form-host-split.md
  - docs/ssot/form/06-capability-scenario-api-support-map.md
last-updated: 2026-04-16
---

# Form RHF Capability Harvest

## 目标

把 RHF 真正比我们强的用户面能力，压成一份可吸收的 future-planning delta。

本轮只做三件事：

1. 识别 RHF 的真实优势
2. 判断这些优势该落在哪个 authority bucket
3. 只把已经通过 gate 的 delta 写回 form planning authority

本轮不做：

- RHF surface 复刻
- hook family 复刻
- exact surface reopen
- competitor survey 常驻 SSoT

## 角色

- 本页已被消费，只保留 adopted delta
- 当前权威事实已回写到目标 SSoT
- 本页不代持 exact surface、host exact law 或 current snapshot

## Imported Freezes

本轮直接继承下面这些已冻结输入：

- semantic closure：
  - [form-semantic-closure-contract.md](./form-semantic-closure-contract.md)
- static IR / trial：
  - [form-static-ir-trial-contract.md](./form-static-ir-trial-contract.md)
- rule x i18n carrier：
  - [form-rule-i18n-message-contract.md](./form-rule-i18n-message-contract.md)
- public composition law：
  - [2026-04-16-form-public-composition-law-review.md](../review-plan/runs/2026-04-16-form-public-composition-law-review.md)
- react exact host law：
  - [10-react-host-projection-boundary.md](../ssot/runtime/10-react-host-projection-boundary.md)

因此本轮默认拒绝：

- `register / Controller / FormProvider / useWatch`
- string-based error contract
- `FieldError.message?: string`
- `root.serverError` loose bag
- field-array-specific hook family
- Proxy 作为公开 contract

这些拒绝项都来自 imported freezes。
本轮不再重复写 reject matrix。

## RHF 证据锚点

这份 proposal 只基于 RHF 官方 docs 与源码里这几类事实：

- `useFieldArray` 的 `field.id` 与 array action 完整性
- array-level `required / minLength / maxLength / validate`
- `formState.isValidating / validatingFields`
- `useFormState({ name, exact, disabled })`
- `setError` 对 field / not-registered / root/server error 的不同清理行为

## Adoption Gate

每个候选能力必须先回答下面五件事：

| gate | 要回答什么 |
| --- | --- |
| benefit axis | 它改善的是 scenario coverage、projection ergonomics、diagnostics、还是 planning closure |
| authority bucket | 它落在 form semantic planning、host-projection obligation、还是 docs/diagnostics |
| public surface cost | 它是否会新增 noun、第二 hook family、第二 projection family、第二 error contract |
| proof obligation | 它要补哪条 witness / scenario / lifecycle / owner split 证明 |
| writeback doc | 它最终只允许写回哪一个 planning authority |

只允许三种 admission 结果：

- `docs-only`
- `law-neutral writeback`
- `reopen-blocked`

本轮额外硬门：

- `authoring-determinism`
- `evidence-determinism`
- `host-separability`

任何触碰 projection、selector、descriptor 的候选，都必须先过这三门。

## Single Harvest Ledger

| capability basis | RHF strength | adopt_or_reject | authority bucket | surviving delta | rejected RHF shape | proof obligation | writeback owner |
| --- | --- | --- | --- | --- | --- | --- | --- |
| H1 row roster projection | `field.id` 强化 render key 叙事 | `law-neutral writeback` | `host-projection obligation` | 只冻结一条 theorem：`renderKey := rowId` 或 `pure(rowId)`；禁止 render-only synthetic id | `useFieldArray` hook family、独立 render-only id | 证明当前 row identity 在 render / reorder / replace / byRowId 场景里如何稳定投影 | [03-kernel-form-host-split.md](../ssot/form/03-kernel-form-host-split.md), [06-capability-scenario-api-support-map.md](../ssot/form/06-capability-scenario-api-support-map.md) |
| H2 list cardinality basis | array-level `required / minLength / maxLength / validate` | `law-neutral writeback` | `form semantic planning` | 只吸收 `minItems / maxItems`；`required` 只允许作为 `minItems(1)` sugar 或继续 deferred | hook-local rules bag | 证明 list cardinality 与 active-shape presence policy 不重叠 | [02-gap-map-and-target-direction.md](../ssot/form/02-gap-map-and-target-direction.md), [06-capability-scenario-api-support-map.md](../ssot/form/06-capability-scenario-api-support-map.md) |
| H3 validating projection obligation | `isValidating / validatingFields` | `law-neutral writeback` | `host-projection obligation` | 只冻结 validating projection obligation，不冻结命名 selector 列表 | 第二 `formState` family、命名 hook list | 证明 validating facts 如何由既有 reason / settlement 投影，并进入 scenario witness | [03-kernel-form-host-split.md](../ssot/form/03-kernel-form-host-split.md), [06-capability-scenario-api-support-map.md](../ssot/form/06-capability-scenario-api-support-map.md) |
| H4 error lifetime law | `setError` 的 field / global / server persistence 差异 | `law-neutral writeback` | `form semantic planning` | 只吸收单一 lifetime law：`origin × reasonSlotId.scope × clear-trigger` | `root.serverError` bag、来源特例树 | 补齐 canonical mapping 表与 witness 场景 | [02-gap-map-and-target-direction.md](../ssot/form/02-gap-map-and-target-direction.md), [03-kernel-form-host-split.md](../ssot/form/03-kernel-form-host-split.md), [06-capability-scenario-api-support-map.md](../ssot/form/06-capability-scenario-api-support-map.md) |
| H5 exact scoping / selector cookbook | `useFormState({ name, exact, disabled })` | `docs-only` | `docs/diagnostics` | 只保留为 host cookbook 候选，不进入 current SSoT writeback | 第二 `useFormState` / subscribe component family、Proxy host truth | 若未来要升格，必须先证明 diagnostics 或 scenario proof 的净增益 | none |
| H6 array action safety guidance | stack action / empty object / unregister cautions | `docs-only` | `docs/diagnostics` | 只保留为 guardrails、examples、diagnostics copy | runtime semantics cutover | 证明只是文档与 guardrail，不改 semantic contract | none |

## Adopted Candidate

本轮 adopted candidate 只保留三桶：

### 1. form semantic planning

- H2 list cardinality basis
- H4 error lifetime law

### 2. host-projection obligation

- H1 row roster projection theorem
- H3 validating projection obligation

### 3. docs / diagnostics only

- H5 exact scoping / selector cookbook
- H6 array action safety guidance

## Exact Deltas

### D1. row roster projection 不是新 identity，只是既有 row identity 的投影定理

本轮不再把 H1 写成新的 capability gap。
它只补一条 theorem：

- render key 只能等于 `rowId`
- 或只能是 `rowId` 的纯投影
- 不允许第二套 render-only id

这条 delta 不触碰 exact surface。
它只补：

- projection proof
- teaching corollary
- witness coverage

### D2. list-level builtins 只先冻结 cardinality basis

本轮只吸收：

- `minItems`
- `maxItems`

`required` 暂时只允许两种未来命运：

- `minItems(1)` 的 sugar
- 继续 deferred

本轮不把 `required` 升成独立 primitive。

### D3. validating observability 只先冻结 obligation，不冻结命名 selector 列表

本轮只冻结：

- 表单需要有 validating projection
- 这份 projection 必须机械回链到既有 reason / settlement facts
- 它必须通过 core selector law 消费

本轮不冻结：

- `isValidating`
- `validatingFields`
- `validatingRows`

这些 spelling 继续留在 docs-only 候选层。

### D4. error lifetime 只允许走单一 mapping law

本轮把 H4 压成一张单一 canonical mapping：

| origin | `reasonSlotId.scope` | persistence | clear trigger | witness |
| --- | --- | --- | --- | --- |
| `rule` | `field | list | root` | 继续由 active validation truth 驱动 | 对应事实消失、value/structure 改变、active exit | rule validate / revalidate scenarios |
| `decode` | `submit` | 持续到下一次 submit attempt 重算 | 新的 `submitAttempt` 完成或显式 clear | submit decode scenarios |
| `manual` | `field | list | root | submit` | 持续到显式 clear 或对应 slot 被 cleanup | `clearErrors`、active exit、manual overwrite | manual error scenarios |
| `submit` | `submit | root | field | list` | 默认持续到下一次 submit attempt 或显式 clear | 新的 `submitAttempt` 开始或显式 clear | server error scenarios |

这里没有 `global-slot`。
banner 语义只允许回收到：

- `scope="root"`
- `scope="submit"`

### D5. writeback 只允许进入 planning authority，不准把开放问题灌进 exact docs

本轮明确：

- [02-gap-map-and-target-direction.md](../ssot/form/02-gap-map-and-target-direction.md)
  - 承接 H2、H4
- [03-kernel-form-host-split.md](../ssot/form/03-kernel-form-host-split.md)
  - 承接 H1、H3、H4 的 owner split corollary
- [06-capability-scenario-api-support-map.md](../ssot/form/06-capability-scenario-api-support-map.md)
  - 承接 H1、H2、H3、H4 的 witness coverage

本轮明确不写回：

- [01-current-capability-map.md](../ssot/form/01-current-capability-map.md)
- [05-public-api-families.md](../ssot/form/05-public-api-families.md)
- [13-exact-surface-contract.md](../ssot/form/13-exact-surface-contract.md)
- [10-react-host-projection-boundary.md](../ssot/runtime/10-react-host-projection-boundary.md)

原因只有一个：

- 这些页当前要么是 snapshot authority，要么是 exact authority
- 不该承接 comparative gap 或 future question

## 当前一句话结论

RHF 真正值得我们吸收的，只剩四个 delta：row roster projection theorem、list cardinality basis、validating projection obligation、error lifetime law；其余 selector cookbook 与 action safety guidance 只保留为 docs/diagnostics，不进入这轮 SSoT 写回。
