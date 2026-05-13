# Perf Evidence: Kernel Performance Convergence Final Gate

Place local artifacts for `235-kernel-performance-convergence-final-gate` here.

Expected files after local implementation:

```text
before/*.json
after/*.json
diff/*.json
reports/*.md
reports/*.json
```

Quick/smoke evidence is a clue only. Hard claims require default or soak evidence, comparable before/after artifacts, zero required counters, passing required suites, and no unexplained migrated cost/risk.

## Cloud-Owned Patch Evidence Notes

The attached cloud-owned patch implements classifier/test/doc support, but it does not create local proof. Local acceptance still requires applying the patch and writing real local artifacts under this directory. Do not copy template values into evidence reports.

Required final manifest fields include:

```text
profile: default | soak | adversarial-default | adversarial-soak for hard claims
comparable: true
regressions: 0
budgetExceeded: 0
timeouts: 0
stabilityWarnings: 0
missingSuites: 0
migration.migratedCost: 0 unless accepted by maintainer authority
migration.migratedRisk: 0 unless accepted by maintainer authority
all required suites: pass
all required counters: 0
```

Quick/smoke artifacts may be stored here as diagnostic clues only.

The checked-in `convergence.manifest.template.json` intentionally uses `profile=quick` so copying the template cannot produce a hard success claim. Local default/soak evidence must replace the template profile, evidence refs, local CI records, counters, suites, and migration ledger.

## Manifest Assembly Bridge

Do not write the final manifest by hand unless debugging. Prefer the assembly input helper, then run the manifest assembler:

```bash
pnpm exec tsx packages/logix-perf-evidence/scripts/ci.kernel-performance-convergence-assembly-input.ts \
  --before specs/235-kernel-performance-convergence-final-gate/perf/before.<env>.default.json \
  --after specs/235-kernel-performance-convergence-final-gate/perf/after.<env>.default.json \
  --diff specs/235-kernel-performance-convergence-final-gate/perf/diff.<env>.default.json \
  --adversarial-report specs/231-adversarial-performance-matrix/perf/reports/adversarial.<env>.default.json \
  --examples-report specs/234-p2-examples-playground-perf-isolation/perf/reports/examples-playground.default.json \
  --profile adversarial-default \
  --out specs/235-kernel-performance-convergence-final-gate/perf/assembly.default.json

pnpm exec tsx packages/logix-perf-evidence/scripts/assemble-kernel-performance-convergence-manifest.ts \
  --input specs/235-kernel-performance-convergence-final-gate/perf/assembly.<profile>.json \
  --out specs/235-kernel-performance-convergence-final-gate/perf/convergence.<profile>.manifest.json
```

The helper reads existing artifacts only. It does not fill missing counters with zero and does not run benchmark or browser collection.

## CI / Stable Runner Artifacts

For ongoing diagnosis, use the split from [Kernel Performance Observability Standard](../../../docs/standards/kernel-performance-observability-standard.md):

```text
knob snapshot -> current commit pressure/counter/suite-status evidence
trend analyze -> same-branch recent snapshot comparison
convergence -> explicit before/after final-gate input
convergence soak -> soak/tail/stability final-gate input
```

Final 231-235 hard before/after evidence should be collected by `logix-perf (convergence)` or an equivalent stable runner:

```text
.github/workflows/logix-perf-convergence.yml
```

Expected uploaded artifact root:

```text
perf/convergence/
```

Required convergence files are `before`, `after`, `diff`, adversarial report, examples/playground report, `assembly.<profile>.json`, `convergence.<profile>.manifest.json`, `convergence.<profile>.json`, and `summary.md`. Snapshot and trend artifacts can explain blockers and regressions, but they do not replace these final-gate inputs. Local files in this spec directory are preflight evidence unless they came from the stable runner artifact chain.

The final gate report must be written under this spec:

```text
specs/235-kernel-performance-convergence-final-gate/perf/reports/convergence.<profile>.md
specs/235-kernel-performance-convergence-final-gate/perf/reports/convergence.<profile>.json
```

`specs/231-adversarial-performance-matrix/perf/**` is an input source for matrix evidence, not the final convergence report owner.

## Local Evidence Snapshot — 2026-05-12

This directory now contains real default-profile evidence for the local run. The final report is intentionally blocked, not complete.

Primary artifacts:

```text
before.darwin-arm64.chromium-143.headless.default.json
after.darwin-arm64.chromium-143.headless.default.json
diff.darwin-arm64.chromium-143.headless.default.json
assembly.default.json
convergence.default.manifest.json
reports/convergence.default.md
reports/convergence.default.json
logs/soak-before.collect.blocked.log
```

Cross-stage inputs:

```text
specs/231-adversarial-performance-matrix/perf/reports/adversarial.darwin-arm64.chromium-143.headless.default.json
specs/234-p2-examples-playground-perf-isolation/perf/reports/examples-playground.default.json
```

Summary:

```text
default diff: comparable=true, regressions=5, budgetExceeded=0, timeouts=2, missingSuites=0, stabilityWarnings=2
adversarial report: classification=blocked, claimStrength=none
P2 examples/playground: classification=isolated, claimStrength=hard
final convergence: classification=blocked, claimStrength=none
soak: blocked before JSON generation; no soak diff exists
```

Hard completion is not claimable from these artifacts. The current admissible claim is limited to: 235 final gate was run locally and is blocked by the recorded evidence.
