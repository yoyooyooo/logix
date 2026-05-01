# Form Resource Source Boundary Discussion

> Stop Marker: 2026-04-22 起，本 discussion 停止承接 active challenge。后续 Form API 主线转入 [../155-form-api-shape](../155-form-api-shape/spec.md)，本页仅作历史讨论来源。迁入 `155` 的候选要点见 [../155-form-api-shape/proposal-149-154-carryover.md](../155-form-api-shape/proposal-149-154-carryover.md)。

**Purpose**: 承接 `154` 的 residual boundary discussion。当前只讨论 boundary delta、lane handoff、upgrade gate 与 future reopen prerequisite。
**Status**: Working  
**Feature**: [spec.md](./spec.md)

## Authority Map

- authority contract：[`spec.md`](./spec.md)
- future noun reopen gate：[09-operator-slot-design.md](../../docs/ssot/form/09-operator-slot-design.md)
- surviving exact surface：[13-exact-surface-contract.md](../../docs/ssot/form/13-exact-surface-contract.md)
- React host exact contract：[10-react-host-projection-boundary.md](../../docs/ssot/runtime/10-react-host-projection-boundary.md)
- shared boundary routing hub：[02-gap-map-and-target-direction.md](../../docs/ssot/form/02-gap-map-and-target-direction.md)

## Rules

- 本文件是 working artifact，不承接 exact authority
- 本文件只记录 delta discussion、proof obligation 与 reopen prerequisite
- 若本页出现冻结结论，必须回写 `spec.md` 或对应 authority 页面
- future noun / exact carrier / exact host helper 统一走 `09 / 13 / runtime/10` 的既有 gate

## Inherited Constraints

- Query 持有 `Resource / ResourceSpec / load` 的 remote fact authority
- Form 只声明触发语义、消费 lowering 语义、lane handoff
- rule / submit / UI 只消费 lowered facts，不直接做 IO
- React 继续只拿 `useModule + useSelector + handle`
- single remote fact path 继续固定为 `Query owner -> Form lowering -> React projection`
- exact noun 当前已冻结为 `field(path).source(...)`；除它之外的 exact carrier landing page / read helper spelling 继续后置，并继续受 `09` gate 约束

## Current Delta To Close

- minimal witness projection contract 应该收敛到哪组 lowered facts
- form-local remote dependency 与 full QueryProgram 的 upgrade gate 应该如何让 reviewer 机械判别
- exact noun freeze 落盘后，lane proof 应如何继续消费这组 lowering matrix

## Boundary Invariants

- Query 继续持有 remote fact、load lifecycle 与 cache truth
- Form 只允许 lower 出当前 form handle 可消费的 companion / settlement / reason slices
- lowered facts 不进入 `values`，不形成 second write path，也不形成独立 cache owner
- React 只消费现有 host law 下的 lowered facts；host glue 不参与 owner 裁决
- sibling discussion page 不再代持 exact carrier、exact noun 或 host helper contract

## Final User-View Shape

当前最终裁决固定为 consumer-attached：

```ts
const ProvincesByCountry = Query.Engine.Resource.make({
  id: "province/by-country",
  keySchema: ProvinceKey,
  load: ({ countryId }) => /* Effect */,
})

const AddressForm = Form.make("AddressForm", {
  values: AddressValues,
  initialValues: {
    countryId: "",
    provinceId: "",
  },
}, ($) => {
  $.field("provinceId").source({
    resource: ProvincesByCountry,
    deps: ["countryId"],
    key: (countryId) => countryId ? { countryId } : undefined,
    debounceMs: 150,
    concurrency: "switch",
  })
})
```

这轮冻结的用户视角只有 4 条：

- noun 固定为 `source`
- attachment 固定挂在 `field(path)`
- `resource` 必须来自 Query owner，例如 `Query.Engine.Resource.make(...)` 的结果
- `target / scope / slot / reset` 不进入 exact surface

当前一律按这个心智理解：

- `field(path).source(...)` 只是声明“这个 field 有一条 Query-owned remote dependency”
- lowered facts 继续隐式落到同一 field 的 companion / settlement / reason slices
- 读侧继续走既有 `useSelector(handle, ...)` host law，不新增 `useFieldSource`、`Form.Source`、`form.source(...)` 一类 helper family
- 如果一个 remote dependency 没有明确的主 consumer field，默认不进入 day-one exact surface；要么升级成 QueryProgram，要么等后续受控 reopen

## Query Truth + Form Lowering Matrix

