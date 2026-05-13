# Quickstart: Verification Loop Orchestration Contract

This quickstart is for implementation verification. It is not a user tutorial.

## Implementation Status

Implemented on 2026-05-07. The proof set now covers exact rerun coordinates, primary report recovery, output budget fallback, check-to-startup advancement, startup default gate completion, compare admissibility and three before/after repair closure families.

## Focused Proof Commands

Run family lane preflight:

```bash
rtk rg --files specs/184-entry-declaration-authority specs/185-repair-intent-contract specs/186-verification-loop-orchestration | rtk rg '(^|/)discussion\\.md$'
rtk rg -n "Must Close Before Implementation" specs/184-entry-declaration-authority specs/185-repair-intent-contract specs/186-verification-loop-orchestration -g discussion.md
```

Expected result: no `discussion.md` files and no `Must Close Before Implementation` hits.

No-hit `rg` commands may exit non-zero; for this preflight, no output is the pass condition.

Run exact rerun and transport proof:

```bash
rtk pnpm --filter @logixjs/cli test -- --run test/Integration/exact-rerun-coordinate.contract.test.ts test/Integration/command-result-transport.contract.test.ts
```

Run command stage proof:

```bash
rtk pnpm --filter @logixjs/cli test -- --run test/Integration/check.command.test.ts test/Integration/trial.command.test.ts test/Integration/compare.command.test.ts
```

Run before/after repair closure proof:

```bash
rtk pnpm --filter @logixjs/cli test -- --run test/Integration/repair-closure.program-assembly.e2e.test.ts test/Integration/repair-closure.source-declaration.e2e.test.ts test/Integration/repair-closure.dependency.e2e.test.ts
```

Run core control-plane compare proof:

```bash
rtk pnpm --filter @logixjs/core test -- --run test/Contracts/VerificationControlPlaneContract.test.ts test/Contracts/VerificationControlPlaneCompare.contract.test.ts
```

## Required Text Sweeps

### Forbidden-Zero Sweep

Check active command and schema surfaces for forbidden wide-command and log-parsing vocabulary. Docs, skills, tests, and specs may contain rejected-shape explanations and belong to the allowed-negative ledger.

```bash
rtk rg -n "logix verify|verify --stage|human log|parse logs|log parsing|trial --mode scenario.*default|logix debug|logix describe|--describe-json" packages/logix-cli/src packages/logix-cli/src/schema
```

### Required-Present Sweep

Check active docs and skills for correct primary report extraction vocabulary:

```bash
rtk rg -n "primaryReportOutputKey|artifacts\\[\\]\\.outputKey|nextRecommendedStage|inputCoordinate|argvSnapshot" docs/ssot/runtime/15-cli-agent-first-control-plane.md skills/logix-cli/SKILL.md
```

### Allowed-Negative Sweep

Negative tests, docs, skills, and current specs may mention forbidden command shapes only as rejection witnesses or rejected/deleted-route explanations. Review hits from this command as an allowed-hit ledger.

```bash
rtk rg -n "logix verify|verify --stage|human log|parse logs|log parsing|trial --mode scenario.*default|logix debug|logix describe|--describe-json" packages/logix-cli/test docs/ssot skills/logix-cli specs/186-verification-loop-orchestration
```

### Template Residue Sweep

Check this spec for unresolved template residue from the implementation shell. Do not store the literal residue pattern in this file, because that turns the quickstart into its own match.

## Expected Evidence

- Check, startup trial and compare each preserve exact rerun coordinate.
- The primary report is recoverable through `primaryReportOutputKey` and `artifacts[].outputKey`.
- File-backed report fallback works when inline output is truncated.
- Compare proves program assembly, source declaration and dependency repair closure.
- Compare returns inconclusive for inadmissible mismatches rather than false pass.
- No default proof depends on `trial --mode scenario`, browser host deep validation or human logs.
- 184 entry/declaration proof and 185 repair intent proof are consumed by the same family loop closure.

## Writeback Checklist

- Update [spec.md](./spec.md) status and proof notes when implementation closes.
- Update [plan.md](./plan.md) only if authority, landing zones or verification gates changed.
- Update `docs/ssot/runtime/16-agent-self-verification-scenario-matrix.md` if terminal loop proof refs change.
- Update `docs/ssot/runtime/15-cli-agent-first-control-plane.md` and `skills/logix-cli/SKILL.md` if Agent loop recipe changes.
- Update `docs/ssot/runtime/09-verification-control-plane.md` if scheduling, pass boundary or compare admissibility law changes.
