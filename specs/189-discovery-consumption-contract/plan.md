# Implementation Plan: Discovery And Consumption Contract

**Branch**: `189-discovery-consumption-contract` | **Date**: 2026-05-07 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/189-discovery-consumption-contract/spec.md`

## Summary

Close Agent discovery and consumption drift for the Logix CLI/control-plane contract.

Implementation must keep package schema, skill-local schema mirror, docs SSoT command contract, guard tests and Agent consumption recipes synchronized. Agents should discover only final public roots, parse stdout result envelopes correctly, recover file-backed artifacts, schedule from top-level report fields, consume structured repair intent, and treat live output as evidence/gap rather than verification report.

This plan explicitly excludes `logix describe`, `--describe-json`, new discovery commands, owning runtime report schemas, owning live artifact truth, automatic patching and `trial --mode scenario`.

## Stage Role

- This file records execution constraints only.
- [spec.md](./spec.md) owns the 189 feature law.
- [CLI Agent First Control Plane](../../docs/ssot/runtime/15-cli-agent-first-control-plane.md) owns public command grammar, discovery boundary, schema mirror role and command result consumption.
- [Verification Control Plane](../../docs/ssot/runtime/09-verification-control-plane.md) owns verification report truth and scheduling law.
- [Runtime Inspect Evidence Contract](../../docs/ssot/runtime/18-runtime-inspect-evidence-contract.md) owns live evidence truth.
- [Agent Self Verification Matrix](../../docs/ssot/runtime/16-agent-self-verification-scenario-matrix.md) owns terminal loop pressure refs.
- [skills/logix-cli/SKILL.md](../../skills/logix-cli/SKILL.md) owns Agent-facing local consumption recipe.
- [186](../186-verification-loop-orchestration/spec.md) and [187](../187-live-diagnosis-evidence/spec.md) own the loop and live behaviors whose recipes are mirrored here.

Implementation must update this plan only if execution discovers a changed authority, gate or writeback target.

## Planning Granularity

This plan targets a high-intelligence implementation Agent.

It freezes owner boundaries, landing zones, phase order, witness set, drift checks, proof obligations and writeback targets. It intentionally avoids line-by-line algorithms.

No `implementation-details/*contract*.md` is required in 189. The package schema, skill mirror and docs SSoT are the contract artifacts; runtime report/live artifact exact schemas remain with their owners.

## Technical Context

**Language/Version**: TypeScript 5.x, JSON schema artifact, Markdown docs/skill files.  
**Primary Dependencies**: `@logixjs/cli`, `@logixjs/core`, static `commands.v1.json`, local `skills/logix-cli` mirror.  
**Storage**: checked-in static schema JSON and docs/skill Markdown; no runtime storage.  
**Testing**: Vitest CLI schema guard tests, mirror drift tests, text sweeps, Speckit extraction scripts.  
**Target Platform**: Node.js 20+ package tests and Agent local skill consumption.  
**Project Type**: pnpm workspace with `packages/logix-cli`, `skills/logix-cli`, `docs/ssot/runtime`, `specs`.  
**Performance Goals**: schema and recipe drift checks remain cheap package-level tests suitable for release gates.  
**Constraints**: static schema is derived mirror only, no executable discovery route, no archived commands, no help-text parsing, no live result as verification report.  
**Scale/Scope**: public command roots `check`, `trial`, `compare`, `live` and their result envelope consumption recipes.

## Constitution Check

- SSoT first: 189 imports `09`, `15`, `16`, `18`, `skills/logix-cli`, package schema and specs `186/187`; any changed command/report/live law must be written back before mirror updates close.
- Runtime truth: schema mirrors command grammar only and does not own verification report or live artifact payload schemas.
- Discovery boundary: static schema/docs/skill only; no `logix describe`, `--describe-json` or executable discovery route.
- Deterministic identity: mirror comparison must detect command grammar, primary output key and forbidden field drift.
- Payload discipline: recipes point to artifact refs/file fallback and avoid duplicating runtime payload truth.
- Performance: drift checks stay cheap enough for package-level tests.
- Forward-only: archived command vocabulary remains absent from active schema/docs/skills.
- Single-track implementation: direct sync to final static discovery contract, no compatibility/deprecation route.

## Entry Gates

### Gate A: Planning Admission

Passed. [spec.md](./spec.md) answers:

- discovery and consumption owner boundary
- schema/docs/skill synchronization scope
- no-describe and no-archived-command guardrails
- closure contract, must-cut list and reopen bar

### Gate B: Implementation Admission

Implementation can start only after these planning artifacts exist:

- [research.md](./research.md)
- [data-model.md](./data-model.md)
- [quickstart.md](./quickstart.md)
- [tasks.md](./tasks.md)
- [checklists/requirements.md](./checklists/requirements.md)

Implementation must not start if `discussion.md` later appears with `Must Close Before Implementation` items.

## Perf Evidence Plan

189 is schema/docs/test synchronization work and does not touch runtime hot paths.

Required evidence:

- Drift check witness: package schema and skill mirror match on command roots, inputs, output key fields and live forbidden fields.
- Cheap gate witness: drift checks run as focused package tests without daemon/live/browser startup.
- Text sweep witness: active public surfaces contain no archived command route or describe-style discovery.

Full `pnpm perf collect` is N/A unless implementation changes runtime/CLI execution paths while adding schema guards. If that happens, reclassify the touched runtime/CLI behavior under the owning feature and update this plan before closure.

## Project Structure

### Documentation

```text
specs/189-discovery-consumption-contract/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── checklists/
│   └── requirements.md
└── tasks.md
```

### Likely Source Landing Zones

Schema and skill mirror:

- `packages/logix-cli/src/schema/commands.v1.json`
- `packages/logix-cli/src/internal/commandSchema.ts`
- `skills/logix-cli/references/commands.v1.json`
- `skills/logix-cli/SKILL.md`

Docs SSoT:

- `docs/ssot/runtime/15-cli-agent-first-control-plane.md`
- `docs/ssot/runtime/09-verification-control-plane.md`
- `docs/ssot/runtime/18-runtime-inspect-evidence-contract.md`
- `docs/ssot/runtime/16-agent-self-verification-scenario-matrix.md`

Proof:

- `packages/logix-cli/test/Integration/command-schema.guard.test.ts`
- `packages/logix-cli/test/Integration/legacy-command-rejection.guard.test.ts`
- `packages/logix-cli/test/Integration/archived-command-deletion.guard.test.ts`
- `packages/logix-cli/test/Integration/command-result-transport.contract.test.ts`
- `packages/logix-cli/test/Integration/live-command-result.contract.test.ts`
- `packages/logix-cli/test/Integration/live-evidence-handoff.e2e.test.ts`

Implementation may choose narrower files after reading current code. If a listed file is not needed, leave it untouched.

## Phase 0 - Research And Admission Confirmation

Output:

- [research.md](./research.md)

Required decisions:

- discovery remains static schema plus docs/skill, not executable command
- package schema is a derived mirror and not runtime payload truth
- skill-local mirror must match package schema for command grammar and envelope fields
- verification recipe resolves primary reports through `primaryReportOutputKey` and artifacts
- live recipe resolves primary live output through `primaryLiveOutputKey` and never reads verification fields
- archived commands and describe-style discovery stay absent

## Phase 1 - Data Model And Quickstart

Outputs:

- [data-model.md](./data-model.md)
- [quickstart.md](./quickstart.md)

The model must name only stable coordination objects:

- Command Schema Mirror
- Verification Consumption Recipe
- Live Consumption Recipe
- Archived Command Vocabulary
- Drift Check
- Derived Authority Reference

The quickstart must show schema mirror proof, result consumption proof and text sweeps.

## Phase 2 - Static Schema And Mirror Sync

Requirements:

- schema lists only `check`, `trial`, `compare` and `live`
- schema defines command inputs, forbidden inputs and primary output key field per command family
- skill-local mirror matches package schema for command grammar and result envelope fields
- schema declares itself derived and references authority pages or owner contracts

## Phase 3 - Verification Result Consumption Recipe

Requirements:

- recipe resolves primary report through `primaryReportOutputKey` and `artifacts[].outputKey`
- recipe prefers artifact file over truncated inline preview
- recipe works for non-zero exits with structured result output
- scheduling recipe uses top-level report `nextRecommendedStage`
- repair recipe consumes structured repair fields and does not require prose parsing

## Phase 4 - Live Result Consumption Recipe

Requirements:

- recipe resolves live output through `primaryLiveOutputKey`
- live output is consumed as live artifact, operation facet, evidence ref or gap
- live recipe forbids reading verification fields from live output
- repair requires feeding live-derived evidence into trial or compare first

## Phase 5 - Drift Guards And Archived Vocabulary Sweep

Requirements:

- package tests fail on schema/skill mirror command grammar drift
- guard tests reject archived commands and describe-style discovery
- active docs/skill/schema/tests contain no archived command route in public command contract
- docs avoid duplicating runtime payload truth

## Phase 6 - Proof And Writeback

Required witness set:

- package schema versus skill mirror drift proof
- public root command list proof
- archived command and describe route rejection proof
- inline/file-backed primary report consumption proof
- live result consumption forbidden-field proof
- docs/skill recipe alignment proof

Verification matrix:

- `rtk pnpm --filter @logixjs/cli test -- --run test/Integration/command-schema.guard.test.ts test/Integration/legacy-command-rejection.guard.test.ts test/Integration/archived-command-deletion.guard.test.ts`
- `rtk pnpm --filter @logixjs/cli test -- --run test/Integration/command-result-transport.contract.test.ts test/Integration/live-command-result.contract.test.ts test/Integration/live-evidence-handoff.e2e.test.ts`
- `rtk diff -u packages/logix-cli/src/schema/commands.v1.json skills/logix-cli/references/commands.v1.json`
- `rtk rg -n "logix describe|--describe-json|logix debug|contract-suite|transform\\.module|trialrun|ir\\.|logix-devserver|help-text parsing|parse help" packages/logix-cli/src packages/logix-cli/test docs/ssot skills/logix-cli specs/189-discovery-consumption-contract`

Required writebacks:

- update `packages/logix-cli/src/schema/commands.v1.json` and `skills/logix-cli/references/commands.v1.json` together when command grammar changes
- update `skills/logix-cli/SKILL.md` for final Agent consumption recipes
- update `docs/ssot/runtime/15-cli-agent-first-control-plane.md` for final command/discovery recipe deltas
- update `docs/ssot/runtime/09-verification-control-plane.md` only if verification report consumption law changed
- update `docs/ssot/runtime/18-runtime-inspect-evidence-contract.md` only if live consumption/evidence boundary changed
- update [quickstart.md](./quickstart.md), [spec.md](./spec.md), and [specs/README.md](../README.md) with final proof status after implementation

## Non-Goals

- Do not add `logix describe`, `--describe-json` or any executable discovery route.
- Do not own runtime report payload schema or live artifact truth.
- Do not add automatic patch generation.
- Do not implement `trial --mode scenario`.
- Do not rely on CLI help text parsing.
- Do not revive archived command routes or old toolbox vocabulary.
