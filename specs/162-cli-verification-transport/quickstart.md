# Quickstart: CLI Verification Transport

## Read First

1. `specs/162-cli-verification-transport/spec.md`
2. `specs/162-cli-verification-transport/tasks.md`
3. `specs/162-cli-verification-transport/checklists/implementation-closure.md`
4. `docs/ssot/runtime/16-agent-self-verification-scenario-matrix.md`
5. `docs/ssot/runtime/15-cli-agent-first-control-plane.md`
6. `docs/ssot/runtime/14-dvtools-internal-workbench.md`
7. `specs/161-verification-pressure-kernel/spec.md`

`checklists/requirements.md` is a spec quality checklist only. It is not implementation evidence.

## Implementation Order

1. Add failing CLI integration tests for public command surface and old command rejection if gaps remain.
2. Add failing `CommandResult` transport tests for primary report key, artifact order, truncation and file fallback.
3. Add exact rerun coordinate tests for check and startup trial.
4. Add source artifact boundary tests.
5. Add DVTools evidence + selection manifest roundtrip tests.
6. Add compare route tests for before/after refs and admissibility.
7. Add e2e closure proof packs after `161` exposes the core pressure needed for each failure family.
8. Update CLI skill and SSoT proof refs.

The executable task order is authoritative in [tasks.md](./tasks.md). This quickstart only lists the short path and final proof commands.

## Suggested Targeted Commands

```sh
pnpm -C packages/logix-cli exec vitest run \
  test/Integration/command-result-transport.contract.test.ts \
  test/Integration/output-contract.test.ts \
  test/Integration/command-schema.guard.test.ts \
  test/Integration/output-budget.contract.test.ts \
  test/Integration/transport-gate-error.contract.test.ts \
  test/Integration/exact-rerun-coordinate.contract.test.ts
```

```sh
pnpm -C packages/logix-cli exec vitest run \
  test/Integration/evidence-selection-input.contract.test.ts \
  test/Integration/evidence-selection-roundtrip.contract.test.ts \
  test/Integration/source-artifact-boundary.contract.test.ts
```

```sh
pnpm -C packages/logix-cli exec vitest run \
  test/Integration/compare.command.test.ts \
  test/Integration/repair-closure.program-assembly.e2e.test.ts \
  test/Integration/repair-closure.source-declaration.e2e.test.ts \
  test/Integration/repair-closure.dependency.e2e.test.ts
```

```sh
pnpm -C packages/logix-cli exec tsc -p tsconfig.json --noEmit
```

```sh
pnpm -C packages/logix-cli exec tsc -p tsconfig.test.json --noEmit
```

## Completion Checklist

- Help, parser and schema expose only `check / trial / compare`.
- `CommandResult` remains transport-only.
- `inputCoordinate` supports exact rerun and stage upgrade.
- stdout budget and file fallback are deterministic.
- Evidence and selection roundtrip keeps selection hint-only.
- Compare command routes to core compare truth.
- Three closure proof packs cover Program assembly, source/declaration and dependency families.
- CLI skill and SSoT proof refs are updated.
- `docs/ssot/runtime/16-agent-self-verification-scenario-matrix.md` statuses match the final proof set.
