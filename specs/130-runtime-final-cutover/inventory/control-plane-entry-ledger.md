# Control Plane Entry Ledger

## Purpose

记录 control plane 的一级公开入口、backing path 与 direct consumers。

## Allowed Final Status

- `canonical`
- `expert-only`
- `internal-backing-only`
- `allowlisted-temporary`
- `remove`

## Target Entry Map

| Stage | Public Facade | Backing Path | Contract Owner | Target Status |
| --- | --- | --- | --- | --- |
| `check` | `runtime.check` | `@logixjs/core/ControlPlane` + core backing implementation | `@logixjs/core/ControlPlane` | `canonical` |
| `trial` | `runtime.trial` | core trial backing modules | `@logixjs/core/ControlPlane` | `canonical` |
| `compare` | `runtime.compare` | core compare backing modules | `@logixjs/core/ControlPlane` | `canonical` |

## Legacy / Transitional Entries

| Surface | Current Role | Target Status | Notes |
| --- | --- | --- | --- |
| `Runtime.trial` | historical public facade | `remove` | public surface 移除；只保留 internal backing |
| `Runtime.trial` | historical public facade | `remove` | public surface 移除；只保留 internal backing |
| `CoreReflection.verifyKernelContract` | backing or expert alias | `expert-only` | 不得继续充当一级入口 |
| `CoreReflection.verifyFullCutoverGate` | backing or expert alias | `expert-only` | 不得继续充当一级入口 |
| `CoreReflection.extractManifest/exportStaticIr/exportControlSurface` | platform/export helpers | `expert-only` | 允许保留 expert 身份，但不得伪装 control plane 一级入口 |

## Direct Consumers

| Consumer | Current Path | Target Path | Notes |
| --- | --- | --- | --- |
| `packages/logix-cli/src/internal/commands/check.ts` | `check` facade + core report contract | `canonical` | 已在主线上 |
| `packages/logix-cli/src/internal/commands/trial.ts` | `trial` facade + backend placeholder | `canonical` | 必须清掉 placeholder |
| `packages/logix-cli/src/internal/commands/trialRun.ts` | archived backend / historical bridge | `remove` | 不得继续作为默认后端桥 |
| `packages/logix-cli/src/internal/commands/compare.ts` | `compare` facade + core report contract | `canonical` | 已在主线上 |
| `packages/logix-sandbox/src/Service.ts` | `trial` service method | `canonical` | 已改走 `Runtime.trial` wrapper |
| `packages/logix-sandbox/src/Client.ts` | 直接拼接 `Runtime.trial` | `canonical` | wrapper 已切到 final facade |
| `packages/logix-sandbox/test/browser/**` | `Runtime.trial` browser path | `canonical` | multi-kernel / compat 场景已改走 final facade |
| `examples/logix-sandbox-mvp/**` | embedded `Runtime.trial` wrapper | `canonical` | 已切到 `Runtime.trial`，bundle 与 generated 产物已重建 |
| `examples/logix/src/scenarios/trial-run-evidence.ts` | `Logix.Runtime.trial` | `canonical` | 已改为 runtime.trial canonical example |
| `packages/logix-core/test/observability/**` | `Runtime.trial` + internal backing imports | `internal-backing-only` | core 自测不再占用 public legacy facade；shared run/evidence primitive 已迁到 `internal/verification/**` |
| `packages/logix-core/test/Contracts/Contracts.045.*` | `CoreReflection.verifyKernelContract` + internal backing `internal/verification/trialRun` | `expert-only` | public legacy facade 已退出，只保留 expert/backing ownership 测试 |
| `packages/logix-core/test/Contracts/Contracts.047.*` | `CoreReflection.verifyFullCutoverGate` | `expert-only` | gate contract 自测保留 expert 路由 |
| `packages/logix-test/test/**` | `Module.implement(...)` + 旧默认 consumer 心智 | `canonical` | 默认写法必须迁到 Program.make + final control plane |
| `packages/logix-react/**` | package-local runtime consumption | `expert-only` | package-local projection，不进入 control plane 主线 |
| `packages/logix-devtools-react/**` | host diagnostics consumer | `expert-only` | package-local diagnostics consumer，不进入 control plane 主线 |

## Gate

