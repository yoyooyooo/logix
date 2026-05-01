---
title: Form Problem Contract
status: living
version: 13
---

# Form Problem Contract

## 目标

冻结 form-facing `P0` problem contract。
当前这页只承接 root grammar 下三条主缺口的长期 authority。

## 判断原则

是否补某项能力，统一按这五个标准裁决：

- 是否直接改善 Agent authoring
- 是否直接改善 runtime clarity
- 是否直接改善 performance
- 是否直接改善 diagnostics
- 是否能直接进入 scenario verification / machine-comparable evidence

并额外增加一条主判据：

- 是否减少了系统分裂、减少了 glue、减少了第二真相或第二习惯用法
- 是否给后续性能优化与 trace 证据保留了空间

若一项能力只会增加 host sugar、增加零件数量、或只是把成熟生态常见零件继续拼接得更全，却不能改善以上几项主判据，默认后置。

## 性能判断原则

当前 `Form` 子树对性能的判断分两层：

- 顶层 API 阶段：
  - 先判断这个方向是否锁死未来优化路线
  - 先判断它是否妨碍 trace、benchmark、diagnostics 证据闭合
- 内核实现阶段：
  - 再用真实可运行逻辑、runtime evidence、真实 benchmark 去证明热路径是否站得住

所以当前不追求：

- 在 API 设计阶段就把内核最优形态一次性定死

当前真正拒绝的是：

- 一眼就看出后续很难优化的方向
- 一眼就看出会放大第二系统、第二真相、第二用法的方向

## 竞争口径

当前 `Form` 子树的竞争口径固定为：

- 不追求在“通用表单能力总量”上全面超过成熟生态
- 优先追求在最难的复合场景里，把 remote fact、本地协调、rule gate、submit、reason、diagnostics 收成更统一的小模型

因此，这页对 `P0` 缺口的判断，优先看：

- 是否还存在多层 glue
- 是否还存在多条真相
- 是否还存在跨层 explainability 断裂
- 是否还存在 owner law 漂移

若答案都是否，即使生态里已有更成熟的单点零件，也不自动构成当前 `P0` 缺口。

## 当前页面角色

- 本页只持有 `P0` root gap ledger 与 closure contract
- 本页不记录 current snapshot
- 本页不持有 exact surface
- 本页不持有 proof / verification evidence matrix
- 本页不持有 implementation landing
- 本页不持有长期 spec 注册表；Form 相关 spec 总入口统一看 [../../../specs/150-form-semantic-closure-group/spec.md](../../../specs/150-form-semantic-closure-group/spec.md)
- current implemented snapshot 继续看 [./01-current-capability-map.md](./01-current-capability-map.md)
- owner split 继续看 [./03-kernel-form-host-split.md](./03-kernel-form-host-split.md)
- convergence DAG 继续看 [./04-convergence-direction.md](./04-convergence-direction.md)
- proof / verification evidence 继续看 [./06-capability-scenario-api-support-map.md](./06-capability-scenario-api-support-map.md) 与 [../runtime/09-verification-control-plane.md](../runtime/09-verification-control-plane.md)
- exact spelling 与 exact carrier 继续看 [./13-exact-surface-contract.md](./13-exact-surface-contract.md)

## canonical grammar

当前 form SSoT 的根语法固定为：

- `active-shape lane`
- `settlement lane`
- `reason contract`

它们之外的项，默认都先视为：

- 派生 contract
- supporting proof
- surface budget
- excluded scope

## 当前 review scope

当前 review scope 固定只开 `P0`。
supporting routing law 不在本页冻结，统一看 [README.md](./README.md)。

## P0 root ledger

| gap_group | priority | depends_on | closure_gate | authority_refs | exit_rule |
| --- | --- | --- | --- | --- | --- |
| `active-shape lane` | `P0` | `none` | presence / cleanup / ownership / remap 闭环 | `02 + 03 + 06` | active set 单独决定 validation / blocking / explain universe |
| `settlement lane` | `P0` | `active-shape lane` | async validation / submit gate / decoded verdict / blocking 闭环 | `02 + 03 + 06 + runtime/09` | submit lane 能单点解释“何时提交、何时阻塞、何时给出 decoded verdict” |
| `reason contract` | `P0` | `active-shape lane + settlement lane` | cross-source lowering / structured reason slot / submit summary 闭环 | `02 + 03 + 06 + 13 + runtime/09` | same truth 能同时供 UI、Agent、trial、compare 消费，而不长第二 authority |

## P0 Spec Routing

长期 spec 总入口统一看：

- [../../../specs/150-form-semantic-closure-group/spec.md](../../../specs/150-form-semantic-closure-group/spec.md)

