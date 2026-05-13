# Perf Evidence: Logix Playground

**Date**: 2026-04-28

## Scope

This implementation adds `packages/logix-playground`, one curated `examples/logix-react` Playground route, package tests, browser tests, and a sandbox public-surface guard.

It does not change:

- `packages/logix-core` runtime core.
- `Runtime.run`, `Runtime.check`, or `Runtime.trial` semantics.
- Sandbox protocol message shapes.
- React host lifecycle or subscription behavior.

## Required Collection

Full runtime perf collection was not required because no runtime hot path, transaction path, sandbox worker protocol, or React host lifecycle code changed.

The relevant evidence is functional and lifecycle bounded:

- `rtk pnpm -C packages/logix-playground test` proves bounded Run/log/report projection and default UI hierarchy.
- `rtk pnpm -C examples/logix-react exec vitest run test/browser/playground-preview.contract.test.tsx --project browser` proves browser-level source/preview/run propagation and reset recovery.
- `rtk pnpm -C packages/logix-sandbox exec vitest run test/browser/sandbox-program-runner.browser.test.ts --project browser` proves the existing browser worker Program Run path.

## Perf Risk Notes

While testing, a full browser contract with Sandpack iframes mounted across multiple tests stalled the Vitest browser process. The implementation now keeps Sandpack as the normal internal adapter and uses a stable internal preview witness for browser contract assertions. Package tests cover snapshot-to-Sandpack file projection.

This is a test-host lifecycle containment decision. It does not alter runtime core performance assumptions.
