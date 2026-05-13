# Agent Start Here — Field Kernel Dirty Work Wave

## Start Checklist

1. Read `LOCAL_AGENT_HANDOFF.md`.
2. Confirm prior wave status:
   - continue only if RuntimeStore/Selector Notify is `tax_removed`, `stable_guarded`, or maintainer-waived;
   - stop if it is `failed`, `tax_migrated`, or unresolved `inconclusive`.
3. Run:

```bash
git status --short
git rev-parse HEAD
./scripts/validate_bundle_structure.sh
./scripts/list_focused_commands.sh
./scripts/print_evidence_commands.sh
```

4. Copy into repo only after preflight:

```bash
./scripts/copy_into_repo.sh /path/to/logix/repo
```

## First Implementation Rule

Do not optimize first. Build the ledger first (`222`). Every production change must be preceded by a sentinel, test, or explicit existing guard.

## Field-Kernel Tax Points

- converge full topo under exact dirty evidence
- validate full scan under one-row dirty
- source key eval for unrelated mutation
- externalStore burst / scheduler / dispose costs
- dirtyPlan/listEvidence clone/materialization costs
- fallback reason drift
- diagnostics/off payload leakage

## Required Final Classification

Use one of:

```text
tax_removed
stable_guarded
tax_migrated
inconclusive
failed
```
