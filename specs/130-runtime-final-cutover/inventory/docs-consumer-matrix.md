# Docs And Consumer Matrix

## Purpose

确保 docs、examples、exports、direct consumers 在 final cutover 后对同一条 runtime 主线说话。

## Docs Owners

| Doc | Focus | Must Align With |
| --- | --- | --- |
| `docs/ssot/runtime/01-public-api-spine.md` | 公开主链 | `packages/logix-core/src/index.ts`, `Module.ts`, `Program.ts`, `Runtime.ts` |
| `docs/ssot/runtime/03-canonical-authoring.md` | canonical 装配与专家边界 | `Program.ts`, `Module.ts`, canonical examples |
| `docs/ssot/runtime/02-hot-path-direction.md` | kernel hot path | `packages/logix-core/src/internal/runtime/core/**` |
| `docs/ssot/runtime/04-capabilities-and-runtime-control-plane.md` | capability + control plane 边界 | `Program.ts`, `ControlPlane.ts`, control plane facade files |
| `docs/ssot/runtime/05-logic-composition-and-override.md` | expert/runtime boundary | `Module.ts`, `Process.ts`, `Workflow.ts` |
| `docs/ssot/runtime/07-standardized-scenario-patterns.md` | canonical scenarios | `examples/logix/**`, host/direct consumer examples |
| `docs/ssot/runtime/09-verification-control-plane.md` | verification protocol | `ControlPlane.ts`, cli/test/sandbox consumers |
| `docs/ssot/platform/01-layered-map.md` | 总分层与 owner map | `runtime spine`, `runtime control plane`, `UI projection` |
| `docs/ssot/platform/02-anchor-profile-and-instantiation.md` | 实例化入口 | `Program.make`, `Runtime.make`, capability settlement |
| `docs/ssot/runtime/README.md` | runtime docs root routing | runtime owner pages |
| `docs/adr/2026-04-04-logix-api-next-charter.md` | 公开主链总裁决 | `runtime/01`, `runtime/03`, `runtime/04`, `runtime/05` |
| `docs/adr/2026-04-05-ai-native-runtime-first-charter.md` | runtime-first 总裁决 | `runtime/02`, `runtime/04`, `runtime/09`, `platform/01` |
| `docs/standards/logix-api-next-guardrails.md` | 全局护栏 | 上述所有 owner docs |

## Direct Consumers

| Consumer | Current Dependency | Target Dependency |
| --- | --- | --- |
| `examples/logix/**` | runtime public spine + some legacy backing paths | canonical runtime spine only |
| `examples/logix/src/scenarios/trial-run-evidence.ts` | `Runtime.trial` | final control plane facade |
| `examples/logix/src/verification/**` | runtime.* narrative | canonical control plane |
| `packages/logix-core/src/index.ts` | root exports with mixed canonical/expert/backing semantics | explicit classified exports |
| `packages/logix-core/test/observability/**` | `Runtime.trial` + `internal/verification/**` backing imports | final control plane facade or internal backing classification |
| `packages/logix-core/test/TrialRunArtifacts/**` | `Runtime.trial` artifact route | final control plane facade |
| `packages/logix-core/test/Reflection*.test.ts` | old reflection route cluster | final control plane facade or explicit expert classification |
| `packages/logix-core/test/Contracts/Contracts.045.*` | `Reflection` + internal backing `internal/verification/trialRun` | final control plane ownership |
| `packages/logix-cli/**` | control plane backing / facade mix | final control plane facade |
| `packages/logix-react/**` | host projection package-local consumer | package-local host projection aligned to final runtime spine |
| `packages/logix-devtools-react/**` | host diagnostics consumer | package-local diagnostics consumer aligned to final runtime spine |
| `packages/logix-test/test/TestProgram/**` | legacy `Module.implement(...)` + old route defaults | canonical runtime spine + final control plane |
| `packages/logix-test/test/Vitest/**` | mixed old defaults | canonical runtime spine + final control plane |
| `packages/logix-sandbox/src/{Client.ts,Service.ts}` | `Runtime.trial` client/service surface | canonical control plane |
| `packages/logix-sandbox/test/browser/**` | final `Runtime.trial` browser wrapper | canonical control plane |
| `examples/logix-sandbox-mvp/**` | embedded `Runtime.trial` wrapper + rebuilt generated type bundle | final `Runtime.trial` facade + rebuilt generated outputs |

