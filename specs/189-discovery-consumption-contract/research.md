# Research: Discovery And Consumption Contract

## Decision: Discovery Stays Static Schema Plus Docs/Skill

**Rationale**: `15-cli-agent-first-control-plane.md` rejects `logix describe` and `--describe-json`. Static schema and docs are enough for Agent discovery while avoiding a new public command surface or second contract truth.

**Alternatives considered**:

- Add `logix describe`. Rejected because it creates executable discovery authority.
- Parse help text. Rejected because help output is not a machine contract.

## Decision: Package Schema Is A Derived Mirror

**Rationale**: `commands.v1.json` should describe command grammar and result envelope fields for offline Agent use. It must not own `VerificationControlPlaneReport` or live artifact payload schemas.

**Alternatives considered**:

- Put full report schemas into command schema. Rejected because runtime report truth belongs to `09`.
- Put live artifact payload truth into command schema. Rejected because live truth belongs to `18`.

## Decision: Skill Mirror Must Match Package Schema For Grammar

**Rationale**: Agents using `skills/logix-cli` may read the skill-local copy. Drift between package schema and skill mirror causes wrong command generation, stale output parsing and archived route revival.

**Alternatives considered**:

- Treat skill mirror as explanatory only. Rejected because the skill explicitly uses it for command-line generation.
- Generate skill mirror at runtime. Rejected because discovery is static and repo-local.

## Decision: Verification Consumption Recipe Resolves Report Artifacts

**Rationale**: Agents must read stdout as `CommandResult`, resolve `primaryReportOutputKey`, then read the matching report artifact. File-backed artifacts must beat truncated inline previews. Scheduling and repair come from the report, not CLI logs.

**Alternatives considered**:

- Read verdict directly from transport. Rejected because `CommandResult` is only an envelope.
- Use stdout previews even when truncated. Rejected because file-backed report is authoritative.

## Decision: Live Consumption Recipe Is Separate From Verification Recipe

**Rationale**: `LiveCommandResult` uses `primaryLiveOutputKey` and live artifact families. Agents must treat it as evidence/gap output and feed canonical evidence into trial or compare before consuming repair hints.

**Alternatives considered**:

- Use one generic result recipe. Rejected because it blurs `CommandResult` and `LiveCommandResult`.
- Allow live output to expose report fields. Rejected because it creates a second verification plane.

## Decision: Drift Guards Are Package-Level Release Gates

**Rationale**: Schema/docs/skill drift is cheap to detect and high impact for Agents. Focused package tests and text sweeps should fail when public command grammar or archived vocabulary drifts.

**Alternatives considered**:

- Rely on manual docs review. Rejected because drift can silently break Agent loops.
- Run full live daemon/browser proof for every schema change. Rejected because grammar drift checks should remain cheap.
