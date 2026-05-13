# Before / After Playbook — Field Kernel Dirty Work Wave

## Baseline Collection

Use separate clean worktrees. Do not reset the active worktree. `pnpm perf collect` expects repeated `--files` flags; do not comma-join file paths.

```bash
# before worktree
pnpm perf collect -- --profile default \
  --files test/browser/perf-boundaries/converge-steps.test.tsx \
  --files test/browser/perf-boundaries/converge-time-slicing.test.tsx \
  --files test/browser/perf-boundaries/form-list-scope-check.test.tsx \
  --files test/browser/perf-boundaries/external-store-ingest.test.tsx \
  --out specs/228-fieldkernel-focused-before-after-evidence-gate/perf/before.fieldKernel.<sha>.<envId>.default.json

# after worktree
pnpm perf collect -- --profile default \
  --files test/browser/perf-boundaries/converge-steps.test.tsx \
  --files test/browser/perf-boundaries/converge-time-slicing.test.tsx \
  --files test/browser/perf-boundaries/form-list-scope-check.test.tsx \
  --files test/browser/perf-boundaries/external-store-ingest.test.tsx \
  --out specs/228-fieldkernel-focused-before-after-evidence-gate/perf/after.fieldKernel.<sha-or-dev>.<envId>.default.json

pnpm perf diff -- \
  --before specs/228-fieldkernel-focused-before-after-evidence-gate/perf/before.fieldKernel.<sha>.<envId>.default.json \
  --after specs/228-fieldkernel-focused-before-after-evidence-gate/perf/after.fieldKernel.<sha-or-dev>.<envId>.default.json \
  --out specs/228-fieldkernel-focused-before-after-evidence-gate/perf/diff.fieldKernel.before__after.<envId>.default.json
```

## Report Gate

Create/use:

```bash
pnpm perf ci:field-kernel-dirty-work-tax-report -- \
  --diff specs/228-fieldkernel-focused-before-after-evidence-gate/perf/diff.fieldKernel.before__after.<envId>.default.json \
  --before specs/228-fieldkernel-focused-before-after-evidence-gate/perf/before.fieldKernel.<sha>.<envId>.default.json \
  --after specs/228-fieldkernel-focused-before-after-evidence-gate/perf/after.fieldKernel.<sha-or-dev>.<envId>.default.json \
  --profile default \
  --out specs/228-fieldkernel-focused-before-after-evidence-gate/perf/report.fieldKernel.<envId>.default.md \
  --json-out specs/228-fieldkernel-focused-before-after-evidence-gate/perf/report.fieldKernel.<envId>.default.json
```

## Focused Smoke Check

`packages/logix-react` currently has no `test:browser` script. Use the browser Vitest project directly:

```bash
pnpm -C packages/logix-react test -- --project browser test/browser/perf-boundaries/converge-steps.test.tsx
pnpm -C packages/logix-react test -- --project browser test/browser/perf-boundaries/converge-time-slicing.test.tsx
pnpm -C packages/logix-react test -- --project browser test/browser/perf-boundaries/form-list-scope-check.test.tsx
pnpm -C packages/logix-react test -- --project browser test/browser/perf-boundaries/external-store-ingest.test.tsx
```

## Interpretation

- `tax_removed`: allowed only for focused field-kernel path, not global runtime.
- `stable_guarded`: structural success, no hard improvement claim.
- `tax_migrated`: fix migrated phase before broad claim.
- `inconclusive`: keep implementation but defer claim.
- `failed`: stop and fix failing sentinel/regression.

Current 228 local artifacts are `smoke`, dirty-worktree, same-head clues and classify as `inconclusive`. They are useful for report-gate plumbing and smoke structure only.
