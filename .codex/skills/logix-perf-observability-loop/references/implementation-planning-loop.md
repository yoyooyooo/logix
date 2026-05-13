# Implementation Planning Loop

Use this file when the user asks to plan or implement a performance-sensitive change.

## Planning Contract

Every plan should reduce to one tuple:

```text
requirement -> owner path -> pressure knob -> counter/metric -> CI artifact
```

If the tuple is unclear, do not start a broad refactor. First identify the missing part:

- unknown owner path
- no pressure knob
- no required counter
- no comparable artifact path
- no clear forbidden migration target

## Step Loop

1. Read current SSoT and performance standard.
2. Identify one owner path.
3. Select one pressure knob.
4. List required counters and expected movement.
5. Run targeted tests or local preflight if needed.
6. Make the smallest implementation or validation fix.
7. Re-run local checks.
8. State which PR/push or manual CI artifact should confirm it.
9. Do not claim hard performance until CI/stable-runner artifacts support it.

## Keep Separate

Do not mix these unless one blocks the other:

- evidence schema changes
- collector/marker fixes
- runtime hot-path optimization
- React host optimization
- browser P2 isolation
- API surface changes

If a script gap blocks evidence, make the minimal validation fix and label it as such in the handoff/report.

## API Change Gate

If performance requires public API or authoring-surface changes, stop and output:

```text
problem:
why internal-only fix is insufficient:
proposed API change:
expected performance evidence:
affected authoring/runtime surface:
rollback or rejection path:
```

Do not implement API changes before user alignment.

## Commit / Push Guidance

Small commits are useful because PR/push `logix-perf (convergence)` can produce comparable candidate artifacts for each step.

Do not tell the user a push proves completion. A push can produce candidate default evidence; final claims still need the required artifact chain and gate.