- 若 direct consumer 仍直接以旧 facade 为默认路径，则 final cutover 不通过。
- `Observability` / `Reflection` / sandbox client-service / root barrel 中任一 control-plane-adjacent surface 未完成 `canonical / expert-only / internal-backing-only / remove / allowlisted-temporary` 分类，则 final cutover 不通过。

## Verification Snapshot

### 2026-04-07

- `pnpm vitest run packages/logix-cli/test/Args/Args.cli-config-prefix.test.ts packages/logix-cli/test/Integration/cli.describe-json.test.ts packages/logix-cli/test/Integration/trial.command.test.ts`
  - PASS
- `pnpm -C packages/logix-cli exec tsc -p tsconfig.json --noEmit`
  - PASS
- `pnpm vitest run packages/logix-core/test/Runtime/Runtime.trial.runId.test.ts`
  - PASS
- `pnpm -C packages/logix-sandbox exec vitest run test/Client/SandboxClientLayer.test.ts test/browser/sandbox-worker-multi-kernel.test.ts test/browser/sandbox-worker-smoke.test.ts test/browser/sandbox-worker-process-events.compat.test.ts`
  - PASS
- `pnpm -C packages/logix-sandbox exec tsc -p tsconfig.json --noEmit`
  - PASS
- `pnpm -C examples/logix exec tsx src/scenarios/trial-run-evidence.ts`
  - PASS
- `pnpm -C packages/logix-sandbox bundle:kernel`
  - PASS
- `pnpm -C examples/logix-sandbox-mvp gen:monaco:types`
  - PASS
- `pnpm -C examples/logix-sandbox-mvp exec vitest run test/ir.noArtifacts.test.ts test/ir.rulesManifest.test.ts`
  - PASS
- `pnpm -C examples/logix-sandbox-mvp exec tsc -p tsconfig.json --noEmit`
  - PASS
- `pnpm vitest run packages/logix-core/test/observability/KernelObservabilitySurface.test.ts packages/logix-core/test/observability/ExecVmEvidence.off.test.ts packages/logix-core/test/observability/TrialRunEvidenceDemo.regression.test.ts packages/logix-core/test/observability/Observability.TrialRun.SessionIsolation.test.ts packages/logix-core/test/observability/Runtime.trial.runId.test.ts packages/logix-core/test/observability/Runtime.trial.missingService.test.ts packages/logix-core/test/observability/Runtime.trial.missingConfig.test.ts packages/logix-core/test/observability/Runtime.trial.runSessionIsolation.test.ts packages/logix-core/test/observability/Runtime.trial.scopeDispose.test.ts packages/logix-core/test/observability/Runtime.trial.trialRunTimeout.test.ts packages/logix-core/test/observability/Runtime.trial.disposeTimeout.test.ts packages/logix-core/test/observability/Runtime.trial.runtimeServicesEvidence.test.ts packages/logix-core/test/observability/Runtime.trial.reExportBudget.test.ts packages/logix-core/test/Contracts/Contracts.045.KernelContractVerification.test.ts`
  - PASS
- `pnpm -C packages/logix-core exec tsc -p tsconfig.json --noEmit`
  - PASS
- `pnpm vitest run packages/logix-core/test/Contracts/KernelReflectionSurface.test.ts`
  - PASS
- `pnpm vitest run packages/logix-core/test/Contracts packages/logix-core/test/Runtime packages/logix-cli/test/Integration packages/logix-test/test/TestProgram packages/logix-test/test/Vitest`
  - PASS
- `pnpm -C packages/logix-sandbox exec vitest run test/Client test/browser`
  - PASS
- `pnpm typecheck`
  - PASS
- `pnpm vitest run packages/logix-core/test/Contracts/KernelReflectionSurface.test.ts packages/logix-core/test/Contracts/KernelReflectionInternalEdges.test.ts packages/logix-core/test/Contracts/Contracts.045.KernelContractVerification.test.ts packages/logix-core/test/Contracts/Contracts.047.FullCutoverGate.serializable.test.ts packages/logix-core/test/Contracts/Contracts.047.FullCutoverGate.trial.test.ts packages/logix-core/test/Contracts/VerificationControlPlaneContract.test.ts packages/logix-core/test/internal/observability/Observability.RuntimeEvidencePackage.test.ts packages/logix-core/test/observability/ExecVmEvidence.off.test.ts packages/logix-core/test/observability/Observability.TrialRun.SessionIsolation.test.ts packages/logix-core/test/observability/TrialRunEvidenceDemo.regression.test.ts packages/logix-core/test/TrialRunArtifacts/Artifacts.budget.test.ts packages/logix-core/test/TrialRunArtifacts/Artifacts.conflict.test.ts packages/logix-core/test/TrialRunArtifacts/Artifacts.truncation-diff.test.ts packages/logix-core/test/TrialRunArtifacts/Artifacts.determinism.test.ts packages/logix-core/test/TrialRunArtifacts/Artifacts.partial-failure.test.ts`
  - PASS
