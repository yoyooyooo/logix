# Research: Verification Loop Orchestration Contract

## Decision: Existing Public Commands Form The Terminal Offline Loop

**Rationale**: `15-cli-agent-first-control-plane.md` freezes public verification roots as `check`, `trial` and `compare`. A wide `verify --stage` command would hide stage semantics in parameters and increase command-surface drift.

**Alternatives considered**:

- Add `logix verify --stage`. Rejected because it duplicates command grammar and weakens stage separation.
- Collapse compare into trial. Rejected because before/after closure needs an explicit compare route.

## Decision: CommandResult Is Transport, Not Report Truth

**Rationale**: Agents should parse stdout as `CommandResult`, resolve `primaryReportOutputKey` against `artifacts[].outputKey`, and then consume `VerificationControlPlaneReport`. This preserves a single report truth and supports inline or file-backed artifacts.

**Alternatives considered**:

- Put verdict and repair closure directly in transport fields. Rejected because it creates a second report surface.
- Require human logs for fallback. Rejected because the loop must be machine-readable.

## Decision: Rerun Coordinate Is Reconstructed From Input Coordinate And Refs

**Rationale**: Exact rerun must survive stop/resume and artifact budgets. The stable source is command input coordinate, argv snapshot, entry coordinate, evidence refs, selection refs, trial options and compare before/after refs. Large or sensitive inputs stay as refs.

**Alternatives considered**:

- Reconstruct rerun commands from docs examples. Rejected because it is not input-specific.
- Inline evidence and selection payloads into the rerun coordinate. Rejected because it breaks payload budget and redaction boundaries.

## Decision: Check Pass Recommends Startup Trial Without Claiming Startup Pass

**Rationale**: `runtime.check` is a cheap static gate. If it passes, the next default gate is startup trial, but the report must state the pass boundary so Agents do not infer startup, scenario or host validation.

**Alternatives considered**:

- Treat check pass as loop closure. Rejected because startup dependencies can still fail.
- Have check silently run startup trial. Rejected because it violates stage separation.

## Decision: Compare Admissibility Must Prefer Inconclusive Over False Closure

**Rationale**: Compare must reject or mark as inconclusive when declaration, evidence or environment fingerprints mismatch. This avoids false repair closure when before/after reports are not comparable.

**Alternatives considered**:

- Compare only verdicts. Rejected because a pass after changed inputs can hide non-comparable repairs.
- Fail generically on mismatch. Rejected because Agents need rerun guidance.

## Decision: No New Contract File For 186

**Rationale**: Exact transport/report/compare shapes already belong to existing CLI and runtime contracts. 186 freezes orchestration and proof obligations without duplicating schema truth.

**Alternatives considered**:

- Add `implementation-details/loop-contract.md`. Rejected unless implementation discovers a concrete wire ambiguity that must be exact before coding.