当前 lane 到 spec 的路由固定为：

| lane | long-lived hub | active members | role split |
| --- | --- | --- | --- |
| `active-shape lane` | `150` | `149`, `151` | `149` 只收 row roster projection theorem；`151` 只收 active set / presence / cleanup law |
| `settlement lane` | `150` | `152` | `152` 只收 contributor grammar、submitImpact、pending/stale/blocking、cardinality basis |
| `reason contract` | `150` | `153` | `153` 只收 path explain、reasonSlot、evidence envelope、compare / repair / trial feed |

另有一个跨 lane boundary member：

- [../../../specs/154-form-resource-source-boundary/spec.md](../../../specs/154-form-resource-source-boundary/spec.md)
  - 冻结 Form × Query/Resource 的 owner boundary、form-local remote dependency 与 full QueryProgram 的分界
  - 由 `151 / 152 / 153` 共同消费，不单独替代任一 lane

本页仍是 authority owner。
spec 只负责把 gap 变成可执行成员，不反向替代本页。

## root lane 1：`active-shape lane`

### 当前范围

- `presence`
- 列表结构编辑
- cleanup
- ownership
- remap

### problem statement

- 条件字段隐藏后，`values / errors / ui / pending task` 的处置还没有统一语义
- 条件子树退出 active set 后，cleanup 与 blocking 退出边界还没有完全闭环
- 结构编辑语义还没有完全闭环，尤其是 cleanup / ownership / remap / roster replacement
- 嵌套列表与条件子树退出 active set 时，仍缺单一 cleanup law
- row-sensitive reasons 还缺稳定坐标，`cleanup / remap / compare / repair` 仍可能被 index 漂移污染

### closure contract

`active-shape lane` 至少要冻结：

- 字段何时进入 active set
- 条件隐藏字段退出 active set 后，value 是否保留必须由 presence policy 显式决定
- 退出 active set 的 subtree 必清：
  - `errors`
  - `ui`
  - pending task
  - blocking contribution
- 退出 active set 后只允许留下 cleanup reason
- 动态列表内的子树退出后如何回收 row ownership
- positional edit 的最终语义：
  - `append / prepend / insert / remove / swap / move / replace`
- identity edit 的最终语义：
  - `byRowId(...).update(...)`
  - `byRowId(...).remove(...)`
- `replace(nextItems)` 固定为 roster replacement，不做隐式 identity 猜测

### exit rule

这条 lane 闭环后，Form 才能稳定定义“什么仍然参与 state、validation、blocking、explain universe”。

### 当前 active-shape 证据任务

当前这条 lane 下，维护者已经把下一条证据任务 固定为：

- [../../../specs/149-list-row-identity-public-projection/spec.md](../../../specs/149-list-row-identity-public-projection/spec.md)
- 长期归档与后续关联统一回 [../../../specs/150-form-semantic-closure-group/spec.md](../../../specs/150-form-semantic-closure-group/spec.md)

它当前只冻结：

- row roster projection 不是第二 identity
- render key 必须回链 canonical `rowId`
- example-local synthetic row id 只算 residue

它当前不冻结：

- exact noun
- import shape
- 完整 `useFormList` helper family

### 当前 active member

当前 lane 的活跃 member spec 固定为：

- [../../../specs/151-form-active-set-cleanup/spec.md](../../../specs/151-form-active-set-cleanup/spec.md)
- shared boundary: [../../../specs/154-form-resource-source-boundary/spec.md](../../../specs/154-form-resource-source-boundary/spec.md)

## root lane 2：`settlement lane`

### 当前范围

- async validation
- submit
- decode
- blocking
- verdict

### problem statement

- 异步校验仍没有作为 field / list / root 规则的一等分支进入 Form DSL
- settlement lane 还没有把 keyed task substrate 收成统一 contributor semantics
- field / list / root async declaration、`submitImpact` 与 contributor 语义仍未完全闭环
- `$form.submitAttempt` 的最小 snapshot、summary 与 compare feed 已落地，当前已经覆盖：
  - sync error / decode truth
  - `submitImpact="block"` 的 active pending snapshot
  - field / list.item / list.list / root submit-time Effect rule lowering
  但 stale/drop 的显式 reason proof 仍未闭环
- decode 失败与 decode 成功后的 payload 还没有形成单一 submit-lane authority
- `$form` 还没有覆盖最小 submit / pending / blocking 归约面

### closure contract

`settlement lane` 至少要冻结：

- async validation 统一 lower 到 `settlement contributor`
- 覆盖范围固定为：
  - field
  - list.item
  - list.list
  - root
