---
title: CAP-PRESS-001-FU2 Source Task Identity And Key Canonicalization
status: closed-implementation-proof
version: 2
---

# CAP-PRESS-001-FU2 Source Task Identity And Key Canonicalization

## 目标

收口 `field(path).source(...)` 背后的 source task identity 与 key canonicalization law。

本页只承担 pressure follow-up 结论，不冻结 exact public surface。exact Form surface 继续看 [../../ssot/form/13-exact-surface-contract.md](../../ssot/form/13-exact-surface-contract.md)。

## Slice Manifest

| field | value |
| --- | --- |
| slice_id | `CAP-PRESS-001-FU2` |
| target_scenarios | `SC-B`, `SC-C`, supporting `SC-F` |
| target_atoms | `CAP-06`, `CAP-07`, `CAP-08`, `CAP-09`, `CAP-18` |
| related_projection | `PROJ-02`, partial `PROJ-07` |
| related_enablers | `IE-02`, `IE-04` |
| required_proofs | `PF-02`, `PF-08` |
| decision_policy | keep source task identity internal unless proof shows public identity is required |
| non_claims | no `Form.Source`, no `useFieldSource`, no public source refresh helper, no public receipt identity API, no source-owned submit truth |

## Internal Law

Source identity has three layers:

| layer | owner | law |
| --- | --- | --- |
| source slot | declaration / owner resolver | field-owned source slot identified by `ownerRef + fieldPath + resourceId` |
| source key | key canonicalizer | `key(...deps)` returns `undefined` for inactive or a canonical key value that can produce stable `keyHash` |
| source task | runtime source substrate | every IO attempt gets an internal task coordinate before entering background fiber |

Internal source task coordinate:

```ts
type SourceOwnerRef =
  | { kind: "field"; fieldPath: string }
  | {
      kind: "rowField"
      patternFieldPath: string
      concreteFieldPath: string
      listPath: string
      rowId: string
      canonicalRowIdChainDigest: string
    }

type SourceTaskId = {
  tag: "source-task:v1"
  moduleId?: string
  instanceId?: string
  ownerRef: SourceOwnerRef
  fieldPath: string
  resourceId: string
  keyHash: string
  opSeq: number
}

type SourceReceiptRef = {
  tag: "source-receipt:v1"
  sourceTaskId: SourceTaskId
  phase: "idle" | "loading" | "success" | "error"
}
```

Identity exclusions:

- timestamp
- fiber id
- React key
- current row index
- raw key object identity
- rendered UI route

Row index may be used only to resolve the current concrete path for a row id.

## Key Canonicalization Law

Accepted key domain:

| key value | law |
| --- | --- |
| `null` | stable |
| `boolean` | stable |
| `string` | stable |
| finite `number` | stable; `-0` normalizes to `0` |
| array | stable by order, every element must be canonical |
| plain object | stable by sorted string keys, every value must be canonical |

Special top-level rule:

- top-level `undefined` means inactive source and must transition the source snapshot to idle.

Rejected key domain:

| key value | required behavior |
| --- | --- |
| `NaN`, `Infinity`, `-Infinity` | reject or deterministic diagnostic; no remote IO |
| nested `undefined` | reject or deterministic diagnostic; no remote IO |
| `bigint`, `symbol`, `function` | reject or deterministic diagnostic; no remote IO |
| `Date`, `Map`, `Set`, `RegExp`, Promise, typed array | reject or deterministic diagnostic unless Query owner later defines canonical encoding |
| class instance | reject or deterministic diagnostic; no remote IO |
| cyclic object or shared-reference structure | reject or deterministic diagnostic; no remote IO |
| sparse array | reject or deterministic diagnostic; no remote IO |
| object with symbol keys | reject or deterministic diagnostic; no remote IO |

Implementation note:

- `TASK-007` updates `Resource.keyHash` and source refresh to enforce this rejected-domain law for the current source substrate.

## Current Implementation Evidence

| area | observed behavior |
| --- | --- |
| key inactive | top-level `undefined` becomes idle and does not generate `keyHash` |
| current keyHash | generated through strict `Resource.keyHash` canonicalization |
| object order | plain object keys are sorted, so object order is stable |
| rejected key domain | rejected before remote IO with deterministic `field_kernel::source_key_rejected` diagnostic |
| `Date` / `Map` / `Set` / `function` / class instance / cycle / shared reference | rejected instead of weakly encoded |
| stale gate | writeback checks snapshot `keyHash` and internal generation; row-scoped source also resolves by row id before checking `keyHash + generation` |
| task metadata | EffectOp meta includes `moduleId / instanceId / fieldPath / resourceId / key / keyHash / fieldNodeId / stepId`; row source adds `rowId` |
| opSeq | available via RunSession in normal Runtime path, but semantic source task identity is not yet materialized as a first-class internal object |

## Implementation Gaps

| gap | consequence |
| --- | --- |
| ordinary field source uses EffectOp kind `field-source`, row source uses `service` | evidence / diagnostics classification can diverge |
| source task identity is implicit in metadata | report / replay / diagnostics cannot rely on one canonical internal coordinate yet |

## Decision

No public source API reopens from FU2.

Accepted:

- keep `field(path).source(...)` as the single authoring route
- keep `key(...deps) => unknown | undefined` at the public type level for now
- define canonical key law internally
- require deterministic rejection or diagnostic before remote IO for non-canonical keys
- define source task identity as internal substrate
- treat `SourceReceipt` as type-only source snapshot shape, not public identity API

Rejected:

- `Form.Source`
- `useFieldSource`
- public receipt identity API
- public source refresh helper from FU2
- source-owned final submit truth
- second evidence envelope

## Proof Obligations

| proof id | target | minimum proof |
| --- | --- | --- |
| `FU2-P1` | key canonicalization | object order stable; `undefined` top-level means idle; rejected-domain keys do not start IO |
| `FU2-P2` | key collision pressure | `Map / function / cycle / class instance` cannot silently produce usable source receipt |
| `FU2-P3` | same-key generation | forced same-key refresh cannot let older task overwrite newer task |
| `FU2-P4` | task identity metadata | source task coordinate can be joined from runtime metadata, replay event, and Form evidence artifact without public receipt identity API |
| `FU2-P5` | row source coordinate | row-scoped task identity includes row owner coordinate and does not rely on current row index as identity |

## Follow-up Routing

| follow-up | status | route |
| --- | --- | --- |
| key canonicalization implementation | `closed-implementation-proof` | `TASK-007` |
| same-key generation gate | `closed-implementation-proof` | `TASK-007` |
| `exhaust-trailing + debounce + submitImpact` | `closed-implementation-proof` | `CAP-PRESS-001-FU3` |
| receipt artifact-to-feed/report join | `closed-implementation-proof` | `CAP-PRESS-001-FU5` |

## Close Predicate

FU2 is closed at the planning law level and current implementation proof level.

`CAP-PRESS-001` can stay closed for current matrix source pressure because:

- key canonicalization implementation matches this law
- rejected-domain keys have deterministic tests
- same-key force refresh has generation-safe writeback
- FU3 / FU4 / FU5 / FU6 proof obligations are resolved or explicitly deferred with owner

Source task coordinate remains internal. Current proof does not promote a public source receipt identity API.

## 当前一句话结论

FU2 does not force a new public source API. Its internal source task identity law and stricter key canonicalization law are now backed by `TASK-007` implementation proof for rejected keys and same-key generation safety.
