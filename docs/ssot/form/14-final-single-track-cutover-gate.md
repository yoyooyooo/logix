---
title: Form Final Single-Track Cutover Gate
status: accepted
version: 1
last-updated: 2026-05-11
---

# Form Final Single-Track Cutover Gate

## Role

This page is the release-facing gate for the final Form/kernel cleanup. It does not re-open API shape. It makes the accepted exact surface operational and defines what must be absent before the repository can claim the Form chain is stable.

Current exact surface authority remains [13-exact-surface-contract.md](./13-exact-surface-contract.md). This page owns implementation closure, residue cleanup, and release-evidence interpretation for the final cutover.

## Single-Track Rule

The cutover is single-track only.

Forbidden in live source, current docs, examples, package exports, and canonical tests:

```text
compatibility shim
deprecation shell
dual-write path
shadow path
watch-only residue
legacy public alias
old narrative that reads as current
```

Historical trace may survive only when the file is archived or begins with a trace-only tombstone that points to current authority.

## Authority Map

| Surface | Current authority | Trace-only / not authority |
| --- | --- | --- |
| Form exact API | `docs/ssot/form/13-exact-surface-contract.md` | old proposals, candidate specs, old demos |
| Scenario coverage | `docs/ssot/form/06-capability-scenario-api-support-map.md` | `specs/155/**` candidate/challenge files except consumed spec summary |
| Source/companion boundary | `docs/ssot/runtime/06-form-field-kernel-boundary.md` + `specs/199/**` as witness | source/options candidates, direct fetch examples |
| React host read | `docs/ssot/runtime/10-react-host-projection-boundary.md` | `@logixjs/form/react`, Form-owned hooks |
| Verification | `docs/ssot/runtime/09-verification-control-plane.md` | Form scenario authoring API, second report shell, raw evidence default compare |
| Performance | `docs/standards/final-cutover-performance-evidence.md` | quick-only success claims |
| Docs governance | `docs/standards/docs-governance.md` + `docs/standards/final-single-track-cutover.md` | unmarked consumed/proposal body |

## Required Absence Matrix

| Category | Must be absent from live route |
| --- | --- |
| Form public nouns | `Form.Source`, `Form.Path`, `Form.SchemaPathMapping`, `Form.SchemaErrorMapping`, `Form.Row`, `Form.Fact`, `Form.SoftFact`, `Form.from` |
| Form host read | `@logixjs/form/react`, `useForm`, `useField`, `useFieldArray`, `useCompanion`, `useFieldSource`, `useFormSelector` |
| Source convenience | `field.options`, `source.refresh`, direct rule fetch, React useEffect remote sync |
| Companion overreach | async lower, Promise/Effect return, remote IO, final-truth writes, list/root baseline |
| Row overreach | public row token, index truth, React key truth |
| Verification overreach | Form scenario authoring API, second report object, raw evidence default compare |
| Toolkit overreach | hidden host route, hidden state owner, source scheduling bypass, compatibility shim |

## Final Pass Conditions

A final pass requires all of the following:

1. authority docs route through this page and `13`;
2. residue scanner passes;
3. root/public export allowlists pass;
4. source/companion/final-truth owner-collision tests pass;
5. row/list/host selector witnesses pass;
6. verification/report shell guards pass;
7. dirtyPlan/fallback reason tests pass;
8. focused performance gates pass or final status is blocked with exact blockers;
9. final report limits claims to collected evidence.

## Evidence Classification

| Evidence | Claim level |
| --- | --- |
| focused unit/contract tests | local correctness for covered invariant |
| typecheck | surface/type compatibility only |
| quick perf | diagnostic clue only |
| default/soak comparable perf | release-facing performance evidence |
| broad perf with budgetExceeded | blocker unless explained and accepted |
| stale docs scanner pass | narrative safety for scanned scope |

## Stop Rule

If a required change can only be achieved by keeping old and new paths alive together, stop and rewrite the plan. Dual-track implementation is not allowed.
