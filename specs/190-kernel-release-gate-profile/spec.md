# Feature Specification: Kernel Release Gate Profile

**Feature Branch**: `190-kernel-release-gate-profile`  
**Created**: 2026-05-10  
**Status**: Implemented  
**Input**: User description: "Absorb the external CLI deep analysis into the Logix source of truth."

## Implementation Result

Implemented on 2026-05-10. The external CLI/kernel analysis is absorbed as a repo-local `Kernel Release Gate Profile` over existing owner pages and proof routes. The implementation added the 190 spec family, projected gate rows into `16`, linked CLI carrier constraints in `15`, clarified default gate aggregation in `09`, added hot-path release-gate perf rules in `02`, linked 190 from `189`, registered 190 in `specs/README.md`, and taught `skills/logix-cli` to consume the profile through existing commands only.

Proof refs: schema mirror diff, focused CLI schema/result/live boundary tests, repair closure tests, live evidence handoff tests, rejected-vocabulary sweep, spec-kit coded point extraction, and changed-file `git diff --check`.

## Current Role

- This page holds the repo-local release gate projection that absorbs the 2026-05-09 external CLI/kernel analysis.
- This page maps the analysis back to existing owner pages, proof rows, command recipes, perf gates and text sweeps.
- This page does not own CLI command grammar, runtime stage vocabulary, verification report truth, live fact truth, perf budgets or domain package authority.
- This page must remain a derived profile. Owner adoption continues to live in `09`, `15`, `16`, `18`, `02`, `189` and predecessor specs.

## Context

The external analysis reframes Logix CLI as a kernel pressure judge: every kernel capability should be provable through static verification, startup trial, repair/rerun/compare closure, live evidence handoff or hot-path evidence. That direction is aligned with the current SSoT, but most underlying decisions are already closed in the CLI and verification family:

- `15` freezes the public command surface as `check / trial / compare` plus `logix live ...`.
- `09` owns stage, report, repair hint, compare and default gate authority.
- `16` already holds terminal pressure rows and proof refs for Agent self-verification.
- `184`, `185`, `186`, `187`, `188` and `189` closed entry authority, repair intent, orchestration, live evidence, host adjunct evidence and discovery consumption.
- `02` owns hot-path direction, perf evidence admission and live disabled-overhead guardrails.

The remaining gap is not another CLI capability. The missing artifact is one repo-local release gate profile that lets maintainers and Agents ask whether the kernel is release-ready without creating `logix challenge`, a public `KernelStabilityReport`, a second verification report or a new truth source.

## Scope

### In Scope

- A derived `Kernel Release Gate Profile` that aggregates existing proof obligations.
- Mapping the external analysis points into owner-backed rows and proof families.
- A challenge-pack projection for declaration, dependency/lifecycle, repair closure, live evidence and hot path budget.
- SSoT writeback links from `09`, `15`, `16`, `02`, `189` and `skills/logix-cli`.
- A quickstart for running or auditing the gate with existing commands, tests, perf artifacts and text sweeps.

### Out of Scope

- Any new public CLI root or subcommand.
- `logix challenge`, `logix verify --stage`, `logix describe`, `logix debug` or flat live roots.
- A public `KernelStabilityReport` schema.
- A new `Runtime.compare` root facade.
- New verification report fields, live artifact payload schemas, evidence envelopes or scenario language.
- Productizing `trial --mode scenario`, host deep trial, browser CPU profile, heap snapshot, cloud mutation or long-running live streams.
- Reopening CLI command grammar already closed by `15` and `189`.

## Analysis Absorption Classification

### Promotion Filter

Any future claim that the release gate should promote a new capability must satisfy at least one of these conditions:

- reduce authoring forks
- stabilize runtime boundary
- produce measurable performance evidence
- improve diagnostics or repair locality

If a candidate does not satisfy one of these conditions, it remains demo, product UI, documentation, domain sugar, future research or internal support.

### Kept As Existing Owner Law

