# Before / After Playbook

## Before Changing Code

1. Read `TAX_LEDGER.md`.
2. Run `203` preflight.
3. Decide the single tax point for the PR.
4. Record current focused test health.
5. If branch comparability is poor, implement `210` A/B harness before production changes.

## During Code Change

For each task:

```text
write failing guard → run focused fail → implement minimal branch → run focused pass → update handoff.md
```

Do not widen scope when a phase moves. Record the migration and continue with the owner spec for that new tax point.

## After Code Change

1. Run structural sentinels.
2. Run same-commit A/B if implemented.
3. Run focused dispatch shell default-profile diff when architecture is stable enough.
4. Fill tax migration report.
5. Do not make broad release claims until the final comparable gate is clean.

## Reading Phase Deltas

| Pattern | Interpretation | Next Action |
| --- | --- | --- |
| total down, scope down, queue up | tax moved to queue/lane | run/fix 205 |
| total down, queue down, commit up | tax moved to commit publish | run/fix 207 |
| median down, p95 up | tail tax emerged | inspect queue wait, GC/allocation, commit fanout |
| off ok, light/full up | diagnostics tax | run/fix 208 |
| time ok, sentinel fail | hidden allocation/key tax | run/fix 208/209 |
| comparable=false | no hard conclusion | recollect with stable env/matrix |
