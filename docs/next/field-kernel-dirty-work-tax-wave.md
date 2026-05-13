# Field Kernel Dirty Work Requirements Bundle

## Purpose

Next planned performance wave after transaction fixed-cost and RuntimeStore selector notify work. This bundle targets the real field-kernel dirty-work cost that remains after shell and notify fanout are structurally controlled.

Target path:

```text
StateTransaction dirtyPlan / listEvidence
  -> converge dirty-reachable execution
  -> validate static IR / list incremental validation
  -> source dirty gating / externalStore ingest
  -> fallback reason + allocation sentinels
  -> focused before/after evidence gate
```

## Contents

- specs `221` through `228`
- local-agent handoff
- sequencing, DoD, dirty-work ledger
- evidence protocol and before/after playbook
- focused command scripts
- goal-driven prompt for local agent

## Where to Apply

Copy files into the Logix repository root. Do not edit packed source snapshots, XML, or Repomix output.

## First File for Local Agent

Read `LOCAL_AGENT_HANDOFF.md`, then `AGENT_START_HERE.md`.

## Preconditions

Start this wave only after the RuntimeStore / Selector Notify wave is either accepted as `tax_removed` / `stable_guarded`, or explicitly waived by the maintainer. If that prior wave is `failed`, `tax_migrated`, or unresolved `inconclusive`, stop and report.

## Non-goals

- No public API expansion.
- No dispatch shell rework.
- No React selector route ownership changes.
- No AOT/WASM/flat-store route.
- No global runtime performance claim.
- No hard performance claim without comparable default/soak evidence.

## Known Cloud LLM Limitations

This package was generated from uploaded source/spec/evidence snapshots. It does not run `pnpm`, typecheck, browser tests, or perf collection locally.
