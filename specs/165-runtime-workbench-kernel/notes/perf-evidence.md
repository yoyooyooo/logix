# Perf Evidence

Date: 2026-04-28

## Decision

Focused runtime hot-path perf collection was not required for this implementation.

## Reason

- No runtime scheduler, transaction, reducer, subscription, `Runtime.make`, `Runtime.run`, `Runtime.check`, `Runtime.trial`, `ProgramRunner` or proof kernel code path was changed.
- The new kernel is a pure projection function called only by host adapters.
- DVTools, CLI and Playground call projection from consumer-side adapter code after evidence/report/run outputs already exist.
- No default runtime debug subscription path was expanded.

## Lightweight Evidence

- Core projection tests operate on plain data.
- Package typechecks passed for core, DVTools, CLI and Playground.
- Public surface sweep found no public workbench facade.
- Gap code set is fixed in `packages/logix-core/src/internal/workbench/gaps.ts` and delegated by DVTools.