- `rg -n "internal/observability/(jsonValue|evidence|runSession|evidenceCollector|evidenceExportPipeline|trialRun|artifacts/exporter)\\.js" packages/logix-core/src packages/logix-core/test -g '*.ts'`
  - ZERO HIT
- `rg -n 'Observability\\.trialRun|Observability\\.trialRunModule|trialRunModule\\(|trialrun|spy\\.evidence' docs/ssot docs/adr docs/standards examples/logix packages/logix-core/src/index.ts -g '*.md' -g '*.ts'`
  - ZERO HIT
- `rg -n 'Logix\\.Observability\\.trialRun|Logix\\.Observability\\.trialRunModule' apps/docs examples/logix-react -g '*.md' -g '*.mdx' -g '*.tsx'`
  - ZERO HIT
- `rg -n 'Observability\\.trialRun|Observability\\.trialRunModule|trialRun\\s*:|trialRunModule\\s*:' packages/logix-sandbox/public/sandbox/logix-core/Observability.js packages/logix-sandbox/public/sandbox/logix-core.js -g '*.js'`
  - ZERO HIT
- `rg -n 'Observability\\.trialRun|Observability\\.trialRunModule|Logix\\.Observability\\.trialRun|Logix\\.Observability\\.trialRunModule|\\.implement\\(' examples/logix-sandbox-mvp/src examples/logix-sandbox-mvp/test examples/logix-sandbox-mvp/public/monacoTypeBundle.generated.files.json examples/logix-sandbox-mvp/src/components/editor/types/monacoTypeBundle.generated.files.ts -g '*.ts' -g '*.tsx' -g '*.json'`
  - ZERO HIT
- `rg -n 'Observability\\.trialRun|Observability\\.trialRunModule|Logix\\.Observability\\.trialRun|Logix\\.Observability\\.trialRunModule|\\.implement\\(' packages/logix-core/test/observability packages/logix-core/test/Contracts/Contracts.045.KernelContractVerification.test.ts -g '*.ts'`
  - ZERO HIT

### Applied Changes

- `trialrun` 已退出公开 parser / help / describe surface
- `spy.evidence` 已退出公开 parser / describe surface
- `trial` 不再通过 archived `trialrun` backend 兜底
- `Runtime.trial` facade 已接到 core trial backing
- sandbox `Client/Service` 已改走 `Runtime.trial`
- `examples/logix/src/scenarios/trial-run-evidence.ts` 已改走 `Runtime.trial`
- `Runtime.trial` / `Runtime.trial` 已从 `@logixjs/core/repo-internal/evidence-api` 公共导出移除
- `CoreReflection.verifyFullCutoverGate` 的 backing 已下沉到 `src/internal/reflection/fullCutoverGate.ts`，`src/Reflection.ts` 不再直接 import `internal/observability/*`
- expert verification shared primitive 已从 `src/internal/observability/**` 迁到 `src/internal/{verification,protocol,artifacts}/**`
- shared execution wiring 已进一步压到 `src/internal/verification/proofKernel.ts`；`trialRunModule.ts` 退成 canonical route adapter，`kernelContract.ts` / `fullCutoverGate.ts` 退成 expert route adapter
- `trialRunModule.ts` 的 `environment` 与 `error-mapping` 已从主文件拆出，canonical adapter 当前不再混入第一波 shared execution owner 语义
- `examples/logix-sandbox-mvp/**` 已切到 `Runtime.trial`
- `packages/logix-core/test/observability/**` 与 `Contracts.045.KernelContractVerification.test.ts` 已改走 `internal/verification/trialRun`
- `packages/logix-core/test/observability/**` 的 module-root 场景已统一改走 `Runtime.trial`
