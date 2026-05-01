---
title: Form Capability Scenario API Support Map
status: living
version: 14
---

# Form Capability Scenario API Support Map

## 目标

把 Form 的场景覆盖、API 组合、verification proof、example/docs 锚点收口到单一主矩阵。

这页当前是 Form 场景矩阵的唯一 SSoT。

## 页面角色

- 本页持有唯一稳定的场景矩阵与 `SC-*` 场景 ID
- 本页回答“哪些场景必须被 API 与 API 组合覆盖，当前覆盖状态如何，证据落点在哪里”
- 本页不新增 public noun
- 本页不冻结 exact surface
- 本页不承接 gap authority，gap 继续看 [02-gap-map-and-target-direction.md](./02-gap-map-and-target-direction.md)
- 本页不承接 exact carrier authority，exact contract 继续看 [13-exact-surface-contract.md](./13-exact-surface-contract.md)

## 单一事实源规则

下面这些文件继续存在，但身份全部固定为本页的投影视图：

- [../../../specs/155-form-api-shape/scenario-proof-family.md](../../../specs/155-form-api-shape/scenario-proof-family.md)
  - 作为 legacy trace 文件名保留，只承接 `WF1..WF6` family projection
- [../../../specs/155-form-api-shape/signoff-brief.md](../../../specs/155-form-api-shape/signoff-brief.md)
  - 只保留 `SC-*` narrative walkthrough
- `examples/logix-react/src/demos/form/demoMatrix.ts`
  - 只保留 runnable route mapping
- [08-capability-decomposition-api-planning-harness.md](./08-capability-decomposition-api-planning-harness.md)
  - 只保留 `SC-* -> CAP-* / PROJ-* / IE-* / PF-* / VOB-* / COL-*` 的 planning projection
- executable proof / benchmark whitelist / retained demo matrix
  - 全部只允许回链本页的 `SC-*` 行或本页派生出来的 `WF*` 投影

任何 spec、brief、demo、test 如果需要讨论“场景覆盖”“API 组合 sufficiency”“最优形状压力面”，都必须先回到本页。

## 稳定坐标

- 场景主键：`SC-A .. SC-F`
- capability 主键：`CAP-01 .. CAP-26`，由 [08-capability-decomposition-api-planning-harness.md](./08-capability-decomposition-api-planning-harness.md) 承接
- family 主键：`WF1 .. WF6`
- executable proof 主键：`W1 .. W5`
- demo route 继续用 example-local route key，但必须显式回链 `SC-*`

## 主场景矩阵

| scenario id | 场景摘要 | canonical API composition | owner lanes | pressure families | primary proof | example / docs anchors | current status | reopen bar |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `SC-A` | 最小稳定表单 | `Form.make -> field.rule -> submit -> useModule/useSelector` | `rule / submit / host` | `-` | rule/submit targeted tests、quick-start runnable proof | `/form-quick-start`、`apps/docs/content/docs/form/quick-start*`、`introduction*` | `covered` | 单一 declaration act 无法继续承接基础 rule/submit 主链 |
| `SC-B` | 远端依赖字段 | `field(path).source(...) + submitImpact + selector read` | `source / submit / host` | `WF1 / WF4 / WF5` | source authoring tests、stale submit snapshot、source proof routes | `/form-field-source`、`/form-source-query`、`introduction*` | `covered` | `source` 无法继续作为唯一 remote fact ingress |
| `SC-C` | 远端 options + 本地协调 | `field.source + field.companion` | `source / companion / host` | `WF1 / WF5` | companion authoring、startup report artifact、recipe-only read proof | `/form-field-companion` | `covered` | `field-only companion` 无法继续承接本地协调，或 sanctioned read route 被迫暴露 raw internal path |
| `SC-D` | 跨行互斥与最终约束 | `field.companion + row/list rule + submit` | `companion / rule / submit` | `WF1 / WF4 / WF5` | executed `PF-04` state proof bundle、scenario trial、cross-row rule proofs、`CAP-15` final submit linkage bridge | `/form-field-companion`、`/form-field-source` | `covered` | `companion -> rule -> submit` 无法继续闭合到单一 truth，或 `CAP-15` submit-link bridge 无法继续回链到 scenario carrier evidence |
| `SC-E` | row-heavy 写侧与读侧 | `list identity + fieldArray.byRowId + reorder/replace/remove + cleanup + selector read` | `active-shape / cleanup / host / reason` | `WF2 / WF3 / WF5` | row identity projection、cleanup receipt、row-heavy companion proofs | `/form-field-arrays`、`/form-advanced-field-behavior`、`apps/docs/content/docs/form/field-arrays*` | `covered` | row-heavy proof 逼出 `list/root companion`、第二 read family、或第二 row truth |
| `SC-F` | React acquisition、读侧 helper、diagnostics / trial feed | `useModule + useSelector + fieldValue/rawFormMeta/Form.Error.field + trial/report feed` | `host / reason / evidence` | `WF5` | reason contract proof、selector primitive tests、startup control-plane reports | `/form-advanced-field-behavior`、`apps/docs/content/docs/form/index*` | `covered` | 同一 reasons / evidence 无法继续经单一 host gate 投影，或必须长第二 report object |

