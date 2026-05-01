# Consumer Route Ledger

| Consumer | Current Default Route | Target Route | Target Status | Notes |
| --- | --- | --- | --- | --- |
| `packages/logix-core/test/Contracts/Contracts.045.KernelContractVerification.test.ts` | `CoreReflection.verifyKernelContract` | `CoreReflection.verifyKernelContract` | expert-only | intentional expert contract consumer |
| `packages/logix-core/test/Contracts/Contracts.047.FullCutoverGate.*` | `CoreReflection.verifyFullCutoverGate` | `CoreReflection.verifyFullCutoverGate` | expert-only | intentional expert contract consumer |
| `packages/logix-core/test/Contracts/VerificationControlPlaneContract.test.ts` | `Runtime.trial` canonical route + expert route ownership assertion | unchanged | expert-only assertion | 只做 route ownership contract，不改变默认入口 |
| `packages/logix-core/test/Reflection*.test.ts` | `Reflection.extract* / diff* / verify*` | same | expert-only | reflection API 自测 |
| `packages/logix-core/test/Runtime/**` | `Runtime.*` | `Runtime.*` | canonical | 不得回流到 `Reflection.verify*` |
| `packages/logix-cli/**` | `runtime.*` narrative + control plane contract | unchanged | canonical | 不受 expert backing 影响 |
| `packages/logix-sandbox/**` | `Runtime.trial` | unchanged | canonical | browser client/service 不得改走 expert route |
| `examples/logix/**` | `runtime.*` narrative | unchanged | canonical | examples 继续只讲 canonical route |
| `docs/ssot/runtime/09-verification-control-plane.md` | `runtime.*` 主线 | unchanged | canonical | 只在 expert route 边界说明处补 owner 变化 |

## Gate

- 新增 `Reflection.verify*` 默认入口命中数必须为 0
- expert-only 命中只允许落在本 ledger 已登记路径

## Verification Snapshot

### 2026-04-07

- `pnpm vitest run packages/logix-core/test/Contracts/KernelReflectionSurface.test.ts packages/logix-core/test/Contracts/KernelReflectionInternalEdges.test.ts packages/logix-core/test/Contracts/KernelReflectionExpertConsumers.test.ts packages/logix-core/test/Contracts/VerificationControlPlaneContract.test.ts packages/logix-core/test/Contracts/Contracts.045.KernelContractVerification.test.ts packages/logix-core/test/Contracts/Contracts.047.FullCutoverGate.serializable.test.ts packages/logix-core/test/Contracts/Contracts.047.FullCutoverGate.trial.test.ts`
  - PASS
- 当前没有新增默认 consumer 回流到 `Reflection.verify*`
