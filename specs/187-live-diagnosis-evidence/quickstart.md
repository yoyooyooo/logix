# Quickstart: Live Diagnosis Evidence Closure

This quickstart is for implementation verification. It is not a user tutorial.

## Implementation Status

Implemented on 2026-05-08. The proof set now covers live route grammar, `LiveCommandResult` forbidden-field boundary, owner-backed inspect/gap output, daemon-backed target discovery, canonical evidence export, verification handoff, runtime inspect coverage inventory, disabled-overhead and retained evidence markers.

## Focused Proof Commands

Run public live route and forbidden-field proof:

```bash
rtk pnpm --filter @logixjs/cli test -- --run test/Integration/live-namespace.contract.test.ts test/Integration/live-command-result.contract.test.ts test/Integration/live-inspect-routes.contract.test.ts
```

Run daemon carrier and evidence handoff proof:

```bash
rtk pnpm --filter @logixjs/cli test -- --run test/Integration/live-daemon-carrier.contract.test.ts test/Integration/live-daemon-multitab.contract.test.ts test/Integration/live-evidence-handoff.e2e.test.ts
```

Run core live inspect coverage and disabled-overhead proof:

```bash
rtk pnpm --filter @logixjs/core test -- --run test/internal/LiveBridge/runtime-inspect-coverage.harness.test.ts test/internal/LiveBridge/live-disabled-overhead.guard.test.ts
```

Run focused core LiveBridge route proof when implementation touches owner-backed inspect behavior:

```bash
rtk pnpm --filter @logixjs/core test -- --run test/internal/LiveBridge/
```

## Required Text Sweeps

### Forbidden-Zero Sweep

Check active implementation surfaces for forbidden root or verification fields:

```bash
rtk rg -n "logix debug|logix status|logix capture|logix snapshot|logix trigger|LiveCommandResult.*verdict|LiveCommandResult.*repairHints|LiveCommandResult.*nextRecommendedStage|LiveCommandResult.*primaryReportOutputKey" packages/logix-cli/src packages/logix-core/src packages/logix-react/src
```

### Required-Present Sweep

Check live evidence docs and skill for evidence-lane vocabulary:

```bash
rtk rg -n "evidence lane|canonical evidence|structured gap|carrier" docs/ssot/runtime/15-cli-agent-first-control-plane.md docs/ssot/runtime/18-runtime-inspect-evidence-contract.md skills/logix-cli/SKILL.md
```

Check this spec for unresolved template residue. Run the repository-wide residue sweep from the implementation shell rather than copying this section into a final proof note, so the command text itself does not become a self-match.

```bash
rtk rg -n "<template-residue-pattern>" specs/187-live-diagnosis-evidence
```

## Expected Evidence

- Live routes cover status, targets, inspect/drilldown, capture, snapshot, wait, dispatch, profile summary and export evidence.
- `LiveCommandResult` outputs exclude verdict, repair hints, next-stage scheduling and primary report output key.
- Inspect routes return owner-backed facts or structured gaps.
- Exported live evidence can be consumed by trial or compare, and any repair hints come from the verification report.
- Disabled live inspect allocates no owner buffers, projection payloads or background collectors.
- Target indexes, retained segments and leases are bounded and cleaned with lifecycle.

## Writeback Checklist

- Update [spec.md](./spec.md) status and proof notes when implementation closes.
- Update [plan.md](./plan.md) only if authority, landing zones or verification gates changed.
- Update `docs/ssot/runtime/15-cli-agent-first-control-plane.md` if public live grammar or schema mirror changed.
- Update `docs/ssot/runtime/18-runtime-inspect-evidence-contract.md` if live owner/cost/proof law changed.
- Update `specs/172-agent-first-runtime-inspect-data-plane/implementation-details/runtime-inspect-coverage-harness.md` and notes if coverage inventory changed.
- Update `skills/logix-cli/SKILL.md` if Agent live consumption recipe changed.
