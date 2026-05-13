# Tasks: Kernel Release Gate Profile

**Input**: Design documents from `specs/190-kernel-release-gate-profile/`
**Prerequisites**: [spec.md](./spec.md), [plan.md](./plan.md)

**Tests**: Required. 190 is a docs/spec/skill absorption and gate-profile update, so verification uses schema diff, focused CLI guard tests when feasible, text sweeps and spec extraction.

**Organization**: Tasks are grouped by outcome. Stable CLI, report, live and perf law stays in owner pages; this file tracks only this absorption pass.

## Phase 1: Spec And Profile Definition

**Purpose**: Capture the external analysis as a derived repo-local gate profile.

- [x] T001 Create `specs/190-kernel-release-gate-profile/spec.md` with owner, scope, closure, must-cut and reopen bar.
- [x] T002 Create `specs/190-kernel-release-gate-profile/plan.md` with writeback matrix and proof commands.
- [x] T003 Create `specs/190-kernel-release-gate-profile/tasks.md` and `quickstart.md`.
- [x] T004 Create `specs/190-kernel-release-gate-profile/checklists/requirements.md`.

## Phase 2: SSoT Projection Writeback

**Purpose**: Make existing owner pages absorb the profile without adding a second truth.

- [x] T005 Add release gate projection to `docs/ssot/runtime/16-agent-self-verification-scenario-matrix.md`.
- [x] T006 Add CLI carrier note to `docs/ssot/runtime/15-cli-agent-first-control-plane.md`.
- [x] T007 Add default gate and compare boundary note to `docs/ssot/runtime/09-verification-control-plane.md`.
- [x] T008 Add hot-path release gate projection to `docs/ssot/runtime/02-hot-path-direction.md`.
- [x] T009 Add downstream consumer backlink to `specs/189-discovery-consumption-contract/spec.md`.
- [x] T010 Register 190 in `specs/README.md`.

## Phase 3: Agent Skill Recipe

**Purpose**: Teach Agents to consume the profile through existing commands and artifacts.

- [x] T011 Add a `Kernel Release Gate Profile` section to `skills/logix-cli/SKILL.md`.
- [x] T012 Ensure the skill explicitly forbids `logix challenge` and live verification truth.

## Phase 4: Verification And Completion Audit

**Purpose**: Prove all explicit analysis points have been absorbed or rejected with evidence.

- [x] T013 Run schema mirror diff.
- [x] T014 Run focused CLI schema/result/live boundary tests if feasible.
- [x] T015 Run text sweeps for rejected public command/report vocabulary.
- [x] T016 Run spec-kit coded point extraction for 190.
- [x] T017 Run changed-file `git diff --check` for task-owned files.
- [x] T018 Perform prompt-to-artifact completion audit.

## Dependencies & Execution Order

- Phase 1 blocks all later phases.
- Phase 2 and Phase 3 can proceed after Phase 1.
- Phase 4 depends on stable docs and skill writeback.

## Notes

- Do not edit archive docs.
- Do not add public CLI commands.
- Do not modify runtime source.
- Do not use old command names except as rejected, negative-only or historical vocabulary.
