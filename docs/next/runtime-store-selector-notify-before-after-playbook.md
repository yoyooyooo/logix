# Before/After Playbook

## Baseline

Use the commit immediately before the selector notify wave as `before` and the final wave commit as `after`. Use separate worktrees. Both must be `dirty=false` for a hard claim.

## Required Equality

```text
matrixId/matrixHash
profile
browser
node
pnpm
os/arch/cpu if local evidence
suite file set
```

## Minimum Artifact Set

```text
before.runtimeStore.<sha>.<envId>.default.json
after.runtimeStore.<sha>.<envId>.default.json
diff.runtimeStore.before__after.<envId>.default.json
report.selectorNotify.<envId>.default.md
report.selectorNotify.<envId>.default.json
```

## Interpretation

If evidence is dirty, quick-only, unstable, has warnings, or incomparable, final classification cannot be a hard success claim.
