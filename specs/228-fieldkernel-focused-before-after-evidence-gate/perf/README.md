# FieldKernel Dirty Work Perf Artifacts

Store clean before/after/diff/report artifacts here.

Required for hard claim:

```text
profile=default or soak
git dirty=false for before and after
same matrixHash/env/profile
comparability.comparable=true
summary.regressions=0
summary.budgetViolations=0
no unexplained warnings/timeout/missing suite
report classification tax_removed
```

Current local artifacts:

```text
before.fieldKernel.current-head.local.smoke.json
after.fieldKernel.current-head.local.smoke.json
diff.fieldKernel.current-head.local.smoke.json
report.fieldKernel.current-head.local.smoke.md
report.fieldKernel.current-head.local.smoke.json
```

Current classification:

```text
classification=inconclusive
claimStrength=clue
reason: profile=smoke, git dirty before/after, same-head current worktree, summary.regressions=2, and incomplete watched phase evidence
```

Do not promote these artifacts to a hard claim. A hard rerun must use separate clean worktrees and repeat `--files` once per browser perf-boundary file; comma-joined `--files` is not supported.
