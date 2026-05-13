# Kernel Stability Report Template

`KernelStabilityReport` is an internal release gate artifact. It is not public API and must not be exposed through `Runtime`, root exports, docs recipes, or authoring examples.

## Gate Status

- `PASS`: exact evidence refs are listed and the referenced guard or sweep passed in this release check.
- `FAIL`: a referenced guard failed, a static sweep found a violation, or the gate has unresolved blockers.
- `UNKNOWN`: evidence is absent, stale, incomparable, or intentionally not collected in this wave.

UNKNOWN is not PASS. A release note may proceed with UNKNOWN only when the residual risk is explicitly accepted. UNKNOWN must not be used to claim closure.

## Gates

| Gate | Evidence expectation |
| --- | --- |
| `publicSurface` | Core/Form/React root barrel allowlists and public subpath checks. |
| `authoringSpine` | `Module.logic -> Program.make -> Runtime.make` spine guards and example checks. |
| `fieldDeclarationCompiler` | Field declaration compiler and Form lowering guards. |
| `runtimeLifecycle` | runtime lifecycle, topic cleanup, hot lifecycle, and module cache guards. |
| `transactionSafety` | state transaction, dirty plan, and no-IO transaction-window guards. |
| `selectorPrecision` | core selector route, fingerprint, dirty/read overlap, and React route-owner guards. |
| `diagnosticsOffCost` | diagnostics-off no-allocation/no-trace guards or comparable evidence. |
| `controlPlaneShape` | runtime.check/runtime.trial/report shape and no root compare facade guards. |
| `domainBoundary` | Form/domain package boundary and no second host truth guards. |
| `legacyResidueSweep` | public residue text sweep and old facade/hook family guards. |

## Non-Claim Rules

- Do not run benchmark suites from this report gate.
- Do not treat dry-run output as release evidence.
- Do not mark `diagnosticsOffCost` or any broad hot-path row as PASS without explicit comparable evidence.
- Record no broad performance success claim unless a separate active perf spec supplies before/after/diff evidence.
- `perfBroadStrict: PASS` is not a valid shortcut field.

## Fill-In Form

```json
{
  "kind": "KernelStabilityReport",
  "schemaVersion": 1,
  "generatedAt": "<iso-or-release-id>",
  "gates": {
    "publicSurface": { "status": "UNKNOWN", "evidenceRefs": [], "note": "" },
    "authoringSpine": { "status": "UNKNOWN", "evidenceRefs": [], "note": "" },
    "fieldDeclarationCompiler": { "status": "UNKNOWN", "evidenceRefs": [], "note": "" },
    "runtimeLifecycle": { "status": "UNKNOWN", "evidenceRefs": [], "note": "" },
    "transactionSafety": { "status": "UNKNOWN", "evidenceRefs": [], "note": "" },
    "selectorPrecision": { "status": "UNKNOWN", "evidenceRefs": [], "note": "" },
    "diagnosticsOffCost": { "status": "UNKNOWN", "evidenceRefs": [], "note": "No comparable diagnostics-off perf artifact provided." },
    "controlPlaneShape": { "status": "UNKNOWN", "evidenceRefs": [], "note": "" },
    "domainBoundary": { "status": "UNKNOWN", "evidenceRefs": [], "note": "" },
    "legacyResidueSweep": { "status": "UNKNOWN", "evidenceRefs": [], "note": "" }
  }
}
```
