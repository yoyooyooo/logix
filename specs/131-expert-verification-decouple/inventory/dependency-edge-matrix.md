# Dependency Edge Matrix

| From | To | Current Reason | Target Verdict | Resolution Path | Gate |
| --- | --- | --- | --- | --- | --- |
| `packages/logix-core/src/internal/reflection/kernelContract.ts` | `../observability/trialRun.js` | 借用现成 trial harness | remove | 提取到 neutral `internal/verification/**` | internal edge contract + grep |
| `packages/logix-core/src/internal/reflection/kernelContract.ts` | `../observability/evidence.js` | 借用 EvidencePackage contract | remove | 提取 shared evidence contract 到 neutral owner | internal edge contract + grep |
| `packages/logix-core/src/internal/reflection/kernelContract.ts` | `../observability/jsonValue.js` | 借用 JsonValue 协议 | remove | 移到 `internal/protocol/**` | internal edge contract + grep |
| `packages/logix-core/src/internal/reflection/fullCutoverGate.ts` | `../observability/trialRun.js` | 借用现成 trial harness | remove | 改吃 neutral verification owner | internal edge contract + grep |
| `packages/logix-core/src/internal/reflection/diff.ts` | `../observability/jsonValue.js` | 借用 JsonValue 协议 | remove | 移到 `internal/protocol/**` | grep |
| `packages/logix-core/src/internal/reflection/manifest.ts` | `../observability/jsonValue.js` | 借用 JsonValue 协议 | remove | 移到 `internal/protocol/**` | grep |
| `packages/logix-core/src/internal/reflection/ports/typeIrProjector.ts` | `../../observability/jsonValue.js` | 借用 JsonValue 协议 | remove | 移到 `internal/protocol/**` | grep |
| `packages/logix-core/src/internal/reflection/ports/exportPortSpec.ts` | `../../observability/jsonValue.js` | 借用 JsonValue 协议 | remove | 移到 `internal/protocol/**` | grep |
| `packages/logix-core/src/internal/reflection/ports/exportPortSpec.ts` | `../../observability/artifacts/exporter.js` | 借用 artifact contract | remove | 提取中性 artifact contract owner | grep + targeted compile |

## Forbidden Final State

- `packages/logix-core/src/internal/reflection-api.ts` 直接 import `internal/observability/**`
- `packages/logix-core/src/internal/reflection/**` 直接 import `internal/observability/**`
- `packages/logix-core/src/internal/verification/**` 反向依赖 `internal/reflection/**`

## Verification Snapshot

### 2026-04-07

- `rg -n "internal/observability/(jsonValue|evidence|runSession|evidenceCollector|evidenceExportPipeline|trialRun|artifacts/exporter)\\.js" packages/logix-core/src packages/logix-core/test -g '*.ts'`
  - ZERO HIT
- `pnpm vitest run packages/logix-core/test/Contracts/KernelReflectionInternalEdges.test.ts`
  - PASS
