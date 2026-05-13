# Discussion: Kernel Selector Route Contract

This file is a non-authoritative working artifact. `spec.md` and active SSoT own the contract.

## Must Close Before Implementation

None.

## Deferred / Non-Blocking

### D1 Future Public Selector Helper

Status: deferred reopen candidate.

Current decision:

- Do not add `select.*` or another public selector namespace in `169`.
- Keep `fieldValue(path)` and domain selector primitives as default generated selector inputs.

Reopen evidence required:

- Exact selector inputs cannot support ordinary business UI projection without worse public surface.
- A new helper strictly improves Agent generation stability and type-safety.
- The candidate does not resurrect public `ReadQuery`, a second hook family, a public object/struct descriptor, or a second route owner.

### D2 Function Selector Expert Lane

Status: non-blocking watchpoint.

Current decision:

- Function selectors remain expert-only.
- L0/L1 docs and Agent recipes do not teach them as defaults.

Watchpoint:

- If exact function-selector admission becomes reliable enough, update type-safety matrix and guidance through a separate SSoT decision before changing public examples.

### D3 Internal Debug/Resilience Marker Generation

Status: non-blocking implementation design detail.

Current decision:

- Marker must be internal-only and inaccessible from public types, root exports, README snippets, cookbook examples, or Agent material.

Watchpoint:

- Implementation must choose a generation route that cannot be copied into user code.
- Candidate mechanisms include runtime capability, internal DI, or repo-internal harness.

### D4 Performance Baseline Coverage

Status: still open evidence watchpoint.

Current decision:

- Implementation must produce comparable before/after evidence before claiming performance success.

Watchpoint:

- Existing perf suites may need a focused selector-route scenario if current suites do not cover selector fingerprint, dirty/read overlap, and React host topic publish.

Current implementation note:

- Selector route, fingerprint identity, dirty fallback diagnostics, React route consumption, verification layering, and business witnesses have landed.
- Comparable before/after performance artifacts have not yet been collected for this spec.
- Do not mark `spec.md` Done or claim performance success until `perf/before.*.json`, `perf/after.*.json`, and `perf/diff.*.json` exist and pass comparability review.

### D5 StateTransaction Decomposition Shape

Status: resolved in implementation.

Current decision:

- Semantic dirty precision changes in `StateTransaction.ts` require a no-behavior split first.

Candidate split:

- `StateTransaction.dirty.ts`
- `StateTransaction.patch.ts`
- `StateTransaction.snapshot.ts`
- retained coordinator in `StateTransaction.ts`

The exact file names may change if the implementation finds a cleaner existing local pattern, but the split must stay mutually exclusive and behavior-preserving.

Implementation result:

- `packages/logix-core/src/internal/runtime/core/StateTransaction.dirty.ts`
- `packages/logix-core/src/internal/runtime/core/StateTransaction.patch.ts`
- `packages/logix-core/src/internal/runtime/core/StateTransaction.snapshot.ts`
- `packages/logix-core/src/internal/runtime/core/StateTransaction.ts` remains the coordinator.
