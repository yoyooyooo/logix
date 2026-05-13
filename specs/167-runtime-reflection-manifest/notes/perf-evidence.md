# Perf Evidence

## 2026-04-29 167A Minimum Reflection Contract

Touched production code is limited to repo-internal reflection DTOs and helper functions:

- `packages/logix-core/src/internal/reflection/programManifest.ts`
- `packages/logix-core/src/internal/reflection/consumptionContract.ts`
- `packages/logix-core/src/internal/reflection-api.ts`

167A adds explicit extraction/classification helpers that run only when a repo-internal consumer calls them. It does not add runtime hooks, dispatch/run/check/trial collection, transaction-window work, public Runtime API or disabled-mode observer paths.

Runtime hot-path perf collection is not required for 167A. Disabled-mode overhead evidence is required later when 167B implements runtime operation event collection.

## 2026-04-29 167B Terminal Reflection Contract

Touched production code remains explicit-call reflection and CLI transport code:

- `packages/logix-core/src/internal/reflection/payloadSummary.ts`
- `packages/logix-core/src/internal/reflection/payloadValidation.ts`
- `packages/logix-core/src/internal/reflection/programManifest.ts`
- `packages/logix-core/src/internal/reflection/runtimeOperationEvents.ts`
- `packages/logix-core/src/internal/reflection/workbenchBridge.ts`
- `packages/logix-core/src/internal/reflection-api.ts`
- `packages/logix-cli/src/internal/reflectionManifestArtifact.ts`
- `packages/logix-cli/src/internal/commands/check.ts`
- `packages/logix-cli/src/internal/commands/trial.ts`

167B adds DTO constructors, manifest extraction, schema validation, debug-ref projection and CLI artifact export that run only when called by repo-internal reflection consumers or CLI commands. It does not install new dispatch/run/check/trial runtime hooks, does not add transaction-window IO and does not change default diagnostics-disabled runtime behavior.

Disabled-mode hot-path benchmark is not required for this closure because runtime collection hooks were not added. Any future default observer, batch buffer or automatic dispatch/run/check/trial collection must reopen perf evidence with a disabled-mode overhead measurement.
