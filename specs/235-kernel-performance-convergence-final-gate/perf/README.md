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

Do not write the final manifest by hand unless debugging. Use the assembler:

```bash
pnpm exec tsx packages/logix-perf-evidence/scripts/assemble-kernel-performance-convergence-manifest.ts \
  --input specs/235-kernel-performance-convergence-final-gate/perf/assembly.<profile>.json \
  --out specs/235-kernel-performance-convergence-final-gate/perf/convergence.<profile>.manifest.json
```

The final gate report must be written under this spec:

```text
specs/235-kernel-performance-convergence-final-gate/perf/reports/convergence.<profile>.md
specs/235-kernel-performance-convergence-final-gate/perf/reports/convergence.<profile>.json
```

`specs/231-adversarial-performance-matrix/perf/**` is an input source for matrix evidence, not the final convergence report owner.
