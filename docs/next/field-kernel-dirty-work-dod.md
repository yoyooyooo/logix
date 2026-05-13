# Definition of Done — Field Kernel Dirty Work Wave

## Structural DoD

- exact dirty evidence does not silently trigger full converge/full validate/full source sync;
- dirtyPlan remains canonical dirty evidence for field-kernel consumers;
- fallback paths are reason-coded and test-covered;
- one-row list dirty can take incremental validate/source path;
- reorder/remove/root-touched list cases remain correct full fallback;
- unrelated txn has zero source key eval where sourceDepIr is exact;
- externalStore burst coalesces as configured and dispose cancels pending flush;
- urgent txn is not starved by low-priority externalStore storm;
- diagnostics=off does not allocate debug/fallback payloads on exact fast path;
- public API/root exports do not change.

## Evidence DoD

- focused structural tests pass;
- rollback/no-partial-commit tests pass;
- validate/source/list/externalStore focused tests pass;
- allocation/materialization sentinels pass;
- report classifier tests pass;
- typecheck passes where required;
- git diff --check passes;
- hard performance claim only after comparable default/soak before-after evidence.

## Classification DoD

Final report must be one of:

```text
tax_removed       total target metric improves, watched phases stable, no allocation/fallback migration
stable_guarded    no headline improvement, but sentinels and evidence guard the path
tax_migrated     target improves but cost moves to converge/validate/source/allocation/fallback/scheduler
inconclusive      evidence missing, quick-only, non-comparable, dirty, unstable, timeout, or missing suite
failed            sentinels fail, regression exists, semantics break, or hard gate fails
```


## Forbidden Claims Unless Fully Proven

- FieldKernel performance is fixed.
- No regressions exist globally.
- Runtime performance improved globally.
- Transaction path is optimal.
- All list/source/converge workloads are solved.
