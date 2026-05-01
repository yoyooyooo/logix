---
title: Form SSoT Root
status: living
version: 30
---

# Form SSoT Root

本目录承接 `@logixjs/form` 的稳定事实源。

## 当前状态

- Form 已从“只靠 `runtime/06` 单页承接全部语义”升级为独立子树
- `docs/ssot/runtime/06-form-field-kernel-boundary.md` 继续保留，但只负责 form 与 field-kernel 的边界
- Form 现状、P0 主缺口、终局方向与 owner split 统一落在当前目录
- 当前 `SC-A..SC-F / CAP-01..CAP-26 / VOB-01..VOB-03` 覆盖矩阵的冻结 API 形状统一看 [../capability/03-frozen-api-shape.md](../capability/03-frozen-api-shape.md)

## 当前聚焦

- root exact surface 与 single declaration carrier 已冻结到当前 authority
- 当前后续工作分成四组：
  - authority drift writeback
  - live residue cutover
  - `error / decode / render` closure
  - `P0` semantic closure waves
- host sugar、projection helper 与 toolkit wrapper 继续排在 `P0` closure 之后

## 长期 Spec Hub

- [../../../specs/150-form-semantic-closure-group/spec.md](../../../specs/150-form-semantic-closure-group/spec.md)
  - Form 相关 spec 的长期 route manifest
  - 统一登记 active members、imported predecessors、current external route owners
  - 新 gap / 新验证任务 / 新 follow-up proposal 先在 owner 工件成形；只有进入当前长期 route 时才回挂 `150`

## 当前角色

- 本页负责 form 子树导航与 owner 路由
- 子页负责唯一语义，本页不重复定义正文
- runtime 主链、React 宿主通用规则、platform 结构事实仍回各自 owner 页面

## 当前入口

| 页面 | 主题 | Owner Spec |
| --- | --- | --- |
| [00-north-star.md](./00-north-star.md) | form 的终局目标函数与非目标 | `125-form-ns` |
| [01-current-capability-map.md](./01-current-capability-map.md) | form 当前已实现能力谱系与 current snapshot | `125-form-current` |
| [02-gap-map-and-target-direction.md](./02-gap-map-and-target-direction.md) | form `P0` problem contract：主链语义边界与 closure contract | `125-form-problem-contract` |
| [03-kernel-form-host-split.md](./03-kernel-form-host-split.md) | field-kernel / form / React host 的 owner split | `125-form-owner` |
| [04-convergence-direction.md](./04-convergence-direction.md) | frozen convergence contract：主链 invariants、DAG 与 freeze gate | `125-form-convergence-contract` |
| [05-public-api-families.md](./05-public-api-families.md) | 从 runtime spine 派生出来的 form public boundary | `125-form-api` |
| [06-capability-scenario-api-support-map.md](./06-capability-scenario-api-support-map.md) | form 场景矩阵唯一 SSoT：场景覆盖、API 组合、proof route 与 example/docs 锚点 | `125-form-chain` |
| [08-capability-decomposition-api-planning-harness.md](./08-capability-decomposition-api-planning-harness.md) | form domain capability projection：继承 Logix-wide harness，承接 `SC-* -> CAP-* / PROJ-* / IE-* / PF-* / VOB-* / COL-*` | `125-form-capability-planning` |
| [07-kernel-upgrade-opportunities.md](./07-kernel-upgrade-opportunities.md) | frozen kernel grammar contract：form-facing kernel 单点合同 | `125-form-kernel-grammar` |
| [09-operator-slot-design.md](./09-operator-slot-design.md) | future noun 的 reopen / promotion gate | `125-form-operator` |
| [13-exact-surface-contract.md](./13-exact-surface-contract.md) | Form 最终用户 contract 的唯一 exact authority | `125-form-exact-surface` |

## 当前优先入口

- core authority 先看：
  - `00-north-star.md`
  - `13-exact-surface-contract.md`
  - `05-public-api-families.md`
  - `../runtime/01-public-api-spine.md`
  - `../runtime/10-react-host-projection-boundary.md`
  - `../runtime/06-form-field-kernel-boundary.md`
- supporting pages 再看：
  - `02-gap-map-and-target-direction.md`
  - `01-current-capability-map.md`
  - `03-kernel-form-host-split.md`
  - `04-convergence-direction.md`
  - `07-kernel-upgrade-opportunities.md`
  - `09-operator-slot-design.md`