- `Module.logic(...)`, `Program.make(Module, config)`, `Runtime.make(Program)` and `Runtime.run(Program, main, options)` stay in `01`.
- `Runtime.check(Program, options?)` and `Runtime.trial(Program, options)` stay as public facades for `runtime.check` and `runtime.trial`.
- `runtime.compare` stays a control-plane stage. A root `Runtime.compare` facade remains out of productization unless reopened by runtime authority intake.
- CLI verification roots stay `logix check`, `logix trial`, `logix compare`.
- CLI live collaboration stays `logix live <task>`.
- `VerificationControlPlaneReport`, `CommandResult`, `LiveCommandResult`, canonical evidence package, `repairHints`, `focusRef`, artifact refs and `nextRecommendedStage` keep their existing owner pages.

### Rejected Or Permanently Downgraded

- old IR toolbox public CLI
- `contract-suite` CLI
- transform/writeback CLI as public product surface
- public `describe` or `--describe-json`
- help-text machine discovery
- flat live roots
- `logix debug`
- CLI-owned automatic patch engine
- Playground-owned scenario truth
- DVTools-owned report or finding truth
- Devtools-owned runtime truth
- public `Runtime.devtools` / `Runtime.inspect` facade
- public `ReadQuery` namespace as a new root truth
- form-owned canonical React hook family that bypasses the shared host law

### Future Or Explicit Upgrade Layer

- `trial --mode scenario`
- host deep trial
- root `Runtime.compare` facade productization
- browser CPU profile integration
- heap snapshot
- remote or cloud mutation
- long-running live stream
- cross-process aggregation
- live-derived before/after compare deep closure

These items may be valuable later, but they are not part of the default release gate and cannot be used to close current verification readiness.

## Imported Authority

- [docs/ssot/runtime/01-public-api-spine.md](../../docs/ssot/runtime/01-public-api-spine.md)
- [docs/ssot/runtime/02-hot-path-direction.md](../../docs/ssot/runtime/02-hot-path-direction.md)
- [docs/ssot/runtime/09-verification-control-plane.md](../../docs/ssot/runtime/09-verification-control-plane.md)
- [docs/ssot/runtime/15-cli-agent-first-control-plane.md](../../docs/ssot/runtime/15-cli-agent-first-control-plane.md)
- [docs/ssot/runtime/16-agent-self-verification-scenario-matrix.md](../../docs/ssot/runtime/16-agent-self-verification-scenario-matrix.md)
- [docs/ssot/runtime/18-runtime-inspect-evidence-contract.md](../../docs/ssot/runtime/18-runtime-inspect-evidence-contract.md)
- [docs/standards/logix-api-next-guardrails.md](../../docs/standards/logix-api-next-guardrails.md)
- [specs/184-entry-declaration-authority/spec.md](../184-entry-declaration-authority/spec.md)
- [specs/185-repair-intent-contract/spec.md](../185-repair-intent-contract/spec.md)
- [specs/186-verification-loop-orchestration/spec.md](../186-verification-loop-orchestration/spec.md)
- [specs/187-live-diagnosis-evidence/spec.md](../187-live-diagnosis-evidence/spec.md)
- [specs/188-react-host-adjunct-evidence/spec.md](../188-react-host-adjunct-evidence/spec.md)
- [specs/189-discovery-consumption-contract/spec.md](../189-discovery-consumption-contract/spec.md)
- [skills/logix-cli/SKILL.md](../../skills/logix-cli/SKILL.md)

## Closure & Guardrails

### Closure Contract

- Every explicit point from the external analysis is classified as already-owned, newly projected into this gate, rejected, or future.
- The release gate profile maps to existing owner pages and proof refs instead of defining a new authority.
- The profile covers declaration, startup dependency, lifecycle, repair closure, live evidence, discovery, hot path, domain boundary and legacy-residue sweep.
- Docs and the `logix-cli` skill state that the profile uses existing commands and tests only.
- Text sweeps prove no active public surface teaches `logix challenge`, `logix describe`, `logix debug`, flat live roots or public `KernelStabilityReport` as a command/report contract.

### Must Cut

