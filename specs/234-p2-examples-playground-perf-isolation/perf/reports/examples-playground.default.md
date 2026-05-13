# Examples / Playground Isolation Report

- Classification: isolated
- Claim strength: hard
- Profile: default
- UNKNOWN/missing is not PASS.
- This report makes no kernel performance success claim from product playground/editor costs.

## Suites

| Suite | Status |
| --- | --- |
| examples.runtimeWitness | pass |
| examples.playgroundNoiseIsolation | pass |

## Counters

| Counter | Value |
| --- | ---: |
| examples.kernelPlaygroundCostMixed | 0 |
| examples.publicResidueViolation | 0 |

## Blockers

- none

## Missing Evidence

- none

## Allowed Claims

- Runtime example witnesses are isolated from product playground/editor cost for the recorded manifest scope.

## Forbidden Claims

- Examples prove kernel performance without isolated runtime evidence.
- Product playground/editor costs are kernel costs.
- Monaco/Sandpack/type-bundle costs can support a kernel performance claim.
- Quick/smoke example evidence proves release-safe performance.

## Cloud LLM Validation Limitations

- Cloud LLM did not run browser route acceptance, Vite playground startup, Monaco worker startup, Sandpack preview, or perf collection.
- This report only classifies local evidence supplied through the input file.
- Cloud LLM did not run this local examples/playground browser evidence.
