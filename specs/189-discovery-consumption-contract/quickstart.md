# Quickstart: Discovery And Consumption Contract

This quickstart is for implementation verification. It is not a user tutorial.

## Implementation Status

Implemented on 2026-05-08. The proof set now covers schema/mirror alignment, archived-route rejection, runtime-stage report extraction, transport error consumption, live evidence consumption and static drift gates.

## Focused Proof Commands

Run schema and archived command guards:

```bash
rtk pnpm --filter @logixjs/cli test -- --run test/Integration/command-schema.guard.test.ts test/Integration/legacy-command-rejection.guard.test.ts test/Integration/archived-command-deletion.guard.test.ts
```

Run result consumption and live boundary proof:

```bash
rtk pnpm --filter @logixjs/cli test -- --run test/Integration/command-result-transport.contract.test.ts test/Integration/live-command-result.contract.test.ts test/Integration/live-evidence-handoff.e2e.test.ts
```

Compare package schema and skill mirror:

```bash
rtk diff -u packages/logix-cli/src/schema/commands.v1.json skills/logix-cli/references/commands.v1.json
```

## Required Text Sweeps

### Forbidden-Zero Sweep

Check active implementation surfaces for archived command and describe-style discovery:

```bash
rtk rg -n "logix describe|--describe-json|logix debug|contract-suite|transform\\.module|trialrun|ir\\.|logix-devserver|help-text parsing|parse help" packages/logix-cli/src packages/logix-cli/src/schema
```

### Required-Present Sweep

Check docs and skill for result consumption recipe fields:

```bash
rtk rg -n "primaryReportOutputKey|artifacts\\[\\]\\.outputKey|primaryLiveOutputKey|nextRecommendedStage|repairHints|file-backed|truncated inline" docs/ssot/runtime/15-cli-agent-first-control-plane.md skills/logix-cli/SKILL.md
```

Check this spec for unresolved template residue. Run the repository-wide residue sweep from the implementation shell rather than copying this section into a final proof note, so the command text itself does not become a self-match.

```bash
rtk rg -n "<template-residue-pattern>" specs/189-discovery-consumption-contract
```

## Expected Evidence

- Package schema and skill mirror match on public commands, inputs, result envelope fields and live forbidden fields.
- Schema lists only `check`, `trial`, `compare` and `live`.
- Archived commands and describe-style discovery are absent from active schema and rejected by guards.
- Verification recipe covers inline report, file-backed report, error report, exact rerun coordinate, next stage and repair hints.
- Live recipe uses `primaryLiveOutputKey` and treats live output as evidence/gap rather than verification result.
- Drift checks are cheap package-level tests.

## Writeback Checklist

- Update [spec.md](./spec.md) status and proof notes when implementation closes.
- Update [plan.md](./plan.md) only if authority, landing zones or verification gates changed.
- Update `packages/logix-cli/src/schema/commands.v1.json` and `skills/logix-cli/references/commands.v1.json` together when grammar changes.
- Update `skills/logix-cli/SKILL.md` if Agent consumption recipe changed.
- Update `docs/ssot/runtime/15-cli-agent-first-control-plane.md` if discovery or command contract recipe changed.
- Update `docs/ssot/runtime/09-verification-control-plane.md` or `18-runtime-inspect-evidence-contract.md` only if owner law changed.