## Migration Matrix

| Old Path / Surface | Replacement Or No Replacement | Affected Consumers | Docs/Examples Cleared | Status |
| --- | --- | --- | --- | --- |
| `Module.implement(...)` | `Program.make(...)` or `Program.make(...) plus internal ProgramRuntimeBlueprint helper` | `packages/logix-core/test/**`, `packages/logix-test/**`, `packages/logix-sandbox/test/browser/**` | `yes` | `completed` |
| `Runtime.trial(...)` | `runtime.trial` canonical facade；effect-only harness 走 internal backing | `packages/logix-core/test/observability/**`, `Contracts.045.*` | `yes` | `completed` |
| `Runtime.trial(...)` | `runtime.trial` canonical facade；public API removed | `examples/logix-sandbox-mvp/**`, `packages/logix-sandbox/public/sandbox/**`, `packages/logix-core/test/TrialRunArtifacts/**` | `yes` | `completed` |
| `Reflection.verify*` as default validation path | no canonical replacement; stays expert-only | `packages/logix-core/test/Contracts/Contracts.045.*`, `packages/logix-core/test/Reflection*.test.ts` | `yes` | `completed` |
| CLI `trialrun` and placeholder backend semantics | `logix trial` + final runtime trial contract | `packages/logix-cli/**`, CLI tests | `yes` | `completed` |

## Gate

- docs 口径、examples 写法、exports 结构、direct consumer 默认入口必须同时一致。
- 任一矩阵行未完成 target dependency 对齐，则 final cutover 不通过。
- 若 `packages/logix-cli/src/internal/commands/trial.ts`、`packages/logix-sandbox/src/{Client.ts,Service.ts}` 或 `packages/logix-core/test/observability/**` 仍保留未解释的旧默认路径，则 final cutover 不通过。
- 若 migration matrix 未覆盖全部 breaking surface，则 final cutover 不通过。

## Verification Snapshot

### 2026-04-07

- `pnpm typecheck`
  - PASS
- `pnpm -C packages/logix-core exec tsc -p tsconfig.json --noEmit`
  - PASS
- `pnpm vitest run packages/logix-core/test/Contracts packages/logix-core/test/Runtime packages/logix-cli/test/Integration packages/logix-test/test/TestProgram packages/logix-test/test/Vitest`
  - PASS
- `pnpm vitest run packages/logix-cli/test/Integration/trial.command.test.ts`
  - PASS
- `pnpm -C packages/logix-sandbox exec vitest run test/Client test/browser`
  - PASS
- `rg -n 'runtime\\.trial is not available yet|TRIAL_BACKEND_PENDING' packages/logix-cli packages/logix-core packages/logix-sandbox packages/logix-test examples/logix docs/ssot docs/adr docs/standards -g '*.ts' -g '*.md'`
  - ZERO HIT
- `rg -n '\\.implement\\(' packages/logix-core/test/{Module,Logic,FieldKernel,Process,Link,Bound,internal,observability,TrialRunArtifacts,Reflection*.test.ts} packages/logix-test packages/logix-sandbox/test/browser -g '*.ts' -g '*.tsx'`
  - ZERO HIT
- `rg -n "internal/runtime/(ModuleRuntime|ProgramRunner|BoundApiRuntime|FlowRuntime|Lifecycle|Runtime|index)(\\.ts|\\.js|\\*|)" packages/logix-core/src packages/logix-core/test -g '*.ts'`
  - ZERO HIT