- contributor 至少稳定表达：
  - `deps`
  - `key`
  - `concurrency`
  - `debounce`
  - `submitImpact`
- stale drop 继续只产生 reason / evidence，不回写成 error leaf
- submit gate 必须基于单一 `submitAttempt` snapshot
- effectful rule 只允许作为既有 `settlement contributor` 的 lowering law
- sync builtins 与 sync 自定义校验只允许作为 sugar lift 进入同一 internal effectful contract
- submit lane 明确区分：
  - raw values 用于表单编辑
  - decoded payload 用于提交回调与业务调用
- list cardinality basis：
  - `minItems`
  - `maxItems`
- list-level `required` 只允许作为 `minItems(1)` sugar，或继续 deferred
- 阻塞真相只允许一条：
  - active `error` leaf
  - `submitImpact="block"` 的 active `pending` leaf
- `cleanup / stale` 不阻塞 submit

### exit rule

这条 lane 闭环后，Form 才能稳定定义“何时允许提交、何时给出 decoded verdict、何时持续阻塞”。

### 当前 active member

当前 lane 的活跃 member spec 固定为：

- [../../../specs/152-form-settlement-contributor/spec.md](../../../specs/152-form-settlement-contributor/spec.md)
- shared boundary: [../../../specs/154-form-resource-source-boundary/spec.md](../../../specs/154-form-resource-source-boundary/spec.md)

## root contract 3：`reason contract`

### 当前范围

- reasons
- evidence
- submit summary
- verdict summary
- path projection

### problem statement

当前 form 还缺：

- path 级 explain
- 为什么 invalid
- 为什么 pending
- 为什么 stale drop
- 为什么 cleanup 生效
- cross-source error 的显式 lower authority
- `reasons / evidence / submit summary` 的单点 authority
- warning / advisory pending / blocking summary 的统一归约面

### closure contract

`reason contract` 至少要冻结：

- 唯一错误 carrier：
  - `FormErrorLeaf`
  - exact carrier 继续看 [./13-exact-surface-contract.md](./13-exact-surface-contract.md)
- 唯一 cross-source lower authority：
  - `rule -> Form.Rule`
  - `decode -> decode-origin canonical bridge`
  - `manual -> FormErrorLeaf`
  - `submit -> explicit submit error mapper`
- 结构化 `reasonSlotId`
- `reasonSlotId.subjectRef` 只允许：
  - `row`
  - `task`
  - `cleanup`
- base reason leaf family：
  - `error`
  - `pending`
  - `cleanup`
  - `stale`
- canonical `blocking` leaf 退出；submit summary 只从 base facts 纯归约
- path-level reason slot
- submit gate reason slot
- ownership / cleanup reason slot
- kernel canonical evidence 到 Form projection 的唯一映射
- `submitAttempt` 的最小 summary 形状
  - 当前已最小落地到 `$form.submitAttempt.summary / compareFeed`

### exit rule

这条 contract 闭环后，Form 才能把 `$form`、submit gate、path explain 收到同一条 authority。

### 当前 active member

当前 lane 的活跃 member spec 固定为：

- [../../../specs/153-form-reason-projection/spec.md](../../../specs/153-form-reason-projection/spec.md)
- shared boundary: [../../../specs/154-form-resource-source-boundary/spec.md](../../../specs/154-form-resource-source-boundary/spec.md)

## imported gates

下面这些 gate 继续由 bound docs 单点持有：

- participation invariant：看 [./03-kernel-form-host-split.md](./03-kernel-form-host-split.md) 与 [./04-convergence-direction.md](./04-convergence-direction.md)
- validation ownership overlay：看 [./03-kernel-form-host-split.md](./03-kernel-form-host-split.md)
- proof / verification evidence：看 [./06-capability-scenario-api-support-map.md](./06-capability-scenario-api-support-map.md)
- control-plane admissibility：看 [./06-capability-scenario-api-support-map.md](./06-capability-scenario-api-support-map.md) 与 [../runtime/09-verification-control-plane.md](../runtime/09-verification-control-plane.md)
- exact carrier / exact spelling：看 [./13-exact-surface-contract.md](./13-exact-surface-contract.md)

## excluded scope

这些能力明确不进入本页的 `P0` problem contract：

- RHF 风格注册式表面
- 纯 host sugar 型观察 API
- 只改变组件 DX、不改变 runtime 语义的 facade
- optional sugar factory
- docs cookbook

## 当前一句话结论

02 当前只保留 Form 的 `P0` problem contract：`active-shape lane / settlement lane / reason contract` 三件事定义了必须闭合的语义边界；长期 spec 总入口统一回 `150`，而 active members 只负责把本页列出的 gap 逐项变成可执行工件。
