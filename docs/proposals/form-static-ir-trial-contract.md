---
title: Form Static IR And Trial Contract
status: consumed
owner: form-static-ir-trial-contract
target-candidates:
  - docs/ssot/form/02-gap-map-and-target-direction.md
  - docs/ssot/form/03-kernel-form-host-split.md
  - docs/ssot/form/06-capability-scenario-api-support-map.md
  - docs/ssot/form/07-kernel-upgrade-opportunities.md
  - docs/ssot/runtime/09-verification-control-plane.md
  - docs/ssot/runtime/06-form-field-kernel-boundary.md
last-updated: 2026-04-16
---

# Form Static IR And Trial Contract

## 角色

- 本页已被消费，只保留 adopted delta
- 静态 IR 与 trial contract 的当前 authority 已回写到目标 SSoT
- 本页不再承载 exact contract、writeback routing、review focus 或并列 carrier 选择

## Adopted Delta

- Form 内部静态合同只保留一个 `FormDeclarationContract`
- `active-shape / settlement / reason-projection` 只作为 declaration slices
- `runtime.check / runtime.trial / runtime.compare` 共享：
  - `declaration`
  - `witness`
  - `evidence`
- `runtime.trial` 只做执行与采证
- compare 主轴固定为：
  - `declarationDigest`
  - `scenarioPlanDigest`
  - `evidenceSummaryDigest`
- repair loop 依赖局部稳定坐标：
  - `declSliceId`
  - `reasonSlotId`
  - `scenarioStepId`
  - `sourceRef`

## Authority Refs

- [02-gap-map-and-target-direction.md](../ssot/form/02-gap-map-and-target-direction.md)
- [03-kernel-form-host-split.md](../ssot/form/03-kernel-form-host-split.md)
- [06-capability-scenario-api-support-map.md](../ssot/form/06-capability-scenario-api-support-map.md)
- [07-kernel-upgrade-opportunities.md](../ssot/form/07-kernel-upgrade-opportunities.md)
- [09-verification-control-plane.md](../ssot/runtime/09-verification-control-plane.md)
- [06-form-field-kernel-boundary.md](../ssot/runtime/06-form-field-kernel-boundary.md)
- [2026-04-16-form-static-ir-trial-contract-review.md](../review-plan/runs/2026-04-16-form-static-ir-trial-contract-review.md)

## Allowed Reopen Surface

- 若未来需要冻结 control-plane materializer / report exact shape，单独 reopen `runtime/09`
- 若 future 需要重新裁决 `RulesManifest / StaticIr / ModuleManifest.digest` 的终局角色，可单独 reopen declaration carrier cutover
- 若 future 需要更细的 `reasonProjectionSlice` exact boundary，可单独 reopen declaration slice cut

## Residue Pointer

当前 residual 继续只指向两类：

- 实现层 carrier residue
- control-plane report shell 仍待进一步压实的 exact shape

## 当前一句话结论

这轮已经把 Form 的静态 IR 与 trial 主轴收成 declaration-witness-evidence 三坐标与单一 `FormDeclarationContract`；任何更细的 report shell、materializer 或 cutover exactness，后续统一到 living SSoT 单点裁决。