- No public `logix challenge` command.
- No public `KernelStabilityReport` schema or report truth.
- No live verdict, live repair hints or live next-stage scheduling.
- No help-text based machine discovery.
- No Playground, DVTools, daemon, browser adapter or CLI-owned runtime truth.
- No domain package second runtime, second host law, second selector truth or second report family.
- No performance claim without clean comparable evidence when hot path rows are touched.

### Reopen Bar

Reopen this spec only if a release or Agent handoff cannot determine kernel readiness from `16` pressure rows, `15` command contract, `09` reports, `18` live evidence, `02` perf gates and `189` discovery recipes without adding a new public command or report truth.

## User Scenarios & Testing

### User Story 1 - Classify External CLI Analysis (Priority: P1)

A maintainer needs the external analysis absorbed without duplicating SSoT. Each point must map to an owner-backed artifact, a rejected direction or a future extension.

**Why this priority**: Unclassified advice drifts into parallel truth. Classification keeps the stronger ideas while avoiding a second architecture narrative.

**Independent Test**: Review this spec, `16` projection, `15` writeback, `02` perf writeback and text sweeps for every named analysis category.

**Acceptance Scenarios**:

1. **Given** the analysis recommends CLI as kernel pressure judge, **When** maintainers inspect the SSoT, **Then** the recommendation appears as a repo-local release gate projection and not as a new public CLI command.
2. **Given** the analysis names static declaration, startup dependency, repair closure, live evidence and hot-path challenge packs, **When** maintainers inspect `16` and this spec, **Then** each pack maps to existing pressure rows, proof refs, perf gates or future rows.

---

### User Story 2 - Run A Kernel Release Gate Profile (Priority: P1)

An Agent or maintainer needs a repeatable proof bundle for kernel readiness using existing commands, tests, perf artifacts and sweeps.

**Why this priority**: The project needs a release gate shape that is stronger than scattered tests but smaller than a new CLI surface.

**Independent Test**: Follow `quickstart.md` and verify that all commands are existing package/test/perf/text-sweep routes.

**Acceptance Scenarios**:

1. **Given** a release candidate, **When** the gate profile is run, **Then** it produces evidence for command schema, report consumption, repair closure, live evidence boundary and relevant hot-path rows.
2. **Given** a gate row is not applicable to the current change, **When** the release note cites it, **Then** the row is marked not-touched or future with owner page evidence instead of being silently skipped.

---

### User Story 3 - Preserve CLI And Live Boundaries (Priority: P1)

An Agent must use CLI as a carrier and evidence route without treating CLI or live as truth owners.

**Why this priority**: The strongest risk in the analysis is accidentally turning an internal gate idea into a fourth control plane.

**Independent Test**: Run CLI schema guards and live forbidden-field tests, then text-sweep docs and skills for rejected command/report vocabulary.

**Acceptance Scenarios**:

1. **Given** a live artifact, **When** repair is needed, **Then** the Agent must feed evidence into `trial` or `compare` before reading repair hints.
2. **Given** command discovery is needed, **When** an Agent reads the contract, **Then** it uses static schema and docs, not help text or `describe`.

---

### User Story 4 - Block Expansion Until Hot Paths Are Proven (Priority: P2)

A maintainer needs the analysis's performance warning reflected in release gating without making old perf artifacts a new truth source.

**Why this priority**: Functional CLI closure does not prove runtime kernel quality if selector, dirty path, external store, runtime store, form list or diagnostics-off rows regress.

**Independent Test**: Inspect `02`, this spec and quickstart to confirm hot-path rows require current-head comparable evidence only when the change touches those rows.

**Acceptance Scenarios**:

1. **Given** a change touches selector route or dirty fallback, **When** the gate is closed, **Then** it must cite same-profile before/after performance evidence.
2. **Given** only after-only or archived perf evidence exists, **When** the gate report is written, **Then** it may classify risk but must not claim performance improvement.

### Edge Cases

- A release changes only docs or schema recipes and does not touch runtime hot paths.
- A live proof passes but before/after live-derived compare closure remains future.
- A command exits non-zero but still returns structured transport output.
- Static schema and skill mirror drift.
- A legacy command appears only as a rejected or negative-only vocabulary item.
- A domain package change claims proof while using a second runtime or second host law.

