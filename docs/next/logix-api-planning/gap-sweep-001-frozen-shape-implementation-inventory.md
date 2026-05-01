---
title: GAP-SWEEP-001 Frozen Shape Implementation Inventory
status: closed-consumed-by-TASK-010
version: 2
---

# GAP-SWEEP-001 Frozen Shape Implementation Inventory

## Goal

梳理当前 frozen API shape 与现有实现之间的最后缺口，并把后续工作转成 implementation plan。

本页不重开 public API，不新增 surface candidate，不启动 `TASK-003`。

## Sources

- [../../ssot/capability/03-frozen-api-shape.md](../../ssot/capability/03-frozen-api-shape.md)
- [../../ssot/form/13-exact-surface-contract.md](../../ssot/form/13-exact-surface-contract.md)
- [../../ssot/runtime/09-verification-control-plane.md](../../ssot/runtime/09-verification-control-plane.md)
- [../../ssot/runtime/10-react-host-projection-boundary.md](../../ssot/runtime/10-react-host-projection-boundary.md)
- [api-implementation-gap-ledger.md](./api-implementation-gap-ledger.md)
- [post-conv-implementation-task-queue.md](./post-conv-implementation-task-queue.md)
- [shape-snapshot.md](./shape-snapshot.md)

## Frozen Shape Digest

| lane | frozen public shape | implementation inventory |
| --- | --- | --- |
| core spine | `Module.logic`, `Program.make`, `Runtime.make`, `Runtime.check`, `Runtime.trial` | present in `packages/logix-core/src/index.ts`, `Runtime.ts`, and contract tests |
| verification static gate | `runtime.check` stage | public `Runtime.check` facade now returns `VerificationControlPlaneReport` with `stage="check"` / `mode="static"` without booting the program |
| verification trial | `runtime.trial(mode="startup")` stage | public `Runtime.trial` exists and returns `VerificationControlPlaneReport` with `stage="trial"` / `mode="startup"` |
| verification scenario | `runtime.trial(mode="scenario")` stage | internal scenario carrier and proof fixtures exist; public scenario facade remains boundary-limited and should not be generalized in this sweep |
| verification compare | `runtime.compare` stage | report vocabulary exists; root productization remains `TASK-003` deferred authority |
| Form root | `Form.make`, `Form.Rule`, `Form.Error`, `Form.Companion` | root barrel exposes the surviving namespaces |
| Form authoring | `field.rule`, `field.source`, `field.companion`, `root`, `list`, `submit` | implemented and covered by current matrix proof |
| Form handle | validate, submit, field mutation, fieldArray mutation, `byRowId` | implemented and covered by row owner retained harness |
| selector helpers | `fieldValue`, `rawFormMeta`, `Form.Error.field`, `Form.Companion.field`, `Form.Companion.byRowId` | implemented through `@logixjs/react` single `useSelector` host gate |
| companion exact typing | returned-carrier type-only metadata | implemented for returned carrier; imperative `void` callback remains runtime-valid / honest-unknown |
| docs | external selectors and API docs | `HUMAN-PRESS-001-FU1` closed and docs build passed |

## Real Gaps

| gap id | priority | item | status | implementation route |
| --- | --- | --- | --- | --- |
| `GAP-001` | `P0` | `Runtime.check` public facade | `closed-by-TASK-010` | implemented cheap static control-plane gate from existing manifest/static IR and return `VerificationControlPlaneReport` with `stage="check"` / `mode="static"` |
| `GAP-002` | `P1` | `runtime.trial(mode="scenario")` public boundary | `closed-guarded` | preserved internal carrier boundary and added public route guards that scenario vocabulary does not leak as public authoring or compare truth |
| `GAP-003` | `P1` | public root export drift guard | `closed-guarded` | added package export allowlist tests for `@logixjs/form`, `@logixjs/react`, and `@logixjs/core` frozen roots |
| `GAP-004` | `P1` | selector primitive negative-space drift | `closed-guarded` | strengthened type and runtime tests for opaque descriptors, no arbitrary object selector, no second host/read family |
| `GAP-005` | `P1` | row owner nested ambiguity guard | `closed-retained-harness` | retained row owner harness remains green through TASK-010 focused verification |
| `GAP-006` | `P2` | docs and examples frozen-shape smoke | `closed-docs-smoke` | runtime docs teach `Runtime.check`; docs smoke keeps old entry names constrained to boundary explanations |
| `GAP-007` | `deferred` | `runtime.compare` root productization | `deferred-authority` | do not implement unless explicit `TASK-003` authority intake is requested |
| `GAP-008` | `accepted-limit` | imperative `void` companion callback exact selector type | `honest-unknown` | do not implement by default; reopen only through explicit void callback exact-inference request |

## Non-gaps

- No public row owner token is required.
- No public `Form.Path` or schema path builder is required.
- No Form-owned React hook family is required.
- No list/root companion is required.
- No generic `Fact / SoftFact` namespace is required.
- No carrier-bound selector route is required.
- No second report object or raw evidence default compare surface is required.

## Plan Handoff

Implementation plan:

- [2026-04-25-frozen-api-baseline-hardening.md](../../superpowers/plans/2026-04-25-frozen-api-baseline-hardening.md)

The plan should implement `GAP-001` first, then harden drift guards. It must not productize `runtime.compare` or void callback exact inference.

## Decision

`GAP-SWEEP-001` closes as `closed-consumed-by-TASK-010`.

The frozen public API shape remains unchanged. The only P0 implementation gap found by the sweep, `Runtime.check`, has been consumed by `TASK-010`. Remaining compare productization and void callback exact inference items stay deferred by explicit request only.
