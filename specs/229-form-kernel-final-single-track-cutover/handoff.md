# Local Agent Handoff — specs/229 Final Form/Kernel Single-Track Cutover

## Objective

Execute the final Form/kernel single-track cutover. Remove stale narratives and compatibility-shaped code paths, enforce the accepted Form owner lanes, close owner-collision witnesses, and produce performance/evidence reports. Do not preserve backward compatibility.

## Delivery Mode

mixed: requirements/spec, implementation plan, patch, source skeleton, docs-only, performance/hot path, smoke/command.

## Goal Contract

```text
Goal:
- make current repo single-track for Form/kernel/host/verification/performance docs and implementation;
- remove or tombstone every old narrative that could be read as current authority;
- delete compatibility-shaped public code, exports, examples, and helpers;
- add owner-collision tests and required witness scenarios;
- gate final claims on real validation evidence.

Required invariants:
- Form.make is the only Form declaration route.
- field.source is remote fact ingress; Query/resource owns remote behavior.
- field.companion is sync local soft fact only.
- rule/root/list/submit/reason own final truth.
- useModule + useSelector is the host read route.
- dirtyPlan and fallback reason protocol own kernel execution explanation.
- verification reports do not become Form authoring API.
- no compatibility shims, dual paths, deprecation shells, or old docs as active narrative.

Stop conditions:
- local repo authority conflicts with this spec;
- implementing a task requires re-opening public API;
- a required test can pass only by weakening a guard;
- perf evidence is incomparable but a success claim is requested;
- broad unrelated rewrite is needed;
- unrelated local worktree changes would be overwritten.
```

## Validation

Run `node scripts/final-cutover/scan-single-track-residue.mjs --profile all --format table` first after applying patches. It may fail before implementation; treat failures as the work queue. Final acceptance requires it to pass, plus focused package tests and performance gates described in `VERIFY.md` / `EVIDENCE_PROTOCOL.md` from the delivery bundle.

## Report

Use the report template in the bundle-level `LOCAL_AGENT_HANDOFF.md`.
