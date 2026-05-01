# @logixjs/perf-evidence

Performance evidence tooling for Logix runtime work.

This package owns the shared perf matrix, report schemas, collection scripts, diff scripts, and CI preflight checks used by runtime performance gates.

## Main Commands

- `pnpm perf collect -- --out specs/<id>/perf/after.local.<envId>.<profile>.json`
- `pnpm perf diff -- --before <before.json> --after <after.json> --out <diff.json>`
- `pnpm perf diff:triage -- --before <before.json> --after <after.json> --out <diff.json>`
- `pnpm perf ci:interpret -- --artifact <dir> --out <summary.md>`

## Assets

- Matrix: `packages/logix-perf-evidence/assets/matrix.json`
- Report schema: `packages/logix-perf-evidence/assets/schemas/perf-report.schema.json`
- Diff schema: `packages/logix-perf-evidence/assets/schemas/perf-diff.schema.json`
- Authoring guide: `packages/logix-perf-evidence/references/authoring.md`
- Operating guide: `packages/logix-perf-evidence/references/perf-evidence.md`

Use `quick` only for iteration. Hard runtime performance conclusions require comparable before and after evidence with the same profile, matrix id, matrix hash, sampling parameters, and environment scope.
