# Shared Primitive Ledger

| Primitive | Current Path | Semantic Role | Direct Consumers | Target Owner | Decision |
| --- | --- | --- | --- | --- | --- |
| `JsonValue` | `packages/logix-core/src/internal/observability/jsonValue.ts` | generic serializable protocol contract | `internal/reflection/**`, `internal/workflow/**`, `internal/runtime/core/**`, `Module.ts`, `Workflow.ts` | `packages/logix-core/src/internal/protocol/jsonValue.ts` | move |
| `trialRun` + `TrialRunOptions` + `TrialRunResult` | `packages/logix-core/src/internal/observability/trialRun.ts` | controlled verification run harness with evidence collection | `internal/reflection/kernelContract.ts`, `internal/reflection/fullCutoverGate.ts`, observability tests, canonical trial backing | `packages/logix-core/src/internal/verification/runtimeTrial.ts` or equivalent neutral owner | split or move |
| `EvidencePackage` + `EvidencePackageSource` | `packages/logix-core/src/internal/observability/evidence.ts` | slim evidence envelope / summary contract | `internal/reflection/kernelContract.ts`, runtime/devtools, observability exports | `packages/logix-core/src/internal/verification/evidence.ts` if shared；否则 split shared contract from observability-specific projection | split |
| `RunSession` + `RunId` + `RunSessionTag` | `packages/logix-core/src/internal/observability/runSession.ts` | stable verification session identity | canonical trial backing, runtime/core imports, observability tests, potential expert verification shared owner | `packages/logix-core/src/internal/verification/runSession.ts` if both canonical and expert route share it | evaluate then move or narrow |
| `TrialRunArtifactExporter` | `packages/logix-core/src/internal/observability/artifacts/exporter.ts` | artifact contract referenced by reflection export helpers | `internal/reflection/ports/exportPortSpec.ts`, trial-run artifact tests | `packages/logix-core/src/internal/artifacts/exporter.ts` or other neutral artifact owner | split |

## Rules

- 若一个 primitive 继续同时服务 canonical route 与 expert route，它必须在本 ledger 中有唯一 target owner
- 若某 primitive 只剩 observability consumer，它应留在 observability owner，并从 reflection import 链退出
- 本 ledger 默认不接受 `allowlisted-temporary`

## Execution Snapshot

### 2026-04-07

- `JsonValue` 已迁到 `packages/logix-core/src/internal/protocol/jsonValue.ts`
- `EvidencePackage`、`EvidencePackageSource`、`RunSession`、`EvidenceCollector`、`trialRun` 已迁到 `packages/logix-core/src/internal/verification/**`
- `TrialRunArtifactExporter` 已迁到 `packages/logix-core/src/internal/artifacts/exporter.ts`
- 旧 `packages/logix-core/src/internal/observability/{jsonValue,evidence,runSession,evidenceExportPipeline,evidenceCollector,trialRun}.ts` 与 `packages/logix-core/src/internal/observability/artifacts/exporter.ts` 已删除
