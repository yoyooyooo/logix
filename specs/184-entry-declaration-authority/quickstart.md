# Quickstart: Entry And Declaration Authority Closure

This quickstart is for implementation verification. It is not a user tutorial.

## Implementation Status

Implemented on 2026-05-07. The proof set now covers Program entry loading, Module/Logic rejection, fake Program and missing blueprint transport failure, missing export, import failure, entry failure repeatability, repaired entry rerun, runtime static declaration pressure and archived route guards.

## Focused Proof Commands

Run CLI entry gate proof:

```bash
rtk pnpm --filter @logixjs/cli test -- --run test/Integration/program-entry.contract.test.ts
```

Run verification command transport proof:

```bash
rtk pnpm --filter @logixjs/cli test -- --run test/Integration/check.command.test.ts test/Integration/trial.command.test.ts test/Integration/compare.command.test.ts test/Integration/command-result-transport.contract.test.ts
```

Run runtime declaration pressure proof:

```bash
rtk pnpm --filter @logixjs/core test -- --run test/Contracts/RuntimeCheck.contract.test.ts test/Contracts/ProgramImports.program-entry.test.ts test/Contracts/VerificationControlPlaneContract.test.ts
```

Run archived route and schema guard proof:

```bash
rtk pnpm --filter @logixjs/cli test -- --run test/Integration/legacy-command-rejection.guard.test.ts test/Integration/archived-command-deletion.guard.test.ts test/Integration/command-schema.guard.test.ts
```

## Required Text Sweeps

### Forbidden-Zero Sweep

Check active command and schema surfaces for forbidden entry fallback and archived command vocabulary. Docs, skills, tests, and specs may contain rejected-shape explanations and belong to the allowed-negative ledger.

```bash
rtk rg -n "Module fallback|Logic fallback|fake Program accepted|logix describe|--describe-json|contract-suite|transform\\.module|trialrun|old IR toolbox" packages/logix-cli/src packages/logix-cli/src/schema
```

### Allowed-Negative Sweep

Negative guard tests, docs, skills, and current specs may mention forbidden entry shapes only as rejection witnesses or rejected/deleted-route explanations. Review hits from this command as an allowed-hit ledger, not as zero-hit failure.

```bash
rtk rg -n "Module fallback|Logic fallback|fake Program accepted|logix describe|--describe-json|contract-suite|transform\\.module|trialrun|old IR toolbox" packages/logix-cli/test docs/ssot skills/logix-cli specs/184-entry-declaration-authority
```

### Template Residue Sweep

Check this spec for unresolved template residue from the implementation shell. Do not store the literal residue pattern in this file, because that turns the quickstart into its own match.

## Expected Evidence

- Module, Logic, fake Program, missing export, import failure and missing blueprint inputs produce structured machine-readable outcomes.
- Entry failures preserve input coordinate, primary report artifact key and artifact refs.
- Entry failures do not schedule `check`, `trial` or `compare` through `nextRecommendedStage`.
- Entry failures remain `162` transport-gate failures and do not introduce `stage="entry"` or a fourth control-plane stage.
- `Runtime.check` emits declaration pressure without runtime boot or startup dependency findings.
- `TP-ENTRY-01` can be updated from partial/open to covered only after runnable proof refs exist.
- 186 consumes repaired entry/declaration proof in the family loop closure before the family is marked closed.

## Writeback Checklist

- Update [spec.md](./spec.md) status and proof notes when implementation closes.
- Update [plan.md](./plan.md) only if authority, landing zones or verification gates changed.
- Update `docs/ssot/runtime/16-agent-self-verification-scenario-matrix.md` with final `TP-ENTRY-01` proof refs.
- Update `docs/ssot/runtime/15-cli-agent-first-control-plane.md` and `skills/logix-cli/SKILL.md` only if public entry guidance changes.