## Family 投影视图

`WF1..WF6` 继续保留，但它们现在只作为主场景矩阵的长期压力投影，不再自持第二张矩阵。

| family id | derived scenario ids | long-lived pressure | required proof |
| --- | --- | --- | --- |
| `WF1` | `SC-B`, `SC-C`, `SC-D` | remote options、local coordination、cross-row mutual exclusion | 远端 facts 只经 `source` 进入，本地协调不长第二 truth |
| `WF2` | `SC-E` | reorder + byRowId continuity | canonical row id chain 持续稳定 |
| `WF3` | `SC-E` | replace + active exit + cleanup | old row truth 退出彻底，cleanup 只留 subordinate residue |
| `WF4` | `SC-B`, `SC-D` | async rule + submit blocking | pending / stale / blocking 继续只落单一 submit truth |
| `WF5` | `SC-B`, `SC-C`, `SC-D`, `SC-E`, `SC-F` | diagnostics causal chain | `source -> patch -> reason -> outcome` 可机械回链 |
| `WF6` | `SC-B`, `SC-C`, `SC-D`, `SC-E`, `SC-F` 的 benchmark-admissible subset | execution reuse / comparability / perf evidence | perf evidence 只复用 execution carrier，不回流 correctness truth |

## Executable Proof 映射

`W1..W5` 继续存在，但它们也只作主场景矩阵的 executable proof subset。

| proof id | scenario ids | family coverage | role |
| --- | --- | --- | --- |
| `W1 source-refresh-multi-lower` | `SC-C`, `SC-D` | `WF1`, `WF5` | source refresh 与 local coordination 的主 executable proof |
| `W2 clear-while-active` | `SC-C`, `SC-E` | `WF3`, `WF5` | active clear / retire / cleanup 的主 executable proof |
| `W3 row-reorder-byRowId` | `SC-E` | `WF2`, `WF3` | row-heavy continuity 的主 executable proof |
| `W4 row-replace-active-exit` | `SC-E` | `WF3`, `WF5` | roster replacement / active exit 的主 executable proof |
| `W5 rule-submit-backlink` | `SC-D`, `SC-F` | `WF4`, `WF5` | rule / submit / reason backlink 的主 executable proof |

## Derived Obligation / Proof Matrix

下面这张表继续保留，角色固定为从主场景矩阵推导出来的 obligation / slice / proof 视图。

