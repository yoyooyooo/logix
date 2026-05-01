# Quickstart: Kernel-to-Playground Verification Parity

This quickstart describes the proof flow for 168 parity implementation and later follow-up slices.

## 1. Dominance Audit Before Coding

Read and classify existing paths:

```bash
rtk sed -n '1,460p' packages/logix-playground/src/internal/runner/projectSnapshotRuntimeInvoker.ts
rtk sed -n '1,180p' packages/logix-playground/src/internal/runner/runProjection.ts
rtk sed -n '1,220p' packages/logix-playground/src/internal/summary/workbenchProjection.ts
rtk sed -n '120,290p' packages/logix-core/src/Runtime.ts
rtk sed -n '1,220p' packages/logix-core/src/internal/workbench/authority.ts
rtk sed -n '1,220p' packages/logix-core/src/internal/workbench/findings.ts
rtk find examples/logix-react/src/playground/projects -maxdepth 4 -type f | sort
```

Record dispositions in [notes/verification.md](./notes/verification.md):

- keep
- rewrite-under-owner
- demote-to-host-state
- delete

## 2. Review Before Coding

For later broad slices, run plan-optimality-loop with the contract in [discussion.md](./discussion.md).

Expected outcome:

- adopted decisions written back to 168 authority files
- blocking discussion items closed or split
- implementation tasks updated

## 3. Core Proof

Run focused core checks:

```bash
rtk pnpm -C packages/logix-core typecheck
rtk pnpm -C packages/logix-core test -- --run --cache --silent=passed-only --reporter=dot
```

Expected proof:

- startup missing dependency is a real Trial finding
- dependency cause spine is sufficient or its gaps are explicit
- Check remains static
- Run failure is visible as failure, not success null
- lossy Run value projection is visible

## 4. CLI Proof

Run focused CLI checks:

```bash
rtk pnpm -C packages/logix-cli typecheck
rtk pnpm -C packages/logix-cli test -- --run --cache --silent=passed-only --reporter=dot
```

Expected proof:

- CLI trial emits the same report authority as core
- CLI compare consumes before/after refs
- CommandResult remains transport-only

## 5. Playground Proof

Run focused Playground checks:

```bash
rtk pnpm -C packages/logix-playground typecheck
rtk pnpm -C packages/logix-playground test -- --run --cache --silent=passed-only --reporter=dot
rtk pnpm -C examples/logix-react typecheck
```

Expected proof:

- Run, Check and Trial consume current ProjectSnapshot.
- Run failure does not render as successful `{ value: null }`.
- business `null`, `undefined`, void return and failure are distinguishable.
- Diagnostics authority lanes contain only owner-backed reports/failures/gaps.

## 6. Browser Route Proof

Run relevant browser routes after examples are updated:

```bash
rtk pnpm -C examples/logix-react test:browser -- --run --silent=passed-only --reporter=dot
```

Required routes after implementation:

- missing dependency Trial route
- failed Run route
- lossy Run value route
- payload validation or validator gap route
- reflection evidence gap route
- compare before/after route if first slice includes compare UI

## 7. Negative Sweep

```bash
rtk rg -n "fake diagnostic|diagnosticsFixture|Runtime\\.playground|Runtime\\.driver|Runtime\\.scenario|Runtime\\.workbench|Logix\\.Reflection|fallback-source-regex" packages/logix-core packages/logix-cli packages/logix-playground examples/logix-react docs specs/168-kernel-to-playground-verification-parity
```

Classify every remaining hit as:

- forbidden shape to remove
- evidence gap
- fallback-only debt
- discussion-only text
- archived/history-only text

## 8. Writeback Check

Before closing implementation, verify owner docs are updated:

```bash
rtk rg -n "168-kernel-to-playground-verification-parity|dependency closure|run-failure-facet|payload validation|captured report" docs/ssot/runtime specs/160-cli-agent-first-control-plane-cutover specs/162-cli-verification-transport specs/165-runtime-workbench-kernel specs/166-playground-driver-scenario-surface specs/167-runtime-reflection-manifest specs/168-kernel-to-playground-verification-parity
```
