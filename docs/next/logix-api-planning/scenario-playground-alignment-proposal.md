---
title: Scenario Playground Alignment Proposal
status: reviewed-adopted
version: 3
---

# Scenario Playground Alignment Proposal

## Goal

Align Playground scenario metadata with future scenario trial without making Playground a verification authority.

The real target is:

- keep `fixtures/env + steps + expect` as the only scenario input authority
- keep runtime control plane as the only report/verdict authority
- let Playground provide scenario mappability, provenance and demo playback only

## Review Result

This proposal was reviewed through `$plan-optimality-loop` and adopted as a planning decision.

- review ledger: [2026-05-07-scenario-playground-alignment-optimality-loop.md](../../review-plan/runs/2026-05-07-scenario-playground-alignment-optimality-loop.md)
- implementation plan: [2026-05-07-scenario-playground-alignment-implementation.md](../../superpowers/plans/2026-05-07-scenario-playground-alignment-implementation.md)
- adopted candidate: verification-owned scenario fixture corpus first, Playground mappability and provenance only
- rejected direction: product-to-control-plane projection from Playground scenarios
- implementation status: corpus and mappability slice landed
- authority status: this file is a planning proposal; scenario authority still belongs to `docs/ssot/runtime/09-verification-control-plane.md`

## Target Claim

Verification fixture authority comes first. Playground scenarios are then checked for mappability and provenance against that authority.

```text
verification scenario corpus
  -> mappability / provenance mapping
    -> Playground scenario metadata
```

This is the opposite of a product-to-control-plane truth flow. It keeps the verification grammar stable and lets Playground stay a consumer of it.

## Why This Direction

The current facts already point this way:

- `docs/ssot/runtime/09-verification-control-plane.md` fixes `fixtures/env + steps + expect` as the first scenario input protocol.
- `docs/ssot/runtime/15-cli-agent-first-control-plane.md` keeps `trial --mode scenario` reserved until a core-owned executor lands.
- `docs/ssot/runtime/07-standardized-scenario-patterns.md` says Playground scenarios are product playback metadata, not runtime source or control-plane authority.
- `packages/logix-playground/src/Project.ts` already separates `drivers` and `scenarios` from runtime source.

So the plan should not invent a new scenario grammar. It should answer one narrower question:

Can Playground scenarios be traced back to the verification corpus without losing intent?

## Non Goals

- Do not create a second scenario grammar.
- Do not make Playground scenarios a verification input source of truth.
- Do not add a public scenario authoring API.
- Do not productize `trial --mode scenario`.
- Do not make Playground playback own verdict, summary or compare truth.
- Do not add a second report object or evidence envelope.

## Proposed Shape

### 1. Verification-Owned Corpus First

Start from the verification side:

- freeze a small corpus of `fixtures/env + steps + expect` examples in `examples/logix/src/verification/**`
- keep those examples executable by future core-owned scenario execution
- use them as the stable source for scenario semantics

### 2. Playground Mappability Inventory

Build a repo-internal inventory that maps Playground metadata to the verification corpus:

- project id
- program entry
- driver action tag
- driver payload example
- read anchor
- scenario label
- scenario step intent

The inventory should answer:

- which Playground step intent is directly representable
- which intent is only a provenance hint
- which intent is unsupported and must stay structured unsupported

This is a mapping record, not a new runtime contract.

### 3. Provenance Sidecar, Not Fixture Grammar

If a bridge is needed, it should be a short-lived projection snapshot or provenance sidecar, not a new fixture type.

Allowed content:

- source project id
- scenario id
- program entry
- driver id
- action tag
- read anchor ids
- supported step intents

Forbidden content:

- new exported scenario union
- new public fixture grammar
- report/verdict fields
- browser/trace/diagnostics as default truth

### 4. Owner Boundaries

| area | owner |
| --- | --- |
| verification grammar | `docs/ssot/runtime/09-verification-control-plane.md` |
| CLI scenario gate | `docs/ssot/runtime/15-cli-agent-first-control-plane.md` |
| Playground product metadata | `packages/logix-playground/src/Project.ts` |
| Playground demo registry | `examples/logix-react/src/playground/**` |
| verification corpus examples | `examples/logix/src/verification/**` |
| core scenario carrier / executor | `packages/logix-core/src/internal/verification/**` |

This keeps import direction one-way:

```text
Playground/examples -> mapping or provenance sidecar
verification corpus -> runtime control plane
core -> scenario carrier/executor
```

## Work Waves

### Wave 1: Corpus Freeze

Add or refine the smallest verification-owned scenario corpus in `examples/logix/src/verification/**`.

Proof:

- corpus uses `fixtures/env + steps + expect`
- corpus stays under verification authority
- no Playground type is required to compile it

### Wave 2: Mappability Matrix

Write a matrix that classifies Playground scenario intents against the verification corpus:

- directly representable
- provenance-only
- unsupported

Proof:

- local-counter scenario can be classified without invention
- unsupported intents are reported structurally
- no new scenario union is introduced
- the matrix is non-executable and cannot be consumed by `Runtime.trial`, CLI schemas or core scenario executor

Current implementation target:

- verification corpus: `examples/logix/src/verification/scenario-corpus.ts`
- mappability matrix: `examples/logix-react/src/playground/scenarioMappability.ts`
- guard tests: `examples/logix-react/test/playground-scenario-mappability.guard.test.ts`

### Wave 3: Provenance Snapshot

If needed, add a short-lived projection snapshot for docs/tests.

Proof:

- snapshot is not imported by core src
- snapshot is not exported as public API
- snapshot expires with a cleanup trigger
- snapshot path is limited to docs, tests or examples support assets
- snapshot is not consumed by `Runtime.trial`, CLI command schema or any control-plane report builder
- snapshot must name its cleanup trigger at creation time, such as corpus-only coverage, core-owned executor landing, or bridge rejection

### Wave 4: Core Bridge Later

Only after the corpus and matrix settle, decide whether a core-owned projection bridge is worth adding.

Proof:

- if a bridge is added, it consumes only verification-owned corpus or core-neutral snapshot
- `trial --mode scenario` still remains structured failure until executor authority exists

## Kill Gate

Stop the plan if the corpus alone already covers Agent self-verification needs and Playground only remains demo UI.

In that case, keep only:

- no-second-truth guard
- mappability inventory
- provenance references

and do not add a projection bridge.

## Reopen Bar

Reopen only if one of these becomes true:

- verification-owned corpus cannot express a critical scenario intent
- Playground metadata needs to become runtime truth to preserve useful evidence
- core-owned scenario executor requires a proven bridge from product metadata

## Acceptance Criteria

This proposal is ready when reviewers agree that it:

- keeps one verification authority
- avoids a second scenario grammar
- treats Playground as product metadata, not control-plane input
- keeps the path open for later bridge promotion
- gives Agent a clear inventory of what is representable vs unsupported

Implementation planning must additionally prove:

- `packages/logix-core/src/**` has no Playground type import
- CLI `trial --mode scenario` stays structured failure until a core-owned scenario executor exists
- no public scenario API, public scenario union, second report object or local proof envelope is introduced
- any mappability or provenance asset is classified as repo-internal, short-lived or non-executable

## Current Sentence

Treat Playground scenarios as a mappability and provenance problem, not as a source of verification truth. The verification corpus stays the semantic source; Playground stays a product-facing projection and demo layer.
