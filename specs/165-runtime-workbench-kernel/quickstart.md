# Quickstart: Runtime Workbench Kernel

## Read First

```bash
rtk sed -n '1,260p' specs/165-runtime-workbench-kernel/spec.md
rtk sed -n '1,260p' specs/165-runtime-workbench-kernel/plan.md
rtk sed -n '1,220p' specs/165-runtime-workbench-kernel/contracts/README.md
```

## Targeted Implementation Checks

Core kernel:

```bash
rtk pnpm -C packages/logix-core exec vitest run \
  test/internal/Workbench/Workbench.authorityBundle.contract.test.ts \
  test/internal/Workbench/Workbench.projectionIndex.contract.test.ts \
  test/internal/Workbench/Workbench.findingAuthority.contract.test.ts \
  test/internal/Workbench/Workbench.coordinateGaps.contract.test.ts \
  test/internal/Workbench/Workbench.shapeSeparation.contract.test.ts \
  test/internal/Workbench/Workbench.publicSurface.guard.test.ts
```

DVTools adapter:

```bash
rtk pnpm -C packages/logix-devtools-react exec vitest run \
  test/internal/workbench-derivation.contract.test.ts \
  test/internal/workbench-gaps.contract.test.ts \
  test/internal/workbench-export.contract.test.ts \
  test/internal/workbench-state.contract.test.tsx
```

CLI adapter:

```bash
rtk pnpm -C packages/logix-cli exec vitest run \
  test/Integration/workbench-projection.contract.test.ts \
  test/Integration/evidence-selection-input.contract.test.ts \
  test/Integration/evidence-selection-roundtrip.contract.test.ts
```

Playground adapter:

```bash
rtk pnpm -C packages/logix-playground exec vitest run \
  test/derived-summary.contract.test.ts \
  test/shape-separation.contract.test.ts \
  test/workbench-layout.contract.test.tsx
```

## Typecheck

```bash
rtk pnpm -C packages/logix-core typecheck
rtk pnpm -C packages/logix-devtools-react typecheck
rtk pnpm -C packages/logix-cli typecheck
rtk pnpm -C packages/logix-playground typecheck
```

## Negative Sweep

```bash
rtk rg -n "Runtime\\.workbench|runtime\\.workbench|Runtime\\.devtools|runtime\\.devtools|Runtime\\.inspect|runtime\\.inspect|Runtime\\.playground|runtime\\.playground|PlaygroundRunResult|SnapshotPreviewWitness" \
  packages/logix-core/src \
  packages/logix-core/package.json \
  packages/logix-sandbox/src \
  packages/logix-sandbox/package.json \
  packages/logix-playground/src \
  packages/logix-devtools-react/src \
  packages/logix-cli/src
```

Expected:

- no public facade hits.
- no production `SnapshotPreviewWitness` hit.
- any remaining `devtools` hits must be existing internal debug/devtools vocabulary, not public workbench facade.

## Workspace Gates

Run after targeted tests pass:

```bash
rtk pnpm typecheck
rtk pnpm test:turbo
```

Run lint if touched packages are lint-covered:

```bash
rtk pnpm lint
```

## Manual Review Checklist

- `packages/logix-core/package.json` blocks repo-internal workbench bridge in publish config.
- all projection nodes carry `authorityRef` or `derivedFrom`.
- `selectionHints` do not affect projection truth.
- debug events without stable coordinate create gaps.
- CLI output remains CLI/control-plane transport.
- DVTools UI state is not named as projection authority.
- Playground summary is host view state.
- Playground display shape follows `docs/ssot/runtime/17-playground-product-workbench.md`, while active file, editor cursor, selected panel, console tab and preview lifecycle remain host state.
- Driver/Scenario semantics follow `specs/166-playground-driver-scenario-surface/spec.md`; the kernel sees only produced result/report/evidence/debug refs.
