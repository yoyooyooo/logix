# Runtime Dispatch Shell Before / After Playbook

## Before Production Changes

1. Complete `203` preflight and confirm the local tax ledger exists.
2. Record focused health for dispatch shell core and react perf-boundary tests.
3. If branch drift makes historical comparison weak, implement `210` same-commit
   A/B before changing production hot paths.
4. Pick one owner spec and one dominant tax point.

## Same-Commit A/B

Same-commit A/B is allowed only as internal test/perf harness machinery. It must
not become public Runtime config, root export, public submodule, or public
authoring noun.

It can support this claim only:

```text
Same-commit A/B indicates phase improvement in X.
```

It cannot support global production claims.

## Focused Before / After Diff

Use the focused dispatch shell file set and matching matrix/env/profile:

```bash
pnpm perf collect -- --profile default \
  --files test/browser/perf-boundaries/dispatch-shell-fixed-cost.test.tsx \
  --out specs/211-focused-perf-evidence-and-tax-migration-gate/perf/before.browser.dispatchShell.<sha>.<envId>.default.json

pnpm perf collect -- --profile default \
  --files test/browser/perf-boundaries/dispatch-shell-fixed-cost.test.tsx \
  --out specs/211-focused-perf-evidence-and-tax-migration-gate/perf/after.browser.dispatchShell.<sha-or-dev>.<envId>.default.json

pnpm perf diff -- \
  --before specs/211-focused-perf-evidence-and-tax-migration-gate/perf/before.browser.dispatchShell.<sha>.<envId>.default.json \
  --after specs/211-focused-perf-evidence-and-tax-migration-gate/perf/after.browser.dispatchShell.<sha-or-dev>.<envId>.default.json \
  --out specs/211-focused-perf-evidence-and-tax-migration-gate/perf/diff.browser.dispatchShell.before__after.<envId>.default.json
```

`quick` runs are clues only. Non-comparable evidence is a clue only.

## Final Default / Soak Gate

A formal focused claim requires all of:

- `profile=default` or `profile=soak`;
- same matrix, config, and environment;
- `meta.comparability.comparable=true`;
- `summary.regressions=0`;
- no unexplained `stabilityWarning`;
- no timeout or missing suite;
- structural/allocation sentinels pass;
- phase deltas explain whether tax was removed or moved.

## Classification

Use the `211` report to classify:

- `tax_removed`: target tax improved and watched phases/counters did not rise;
- `tax_migrated`: target or total improved while another watched phase/counter
  rose;
- `inconclusive`: evidence is missing, unstable, quick-only, or
  non-comparable;
- `failed`: target did not improve or a structural sentinel failed.

## Allowed Claims

- `Focused validation passed.`
- `Same-commit A/B indicates phase improvement in X.`
- `Formal performance claim deferred until comparable default/soak evidence.`

## Forbidden Claims

- `Runtime performance is fixed.`
- `No regressions exist.`
- `Production performance improved globally.`
- `Transaction path is optimal.`
