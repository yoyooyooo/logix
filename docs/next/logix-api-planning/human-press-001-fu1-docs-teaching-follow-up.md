---
title: HUMAN-PRESS-001-FU1 Docs Teaching Follow-up
status: closed-docs-example-task
version: 2
---

# HUMAN-PRESS-001-FU1 Docs Teaching Follow-up

## Goal

Consume the `docs-or-example-task` output from [HUMAN-PRESS-001](./human-press-001-first-read-acceptance-taste-pressure-packet.md) into user-facing documentation.

This follow-up does not change public API, does not admit a new surface candidate, does not write authority pages, does not create an implementation gap row, and does not start `TASK-003`.

## Slice Manifest

| field | value |
| --- | --- |
| target_scenarios | `SC-C`, `SC-E`, `SC-F`; `SC-D` as final-truth teaching pressure |
| target_caps | `CAP-10..13`, `CAP-19..26`; overlay `CAP-14`, `CAP-17`, `CAP-18` |
| related_pressure | `HUMAN-PRESS-001` |
| output_kind | `docs-or-example-task` |
| public_surface_delta | `none` |
| surface_candidate_delta | `none` |
| implementation_gap_delta | `none` |
| authority_writeback | `not-required` |

## Teaching Deltas

| target | delta |
| --- | --- |
| `apps/docs/content/docs/form/selectors.md` | added the canonical Form selector route, companion soft-fact boundary, returned-carrier exact typing, `void` callback honest-unknown route, row `byRowId` read/write split, `Form.Error.field` explain selector, and verification boundary |
| `apps/docs/content/docs/form/selectors.cn.md` | Chinese mirror of the same route |
| `apps/docs/content/docs/form/index.mdx` | added the new page and summary of the selector support route |
| `apps/docs/content/docs/form/index.cn.mdx` | Chinese mirror of the index update |
| `apps/docs/content/docs/form/meta.json` | registered `selectors` |
| `apps/docs/content/docs/form/meta.cn.json` | registered `selectors` |
| `apps/docs/content/docs/form/quick-start.md` | linked support reads to the selector page from the read/write boundary |
| `apps/docs/content/docs/form/quick-start.cn.md` | Chinese mirror of the quick-start link |
| `apps/docs/content/docs/api/react/use-selector.md` | documented Form selector descriptors and the no-second-host-route boundary |
| `apps/docs/content/docs/api/react/use-selector.cn.md` | Chinese mirror of the React API update |
| `apps/docs/content/docs/api/core/runtime.md` | documented `runtime.check / runtime.trial / runtime.compare` as verification control plane |
| `apps/docs/content/docs/api/core/runtime.cn.md` | Chinese mirror of the runtime control-plane update |

## Review Finding

| finding | decision |
| --- | --- |
| A review lane proposed embedding the FU1 teaching material into existing `introduction / derived / validation / field-arrays / advanced testing` pages and avoiding a new `selectors` page. | Rejected for this wave. A single selectors landing page keeps the route table, negative space, returned-carrier typing, row read/write symmetry, and verification boundary in one first-read path. The existing pages link into that path without adding public API or a second route. |

## Required Negative Constraints

The user-facing docs now carry these constraints:

- `Form.Companion.*` is consumed only through `useSelector`.
- No `useCompanion`, Form-owned hook family, carrier-bound selector route, or second host read route is introduced.
- Returned carriers only carry type-only metadata; imperative `void` callback authoring remains runtime-valid and honest-unknown for exact companion selector results.
- Companion carries field-local `availability / candidates` soft facts, not final truth, canonical error truth, rule / submit truth, remote IO, or async search.
- `Form.Error.field(path)` is a field explanation selector; it may explain `error / pending / stale / cleanup / undefined` and is not just `FormErrorLeaf`.
- `fieldArray(path).byRowId(rowId).*` and `Form.Companion.byRowId(...)` share the same row owner law, while the read side still goes through `useSelector`.
- `runtime.check`, `runtime.trial`, and `runtime.compare` belong to runtime control plane and do not enter Form authoring surface.

## Non-claims

- no public `Form.Path`
- no schema path builder
- no Form-owned React hooks
- no public row owner token
- no `Fact / SoftFact` namespace
- no public `FormProgram.metadata`
- no returned carrier as selector
- no `runtime.compare` productization
- no authority writeback
- no implementation proof

## Validation

| check | status | note |
| --- | --- | --- |
| forbidden wording scan | `passed` | no banned Chinese contrast wording or dash punctuation hits in this follow-up's touched docs |
| misleading-entry scan | `passed` | `useCompanion`, `Form.Path`, row owner token, `Fact / SoftFact`, and related old routes appear only as negative constraints or control-plane notes |
| whitespace check | `passed` | `git diff --check` passed for this follow-up's touched files |
| docs typecheck | `passed` | `pnpm -C apps/docs types:check` passed |
| docs build | `passed` | `pnpm -C apps/docs build` passed; remaining output was non-blocking existing docgen and Next metadata warnings |

## Decision

`HUMAN-PRESS-001-FU1` closes as `closed-docs-example-task`.

The frozen API shape remains unchanged. Human-facing friction from `HUMAN-PRESS-001` is now carried by external docs instead of internal-only notes.
