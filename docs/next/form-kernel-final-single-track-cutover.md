---
title: Form/Kernel Final Single-Track Cutover Cursor
status: active-next
owner: final-form-kernel-single-track-cutover
last-updated: 2026-05-12
---

# Form/Kernel Final Single-Track Cutover Cursor

## Role

This page is the implementation cursor for the final single-track cutover. Stable facts belong in SSoT/ADR/standards. This page records execution status and final report pointers.

## Current Cutover Contract

```text
No compatibility shims.
No old public aliases.
No stale current-looking docs.
No Form-owned React route.
No source/options route.
No companion final truth.
No public row token.
No default Form compare productization.
No quick-only perf success claim.
```

## 2026-05-12 Cloud Patch Status

The cloud patch makes the final gate executable without re-opening Form API shape:

- `scripts/final-cutover/scan-single-track-residue.mjs` provides the M1 residue scanner.
- `scripts/final-cutover/collect-final-cutover-report.mjs` writes the final report and blocks hard performance claims unless comparable perf artifacts are supplied.
- `packages/logix-form/src/internal/form/artifacts.ts` exports the final-truth contributor matrix through the existing Form evidence artifact, avoiding a second issue tree.
- `packages/logix-form/test/Form/Form.SourceCompanion.RequiredWitnesses.test.ts` adds source/companion/row-local witness coverage for country/province, invite/username, and sku/quote cases.
- The local agent still owns real package tests, browser/no-tearing checks, and performance collection in the real repo.

## Work Register

| Area | Status | Gate |
| --- | --- | --- |
| authority/docs | patch-gated | residue scanner pass |
| public surface | patch-gated | package/export guards |
| source/query | patch-gated | witness + negative tests |
| companion | patch-gated | sync/local/final-truth guards |
| final truth/reason | patch-gated | contributor matrix on evidence artifact |
| row/list | patch-gated + perf-pending | continuity + listScopeCheck perf |
| host selector | patch-gated + browser-pending | no Form hooks + no tearing |
| dirtyPlan/fallback | delegated-validation | shared reason protocol package tests |
| verification/compare | delegated-validation | check/trial current route + compare not default |
| toolkit/DX | delegated-validation | mechanical reduction proof |
| performance | local-required | focused/default/soak evidence |

## Final Report Placeholder

Final report path:

```text
docs/next/form-kernel-final-single-track-cutover-report.md
```

Generate it with:

```bash
node scripts/final-cutover/collect-final-cutover-report.mjs \
  --out docs/next/form-kernel-final-single-track-cutover-report.md
```

For a release-facing claim, supply comparable performance artifacts and require them:

```bash
node scripts/final-cutover/collect-final-cutover-report.mjs \
  --out docs/next/form-kernel-final-single-track-cutover-report.md \
  --perf-artifact specs/229-form-kernel-final-single-track-cutover/perf/diff.<before>__<after>.json \
  --require-perf
```
