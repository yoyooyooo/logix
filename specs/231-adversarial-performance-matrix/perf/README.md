# Perf Evidence: Adversarial Performance Matrix

Place local artifacts for `231-adversarial-performance-matrix` here.

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