## Requirements

### Functional Requirements

- **FR-001**: The gate profile MUST classify every explicit analysis theme: north star, public spine, CLI as pressure protocol, default gate, live evidence, schema discovery, repair closure, performance, domain packages, Playground/DVTools and rejected expansions.
- **FR-002**: The gate profile MUST remain repo-local and MUST NOT add public CLI command grammar.
- **FR-003**: The gate profile MUST define these rows as derived checks: `publicSurface`, `authoringSpine`, `entryDeclarationAuthority`, `fieldDeclarationCompiler`, `runtimeLifecycle`, `transactionSafety`, `selectorPrecision`, `dependencyTrial`, `liveEvidenceBoundary`, `diagnosticsOffCost`, `perfBroadStrict`, `domainBoundary`, `discoveryConsumption`, `legacyResidueSweep`.
- **FR-004**: Each row MUST point to an owner page, predecessor spec, proof command, perf artifact class or explicit future/rejected classification.
- **FR-005**: The profile MUST map challenge packs to existing owners: declaration to `184/16`, dependency/lifecycle to `09/16/161`, repair closure to `185/186/16`, live evidence to `187/18/15`, hot path budget to `02`.
- **FR-006**: Verification lane proof MUST continue to use only `logix check`, `logix trial --mode startup` and explicit `logix compare`.
- **FR-007**: Live lane proof MUST continue to use `logix live <task>` only as evidence/gap production and MUST NOT produce verdict, repair hints or next-stage scheduling.
- **FR-008**: Discovery proof MUST continue to use static schema and docs/skill mirrors, not executable `describe` or help text.
- **FR-009**: Domain package rows MUST prove same-spine projection and MUST reject second runtime, second host law, second selector truth or second report truth.
- **FR-010**: Legacy residue sweep MUST classify residual old vocabulary as rejected, internal-only, negative-only, archived or future.

### Non-Functional Requirements (Performance & Diagnosability)

- **NFR-001**: Gate execution MUST be cheap enough for release and handoff checks when runtime hot paths are not touched.
- **NFR-002**: Hot-path rows MUST require clean comparable evidence before claiming performance closure.
- **NFR-003**: The profile MUST be artifact-backed and must not rely on human logs as completion proof.
- **NFR-004**: The profile MUST not duplicate runtime payload truth, live artifact truth or report exact schema.
- **NFR-005**: The profile MUST keep default gate scope to static verification plus startup trial; scenario, host-deep, raw trace and replay remain explicit upgrades.
- **NFR-006**: The profile MUST make disabled live overhead and diagnostics-off cost visible when live or diagnostics paths are touched.

### Key Entities

- **Kernel Release Gate Profile**: Repo-local derived profile over existing SSoT pages, proof refs and commands.
- **Gate Row**: A named readiness dimension with owner authority and proof evidence.
- **Challenge Pack Projection**: Mapping from the external analysis's challenge packs to existing terminal pressure rows and proof routes.
- **Gate Evidence Bundle**: A release or handoff artifact containing command/test/perf/sweep results.
- **Residual Vocabulary Classification**: Required classification for old or rejected public terms found during sweeps.

## Success Criteria

### Measurable Outcomes

- **SC-001**: All explicit themes from the external analysis have an owner-backed classification in `spec.md` or `16`.
- **SC-002**: Active SSoT pages cross-link the gate without adding a public command, report schema or verification stage.
- **SC-003**: The `logix-cli` skill explains the profile as an existing-command release gate and does not teach `logix challenge`.
- **SC-004**: Quickstart proof covers schema guard, archived vocabulary guard, verification transport, live boundary, schema mirror diff and relevant text sweeps.
- **SC-005**: Hot-path guidance requires clean comparable evidence for touched runtime performance rows and rejects after-only evidence as closure.
- **SC-006**: Text sweeps show rejected vocabulary appears only in negative, rejected, out-of-scope or historical contexts.
