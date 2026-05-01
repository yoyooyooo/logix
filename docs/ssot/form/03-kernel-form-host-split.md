---
title: Kernel Form Host Split
status: living
version: 8
---

# Kernel Form Host Split

## 目标

冻结 form 相关能力应该落在哪一层，避免 form、field-kernel、React host 之间重新长出第二套职责面。

这页在 supporting routing law 下只承接：

- owner split
- semantic obligation
- owner-side negative rules

## 总规则

### field-kernel 承接什么

field-kernel 负责可复用、与表单领域无关、能被多个 domain package 共享的底层机制：

- `deps`
- scope graph
- path canonical
- dirtySet / patchPaths
- list identity
- `trackBy / rowId`
- task ownership
- stale gate
- declaration-time graph / plan / compile
- slim evidence

### Form 承接什么

Form 负责表单领域语义本身：

- `values`
- `errors`
- `ui`
- `$form`
- root semantic lanes
- reason contract 的 public projection
- form runtime authority
- `FormDeclarationContract`
- rule message token declaration

### React host 承接什么

React host 只负责 core-owned host acquisition 与 selector law：

- `useModule(ModuleTag)`
- `useModule(Program, options?)`
- `useImportedModule(parent, ModuleTag)`
- `useSelector(handle, selector, equalityFn?)`
- 未来可能出现的 core host sugar

它不拥有：

- 第二套 form truth
- 第二套 task model
- 第二套 submit model
- 第二套 domain-owned host truth

### runtime control plane 承接什么

`runtime control plane` 负责验证阶段、scenario 计划与机器报告：

- `runtime.check`
- `runtime.trial`
- `runtime.compare`
- runtime-owned `ScenarioPlan`
- machine report / artifact refs / repair hints

它不拥有：

- 第二套 Form declaration authority
- 第二套 reason truth
- 第二套 host truth

## canonical split

### 1. `active-shape lane`

| 面向 | owner | 说明 |
| --- | --- | --- |
| presence / cleanup policy | Form | 领域语义与 active set 定义 |
| list editing / remap / row ownership | Form + field-kernel | Form 定义语义；kernel 执行 ownership/remap |
| cleanup reason 留存 | field-kernel + Form | kernel 产出 canonical evidence；Form 投影到 explain surface |

### 2. `settlement lane`

| 面向 | owner | 说明 |
| --- | --- | --- |
| async validation lane | Form + field-kernel | Form 定义规则语义；kernel 提供 keyed task substrate |
| submit / decode / blocking | Form | 提交语义与 decoded verdict |
| stale / cancel / task lifecycle | field-kernel | 共享底层机制 |

### 3. `reason contract`

| 面向 | owner | 说明 |
| --- | --- | --- |
| canonical reasons / evidence | field-kernel | 唯一底层 authority |
| `$form` 最小 verdict summary | Form | 只保留最小提交或阻塞摘要 |
| pure explain slot / path projection | Form + React host | Form 定义领域语义；host 按 core selector law 消费 |
| React host law | React host | 只消费 projection，不拥有第二 authority |
| scenario plan / machine report | runtime control plane | 只消费 declaration anchors、scenario anchors 与 evidence refs |

## 参与公理

当前固定一条参与公理：

- active set 决定 validation universe、blocking universe 与 explain universe
- 退出 active set 的子树只允许留下终态 cleanup reason，不再贡献 pending 或 blocking

## 具体能力的 owner 裁决

