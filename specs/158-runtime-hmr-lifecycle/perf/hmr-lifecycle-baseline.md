# HMR Lifecycle Baseline

## Environment

- Date: 2026-04-25
- Host: local development workspace
- Feature: `158-runtime-hmr-lifecycle`

## Before

- Current failure class is captured in `../notes/hmr-baseline.md`.
- A full browser HMR proof has not been run in this pass.

## After

- Focused core lifecycle contracts cover decision, evidence, owner handoff, resource cleanup, and no public route drift.
- Focused React contracts cover host cleanup helper and runtime replacement binding.
- Host dev lifecycle carrier evidence was recaptured through:
  - `pnpm -C examples/logix-react exec vitest run test/hmr-host-carrier.contract.test.ts test/browser/hmr-active-demo-reset.contract.test.tsx test/browser/hmr-module-invalidation-carrier.contract.test.tsx test/browser/hmr-repeated-reset.contract.test.tsx`
  - Result: PASS, 4 files, 7 tests, including Chromium browser project.
- Generated artifact: `hmr-carrier-witness.json`.
- Covered examples keep normal runtime authoring code; helper-route evidence is superseded.
- Focused bookkeeping measurement entrypoint:
  - `pnpm -C packages/logix-core exec vitest run test/Runtime/Lifecycle/hot-lifecycle-bookkeeping.perf.test.ts`
  - Result: PASS, 1 file, 2 tests.

## Comparable Status

- `comparable=false` for production steady-state performance claims in this pass.
- Functional recovery implementation may proceed, but no broad production overhead claim is made from this artifact.
- The bookkeeping perf test is a focused regression guard for lifecycle data structures. It is not a bundle-level production overhead comparison.