- scenario / proof / example 锚点看：
  - `06-capability-scenario-api-support-map.md`
- capability decomposition / API planning harness 看：
  - `08-capability-decomposition-api-planning-harness.md`
- 当前全局 frozen API shape 看：
  - `../capability/03-frozen-api-shape.md`

## 当前 active-shape 证据任务

- `list row identity public projection contract`
  - working spec: [../../../specs/149-list-row-identity-public-projection/spec.md](../../../specs/149-list-row-identity-public-projection/spec.md)
  - long-lived hub: [../../../specs/150-form-semantic-closure-group/spec.md](../../../specs/150-form-semantic-closure-group/spec.md)
  - 目标：先冻结 row roster projection theorem、single row identity truth 与 synthetic local id residue 禁止项
  - 当前不冻结：exact noun、import shape、完整 `useFormList` helper family

## 当前 Proposal Cluster

- [../../proposals/form-authority-drift-writeback-contract.md](../../proposals/form-authority-drift-writeback-contract.md)
  - 修 post-`F1` 的 authority / inventory / README / stale planning drift

## 当前 External Route Specs

- [../../../specs/155-form-api-shape/spec.md](../../../specs/155-form-api-shape/spec.md)
  - 未来 Form API shape 的初始方案 owner artifact
  - 记录负边界与 reopen targets，例如 `fieldValue(path)` 仅作为 future reopen target，`source` 不吸收本地协调层
  - 记录仍未定案的 noun / placement / landing page，供后续多 agent 评审与继续收敛
  - 上层拍板综述统一落在 [../../../specs/155-form-api-shape/signoff-brief.md](../../../specs/155-form-api-shape/signoff-brief.md)

## 当前 Next Cluster

- [../../next/form-live-residue-cutover-plan.md](../../next/form-live-residue-cutover-plan.md)
  - 清 examples、sandbox preset、manifest promise 里的 live residue
- [../../next/form-error-decode-render-closure-contract.md](../../next/form-error-decode-render-closure-contract.md)
  - 收 `error / decode / render` 这条 canonical closure chain
- [../../next/form-p0-semantic-closure-wave-plan.md](../../next/form-p0-semantic-closure-wave-plan.md)
  - 把 `active-shape / settlement / reason` 拆成可实施波次

## 当前 Active Member Specs

- [../../../specs/149-list-row-identity-public-projection/spec.md](../../../specs/149-list-row-identity-public-projection/spec.md)
  - row roster projection theorem / public projection legality
- [../../../specs/151-form-active-set-cleanup/spec.md](../../../specs/151-form-active-set-cleanup/spec.md)
  - active set / presence / subtree cleanup / blocking exit
- [../../../specs/154-form-resource-source-boundary/spec.md](../../../specs/154-form-resource-source-boundary/spec.md)
  - Form × Query/Resource owner boundary / form-local remote dependency / QueryProgram upgrade gate
- [../../../specs/152-form-settlement-contributor/spec.md](../../../specs/152-form-settlement-contributor/spec.md)
  - async contributor grammar / submitImpact / pending-stale-blocking / cardinality basis
- [../../../specs/153-form-reason-projection/spec.md](../../../specs/153-form-reason-projection/spec.md)
  - path explain / structured reason slot / evidence envelope / compare-repair-trial feed

## Supporting Routing Law

下面这组 supporting routing law 是当前唯一的 routing manifest。
它只负责把跨页 supporting authority 的路由写死，不新增第二 authority hub。

