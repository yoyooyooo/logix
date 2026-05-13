# Runtime Transaction Fixed-Cost Evidence Playbook

## Evidence Layers

Use the wave evidence in four layers. Later layers do not erase failures in
earlier layers.

| Layer | Purpose | Claim level |
| --- | --- | --- |
| Structural sentinels | Prove disabled or empty paths do not allocate, iterate, clone, or run no-op phases. | Required guard, not a performance win. |
| Same-commit A/B | Compare old and new internal shell branches inside one commit when branch drift makes historical comparison weak. | Local diagnostic only. |
| Focused default/soak diff | Compare dispatch-shell evidence under the same matrix, env, and profile. | Candidate focused validation. |
| Tax migration report | Classify whether a tax was removed, moved, failed, or remained inconclusive. | Final wave classification. |

## Before / After Modes

Before/after evidence must use the same matrix, same env, same focused file set,
and `default` or `soak` profile. A `quick` run is only a clue.

The focused dispatch-shell target is:

```bash
pnpm perf collect -- --profile default \
  --files test/browser/perf-boundaries/dispatch-shell-fixed-cost.test.tsx \
  --out specs/211-focused-perf-evidence-and-tax-migration-gate/perf/before.browser.dispatchShell.<sha>.<envId>.default.json

pnpm perf collect -- --profile default \
  --files test/browser/perf-boundaries/dispatch-shell-fixed-cost.test.tsx \
  --out specs/211-focused-perf-evidence-and-tax-migration-gate/perf/after.browser.dispatchShell.<sha-or-dev>.<envId>.default.json
```

Diff output belongs under
`specs/211-focused-perf-evidence-and-tax-migration-gate/perf/`.

## Same-Commit A/B Mode

Same-commit A/B is test-only/internal harness machinery. It must not enter
public Runtime config, public authoring surface, or root exports.

Allowed interpretation:

- `Same-commit A/B indicates phase improvement in X.`

Forbidden interpretation:

- `Production performance improved globally.`

## Structural Sentinel Gate

The following sentinels must remain clean before any focused performance claim:

```text
debugEventAllocCount.off = 0
patchObjectMaterializeCount.light = 0
snapshotObjectMaterializeCount.light = 0
commitPublishIterationCount.noSubscribers = 0
onCommitHookCloneCount.noHooks = 0
joinSplitInTxnWindowCount = 0
dirtyAllFallbackCount.p1Gate = 0
```

If a time metric improves and an allocation or materialization sentinel fails,
the result is not a success.

## Focused Diff Gate

A hard focused claim requires all of these:

- `profile=default` or `profile=soak`;
- `meta.comparability.comparable=true`;
- unchanged matrix/config/env;
- `summary.regressions=0`;
- no unexplained `stabilityWarning`, timeout, or missing suite;
- structural and allocation sentinels pass;
- phase deltas explain whether cost was removed or moved.

## Tax Migration Classification

Classify every member result as one of:

| Classification | Meaning |
| --- | --- |
| `tax_removed` | Target phase improved and no watched phase/counter regressed. |
| `tax_migrated` | Total or target phase improved, while another watched phase/counter rose. |
| `inconclusive` | Evidence is missing, non-comparable, unstable, or too narrow for the claim. |
| `failed` | Target phase did not improve or a structural sentinel failed. |

Specific migration patterns:

- scope down while `resolveEach` remains flat means scope tax still exists;
- body shell down while `queue*` rises means tax moved to queue/lane;
- transaction shell down while `commitPublish` rises means tax moved to commit;
- small transactions slower after large transactions suggests buffer clear tax;
- key/materialize counters rising suggests cache key tax.

## Allowed Claims

- `Focused validation passed.`
- `Same-commit A/B indicates phase improvement in X.`
- `Formal performance claim deferred until comparable default/soak evidence.`

## Forbidden Claims

- `Runtime performance is fixed.`
- `No regressions exist.`
- `Production performance improved globally.`
- `Transaction path is optimal.`
