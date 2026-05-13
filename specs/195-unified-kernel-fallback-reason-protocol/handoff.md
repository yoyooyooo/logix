# Handoff: 195 Unified Kernel Fallback Reason Protocol

## Status

Implemented on 2026-05-11. No commit was created by the agent.

## Result

Source, validate, selector, and converge fallback classifications now map to the internal `KernelFallbackReason` vocabulary. The protocol remains internal and does not add application authoring API.

## Key Files

- `packages/logix-core/src/internal/runtime/core/kernelFallbackReason.ts`
- `packages/logix-core/src/internal/field-kernel/source.impl.ts`
- `packages/logix-core/src/internal/field-kernel/validate.impl.ts`
- `packages/logix-core/src/internal/runtime/core/selectorRoute.dirty.ts`
- `packages/logix-core/src/internal/field-kernel/converge-planner.ts`
- `packages/logix-core/test/Contracts/KernelFallbackReason.contract.test.ts`

## Verification

Focused commands:

```bash
pnpm -C packages/logix-core test test/Contracts/KernelFallbackReason.contract.test.ts test/internal/FieldKernel/FieldKernel.Source.SyncIdle.DirtyGate.test.ts test/internal/FieldKernel/FieldKernel.Validate.StaticIr.test.ts test/Runtime/Runtime.selectorDirtyFallback.contract.test.ts test/Runtime/Runtime.selectorDirtyOverlap.contract.test.ts
```

Fresh 190-201 verification on 2026-05-11 passed this group.

## Public Surface Delta

None. The fallback vocabulary is internal-only.

## Diagnostics And Perf

Diagnostics-enabled branches may attach normalized reason fields. Diagnostics-off does not add debug event families.

## Follow-Up

None.
