# Selector Route Perf Evidence

Spec: `169-kernel-selector-route`

## Environment

- OS: macOS Darwin arm64
- CPU: Apple M2 Max
- Node: v22.22.0
- pnpm: 9.15.9
- Browser, if used: Vitest browser profile, Chromium 143.0.7499.4 headless

## Commands

Before:
`rtk pnpm perf collect -- --profile default --files test/browser/perf-boundaries/runtime-store-no-tearing.test.tsx --files test/browser/perf-boundaries/diagnostics-overhead.test.tsx --out specs/169-kernel-selector-route/perf/before.<sha>.<envId>.default.json`

After:
`rtk pnpm perf collect -- --profile default --files test/browser/perf-boundaries/runtime-store-no-tearing.test.tsx --files test/browser/perf-boundaries/diagnostics-overhead.test.tsx --out specs/169-kernel-selector-route/perf/after.<sha-or-worktree>.<envId>.default.json`

Diff:
`rtk pnpm perf diff -- --before specs/169-kernel-selector-route/perf/before.<sha>.<envId>.default.json --after specs/169-kernel-selector-route/perf/after.<sha-or-worktree>.<envId>.default.json --out specs/169-kernel-selector-route/perf/diff.before.<sha>__after.<sha-or-worktree>.<envId>.default.json`

## Results

- before: deferred
- after: `after.worktree.223352e4.darwin-arm64-node22.22.0.default.json`
- diff: deferred
- comparable: false
- stabilityWarning: comparable before/after diff is intentionally deferred because the current worktree contains multiple concurrent feature changes and selector route API/internal shape is still moving. The after artifact is smoke evidence only. Do not claim performance success from this spec until a clean single-purpose baseline and diff are collected.
