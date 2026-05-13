# Quickstart: Verification Pressure Kernel

## Read First

1. `specs/161-verification-pressure-kernel/spec.md`
2. `docs/ssot/runtime/16-agent-self-verification-scenario-matrix.md`
3. `docs/ssot/runtime/09-verification-control-plane.md`
4. `docs/ssot/runtime/04-capabilities-and-runtime-control-plane.md`

## Implementation Order

1. Add failing contract tests for static pressure and no-startup check behavior.
2. Add failing startup dependency tests for service, config, Program import and child dependency.
3. Add lifecycle dual-summary tests.
4. Add compare admissibility tests.
5. Add repeatability tests.
6. Implement core changes through existing control-plane and proof-kernel routes.
7. Write proof refs back to `docs/ssot/runtime/16` only for rows that meet covered criteria.

## Suggested Targeted Commands

```sh
pnpm -C packages/logix-core exec vitest run \
  test/Contracts/RuntimeCheck.contract.test.ts \
  test/Contracts/ProgramImports.program-entry.test.ts \
  test/Contracts/VerificationControlPlaneCompare.contract.test.ts \
  test/Contracts/VerificationControlPlaneContract.test.ts
```

```sh
pnpm -C packages/logix-core exec vitest run \
  test/observability/Observability.trialRunModule.missingService.test.ts \
  test/observability/Observability.trialRunModule.missingConfig.test.ts \
  test/observability/Observability.trialRunModule.disposeTimeout.test.ts \
  test/observability/Observability.trialRunModule.scopeDispose.test.ts
```

```sh
pnpm -C packages/logix-core exec tsc -p tsconfig.json --noEmit
```

## Completion Checklist

- `runtime.check` static failures are structured and do not boot runtime.
- Startup dependency failures have typed cause pressure.
- PASS semantics only cover current stage.
- Compare admissibility distinguishes input drift from repair failure.
- Repeatability proof is narrow and deterministic.
- SSoT writeback is complete.

## Implementation Evidence

Validated on 2026-04-27:

- `pnpm -C packages/logix-core exec vitest run test/Contracts/RuntimeCheck.contract.test.ts test/Contracts/ProgramImports.program-entry.test.ts test/Contracts/VerificationControlPlaneCompare.contract.test.ts test/Contracts/VerificationControlPlaneContract.test.ts` passed, 4 files / 20 tests.
- `pnpm -C packages/logix-core exec vitest run test/observability/Observability.trialRunModule.missingService.test.ts test/observability/Observability.trialRunModule.missingConfig.test.ts test/observability/Observability.trialRunModule.disposeTimeout.test.ts test/observability/Observability.trialRunModule.scopeDispose.test.ts` passed, 4 files / 4 tests.
- `pnpm -C packages/logix-core exec tsc -p tsconfig.json --noEmit` passed.
- `rg -n "\b(Probe|Witness|Pressure|CAP-PRESS|TASK)\b" packages/logix-core/src` returned no production-code hits.

Known verification note:

- `pnpm -C packages/logix-core exec tsc -p tsconfig.test.json --noEmit` no longer fails with `TS2209`; `packages/logix-core/tsconfig.test.json` now sets `rootDir` to the workspace root so package export map resolution is unambiguous.
- Full test typecheck still fails on older test debt outside `161`: scenario carrier Effect environment mismatches, legacy root type references such as `ActionOf` / `StateOf`, missing `src/EffectOp.js` imports, stale `RuntimeInternalsFields` fixtures and old debug event shape assertions.