| concern | owner / allowed lowering | forbidden forms | routed to |
| --- | --- | --- | --- |
| remote fact / IO | Query owner 继续持有 `Resource / ResourceSpec / load`；Form 只引用触发依赖与消费需要 | Form 重定义 Resource、Form 自带 cache owner、Form 侧 direct fetch | `154/spec.md` + Query owner |
| companion receipt | Form 可以暴露只读 companion receipt，供 field / rule / submit / UI 消费 | raw path target、mutable mirror slot、snapshot 双写 | `154` + `form/13` |
| active exit / cleanup | lowered facts 离开 active set 时，继续服从 active-shape cleanup law | hidden subtree residue、cleanup 外挂第二 truth | `151` |
| settlement contribution | pending / stale / blocking / submitImpact 只消费 lowered facts | submit lane direct fetch、第二 task truth、独立 remote protocol | `152` |
| reason / evidence | explain / compare / repair / trial 只消费 lowered facts | second reason truth、ad hoc mirror、lane 外 evidence owner | `153` |
| React host read | `useModule + useSelector + handle` 读取同一份 lowered facts | `useEffect` 回写、host-owned remote mirror、host 反向决定 owner | `runtime/10` |

## QueryProgram Upgrade Gate

### Must-Upgrade Triggers

命中任一条，就升级到 QueryProgram：

- 生命周期超出当前 form handle，包含跨 form instance、跨区域或跨组件复用
- 需要显式 cache / invalidate / prefetch / retry / refresh policy
- 需要分页、selectedId、detail、master-detail 或其他 query-native orchestration lifecycle
- 需要独立于当前 values / active set / submit trigger 的 query lifecycle

### Safe-Local Envelope

只有在未命中任何 hard trigger 时，才允许继续停在 form-local remote dependency：

- 只服务当前 form instance 与当前 form handle
- 生命周期完全受当前 values、active set 或 submit trigger 驱动
- 主要用途是 options、validation context、autofill、submit assist
- 消费面只经过 companion / settlement / reason lowered facts
- 不需要独立 cache 心智，也不需要 query-native lifecycle control

### Notes

- `2-of-N` 计数法已经停用
- reviewer 优先看 owner obligation 与 lifecycle，再看具体场景表象

## Post-Freeze Reopen Surface

当前 exact noun 已冻结为 `field(path).source(...)`。后续只允许重开下面这些问题：

| reopen item | 当前状态 | reopen prerequisite |
| --- | --- | --- |
| form-companion-attached family | rejected by default | 证明 consumer-attached 真的挡住了稳定 day-one 场景，且不会长第二 companion route / cache owner |
| exact carrier landing page | deferred | `151 / 152 / 153` 交出足够 proof，证明当前隐式 lowering 不足以支撑单值解释 |
| row.item / list.item / submit-lane spelling | deferred | lane proof 闭合后，再通过 `09` 重开 exact spelling |

## Rejected Directions

- [x] rule direct fetch
  原因：会让 settlement / reason contract 长第二套 remote truth。
- [x] Form 自带第二套 remote protocol 或 cache owner
  原因：Resource owner 已固定在 Query。
- [x] React `useEffect` 同步远程结果回表单
  原因：会长第二条 host-side remote sync path。
- [x] 远程 options 或 payload mirror 直接写进 `values`
  原因：会污染 values truth，并让 companion receipt 与 root truth 混写。
- [x] `target / raw path / scope / slot` 形成第二 write path
  原因：会把 lowered facts 误做成可变 owner。
- [x] sibling discussion page 代持 exact contract
  原因：会和 `09 / 13 / runtime/10` 长出双 authority。
- [x] form-level `source(...)` 或 `Form.Source` family
  原因：会把 local remote dependency 误学成 Form 自带 remote subsystem。

## Proof Obligations Before Close

- `151` 能解释 lowered facts 的 active exit / cleanup，而不重开第二 truth
- `152` 能消费 lowered facts 的 pending / stale / blocking / submitImpact，而不重开 owner
- `153` 能消费 lowered facts 的 reason / evidence / compare / repair，而不重开 owner
- examples 与 walkthrough 能解释 boundary，而不需要额外再长 helper family
- 任何 future noun 候选都必须通过 `09` 的 reopen gate，并写回 `13` 或 `runtime/10`
- Decision Backlinks 必须保持完整

## Recommended Next Order

1. 先用 `151 / 152 / 153` 校验 lowering matrix
2. 若 `field(path).source(...)` 真挡住了稳定场景，再通过 `09` 重开 form-companion-attached family
3. lane owner 闭合后，再讨论 row.item / list.item / submit-lane 的 spelling

## Decision Backlinks

- [spec.md](./spec.md)
- [plan.md](./plan.md)
- [2026-04-21-form-resource-source-boundary-discussion-api-review.md](../../docs/review-plan/runs/2026-04-21-form-resource-source-boundary-discussion-api-review.md)
- [09-operator-slot-design.md](../../docs/ssot/form/09-operator-slot-design.md)
- [13-exact-surface-contract.md](../../docs/ssot/form/13-exact-surface-contract.md)
- [10-react-host-projection-boundary.md](../../docs/ssot/runtime/10-react-host-projection-boundary.md)
