---
name: logix-cli
description: Use when an Agent needs to run Logix verification from shell or CI, consume DVTools evidence, validate a Program entry, compare before/after reports, or test the Agent First CLI loop.
---

# logix-cli

Logix CLI is the Agent First shell route into the runtime control plane. Use it to get machine-readable verification reports for business code changes.

## When To Use

- You changed Logix business code and need a fast self-check.
- You need to verify a `Program` entry from shell or CI.
- You have DVTools evidence or a selection manifest to feed back into Agent repair.
- You need a before/after repair comparison.
- You are opening a subagent to validate CLI behavior.

Do not use this skill for runtime API authoring rules. Use `logix-best-practices` first for code generation.

## Command Surface

Only these public commands exist:

```bash
logix check
logix trial
logix compare
```

Deleted public routes stay deleted: `describe`, `--describe-json`, `ir.*`, `contract-suite.run`, `transform.module`, `logix-devserver`, and `trialrun`.

## Entry Rule

`--entry` must point to a `Program` export:

```bash
logix trial --runId demo --entry src/entry.ts#AppRoot --mode startup
```

`AppRoot` must be made with `Logix.Program.make(...)`. Do not pass a `Module` or `Logic` export.

## Normal Agent Loop

Use stable `runId` values and write artifacts under a predictable root. For fast repair feedback, rerun the same stage first:

```bash
logix check \
  --runId fix-001-check \
  --entry src/entry.ts#AppRoot \
  --outRoot .logix/runs

logix trial \
  --runId fix-001-trial \
  --entry src/entry.ts#AppRoot \
  --mode startup \
  --outRoot .logix/runs
```

Read stdout as `CommandResult`. Then resolve `primaryReportOutputKey` against `artifacts[].outputKey` and inspect the referenced `VerificationControlPlaneReport`.

Important fields:

- `ok`
- `inputCoordinate`
- `primaryReportOutputKey`
- `artifacts[].outputKey`
- report `verdict`
- report `nextRecommendedStage`
- report `repairHints`

Do not parse human logs for conclusions.

For a normal code edit, the first validation after repair is usually another `logix trial --mode startup` with the same entry and relevant refs. Prefer `inputCoordinate.argvSnapshot.tokens` when you need to reconstruct the same command shape. If you need a different `runId` to avoid overwriting artifacts, keep the validation inputs stable and only change `--runId`.

## DVTools Evidence Loop

When DVTools exports canonical evidence and a selection manifest, pass them as inputs:

```bash
logix trial \
  --runId dvtools-fix-001 \
  --entry src/entry.ts#AppRoot \
  --mode startup \
  --evidence .logix/evidence/session-001 \
  --selection .logix/evidence/session-001/selection.json \
  --outRoot .logix/runs
```

`selection` is only a hint sidecar. It does not own evidence truth, report truth, or entry truth.

## Compare Loop

`compare` is a closure proof tool. It is not required after every repair. Use it when you need to prove that an after report closes a known before report under comparable inputs:

```bash
logix compare \
  --runId fix-001-compare \
  --beforeReport .logix/runs/trial/before/trialReport.json \
  --afterReport .logix/runs/trial/after/trialReport.json \
  --outRoot .logix/runs
```

Use `compare` for:

- spec or CI closure where before/after evidence must be auditable
- fixing a known failure family such as Program assembly, source/declaration, dependency, lifecycle, or admissibility
- guarding against accidental input drift across entry, config, evidence, environment, declaration digest, scenario plan, or artifact refs
- handoff to another Agent that needs a machine-checkable closure record

Rerun `trial` without `compare` is enough for:

- local fast feedback
- exploratory repair where no before report is being claimed closed
- deliberate broader refactor where the Agent intentionally changed the verification scope

When the verification scope intentionally changes, start a new baseline instead of forcing old before/after reports through compare. In the final note, state which input changed and why the new baseline is the right proof target.

The compare result is authoritative only through the `VerificationControlPlaneReport` artifact. `INCONCLUSIVE` usually means the reports are not admissible for closure, not that the repair failed.

## Scenario Boundary

Current successful trial mode is:

```bash
logix trial --mode startup
```

`trial --mode scenario` is reserved until a core-owned scenario executor lands. Treat scenario mode as structured failure for now.

## Subagent Verification Prompt

Use this prompt when delegating CLI validation:

```text
Read skills/logix-cli/SKILL.md. In this workspace, verify the Logix CLI Agent First loop for a Program entry. Run check and trial startup with stable runId values and --outRoot .logix/runs. Inspect stdout CommandResult and the primary VerificationControlPlaneReport artifact. Confirm no old public CLI route is needed. Do not modify files unless explicitly asked.
```

## References

- `docs/ssot/runtime/15-cli-agent-first-control-plane.md`
- `docs/ssot/runtime/09-verification-control-plane.md`
- `packages/logix-cli/src/schema/commands.v1.json`
