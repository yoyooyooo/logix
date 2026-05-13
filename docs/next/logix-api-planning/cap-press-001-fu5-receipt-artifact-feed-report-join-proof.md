---
title: CAP-PRESS-001-FU5 Receipt Artifact Feed Report Join Proof
status: closed-implementation-proof
version: 1
---

# CAP-PRESS-001-FU5 Receipt Artifact Feed Report Join Proof

## 目标

证明 Form source receipt identity 可以通过现有 Form evidence artifact、scenario carrier feed 与 verification control-plane report 机械回链，不需要新增 public receipt API、第二 evidence envelope 或第二 report object。

本页只记录 pressure follow-up 结论，不冻结 exact public surface。exact Form source surface 继续看 [../../ssot/form/13-exact-surface-contract.md](../../ssot/form/13-exact-surface-contract.md)，report shell 继续看 [../../ssot/runtime/09-verification-control-plane.md](../../ssot/runtime/09-verification-control-plane.md)。

## Slice Manifest

| field | value |
| --- | --- |
| slice_id | `CAP-PRESS-001-FU5` |
| target_scenarios | `SC-B`, `SC-C`, supporting `SC-F` evidence/report pressure |
| target_atoms | `CAP-09`, `CAP-15`, `CAP-17`, `CAP-18` |
| related_projection | `PROJ-02`, `PROJ-07` |
| related_enablers | `IE-02`, `IE-04`, `IE-07` |
| required_proof | `PF-08` |
| decision_policy | keep receipt identity artifact-backed and opaque; strengthen report shell boundary if leaks are possible |
| non_claims | no `Form.Source`, no `useFieldSource`, no public receipt identity API, no public scenario feed API, no second evidence envelope, no root compare productization |

## Pressure Question

`S7-source-receipt-feed-join` asked whether Form artifact fields such as `sourceReceiptRef / keyHashRef / sourceSnapshotPath / bundlePatchPath` must leak into public feed/report fields to let Agent, trial, report, and later compare flows explain source causality.

## Implementation Delta

| file | change |
| --- | --- |
| `packages/logix-core/test/Contracts/VerificationScenarioCarrierFormArtifactBundlePatchRef.contract.test.ts` | added FU5 feed proof for concrete and pattern source artifact seeds; feed row keeps `bundlePatchRef / reasonSlotId / ownerRef / retention / canonicalRowIdChainDigest` and rejects receipt coordinate leakage |
| `packages/logix-core/test/Contracts/VerificationControlPlaneContract.test.ts` | added report join proof; report links through `artifacts[] + repairHints[].focusRef + relatedArtifactOutputKeys` and rejects domain payload leakage |
| `packages/logix-core/src/ControlPlane.ts` | tightened `isVerificationControlPlaneReport` to validate exact report, artifact, repair hint, and focusRef key sets; `relatedArtifactOutputKeys` must reference real `artifacts[].outputKey` |

## Decision

`CAP-PRESS-001-FU5` closes without new public API.

Accepted:

- Form evidence artifact may keep internal source coordinates such as `sourceReceiptRef / keyHashRef / sourceSnapshotPath / bundlePatchPath`.
- Scenario carrier feed only carries the internal verification row projection: `bundlePatchRef / reasonSlotId / ownerRef / transition / retention / canonicalRowIdChainDigest`.
- `bundlePatchRef` is mechanically derived from artifact `bundlePatchPath`.
- Verification report links back through `artifacts[]` and `repairHints[].relatedArtifactOutputKeys`.
- `repairHints[].focusRef` only carries coordinate-first opaque ids: `declSliceId / reasonSlotId / scenarioStepId / sourceRef`.
- Report guard rejects leaked `sourceReceiptRef / keyHashRef / bundlePatchPath / bundlePatchRef / ownerRef` fields in report shell positions.
- Scenario carrier feed continues to avoid `EvidencePackage.summary`; summary, diff, focusRef and compare truth stay with their existing owners.

Rejected:

- adding public receipt names
- adding `Form.Source`
- adding `useFieldSource`
- exposing `sourceReceiptRef` or `keyHashRef` as public report fields
- making `bundlePatchRef` a public authoring noun
- adding a second evidence envelope
- adding a second report object
- starting root compare productization by implication

## Proof

| proof | result |
| --- | --- |
| concrete artifact seed | source artifact `bundlePatchPath: "items.warehouseId"` produces feed `bundlePatchRef: "bundlePatch:items.warehouseId"` |
| pattern artifact seed | source artifact `fieldPath: "items[].warehouseId"` and `bundlePatchPath: "items[].warehouseId"` produce pattern-safe feed ref |
| feed row locality | feed row keeps `ownerRef: "items[row-*].warehouseId"` and `canonicalRowIdChainDigest` |
| feed non-leakage | feed row and payload do not expose `sourceReceiptRef / keyHashRef / sourceSnapshotPath / reasonSourceRef / sourceRef / bundlePatchPath / formEvidenceContract / sources / submitAttempt` |
| summary boundary | scenario carrier feed does not write `EvidencePackage.summary` |
| report artifact link | report carries artifact `outputKey / kind / digest / reasonCodes` and repair hint `relatedArtifactOutputKeys` |
| focusRef boundary | report focusRef keeps only `reasonSlotId / sourceRef` for this proof |
| report guard | guard rejects top-level leaks, artifact leaks, focusRef leaks, broken artifact refs, and duplicate artifact output keys |

## Validation

Ran:

```bash
pnpm exec vitest run packages/logix-core/test/Contracts/VerificationScenarioCarrierFormArtifactBundlePatchRef.contract.test.ts packages/logix-core/test/Contracts/VerificationControlPlaneContract.test.ts --silent=passed-only --reporter=dot --hideSkippedTests
pnpm -C packages/logix-core typecheck
```

Result:

- targeted FU5 gate: `2` files, `9` tests passed
- `packages/logix-core` typecheck passed

## Does Not Prove

- complete `IE-02` coverage for every remote source variant
- root compare productization beyond the frozen control-plane stage

## Follow-up Routing

| follow-up | status | route |
| --- | --- | --- |
| row source disambiguation | `closed-implementation-proof` | `CAP-PRESS-001-FU6` |
| key canonicalization and same-key generation | `closed-implementation-proof` | `TASK-007` |
| root compare productization | `deferred` | `TASK-003`, explicit authority intake only |

## 当前一句话结论

FU5 proves source receipt identity can stay artifact-backed and report-linked through the existing verification control plane. FU6 has since closed row source disambiguation, and TASK-007 has since closed key canonicalization / same-key generation proof. Public source API stays unchanged.
