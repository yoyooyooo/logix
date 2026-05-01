# Data Model: Form Companion Formalization

## CompanionLowerContext

- Represents:
  - the minimum synchronous input passed into `lower(ctx)`
- Core fields:
  - `value`
  - `deps`
  - `source?`
- Notes:
  - `source` is optional
  - context is field-owned and must not imply roster-level or host-level authority
  - type-only public contract must infer `value` from `field(path)` and `deps` from the declared deps tuple

## CompanionBundle

- Represents:
  - one owner-local companion derivation result
- Allowed states:
  - `clear`
  - `bundle`
- Bundle payload:
  - `availability?`
  - `candidates?`
- Notes:
  - commit semantics are atomic per field
  - bundle must not imply partial merge sub-lanes
  - type-only public contract keeps `availability / candidates` as the only day-one slots

## AvailabilityFact

- Represents:
  - field-local availability or interactivity soft fact
- Typical meaning:
  - whether the field is interactive, blocked, stale, or otherwise locally constrained
- Boundary:
  - not a final verdict
  - not a replacement for submit truth

## CandidateSet

- Represents:
  - field-local candidate collection projected from deps and optional source receipt
- Typical meaning:
  - option items
  - projection hints
  - keep-current semantics
- Boundary:
  - not a render policy
  - not a second remote truth

## Selector Recipe Projection

- Represents:
  - selector-visible view of companion facts under `useSelector(handle, selectorFn)`
- Source:
  - sanctioned selector route only
- Boundary:
  - must not require raw internal landing path knowledge in user code
  - must not become a second canonical read family
  - does not imply a day-one public helper noun or selector primitive

## CompanionEvidenceRef

- Represents:
  - causal references that tie `source -> companion -> rule / submit`
- Typical fields:
  - field path
  - reason slot
  - source reference
  - row identity when applicable
- Boundary:
  - remains slim and serializable
  - must align with existing diagnostics / evidence truth
