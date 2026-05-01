# Requirements Checklist: Runtime Workbench Kernel

**Purpose**: Validate that planning artifacts for `165-runtime-workbench-kernel` are implementation-ready.

## Completeness

- [x] Spec defines owner and import law.
- [x] Spec defines truth inputs, context refs and selection hints.
- [x] Spec defines projection-only output boundary.
- [x] Spec defines finding authority lattice.
- [x] Spec defines coordinate ownership.
- [x] Spec defines host consumption rules.
- [x] Spec defines proof matrix and must-cut list.
- [x] Plan maps exact files to responsibilities.
- [x] Tasks name exact files and commands.
- [x] Contracts define TypeScript/internal API expectations.
- [x] Quickstart lists targeted commands and negative sweep.

## Authority

- [x] Runtime/control-plane report authority remains in `09-verification-control-plane.md`.
- [x] DVTools host role remains in `14-dvtools-internal-workbench.md`.
- [x] Playground product workbench capability and display authority remains in `docs/ssot/runtime/17-playground-product-workbench.md`; `164-logix-playground` remains implementation history and package requirement source.
- [x] CLI transport remains CLI-owned.
- [x] `@logixjs/sandbox` remains transport-only.

## Risk Checks

- [x] No public workbench facade planned.
- [x] No new report schema planned.
- [x] No new evidence envelope planned.
- [x] No trigger/scenario/source DSL planned.
- [x] No host UI state in kernel output.
- [x] No selection hint truth derivation.
- [x] Gap/degradation table risk is documented.
- [x] Repo-internal export publish blocking is required.

## Verification Readiness

- [x] PM-01 authority preservation has a command.
- [x] PM-02 shape separation has a command.
- [x] PM-03 finding lattice has a command.
- [x] PM-04 coordinate gap completeness has a command.
- [x] PM-05 DVTools parity has a command.
- [x] PM-06 CLI boundary has a command.
- [x] PM-07 Playground host-state exclusion and display fit has a command.
- [x] PM-08 public surface negative sweep has a command.

## Open Questions

- [x] No open requirement questions remain.
