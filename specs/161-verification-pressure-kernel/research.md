# Research: Verification Pressure Kernel

## Decision 1: Static pressure belongs to `runtime.check`

**Decision**: `runtime.check` owns static pressure for blueprint, Program-only imports, duplicate imports, declaration freshness, sourceRef and PASS boundary.

**Rationale**: These failures can be detected before startup. Keeping them in check gives Agent a cheap first repair loop and preserves the default gate of check plus startup trial.

**Alternatives considered**:

- Detect in startup trial only: rejected because static and runtime failures become mixed.
- Detect in CLI entry gate: rejected because CLI would gain declaration or Program truth.
- Detect through import-time throw: rejected because it is not a control-plane report.

## Decision 2: Dependency failure uses typed cause pressure

**Decision**: Startup trial must produce a typed dependency cause with kind, phase, provider source, owner coordinate and child identity where applicable.

**Rationale**: Agent repair cannot depend on parsing error text. The same pressure shape can cover missing service, missing config, missing Program import and imported child dependency.

**Alternatives considered**:

- Keep free-text error summaries: rejected because they are not stable repair targets.
- Add separate parser per failure family: rejected because it creates drift and multiple truth paths.

## Decision 3: Focus projection stays coordinate-only

**Decision**: `repairHints.focusRef` remains limited to stable coordinates and must not embed domain payload.

**Rationale**: Coordinate-only focus keeps reports slim and lets artifacts carry heavier explanation material.

**Alternatives considered**:

- Expand focusRef into domain payload: rejected because compare and repeatability would become unstable.
- Use raw trace paths as focus: rejected because traces are optional drilldown material.

## Decision 4: Boot and close failures need dual summary

**Decision**: Trial reports must preserve primary boot failure and close summary together; close failure is linked through artifact or summary pressure.

**Rationale**: Close failures often reveal leaks, but they must not hide the original startup failure.

**Alternatives considered**:

- Let close failure replace primary failure: rejected because repair target becomes misleading.
- Drop close failure on boot failure: rejected because lifecycle evidence is lost.

## Decision 5: Compare needs admissibility digest

**Decision**: Compare must judge declaration digest, scenario plan digest, evidence summary digest and environment fingerprint before comparing verdicts.

**Rationale**: If before/after reports are not comparable, Agent needs an admissibility result rather than a false repair failure.

**Alternatives considered**:

- Compare only verdict and errorCode: rejected because it hides input drift.
- Compare full raw evidence by default: rejected because it makes default compare heavy and unstable.

## Decision 6: Repeatability ignores only narrow fields

**Decision**: Repeatability may ignore runId and allowed file path/outDir variation. Verdict, errorCode, artifact keys, digest and next stage must stay stable.

**Rationale**: Agent uses these fields for scheduling and proof. Broad normalization would hide real nondeterminism.

**Alternatives considered**:

- Ignore all environment fields: rejected because environment drift is a compare input.
- Normalize every artifact payload: rejected because payload stability belongs to artifact-specific proof, not the global rule.
