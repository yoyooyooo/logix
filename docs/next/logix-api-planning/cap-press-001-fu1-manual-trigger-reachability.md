---
title: CAP-PRESS-001-FU1 Manual Trigger Reachability
status: closed-delete-defer
version: 1
---

# CAP-PRESS-001-FU1 Manual Trigger Reachability

## 目标

判断 `field(path).source({ triggers: ["manual"] })` 是否属于 day-one exact surface。

本页只记录 pressure follow-up 裁决；exact authority 仍看 [../../ssot/form/13-exact-surface-contract.md](../../ssot/form/13-exact-surface-contract.md)。

## Slice Manifest

| field | value |
| --- | --- |
| slice_id | `CAP-PRESS-001-FU1` |
| target_atoms | `CAP-06`, `CAP-07`, `CAP-08`, `CAP-09` |
| target_scenario | `SC-B` |
| pressure | exact surface accepted `manual`, but public Form runtime handle had no sanctioned source refresh route |
| decision_policy | prefer deleting unreachable spelling over adding a new public route |
| non_claims | no `Form.Source`, no `useFieldSource`, no public receipt identity API, no public manual refresh helper |

## Evidence

| check | result |
| --- | --- |
| exact/type surface | `manual` existed in Form/core source trigger unions |
| runtime wiring | source wiring consumed only `onMount` and `onKeyChange` |
| hidden internal route | internal `fields.source.refresh(...)` / `source:refresh` exists, but is not a Form handle route and does not consume `triggers: "manual"` |
| user reachability | no frozen `form.field(path).refreshSource()` or sanctioned host route exists |

## Decision

`manual` is deleted from the day-one source trigger surface.

Accepted trigger set:

```ts
triggers?: ReadonlyArray<"onMount" | "onKeyChange">
```

Controlled manual source refresh remains a deferred reopen candidate, likely shaped as `handle.field(path).refreshSource()` only if a later pressure slice proves it is required.

## Writeback

| target | result |
| --- | --- |
| `docs/ssot/form/13-exact-surface-contract.md` | exact trigger set changed to `onMount / onKeyChange`; manual refresh marked deferred |
| `docs/ssot/capability/03-frozen-api-shape.md` | global frozen summary now points exact trigger set to Form authority and rejects public manual refresh helper |
| source trigger type surface | `manual` removed from Form/core source trigger unions |
| `Form.Source.Authoring` boundary test | type-level `@ts-expect-error` added for `triggers: ["manual"]` |
| `CAP-PRESS-001` packet | FU1 closed as `closed-delete-defer` |

## Reopen Bar

Reopen only if a later proof shows at least one current matrix scenario cannot be covered by `onMount / onKeyChange`, internal scheduling, submitImpact, and selector/evidence routes.

Any reopened route must satisfy all of these:

- does not create `Form.Source`
- does not add `useFieldSource`
- does not expose public receipt identity API
- does not make source own final submit truth
- has a sanctioned Form handle route and exact proof

## Next Action

Continue with `CAP-PRESS-001-FU2`: source task identity and key canonicalization.

## 当前一句话结论

`manual` was an unreachable source trigger spelling. It has been removed from day-one source triggers and deferred as a controlled refresh candidate, without reopening public source API.
