# Quickstart: Verification Proof Kernel Second Wave

## 1. 先看哪些路径

- `packages/logix-core/src/internal/verification/proofKernel.ts`
- `packages/logix-core/src/internal/observability/trialRunModule.ts`
- `packages/logix-core/src/internal/reflection/kernelContract.ts`
- `packages/logix-core/src/internal/reflection/fullCutoverGate.ts`
- `packages/logix-core/test/Contracts/VerificationProofKernel*.test.ts`
- `docs/ssot/runtime/09-verification-control-plane.md`

## 2. 先回答哪些问题

1. 哪些逻辑属于 proof-kernel
2. 哪些逻辑属于 canonical adapter
3. `trialRunModule.ts` 还厚在什么地方
4. 哪些 contract tests 已经能证明 route 边界

## 3. 最小检查命令

```bash
pnpm vitest run \
  packages/logix-core/test/Contracts/VerificationProofKernel.contract.test.ts \
  packages/logix-core/test/Contracts/VerificationProofKernelRoutes.test.ts \
  packages/logix-core/test/Contracts/VerificationControlPlaneContract.test.ts

pnpm vitest run \
  packages/logix-core/test/Runtime/Runtime.trial.runId.test.ts \
  packages/logix-core/test/observability/Runtime.trial.runSessionIsolation.test.ts \
  packages/logix-core/test/observability/Runtime.trial.runtimeServicesEvidence.test.ts \
  packages/logix-core/test/observability/Runtime.trial.reExportBudget.test.ts

pnpm -C packages/logix-core exec tsc -p tsconfig.json --noEmit
```

## 4. 结构 grep

```bash
rg -n 'makeRunSession\\(|makeEvidenceCollector\\(' \
  packages/logix-core/src/internal/observability/trialRunModule.ts \
  packages/logix-core/src/internal/reflection/kernelContract.ts \
  packages/logix-core/src/internal/reflection/fullCutoverGate.ts \
  -g '*.ts'
```

目标：
- 若这类命中出现在 canonical / expert adapter 中，说明 proof-kernel 还没真正收成唯一共享执行内核
