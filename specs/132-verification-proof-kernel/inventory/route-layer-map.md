# Route Layer Map

| Layer | Current Owner | Allowed Responsibilities | Must Not Hold |
| --- | --- | --- | --- |
| `proof-kernel` | `packages/logix-core/src/internal/verification/proofKernel.ts` | session、collector、shared layer wiring、exit normalization | canonical report 组装、expert diff/gate 语义 |
| `canonical-adapter` | `packages/logix-core/src/internal/observability/trialRunModule.ts` | `Runtime.trial` 输入装配、environment、report、artifact re-export、error mapping | shared execution 内核 |
| `expert-adapter` | `packages/logix-core/src/internal/reflection/{kernelContract.ts,fullCutoverGate.ts}` | diff、gate、expert-only report shaping | shared execution 内核 |
| `public-facade` | `packages/logix-core/src/{Runtime.ts,Reflection.ts}` | 公开导出与注释说明 | 内部执行逻辑 |

## Execution Snapshot

### 2026-04-08

- `proof-kernel` 当前继续是唯一共享执行内核
- `trialRunModule.ts` 当前只保留 canonical route adapter + kernel boot/close 协调 + report/re-export 编排
- `trialRunEnvironment.ts` 已承接 environment 与 missing dependency 解释
- `trialRunErrors.ts` 已承接 timeout / dispose / generic runtime error mapping
- `kernelContract.ts` 与 `fullCutoverGate.ts` 当前继续只保留 expert adapter 语义
- `pnpm vitest run packages/logix-core/test/Contracts/VerificationProofKernel.contract.test.ts packages/logix-core/test/Contracts/VerificationProofKernelRoutes.test.ts packages/logix-core/test/Contracts/VerificationControlPlaneContract.test.ts packages/logix-core/test/Contracts/KernelReflectionExpertConsumers.test.ts`
  - PASS
- `pnpm vitest run packages/logix-core/test/Runtime/Runtime.trial.runId.test.ts packages/logix-core/test/observability/Runtime.trial.runSessionIsolation.test.ts packages/logix-core/test/observability/Runtime.trial.runtimeServicesEvidence.test.ts packages/logix-core/test/observability/Runtime.trial.reExportBudget.test.ts`
  - PASS
- `pnpm -C packages/logix-core exec tsc -p tsconfig.json --noEmit`
  - PASS

## Current Snapshot

### 2026-04-08

- `proof-kernel` 当前已经是唯一共享执行内核
- `trialRun.ts` 当前已经退成 proof-kernel 薄 wrapper
- `trialRunModule.ts` 当前仍混有：
  - missing dependency 解释
  - environment 组装
  - timeout / dispose error mapping
  - report / artifacts re-export
- `kernelContract.ts` 与 `fullCutoverGate.ts` 当前已经只消费 proof-kernel，不再持有 shared execution wiring
