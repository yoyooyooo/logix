# Quickstart: React Host Adjunct Evidence Closure

This quickstart is for implementation verification. It is not a user tutorial.

## Implementation Status

Implemented on 2026-05-08. The proof set now covers host adjunct evidence, interaction linkage, bounded local profile summaries, disagreement-safe packaging, disabled capture safety, cleanup, transaction-window no-IO and production bundle isolation.

## Focused Proof Commands

Run React host internal dev and provider proof:

```bash
rtk pnpm --filter @logixjs/react test -- --run test/internal/dev/ test/RuntimeProvider/
```

Run core host coordinate and transaction-window proof:

```bash
rtk pnpm --filter @logixjs/core test -- --run test/internal/LiveBridge/live-host-coordinate.contract.test.ts test/internal/LiveBridge/live-operation-window.contract.test.ts
```

Run CLI evidence handoff and forbidden-field proof:

```bash
rtk pnpm --filter @logixjs/cli test -- --run test/Integration/live-evidence-handoff.e2e.test.ts test/Integration/live-command-result.contract.test.ts
```

Run production bundle isolation proof if public imports or dev carrier boundaries changed:

```bash
rtk pnpm -C examples/logix-react test:bundle:production
```

## Required Text Sweeps

### Forbidden-Zero Sweep

Check active implementation surfaces for forbidden host authority nouns and routes:

```bash
rtk rg -n "HostEvidence|HostAdjunctEvidence|host-owned verdict|host-owned repair|host-owned timeline|host-owned stateAfter|host-owned compare|logix debug|second selector authority" packages/logix-react/src packages/logix-core/src packages/logix-cli/src
```

### Required-Present Sweep

Check active docs/specs for stopped 182 routing:

```bash
rtk rg -n "182-react-host-adjunct-evidence|standalone 182|stopped|terminal adopted" docs/ssot/runtime specs/183-agent-debug-closure specs/188-react-host-adjunct-evidence specs/README.md
```

Check this spec for unresolved template residue. Run the repository-wide residue sweep from the implementation shell rather than copying this section into a final proof note, so the command text itself does not become a self-match.

```bash
rtk rg -n "<template-residue-pattern>" specs/188-react-host-adjunct-evidence
```

### Template Residue Sweep

Check this spec for unresolved template residue. Run the repository-wide residue sweep from the implementation shell rather than copying this section into a final proof note, so the command text itself does not become a self-match.

```bash
rtk rg -n "<template-residue-pattern>" specs/188-react-host-adjunct-evidence
```

## Expected Evidence

- Host adjunct evidence closes at least one Agent diagnosis blind spot without producing verdicts or repair hints.
- Disabled mode allocates no host capture buffer, adds no render subscription fanout and performs no transaction-window IO.
- Conflicting host evidence produces structural disagreement and runtime truth wins.
- Local profile summaries are bounded, redaction-preserving, local-only and linked to runtime refs.
- Host buffers, linkage indexes and profile summaries clean up with target or host lifecycle.
- Active docs route standalone 182 as stopped and 188/183 as terminal adopted closure path.

## Writeback Checklist

- Update [spec.md](./spec.md) status and proof notes when implementation closes.
- Update [plan.md](./plan.md) only if authority, landing zones or verification gates changed.
- Update `docs/ssot/runtime/10-react-host-projection-boundary.md` if selector/render host law changed.
- Update `docs/ssot/runtime/18-runtime-inspect-evidence-contract.md` if adjunct admission or cost law changed.
- Update `docs/ssot/runtime/15-cli-agent-first-control-plane.md` only if public live artifact route or schema mirror changed.
- Ensure `specs/182-react-host-adjunct-evidence/spec.md` remains stopped/history and not revived as owner.
