---
title: IMP-001 Companion Host Implementation Packet
status: draft
version: 2
---

# IMP-001 Companion Host Implementation Packet

## 目标

把 `PROP-001` 中已经闭合的 field-local soft fact lane 转成实施包，覆盖 companion authoring、sanctioned selector route 与 host read gate。

本页只承接实施切片，不冻结 exact surface。exact surface 继续由 `13` 与 `runtime/10` 持有。

## Source

- [implementation-ready-conversion.md](./implementation-ready-conversion.md)
- [proposal-portfolio.md](./proposal-portfolio.md)
- [../../proposals/logix-api/PROP-001-field-local-soft-fact-minimal-generator.md](../../proposals/logix-api/PROP-001-field-local-soft-fact-minimal-generator.md)
- [../../ssot/form/08-capability-decomposition-api-planning-harness.md](../../ssot/form/08-capability-decomposition-api-planning-harness.md)
- [../../ssot/form/13-exact-surface-contract.md](../../ssot/form/13-exact-surface-contract.md)
- [../../ssot/runtime/10-react-host-projection-boundary.md](../../ssot/runtime/10-react-host-projection-boundary.md)

## Scope

| field | value |
| --- | --- |
| packet_id | `IMP-001` |
| status | `proof-refreshed` |
| owner_lane | companion / host |
| source_caps | `CAP-10`, `CAP-11`, `CAP-12`, `CAP-13` |
| source_projection | `PROJ-03`, `PROJ-06` |
| proof_gates | `PF-03`, `PF-07` |
| public_surface_budget | no new public concept |

## Required Implementation Outcomes

| outcome | requirement |
| --- | --- |
| authoring lane | `field(path).companion({ deps, lower })` remains the Form-owned authoring act |
| soft fact bundle | implementation must preserve `availability / candidates` as a local soft fact bundle |
| IO boundary | companion lowering remains synchronous and cannot perform IO |
| final truth boundary | companion output cannot become rule / submit final truth |
| selector route | sanctioned consumption stays behind `useSelector(handle, Form.Companion.field(path))` |
| row route | row-specific consumption stays behind `Form.Companion.byRowId(listPath, rowId, fieldPath)` |
| host boundary | React host only consumes selector primitives through the canonical host gate |

## Suggested File Scope

| area | likely files | allowed edits |
| --- | --- | --- |
| Form exact export | `packages/logix-form/src/Companion.ts`, `packages/logix-form/src/index.ts` | keep exact nouns aligned with `13`; no new root family |
| React projection | `packages/logix-react/src/FormProjection.ts`, `packages/logix-react/src/internal/hooks/useSelector.ts` | ensure companion selectors consume the same host gate |
| Tests | `packages/logix-form/test/Form/Form.CompanionSelectorPrimitive.test.ts`, `packages/logix-react/test/Hooks/useSelector.formCompanionDescriptor.test.tsx` | keep `PF-03 / PF-07` executable |
| Example integration | `examples/logix-react/test/form-companion-host-gate.integration.test.tsx` | proves exact `Form.Companion.*` primitives pass through the React host gate |

Do not edit verification retained-harness or fixture internals in this packet unless a companion selector regression blocks `PF-03` or `PF-07`.

## Verification Artifact Consumption

| artifact area | decision |
| --- | --- |
| scenario carrier feed helpers | out of scope |
| expectation evaluator | out of scope |
| fixture adapter | out of scope |
| compare perf admissibility helper | out of scope |

## Verification Plan

Run the narrow gates first:

```bash
pnpm vitest run packages/logix-form/test/Form/Form.CompanionSelectorPrimitive.test.ts packages/logix-react/test/Hooks/useSelector.formCompanionDescriptor.test.tsx
```

Run the cross-package exact primitive integration proof:

```bash
pnpm vitest run examples/logix-react/test/form-companion-host-gate.integration.test.tsx
```

Then run the package checks affected by Form / React surface:

```bash
pnpm -C packages/logix-form typecheck
pnpm -C packages/logix-react typecheck
```

If the implementation touches shared package exports, also run:

```bash
pnpm typecheck
```

## Verification Result

Last refreshed in this packet:

```bash
pnpm vitest run packages/logix-form/test/Form/Form.CompanionSelectorPrimitive.test.ts packages/logix-react/test/Hooks/useSelector.formCompanionDescriptor.test.tsx examples/logix-react/test/form-companion-host-gate.integration.test.tsx
pnpm -C packages/logix-form typecheck
pnpm -C packages/logix-react typecheck
pnpm -C examples/logix-react typecheck
```

Result:

- `9` targeted tests passed
- `packages/logix-form` typecheck passed
- `packages/logix-react` typecheck passed
- `examples/logix-react` typecheck passed

## Implementation Decision

`IMP-001` does not need additional production code in this wave.

The existing implementation already provides:

- `Form.Companion.field(path)`
- `Form.Companion.byRowId(listPath, rowId, fieldPath)`
- React descriptor normalization behind `useSelector`
- example-level proof that exact Form primitives pass through the React host gate

## Reopen Bar

Reopen API planning only if implementation proves one of these:

- `availability / candidates` cannot share one companion bundle without a second public concept
- sanctioned selector route must expose raw internal landing path
- `useSelector(handle, Form.Companion.field(path))` cannot stay on the canonical host gate
- companion lowering needs IO or final truth ownership

## Non-claims

- no new public helper
- no root `Form.Companion.*` expansion beyond already linked exact authority
- no final rule or submit truth change
- no verification carrier promotion
- no root compare productization

## 当前一句话结论

`IMP-001` 当前 proof 已刷新；本轮无需新增生产代码。后续只在 companion / host regression 出现时重开。
