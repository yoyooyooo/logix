# Runtime Lifecycle Authoring Surface Perf Evidence

## Scope

This directory stores before / after evidence for spec 170.

Required focus areas:

- runtime instance creation without readiness requirements
- runtime instance creation with one readiness requirement
- runtime instance creation with multiple readiness requirements
- readiness failure diagnostics
- returned run effect scheduling after readiness
- runtime close and Scope finalizer execution
- diagnostics disabled path

## Environment

- Date: 2026-05-01
- Runner: local worktree
- Command family: `pnpm perf collect`, `pnpm perf diff`
- Current worktree state: mixed feature development, not performance-comparable

## Before Baseline

Planned command:

```bash
rtk pnpm perf collect -- --profile default --out specs/170-runtime-lifecycle-authoring-surface/perf/before.worktree.local.default.json
```

Result:

- Deferred by user decision on 2026-05-01.
- No before artifact is recorded for this branch.
- Reason: the current worktree mixes multiple active features and is not a stable performance baseline.

## After Baseline

Planned command:

```bash
rtk pnpm perf collect -- --profile default --out specs/170-runtime-lifecycle-authoring-surface/perf/after.worktree.local.default.json
rtk pnpm perf diff -- --before specs/170-runtime-lifecycle-authoring-surface/perf/before.worktree.local.default.json --after specs/170-runtime-lifecycle-authoring-surface/perf/after.worktree.local.default.json --out specs/170-runtime-lifecycle-authoring-surface/perf/diff.before__after.local.default.json
```

Do not claim performance success unless the diff is comparable and has no unresolved stability warning.

Result:

- Deferred by user decision on 2026-05-01.
- `rtk pnpm perf collect -- --profile default --out specs/170-runtime-lifecycle-authoring-surface/perf/after.worktree.local.default.json` was started and then stopped after the decision to skip collection.
- No after artifact or diff artifact is accepted for spec 170.
- Partial browser perf output from the stopped run is ignored and must not be cited as 170 evidence.

## Current Performance Conclusion

- Performance collection is intentionally skipped for this feature closure on the current dirty branch.
- No performance pass is claimed.
- No performance regression is claimed.
- Reopen performance evidence when the branch is stable enough to collect comparable before / after data.

## Related Observation

- During the skipped collection attempt, `packages/logix-react/test/browser/perf-boundaries/react-strict-suspense-jitter.test.tsx` exposed an existing selector route drift: a broad function selector hit `selector.dynamic_fallback`.
- The test was aligned to the current exact selector law by using `fieldValues(['ready', 'value'])`.
- This observation belongs to selector / React perf hygiene. It is not lifecycle authoring evidence.
