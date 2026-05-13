# Perf Evidence: P2 Examples and Playground Performance Isolation

Place local artifacts for `234-p2-examples-playground-perf-isolation` here.

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

## Examples / Playground Isolation Report

Use the P2 classifier after local runtime-example and playground-product evidence exists:

```bash
pnpm exec tsx packages/logix-perf-evidence/scripts/ci.examples-playground-isolation-report.ts \
  --input specs/234-p2-examples-playground-perf-isolation/perf/examples-playground.<profile>.input.json \
  --out specs/234-p2-examples-playground-perf-isolation/perf/reports/examples-playground.<profile>.md \
  --json-out specs/234-p2-examples-playground-perf-isolation/perf/reports/examples-playground.<profile>.json
```

The report must show:

```text
examples.runtimeWitness: pass
examples.playgroundNoiseIsolation: pass
examples.kernelPlaygroundCostMixed: 0
examples.publicResidueViolation: 0
runtime.kernelOnly: true
playground.productCostSeparated: true
```

The JSON report can be supplied to `assemble-kernel-performance-convergence-manifest.ts` as one of the `reports[]` inputs.
