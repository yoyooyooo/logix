# @logixjs/perf-evidence

Performance evidence tooling for Logix runtime work.

This package owns the shared perf matrix, report schemas, collection scripts, diff scripts, and CI preflight checks used by runtime performance gates.

## Main Commands

- `pnpm perf collect -- --out specs/<id>/perf/after.local.<envId>.<profile>.json`
- `pnpm perf diff -- --before <before.json> --after <after.json> --out <diff.json>`
- `pnpm perf diff:triage -- --before <before.json> --after <after.json> --out <diff.json>`
- `pnpm perf ci:interpret -- --artifact <dir> --out <summary.md>`
- `pnpm perf ci:dispatch-shell-tax-report -- --diff <diff.json> --profile default --out <report.md>`
- `pnpm perf ci:selector-notify-tax-report -- --diff <diff.json> --before <before.json> --after <after.json> --profile default --out <report.md> --json-out <report.json>`
- `pnpm perf ci:field-kernel-dirty-work-tax-report -- --diff <diff.json> --before <before.json> --after <after.json> --profile default --out <report.md> --json-out <report.json>`

## Assets

- Matrix: `packages/logix-perf-evidence/assets/matrix.json`
- Report schema: `packages/logix-perf-evidence/assets/schemas/perf-report.schema.json`
- Diff schema: `packages/logix-perf-evidence/assets/schemas/perf-diff.schema.json`
- Authoring guide: `packages/logix-perf-evidence/references/authoring.md`
- Operating guide: `packages/logix-perf-evidence/references/perf-evidence.md`

Use `quick`/`smoke` only for iteration. Hard runtime performance conclusions require comparable before and after evidence with the same profile, matrix id, matrix hash, sampling parameters, and environment scope. Dispatch-shell tax claims additionally require `profile=default` or `profile=soak`, `summary.regressions=0`, no dirty/stability drift, and available `runtime.txnPhase.*Ms` evidence. Selector-notify tax claims additionally require available notify/render/runSync/retained/listener/broadcast watched evidence and must classify cost migration instead of treating total-only improvement as success. FieldKernel dirty-work tax claims additionally require focused field-kernel suites plus available watched evidence. The preferred names are `fieldKernel.converge*`, `fieldKernel.validate*`, `fieldKernel.source*`, `fieldKernel.externalStore*`, `fieldKernel.dirtyPlan*`, `fieldKernel.fallback*`, and `fieldKernel.diagnosticsOff*`; the current browser perf aliases `converge.*`, `validate.*`, `source.*`, `externalStore.*`, `dirtyPlan.*`, cache counters, `diagnostics.level`, and workload counters are also accepted. Total improvement with watched dirty-work growth is `tax_migrated`; smoke, dirty, non-comparable, or missing watched evidence is `inconclusive`.
