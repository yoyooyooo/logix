# 199 Form Source/Companion Boundary Second Wave Specification

**Status:** Implemented  
**Priority:** P1  
**Created:** 2026-05-11  
**Depends On:** 190, 195, 197

## Purpose

继续收紧 Form 的 source、companion、rule/list/root/submit owner law，防止 Form 领域包长出第二 runtime 或第二 host read law。

## Scope

Form remains a program-first domain package. Remote fact goes through source, local soft fact goes through synchronous companion, final truth goes through rule/list/root/submit, and React reads continue through core `useModule + useSelector`. This requirement strengthens guard tests and fixes any implementation drift; it does not expand Form public API. 

## Global Guardrails

- Do not add public root exports, public submodules, or public authoring nouns.
- Do not add benchmark/perf collection scripts in this wave. Existing focused contract/perf-off tests may be run only as correctness guards.
- Do not claim performance improvement. The goal is architecture stabilization and regression-proofing.
- Do not use destructive git operations (`git reset`, `git clean`, `git checkout -- <path>`, `git restore`, `git stash`).
- Keep every PR small and reviewable. Commit after each passing task group.
- Diagnostics-level `off` must not allocate trace payloads or emit debug events.
- Runtime owns truth. React, Playground, Devtools, CLI, and domain packages may only consume/project existing truth.

## Functional Requirements
- **FR-001:** Companion lowering must reject async/Promise/Effectful forms where the current contract expects synchronous local soft fact derivation.
- **FR-002:** Companion must not write canonical errors or submit-final truth.
- **FR-003:** Source must not become an options/candidates API and must not own final settlement truth.
- **FR-004:** Form read route must remain core selector-only; no `useFormField`, `useCompanion`, `useFormSelector` canonical host family may be introduced.
- **FR-005:** Row identity remains kernel/internal evidence, not a public row token authoring surface.
## Non-Goals
- **NG-001:** Do not add Form public API.
- **NG-002:** Do not rewrite Form DSL.
- **NG-003:** Do not migrate examples except small residue fixes needed by tests.
## Acceptance Criteria
- **AC-001:** Async companion guard fails on Promise/Effect return and includes owner-law diagnostic wording.
- **AC-002:** Source guard proves no options/candidates public namespace is exported or documented as canonical.
- **AC-003:** React host gate test proves Form companion/error selectors are consumed via `useSelector`.
## Target Files

### Create
- `packages/logix-form/test/Form/Form.Companion.NoAsyncGuard.test.ts`
- `packages/logix-form/test/Form/Form.Source.NotOptionsApi.guard.test.ts`
- `packages/logix-form/test/Form/Form.ReadRoute.CoreSelectorOnly.guard.test.ts`
### Modify
- `packages/logix-form/src/internal/form/impl.ts`
- `packages/logix-form/src/internal/form/install.ts`
- `packages/logix-form/src/internal/form/rules.ts`
- `packages/logix-form/src/internal/form/fields.ts`
- `packages/logix-form/src/Companion.ts`
- `packages/logix-form/src/Form.ts`
- `packages/logix-form/test/Form/Form.Companion.Authoring.test.ts`
- `packages/logix-form/test/Form/Form.Source.Authoring.test.ts`
- `packages/logix-form/test/Form/Form.DomainBoundary.test.ts`
- `packages/logix-react/test/form-companion-host-gate.integration.test.tsx`
### Focused Tests
- `packages/logix-form/test/Form/Form.Companion.Authoring.test.ts`
- `packages/logix-form/test/Form/Form.Companion.NoAsyncGuard.test.ts`
- `packages/logix-form/test/Form/Form.Source.Authoring.test.ts`
- `packages/logix-form/test/Form/Form.Source.NotOptionsApi.guard.test.ts`
- `packages/logix-form/test/Form/Form.DomainBoundary.test.ts`
- `packages/logix-react/test/form-companion-host-gate.integration.test.tsx`
## Dependency and Sequencing Notes

- Complete all dependency specs first.
- Treat this spec as independent once dependencies pass their focused tests.
- If an upstream dependency is partially complete, do not compensate here by widening public API or adding temporary shims.
