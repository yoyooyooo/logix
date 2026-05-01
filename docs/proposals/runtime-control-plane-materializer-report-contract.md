---
title: Runtime Control Plane Materializer Report Contract
status: consumed
owner: runtime-control-plane-materializer-report-contract
target-candidates:
  - docs/ssot/runtime/09-verification-control-plane.md
last-updated: 2026-04-16
---

# Runtime Control Plane Materializer Report Contract

## 角色

- 本页已被消费，只保留 adopted delta
- control plane materializer/report 的 authority 已回写到 `runtime/09`
- 本页不再承载 exact contract、writeback routing、review focus 或并列 carrier 选择

## Adopted Delta

- `VerificationControlPlaneReport` 继续只允许作为单一 top-level shell
- report payload 的 `kind` 压成单一常量 `VerificationControlPlaneReport`
- `stage + mode` 成为唯一变体轴
- `repairHints` 的 machine core 收成：
  - `code`
  - `canAutoRetry`
  - `upgradeToStage`
  - `focusRef`
- `focusRef` 继续是 coordinate-first repair target，只承载：
  - `declSliceId`
  - `reasonSlotId`
  - `scenarioStepId`
  - `sourceRef`
- `reasonSlotId / sourceRef` 在 report shell 中继续只允许承载 domain-owned opaque stable id
- materializer 继续只走 artifact-backed linking law
- `artifact.role` 退出 exact contract
- `TrialReport` 继续只允许作为 `VerificationControlPlaneReport` 的 pure alias
- `runtime/09` 成为 report/materializer exact shell 的唯一 authority
- 相关 consumed proposal 已压成 freeze note，proposal 层不再继续承载 exact carrier contract

## Authority Refs

- [09-verification-control-plane.md](../ssot/runtime/09-verification-control-plane.md)
- [2026-04-16-form-static-ir-trial-contract-review.md](../review-plan/runs/2026-04-16-form-static-ir-trial-contract-review.md)
- [2026-04-16-form-validation-funnel-export-contract-review.md](../review-plan/runs/2026-04-16-form-validation-funnel-export-contract-review.md)
- [2026-04-16-runtime-control-plane-materializer-report-contract-review.md](../review-plan/runs/2026-04-16-runtime-control-plane-materializer-report-contract-review.md)

## Allowed Reopen Surface

- 若 future 证明 `relatedArtifactOutputKeys` 还能继续压掉，可单独 reopen materializer linking shell
- 若 future 出现首个真实多消费者 materializer 场景，再决定是否需要新增 artifact classification
- 若 future 需要更细的 domain payload exact shape，继续由对应 domain SSoT 单点裁决

## Residue Pointer

当前 residual 继续只指向两类：

- `@logixjs/core / cli / tests` 尚未同步到新 contract 的实现 drift
- 首个真实 materializer consumer 落地前，`relatedArtifactOutputKeys` 仍可能继续压缩

## 当前一句话结论

这轮已经把 runtime control plane 的 materializer/report shell 收成单一 report、单一命名轴、coordinate-first repair target 与 artifact-backed linking law；任何更细的 payload exactness 或实现 cutover，后续统一回到 living `runtime/09` 与实现层单点推进。
