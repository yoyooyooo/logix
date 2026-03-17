# StageGateRecord: G0

- gate: `G0`
- result: `NOT_PASS`
- mode: `strict_gate`
- timestamp: `2026-03-02T19:53:41+0800`

## criteria

- `gp1_passed`: `NOT_PASS`
- `api_ledger_ready`: `PASS`
- `s0_perf_before_ready`: `NOT_PASS`
- `s0_diagnostics_snapshot_ready`: `IN_PROGRESS`

## commands

```bash
pnpm perf collect -- --profile default --out specs/103-effect-v4-forward-cutover/perf/s0.before.<envId>.default.json
pnpm perf validate -- --report specs/103-effect-v4-forward-cutover/perf/s0.before.<envId>.default.json
```

## evidenceRefs

- `specs/103-effect-v4-forward-cutover/inventory/perf-prerequisite.md`
- `specs/103-effect-v4-forward-cutover/inventory/api-ledger.md`
- `specs/103-effect-v4-forward-cutover/diagnostics/s0.snapshot.md`

## notes

- 阻塞原因：GP-1 尚未通过，且 S0 performance before 报告未落盘。
- 复核说明：GP-1 已重新核验，仍为 `NOT_PASS`，因此本 gate 保持阻塞。
- 放行条件：`gp1_passed` 与 `s0_perf_before_ready` 必须变为 `PASS`。