| concern | owner page | 角色 |
| --- | --- | --- |
| owner split / semantic obligation | [03-kernel-form-host-split.md](./03-kernel-form-host-split.md) | 冻结 owner split、semantic owner 与禁止项 |
| scenario matrix / proof / acceptance map | [06-capability-scenario-api-support-map.md](./06-capability-scenario-api-support-map.md) | 冻结唯一 `SC-*` 场景矩阵、API 组合、scenario proof、acceptance 与 verification proof |
| capability decomposition / API planning harness | [08-capability-decomposition-api-planning-harness.md](./08-capability-decomposition-api-planning-harness.md) | 继承 [../capability/01-planning-harness.md](../capability/01-planning-harness.md)，从 `SC-*` 派生 `CAP-*` 能力原子、planning projection、internal enabler、proof harness、verification obligation 与 collision ledger |
| frozen API shape | [../capability/03-frozen-api-shape.md](../capability/03-frozen-api-shape.md) | 汇总当前 `SC-A..SC-F / CAP-01..CAP-26 / VOB-01..VOB-03` 的冻结公开形状，并回链 `13 / 05 / runtime/01 / runtime/09 / runtime/10` owner authority |
| verification control plane | [../runtime/09-verification-control-plane.md](../runtime/09-verification-control-plane.md) | 冻结 control-plane stage、coordinate 与 compare 主轴 |
| host-owned adjunct exact contract | [../runtime/10-react-host-projection-boundary.md](../runtime/10-react-host-projection-boundary.md) | 冻结 host adjunct exact noun、import shape 与禁止项 |
| Form-owned exact carrier / companion primitive | [13-exact-surface-contract.md](./13-exact-surface-contract.md) | 冻结 Form exact carrier、Form handle、`Form.Error.field(path)` |
| `P0` problem ledger | [02-gap-map-and-target-direction.md](./02-gap-map-and-target-direction.md) | 只冻结 root grammar 下的 `P0` 主缺口，不承接 supporting 细节 |

## 相关裁决

- [2026-04-04 Logix API Next Charter](../../adr/2026-04-04-logix-api-next-charter.md)
- [2026-04-05 AI Native Runtime First Charter](../../adr/2026-04-05-ai-native-runtime-first-charter.md)
- [2026-04-12 Field Kernel Declaration Cutover](../../adr/2026-04-12-field-kernel-declaration-cutover.md)

## 相关规范

- [../runtime/06-form-field-kernel-boundary.md](../runtime/06-form-field-kernel-boundary.md)
- [../runtime/03-canonical-authoring.md](../runtime/03-canonical-authoring.md)
- [../runtime/10-react-host-projection-boundary.md](../runtime/10-react-host-projection-boundary.md)
- [../../standards/logix-api-next-guardrails.md](../../standards/logix-api-next-guardrails.md)
- [../../standards/docs-governance.md](../../standards/docs-governance.md)

## 导航说明

- 写 form 事实前，先判断是“现状 / P0 主缺口 / owner split”哪一页
- supporting routing 统一先看本页，不回到 `02` 重写
- form 相关长期 spec 路由统一先回 `150`
- 涉及 north-star、exact surface、family law、declaration carrier、host owner、projection owner 时，优先回 core authority pages
- 若要先按用户视角过一遍未来规划态，再回 authority 校对，可先看 [../../internal/form-api-tutorial.md](../../internal/form-api-tutorial.md)
- `06` 是 form 场景矩阵唯一 SSoT，承接 `SC-*` 场景 ID、API 组合、proof / acceptance、proof route 与 example/docs 锚点；不反向定义 exact contract
- `08` 是 form capability decomposition 与 API planning harness，承接从 `SC-*` 到 `CAP-* / PROJ-* / IE-* / PF-* / VOB-* / COL-*` 的中间规划层；不反向定义 exact contract
- 当前覆盖矩阵的冻结 API 形状统一看 [../capability/03-frozen-api-shape.md](../capability/03-frozen-api-shape.md)，Form 子树只持有各自 owner authority
- 触及 field-kernel 边界时，同时回写 [../runtime/06-form-field-kernel-boundary.md](../runtime/06-form-field-kernel-boundary.md)
- 触及 React host law 时，同时回写 [../runtime/10-react-host-projection-boundary.md](../runtime/10-react-host-projection-boundary.md) 与 [../runtime/01-public-api-spine.md](../runtime/01-public-api-spine.md)
- 子页新增、删除或重排时，先回写本页、`docs/ssot/README.md` 与相关 runtime leaf page

## 当前一句话结论

Form 已升级为独立 SSoT 子树；当前覆盖矩阵的冻结 API 形状看 [../capability/03-frozen-api-shape.md](../capability/03-frozen-api-shape.md)，最终用户 contract 由 `13 + runtime/10 + runtime/06 + runtime/01` 共同收口，`05` 只承接 route boundary，`09` 只承接 future noun 的 reopen gate。
