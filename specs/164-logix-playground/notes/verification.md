# Verification Notes: Logix Playground

**Date**: 2026-04-28

## Result Summary

The implemented scope proves the reusable `@logixjs/playground` package, one curated `examples/logix-react` route, shared `ProjectSnapshot` propagation, shell-first public exports, docs-style consumption, and sandbox public-surface isolation.

The browser Playground contract uses an internal stable preview witness for automated assertions. Sandpack remains the runtime preview adapter and is covered by package-level snapshot-to-Sandpack projection tests. A direct attempt to load `logixSandboxKernelPlugin()` in the default `examples/logix-react` Vite config caused the browser test process to hang before assertions, so real sandbox-backed UI Run is not enabled by default in the example route. The real browser worker Program Run path remains proven by `packages/logix-sandbox/test/browser/sandbox-program-runner.browser.test.ts`.

The browser witness should be run serially. Running it in parallel with other browser/package commands can leave the Vitest browser process waiting on Playwright resources even though the same witness passes when run alone.

## Commands Run

```bash
rtk pnpm install
rtk pnpm -C packages/logix-playground typecheck
rtk pnpm -C packages/logix-playground test
rtk pnpm -C examples/logix-react typecheck
rtk pnpm -C examples/logix-react exec vitest run test/playground-registry.contract.test.ts
rtk pnpm -C examples/logix-react exec vitest run test/browser/playground-preview.contract.test.tsx --project browser
rtk pnpm -C packages/logix-sandbox exec vitest run test/SandboxPublicSurface.contract.test.ts
rtk pnpm -C packages/logix-sandbox exec vitest run test/browser/sandbox-program-runner.browser.test.ts --project browser
rtk rg -n "PlaygroundRunResult|RUN_EXAMPLE|RUNTIME_CHECK|RUNTIME_TRIAL|programExport|mainExport" packages/logix-sandbox/src packages/logix-sandbox/package.json specs/164-logix-playground
rtk pnpm typecheck
rtk pnpm lint
rtk pnpm test:turbo
```

## AM Witnesses

| Witness | Status | Evidence |
| --- | --- | --- |
| AM-01 public surface | Pass | `packages/logix-playground/test/public-surface.contract.test.ts` |
| AM-02 project declaration | Pass | `packages/logix-playground/test/project.contract.test.ts` |
| AM-03 snapshot law | Pass | `packages/logix-playground/test/project-snapshot.contract.test.ts` |
| AM-04 React preview | Pass | `examples/logix-react/test/browser/playground-preview.contract.test.tsx`; automated path uses stable preview witness, Sandpack projection covered in package tests |
| AM-05 Program Run | Pass | `packages/logix-playground/test/program-runner.contract.test.ts`; real browser worker Run separately covered by sandbox browser witness |
| AM-06 startup Trial | Pass | `packages/logix-playground/test/trial-startup.boundary.test.ts` |
| AM-07 shape separation | Pass | `packages/logix-playground/test/shape-separation.contract.test.ts` |
| AM-08 edit propagation | Pass | `examples/logix-react/test/browser/playground-preview.contract.test.tsx`; shared source edit changes preview witness and Run output from one snapshot |
| AM-09 derived summary/failures | Pass | `packages/logix-playground/test/derived-summary.contract.test.ts` |
| AM-10 docs consumer | Pass | `packages/logix-playground/test/docs-consumer.contract.test.tsx` |
| AM-11 single project authority | Pass | `examples/logix-react/test/playground-registry.contract.test.ts` |
| AM-12 sandbox boundary | Pass | `packages/logix-sandbox/test/SandboxPublicSurface.contract.test.ts` |
| AM-13 UI hierarchy | Pass | `packages/logix-playground/test/default-ui-hierarchy.contract.test.tsx` |
| AM-14 text sweep | Pass with classified spec-only hits | No hits in `packages/logix-sandbox/src` or `packages/logix-sandbox/package.json`; remaining hits are 164 spec/plan/contract/task negative rules or the sweep command itself |

## AM-14 Classification

Remaining matches are intentional:

- `spec.md`, `plan.md`, `data-model.md`, `contracts/README.md`: forbidden-shape rules for custom export names and sandbox product vocabulary.
- `research.md`: rejected alternative for public sandbox action families.
- `quickstart.md`, `tasks.md`, `implementation-plan.md`: verification command text and implementation guard examples.

No live sandbox public source or package export uses `PlaygroundRunResult`, `RUN_EXAMPLE`, `RUNTIME_CHECK`, `RUNTIME_TRIAL`, `programExport`, or `mainExport`.

## Open Follow-Up

The next hardening item is a dedicated example-level worker E2E witness that mounts `logixSandboxKernelPlugin()` without stalling the browser test host and wires the Playground Run button to the sandbox-backed runner. That follow-up should stay internal to `@logixjs/playground` and must not add `runnerMode` or transport props to the public `PlaygroundPage` contract.