| obligation | declaration slice | kernel enabler | scenario proof input | verification proof |
| --- | --- | --- | --- | --- |
| `active-shape lane` 的字段存在性与 cleanup | `activeShapeSlice` | subtree cleanup、owner remap、task cancel | 条件字段显示/隐藏、动态列表行的增删改排 | active set 是否正确影响 validation / blocking / explain universe |
| `active-shape lane` 的结构编辑 | `activeShapeSlice` | row ownership、remap、trackBy | 动态列表、嵌套列表、`byRowId` 结构编辑类场景 | 重排或删除后 errors/ui/reasons 是否跟随，`reasonSlotId.subjectRef.kind="row"` 是否稳定 |
| row roster projection theorem | `activeShapeSlice` | row ownership、trackBy | reorder、replace、`byRowId` 之后的列表渲染 | render key 是否继续等于 `rowId` 或其纯投影；store-mode `replace(nextItems)` 不得复用旧 roster rowId |
| `settlement lane` 的 async validation | `settlementSlice` | keyed task substrate、debounce、cancel、stale drop | 唯一性检查、远端约束校验、list.item 异步检查、later source settle | pending snapshot 是否进入单一 submit truth，later settle 是否不改写旧 `submitAttempt`，后续 stale reason proof 是否继续补齐 |
| `settlement lane` 的 submit / decode / blocking | `settlementSlice` | submit gate、decoded verdict、field scoped validate | `submit(options?)`、decode payload、blocked submit、later source settle 后再次 submit | `$form.submitAttempt.summary / compareFeed`、submit-lane decode、blocked-by 是否单点可解释，旧 submit snapshot 是否保持稳定 |
| validation ownership overlay | `settlementSlice` + `reasonProjectionSlice` | schema bridge、core selector law、canonical evidence envelope | structural schema、form rule、decode-origin bridge 联合场景 | structural authority、form semantics、bridge lowering 是否继续挂靠既有 root grammar，没有第二 taxonomy |
| validating projection obligation | `settlementSlice` + `reasonProjectionSlice` | keyed task substrate、canonical reasons、core selector law | 字段 validating、列表项 validating、表单级 validating 指示 | validating facts 是否全部回链到既有 reason / settlement，没有第二 projection family |
| list cardinality basis | `settlementSlice` | list-level rules、canonical reasons | 空列表、超上限列表、范围内列表 | `minItems / maxItems` 是否稳定进入 list scope，没有与 presence policy 重叠 |
| cross-source error lowering | `reasonProjectionSlice` | canonical mapper、submit error mapper、rule lowering | rule error、decode error、manual error、submit error 汇合到同一路径 | 是否全部 lower 到同一 `FormErrorLeaf`，且没有隐式 string / token 推断 |
| error lifetime law | `reasonProjectionSlice` | submit gate、slot cleanup、active exit | manual error、server error、decode error、下一次 submit | `origin × scope × clear-trigger` 是否可比较、可解释、不会长第二错误分类表 |
| submit-only decode gate | `settlementSlice` + `reasonProjectionSlice` | submit gate、Effect Schema contract、canonical evidence envelope | submit 触发 structural decode、field validate 不触发 structural decode | canonical structural decode 是否继续只绑在 `submitAttempt`，没有第二 attempt noun |
| decode-origin canonical bridge | `reasonProjectionSlice` | Effect Schema contract、path mapping、canonical evidence envelope | Effect Schema decode failure、外部 adapter、schema-origin lowering | bridge 是否只消费 normalized decode facts，并按 path-first lowering + submit fallback 进入既有 truth |
| effectful rule lowering law | `settlementSlice` + `reasonProjectionSlice` | Effect lowering、settlement contributor、canonical evidence envelope | sync rule、field/list.item/list.list/root submit-time Effect rule、async submit 统一场景 | sync sugar 是否统一 lower 到 Effect，field/list.item/list.list/root Effect rule 是否在 submit gate 前 lower 到 canonical `FormErrorLeaf` 并进入既有 submit truth |
| control-plane materializer admissibility | `reasonProjectionSlice` + evidence summary | canonical evidence envelope、runtime control plane | diagnostics/export/report/repair 视图 | control plane materializer 是否只读取既有 truth 与局部坐标，没有第二 report object 或第二 issue authority |
| `reason contract` 的 pure projection | `reasonProjectionSlice` | canonical reasons / evidence、submit summary input | `useSelector(handle, selector)`、`Form.Error.field(path)`、trial feed、list structural cleanup receipt、list row field error | 同一 reasons / evidence 是否被投影到 UI、Agent、trial 而不分叉；同一 token 是否能解释 `error / pending / stale / cleanup`，且最小结果继续保留 `reasonSlotId / sourceRef` 与必要的 `subjectRef` |

## 坐标规则

- `FormDeclarationContract` 继续是唯一 declaration authority
- runtime-owned `ScenarioPlan` 继续持有 `fixtures/env + steps + expect`
- compare 主轴、environment gate 与 report 坐标统一服从 [../runtime/09-verification-control-plane.md](../runtime/09-verification-control-plane.md)
- evidence summary 继续必须包含结构化 `reasonSlotId`

## 使用规则

- 任何 active spec 若要声明“覆盖了哪些场景”，必须先引用本页 `SC-*`
- `WF*`、`W*`、demo route、docs page 都只能作为本页的投影视图
- 新增 demo、spec、proof route 时，先补本页行状态与锚点，再补局部文件
- 若某个 challenger 只能在局部投影视图里成立，回不到本页主矩阵，默认不进入主线

## 当前一句话结论

Form 的场景覆盖、API 组合 sufficiency、proof route、example/docs 映射，当前全部收口到这页；`SC-A..SC-F` 已在当前 baseline 上转为 `covered`，legacy `proof-family` 文件、`signoff-brief`、retained demo matrix、`W1..W5` 都只作为本页的派生投影视图存在。当前整体矩阵已通过 planning-level closure，冻结 API 形状看 [../capability/03-frozen-api-shape.md](../capability/03-frozen-api-shape.md)。