| 能力 | 主 owner | 辅助 owner | 当前裁决 |
| --- | --- | --- | --- |
| `FormDeclarationContract` | Form | field-kernel | Form 持有唯一 declaration authority；`activeShape / settlement / reasonProjection` 只作为 slices 存在 |
| rule message token declaration | Form | `@logixjs/i18n` | 这是跨领域组合边界；Form 声明哪条消息 token，i18n 包只持有 token contract 与 render service；最终文案更新由“错误叶子 + i18n snapshot”在渲染边界联合驱动 |
| cross-source error lowering | Form | `@logixjs/i18n` | `rule / decode / manual / submit` 都必须 lower 到同一 `FormErrorLeaf`；`decode` 继续只通过 decode-origin canonical bridge lowering，`submit` 继续走显式 submit error mapper |
| `presence` | Form | field-kernel | Form 定义 active set；kernel 执行 subtree cleanup 与 row/task owner 回收 |
| `insert / update / replace` | Form | field-kernel | Form 暴露结构编辑语义；kernel 执行 remap；`replace` 固定为 roster replacement，不做隐式 identity 猜测 |
| row roster projection | Form + React host | field-kernel | 这不是第二 identity；render key 只能等于 `rowId` 或 `rowId` 的纯投影；kernel 继续只提供稳定 row locality |
| `byRowId` 结构编辑 | Form | field-kernel | Form 定义语义入口；kernel 负责稳定 ownership，并把 row locality 写入 `reasonSlotId.subjectRef.kind=\"row\"` |
| async validation | Form | field-kernel | Form 定义 contributor 语义与 `submitImpact`；kernel 提供 keyed task substrate，并把 task locality 写入 `reasonSlotId.subjectRef.kind=\"task\"` |
| effectful rule lowering law | Form + field-kernel | Effect Schema | Form 只定义 rule authoring 与 lowering law；internal validator 一律 lower 到 Effect；field-kernel 继续执行 contributor substrate；Effect Schema 继续持有 structural effectful decode / transform 能力 |
| `submitAttempt` snapshot | Form | field-kernel | Form 当前已落地最小 `$form.submitAttempt.summary / compareFeed`；kernel 继续供应 row/task/locality 与后续 contributor facts |
| validating projection obligation | React host | Form + field-kernel | Form 与 kernel 继续只供应 validating facts；host 继续只通过 core selector law 消费这些 facts；本轮不冻结命名 selector 列表 |
| decoded submit payload | Form | 无 | 仅作为 submit-lane output |
| submit summary | Form | field-kernel | Form 保留最小 submit summary；它只从 base facts 纯归约；kernel 供应 reasons / counters / evidence |
| error lifetime law | Form | field-kernel | Form 继续持有 `origin × scope × clear-trigger` 的 canonical mapping；kernel 只供应 slot cleanup、active exit 与 submitAttempt 边界事实 |
| structural schema authority | Effect Schema | Form | structural decode / transform / annotations 默认优先归 Effect Schema；Form 只通过 submit-lane decode bridge 消费它的 canonical outputs |
| decode-origin canonical bridge | Form | Effect Schema + field-kernel | bridge 只承接 submit-lane decode 的 normalized facts、path-first lowering 与 submit fallback；它只消费 Effect Schema canonical output family，不引入第二 parse/result contract |
| control-plane materializer admissibility | runtime control plane | Form + field-kernel | 若 diagnostics/export/report/repair 需要对象化视图，只允许从 `ReasonLeaf.kind + FormErrorLeaf + ReasonSlotId + sourceRef + local coordinates + canonical evidence envelope` on-demand materialize |
| path explain / trial evidence | field-kernel | Form + React host | kernel 产出 canonical reasons / evidence；Form 定义语义；host 通过 core selector law 消费 |
| `Form.Error` data-support | Form | core runtime + `@logixjs/i18n` | 只允许 leaf constructor、selector descriptor factory、`toRenderInput` 这类纯数据辅助；不允许 host acquisition、subscription helper、render execution、snapshot ownership |
| runtime-owned `ScenarioPlan` | runtime control plane | Form | control plane 持有 compiled plan；Form 只提供 scenario read anchors |
| repair local coordinates | Form + runtime control plane | field-kernel | `declSliceId / reasonSlotId / scenarioStepId / sourceRef` 必须稳定且可回链 |
| RHF 风格 host sugar | React host | Form | 只改变 projection，不改变 root lanes、reason contract 或 host owner |

## 判定公式

遇到新能力时，按下面顺序裁决：

1. 如果它直接写 `values / errors / ui / $form`，优先归 Form
2. 如果它只提供 graph、ownership、dirty、task、evidence 之类底层机制，优先归 field-kernel
3. 如果它只定义验证阶段、scenario 计划或机器报告，优先归 `runtime control plane`
4. 如果它只改变 React 使用姿势、订阅方式或组件 DX，优先归 core host projection
5. 如果它只负责 message token contract 或 render service，优先归 `@logixjs/i18n`
6. 如果一个能力会让多层都想拥有同一份状态、同一份 reason truth、同一份 message truth 或同一份 declaration truth，直接视为错误设计，回到单 owner
7. 如果一个能力会把 row / task / cleanup locality 藏到第二套 side refs，直接视为错误设计，统一回到结构化 `reasonSlotId.subjectRef`
8. 如果一个能力会把 validating facts 重新包装成第二套 canonical hook family 或第二套 projection family，直接视为错误设计，统一回到 core selector law
9. 如果一个能力会把 structural decode / transform / annotations 从 Effect Schema 复制到 Form，直接视为错误设计，回到 Effect-first 路由

## 当前一句话结论

field-kernel 继续做 substrate，Form 继续做 `active-shape lane / settlement lane / reason contract` 的领域语义，React host 继续按 core law 消费同一份 truth；cross-source error lowering、`submitAttempt` snapshot、`reasonSlotId.subjectRef` 与 `Form.Error` data-support 现在都已按单 owner 收口，任何会把同一份 reasons 或 host truth 同时塞进多层的设计，默认直接拒绝。