- `rg -n 'Observability\\.trialRun|Observability\\.trialRunModule|Reflection\\.(verify|export|extract)|runtime\\.trial is not available yet|TRIAL_BACKEND_PENDING|\\.implement\\(|v3:|platform-first|_TBD_' docs/ssot docs/adr docs/standards examples/logix packages/logix-core/src/index.ts packages/logix-core/test/{Contracts,Runtime,observability,TrialRunArtifacts,Reflection*.test.ts} packages/logix-test/{src,test} packages/logix-sandbox/{src,test/browser} packages/logix-cli/{src,test} -g '*.md' -g '*.mdx' -g '*.ts' -g '*.tsx'`
  - 仅剩 `packages/logix-core/test/Reflection*.test.ts` 与 `packages/logix-core/test/Contracts/Contracts.045/047.*` 的 intentional expert-only hit，已在 `docs-consumer-matrix.md` 与 `control-plane-entry-ledger.md` 分类
- `packages/logix-core/package.json`
  - public exports 保持 `./Observability`、`./Runtime`、`./ControlPlane`、`./Reflection` 的显式分类；`./internal/*` 继续封闭
- `packages/logix-cli/package.json`
  - package description 已去掉 `trialrun` 旧命名
- `pnpm vitest run packages/logix-core/test/Contracts/KernelReflectionSurface.test.ts packages/logix-core/test/Contracts/KernelReflectionInternalEdges.test.ts packages/logix-core/test/Contracts/Contracts.045.KernelContractVerification.test.ts packages/logix-core/test/Contracts/Contracts.047.FullCutoverGate.serializable.test.ts packages/logix-core/test/Contracts/Contracts.047.FullCutoverGate.trial.test.ts packages/logix-core/test/Contracts/VerificationControlPlaneContract.test.ts packages/logix-core/test/internal/observability/Observability.RuntimeEvidencePackage.test.ts packages/logix-core/test/observability/ExecVmEvidence.off.test.ts packages/logix-core/test/observability/Observability.TrialRun.SessionIsolation.test.ts packages/logix-core/test/observability/TrialRunEvidenceDemo.regression.test.ts packages/logix-core/test/TrialRunArtifacts/Artifacts.budget.test.ts packages/logix-core/test/TrialRunArtifacts/Artifacts.conflict.test.ts packages/logix-core/test/TrialRunArtifacts/Artifacts.truncation-diff.test.ts packages/logix-core/test/TrialRunArtifacts/Artifacts.determinism.test.ts packages/logix-core/test/TrialRunArtifacts/Artifacts.partial-failure.test.ts`
  - PASS
- `rg -n "internal/observability/(jsonValue|evidence|runSession|evidenceCollector|evidenceExportPipeline|trialRun|artifacts/exporter)\\.js" packages/logix-core/src packages/logix-core/test -g '*.ts'`
  - ZERO HIT

## Final State

- owner docs、canonical examples、exports、direct consumers 当前已对齐到同一条 runtime 主线
- `Reflection.verify*` 保留 expert-only 身份，不再占用默认验证入口
- `src/Reflection.ts` 已退出对 `internal/observability/*` 的直接依赖，expert gate backing 与 shared primitive 已收口到 `src/internal/{reflection,verification,protocol,artifacts}/**`
- `Runtime.trial` 与 `Reflection.verify*` 当前共享 `src/internal/verification/proofKernel.ts`，各自只保留 route-specific adapter 语义
- canonical `Runtime.trial` adapter 当前已继续压薄，`trialRunModule.ts` 不再同时持有 environment / error-mapping 主实现
- `Module.implement(...)` 默认心智已退出目标 consumer 面
- `trialrun / spy.evidence / trial backend placeholder` 已退出公开命令面与 package 描述
- Phase 6 / Phase 7 门禁当前已收口
