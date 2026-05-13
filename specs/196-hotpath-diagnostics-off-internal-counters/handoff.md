# Handoff: 196 Hotpath Diagnostics-Off Internal Counters

## Status

Implemented on 2026-05-11. No commit was created by the agent.

## Result

`KernelHotPathAudit` provides an internal sink for source, validate, selector, and converge fallback counters. Recording is sink-gated and does not introduce runtime public API or persistent telemetry.

## Key Files

- `packages/logix-core/src/internal/runtime/core/KernelHotPathAudit.ts`
- `packages/logix-core/src/internal/runtime/core/kernelFallbackReason.ts`
- `packages/logix-core/src/internal/field-kernel/source.impl.ts`
- `packages/logix-core/src/internal/field-kernel/validate.impl.ts`
- `packages/logix-core/src/internal/runtime/core/SelectorGraph.ts`
- `packages/logix-core/src/internal/field-kernel/converge-planner.ts`
- `packages/logix-core/test/Contracts/KernelHotPathAudit.contract.test.ts`

## Verification

Focused commands:

```bash
pnpm -C packages/logix-core test test/Contracts/KernelHotPathAudit.contract.test.ts test/Debug/Debug.OffSemantics.NoDrift.test.ts test/Debug/Debug.DiagnosticsLevels.test.ts test/internal/FieldKernel/FieldKernel.Source.SyncIdle.DirtyGate.test.ts test/internal/FieldKernel/FieldKernel.Validate.StaticIr.test.ts
```

Fresh 190-201 verification on 2026-05-11 passed this group.

## Public Surface Delta

None. Audit counters are internal-only.

## Diagnostics And Perf

No timing, p95, browser perf, or benchmark collection. Diagnostics-off does not emit new debug events.

## Follow-Up

None.
