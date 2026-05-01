# Owner Route Map

## Public Routes

| Surface | Current Backing | Current Role | Target Backing | Target Role | Notes |
| --- | --- | --- | --- | --- | --- |
| `Runtime.trial` | `packages/logix-core/src/Runtime.ts` + `packages/logix-core/src/internal/observability/trialRunModule.ts` | canonical | same public facade；底层可消费 `internal/verification/**` shared primitive | canonical | 默认入口不变 |
| `CoreReflection.verifyKernelContract` | `packages/logix-core/src/internal/reflection/kernelContract.ts` + borrowed observability primitive | expert-only with borrowed backing | `packages/logix-core/src/internal/reflection/kernelContract.ts` + `packages/logix-core/src/internal/verification/**` | expert-only | 不得再直接 import observability |
| `CoreReflection.verifyFullCutoverGate` | `packages/logix-core/src/internal/reflection/fullCutoverGate.ts` + borrowed observability primitive | expert-only with borrowed backing | `packages/logix-core/src/internal/reflection/fullCutoverGate.ts` + `packages/logix-core/src/internal/verification/**` | expert-only | public facade 已收口，剩 backing 待收口 |

## Internal Owners

| Owner | Current Responsibility | Target Responsibility | Allowed Dependencies | Forbidden Dependencies |
| --- | --- | --- | --- | --- |
| `packages/logix-core/src/internal/reflection/**` | expert diff/gate/export + borrowed run/evidence/protocol primitive | expert diff/gate/export only | `internal/verification/**`, `internal/protocol/**`, runtime/core helpers | `internal/observability/**` |
| `packages/logix-core/src/internal/verification/**` | N/A | shared run/evidence/session primitive | runtime/core helpers, protocol contracts | reflection-specific diff/gate, observability-only exports |
| `packages/logix-core/src/internal/protocol/**` | N/A | generic protocol contract such as `JsonValue` | none or lower-level utilities | reflection / verification / observability high-level semantics |
| `packages/logix-core/src/internal/observability/**` | run/evidence/debug/artifact/public observability projection | observability-owned debug/projection/export only | runtime/core helpers, protocol/shared primitive if needed | reflection-specific owner semantics |

## Execution Snapshot

### 2026-04-07

- `CoreReflection.verifyKernelContract` 当前 backing 已改为 `internal/reflection/kernelContract.ts` + `internal/{verification,protocol}/**`
- `CoreReflection.verifyFullCutoverGate` 当前 backing 已改为 `internal/reflection/fullCutoverGate.ts` + `internal/{verification,protocol}/**`
- `Runtime.trial` public facade 保持不变，`trialRunModule.ts` 当前改吃 `internal/verification/**`
- `pnpm vitest run packages/logix-core/test/Contracts/KernelReflectionSurface.test.ts packages/logix-core/test/Contracts/KernelReflectionInternalEdges.test.ts packages/logix-core/test/Contracts/Contracts.045.KernelContractVerification.test.ts packages/logix-core/test/Contracts/Contracts.047.FullCutoverGate.serializable.test.ts packages/logix-core/test/Contracts/Contracts.047.FullCutoverGate.trial.test.ts`
  - PASS
