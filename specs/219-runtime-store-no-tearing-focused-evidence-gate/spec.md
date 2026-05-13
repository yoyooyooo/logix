# Feature Specification: RuntimeStore No-Tearing Focused Evidence Gate

**Feature Branch**: `219-runtime-store-no-tearing-focused-evidence-gate`
**Created**: 2026-05-11
**Status**: Planned
**Priority**: P0
**Input**: RuntimeStore selector notify wave handoff.

## Summary

Collect comparable focused evidence for RuntimeStore no-tearing / selector notify paths and classify results without broad claims.

## Goal

Create a hard-evidence route for the RuntimeStore / selector notify wave after structural sentinels pass.

## Dependencies

- Previous member specs up to `218` completed or consciously deferred.

## Tax Points Covered

- `runtimeStore.noTearing.tickNotify`
- `selector notify fanout`
- `dirty pattern negative boundary`
- `React render fanout`
- `topic lifecycle cleanup`

## Functional Requirements

- **FR-001**: The implementation MUST target only the tax points listed for `219-runtime-store-no-tearing-focused-evidence-gate`.
- **FR-002**: The implementation MUST preserve public API shape, transaction semantics, and selector route ownership.
- **FR-003**: The implementation MUST add or update a focused guard before changing production code.
- **FR-004**: The implementation MUST record command outcomes and unresolved blockers in `handoff.md`.
- **FR-005**: The implementation MUST classify any observed cost/risk migration instead of hiding it.

## Non-Functional Requirements

- **NFR-001**: `diagnostics=off` MUST NOT allocate debug/trace payload objects on exact fast paths.
- **NFR-002**: RuntimeStore no-tearing and listener mutation isolation MUST be preserved.
- **NFR-003**: React host MUST consume core selector route and MUST NOT own a parallel selector law.
- **NFR-004**: If evidence is quick, dirty, unstable, or non-comparable, it MUST be labelled clue-only.
- **NFR-005**: The work MUST be reviewable as one spec-sized PR.

## Target Files


### Create

- `specs/219-runtime-store-no-tearing-focused-evidence-gate/perf/README.md`
- `docs/next/runtime-store-selector-notify-before-after-playbook.md`

### Modify

- `packages/logix-react/test/browser/perf-boundaries/runtime-store-no-tearing.test.tsx`
- `packages/logix-react/test/browser/perf-boundaries/negative-dirty-pattern.test.tsx`
- `packages/logix-react/test/browser/perf-boundaries/selector-render-fanout.test.tsx`

## Focused Tests / Commands

```bash
pnpm perf collect -- --profile default --files test/browser/perf-boundaries/runtime-store-no-tearing.test.tsx --out specs/219-runtime-store-no-tearing-focused-evidence-gate/perf/before.runtimeStore.<sha>.<envId>.default.json
pnpm perf diff -- --before <before> --after <after> --out specs/219-runtime-store-no-tearing-focused-evidence-gate/perf/diff.runtimeStore.before__after.<envId>.default.json
```

## Acceptance Criteria

- **AC-001**: Before/after artifacts are collected under same matrix/env/profile when a hard claim is requested.
- **AC-002**: quick artifacts are labelled clue-only.
- **AC-003**: Evidence includes notify counts, render counts, runSync fallback counts, retained topic counts, and runtimeStore.noTearing metrics where available.
- **AC-004**: If comparable evidence is missing, final classification remains inconclusive.

## Non-Goals

- Do not run broad perf as part of implementation unless requested.
- Do not claim global runtime or React performance.
- Do not compare artifacts with env/config drift unless marked clue-only.

## Handoff Requirements

The local agent must update `handoff.md` with changed files, commands, sentinel status, evidence files, classification, and next recommended spec.
