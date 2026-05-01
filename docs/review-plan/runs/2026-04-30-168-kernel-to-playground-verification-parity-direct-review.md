# 168 Kernel-to-Playground Verification Parity Review Ledger

## Meta

- target: `specs/168-kernel-to-playground-verification-parity`
- targets:
  - `specs/168-kernel-to-playground-verification-parity/spec.md`
  - `specs/168-kernel-to-playground-verification-parity/plan.md`
  - `specs/168-kernel-to-playground-verification-parity/discussion.md`
  - `specs/168-kernel-to-playground-verification-parity/data-model.md`
  - `specs/168-kernel-to-playground-verification-parity/contracts/README.md`
  - `docs/ssot/runtime/09-verification-control-plane.md`
  - `docs/ssot/runtime/15-cli-agent-first-control-plane.md`
  - `docs/ssot/runtime/17-playground-product-workbench.md`
  - `specs/165-runtime-workbench-kernel/spec.md`
  - `specs/166-playground-driver-scenario-surface/spec.md`
  - `specs/167-runtime-reflection-manifest/spec.md`
- source_kind: `file-ssot-contract`
- reviewers: `main-agent direct dominance review`
- round_count: 1
- challenge_scope: `open`
- consensus_status: `closed-by-direct-review`

## Bootstrap

- target_complete: yes
- alignment_gate:
  - policy: `auto`
  - status: `inferred`
  - resolved_points:
    - User requested implementation of all tasks under 168.
    - Repository policy only permits subagents after explicit current-request authorization.
    - This ledger records a direct review closure for T010 without spawning reviewers.
  - open_questions: none
- review_contract:
  - artifact_kind: `ssot-contract`
  - review_goal: `implementation-ready`
  - target_claim: 168 aligns core verification, CLI transport, Workbench projection and Playground diagnostics without new public surface or fake authority.
  - challenge_scope: `open`
  - stop_condition: `bounded-round`
  - write_policy: target spec, owner SSoT pages and this ledger may be updated.

## Findings

- F168-001 `closed`:
  - summary: Reflection bridge stopped at manifest artifact refs and did not expose action, payload or dependency drilldown nodes.
  - adopted: add internal `reflection-node` truth inputs from 167-owned manifest facts.
- F168-002 `closed`:
  - summary: Payload validator unavailable and stale/fallback reflection cases needed explicit evidence-gap projection.
  - adopted: project unknown schema, missing manifest, stale manifest digest and `fallback-source-regex` as Workbench evidence gaps.
- F168-003 `closed`:
  - summary: `runtime.check` needed a regression guard proving it does not run startup validation.
  - adopted: add static-only missing-service test; declared dependency risk remains owner-gated.
- F168-004 `closed`:
  - summary: Playground needed captured refs for Check/Trial and Run failure before compare parity could be claimed.
  - adopted: add host-state capture helpers and compare-compatible report pair proof.
- F168-005 `closed`:
  - summary: Scenario trial could be misread as available because CLI accepts `--mode scenario`.
  - adopted: CLI returns structured scenario failure until core executor exists.

## Adopted Freeze

- `VerificationDependencyCause` remains the dependency spine; no broad closure index was added.
- Reflection bridge expands owner manifest facts into action, payload and dependency nodes.
- Payload validation issue projection remains reflection-owned.
- Playground captures Check, Trial and Run failure refs; default compare proof consumes report captures only.
- CLI scenario mode stays blocked until a core-owned executor exists.
- Diagnostics routes include payload validator unavailable and reflection action evidence-gap demos.

## Residual Risk

- Adapter module naming and export path remain deferred.
- Core scenario executor remains deferred.
- Public reflection surface remains rejected for this phase.
