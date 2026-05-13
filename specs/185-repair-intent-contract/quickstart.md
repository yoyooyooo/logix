# Quickstart: Repair Intent Contract

This quickstart is for implementation verification. It is not a user tutorial.

## Implementation Status

Implemented on 2026-05-07. The proof set now covers dependency repair owner facts, static declaration repair hints, canonical evidence and selection artifact backlinks, compare repair states and the live forbidden-field boundary.

## Focused Proof Commands

Run core report and compare contract proof:

```bash
rtk pnpm --filter @logixjs/core test -- --run test/Contracts/VerificationControlPlaneContract.test.ts test/Contracts/RuntimeCheck.contract.test.ts test/Contracts/VerificationControlPlaneCompare.contract.test.ts test/VerificationDependencyCauseSpine.contract.test.ts
```

Run CLI dependency and repair closure proof:

```bash
rtk pnpm --filter @logixjs/cli test -- --run test/Integration/trial-dependency-spine.contract.test.ts test/Integration/repair-closure.program-assembly.e2e.test.ts test/Integration/repair-closure.source-declaration.e2e.test.ts test/Integration/repair-closure.dependency.e2e.test.ts
```

Run canonical evidence backlink and live boundary proof:

```bash
rtk pnpm --filter @logixjs/cli test -- --run test/Integration/evidence-selection-input.contract.test.ts test/Integration/evidence-selection-roundtrip.contract.test.ts test/Integration/live-command-result.contract.test.ts
```

Run command schema guard proof:

```bash
rtk pnpm --filter @logixjs/cli test -- --run test/Integration/command-schema.guard.test.ts
```

## Required Text Sweeps

### Forbidden-Zero Sweep

Check active source surfaces for forbidden repair-policy nouns. Docs, skills, tests, and specs may contain rejected-shape explanations and belong to the allowed-negative ledger.

```bash
rtk rg -n "RepairReport|AgentPolicyReport|auto patch|autopatch|patch engine|writeback runtime|Agent policy|second report" packages/logix-core/src packages/logix-cli/src
```

### Allowed-Negative Sweep

Negative guard tests, docs, skills, and current specs may mention forbidden repair fields only to assert absence or explain rejected authority. Review hits from this command as an allowed-hit ledger.

```bash
rtk rg -n "repairHints|nextRecommendedStage|verdict|primaryReportOutputKey" packages/logix-cli/src/internal/liveResult.ts packages/logix-cli/src/internal/commands/live.ts packages/logix-cli/test/Integration/live-command-result.contract.test.ts docs/ssot skills/logix-cli specs/185-repair-intent-contract
```

### Required-Present Sweep

Check active docs and skills for the fields Agents should consume.

```bash
rtk rg -n "repairHints|canAutoRetry|focusRef|relatedArtifactOutputKeys|nextRecommendedStage" docs/ssot/runtime/09-verification-control-plane.md docs/ssot/runtime/15-cli-agent-first-control-plane.md skills/logix-cli
```

### Template Residue Sweep

Check this spec for unresolved template residue from the implementation shell. Do not store the literal residue pattern in this file, because that turns the quickstart into its own match.

## Expected Evidence

- Static, dependency, canonical evidence and compare failure fixtures route to repair targets without reading prose fields.
- `relatedArtifactOutputKeys` only references existing report artifacts.
- Top-level `nextRecommendedStage` remains the only scheduling authority.
- Live command results exclude repair hints, verdicts, next-stage scheduling and primary report output key.
- Agent-facing skill/docs identify machine fields to consume and prose fields not to parse.
- 186 consumes these repair hints in exact rerun or compare closure before the family is marked closed.

## Writeback Checklist

- Update [spec.md](./spec.md) status and proof notes when implementation closes.
- Update [plan.md](./plan.md) only if authority, landing zones or verification gates changed.
- Update `docs/ssot/runtime/09-verification-control-plane.md` if report field law changed.
- Update `docs/ssot/runtime/15-cli-agent-first-control-plane.md` and `skills/logix-cli/SKILL.md` if Agent consumption recipe changed.
- Update `docs/ssot/runtime/18-runtime-inspect-evidence-contract.md` if live handoff boundary changed.
