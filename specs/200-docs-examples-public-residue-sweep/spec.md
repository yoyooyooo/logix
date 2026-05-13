# 200 Docs Examples Public Residue Sweep Specification

**Status:** Implemented  
**Priority:** P2  
**Created:** 2026-05-11  
**Depends On:** 194, 195, 197, 199

## Purpose

清理 docs/examples/Agent recipe 中会把用户带回旧 public surface、旧 selector law、旧 Form read family 或旧 field-kernel noun 的 residue。

## Scope

This is a documentation/example contract sweep. It must not create new capabilities. Public docs and examples should teach exact selector input, core React host law, Form program-first boundary, internal field-kernel vocabulary exclusion, and Playground as product witness rather than kernel truth owner. Tests should use text guards and example smoke where appropriate. 

## Global Guardrails

- Do not add public root exports, public submodules, or public authoring nouns.
- Do not add benchmark/perf collection scripts in this wave. Existing focused contract/perf-off tests may be run only as correctness guards.
- Do not claim performance improvement. The goal is architecture stabilization and regression-proofing.
- Do not use destructive git operations (`git reset`, `git clean`, `git checkout -- <path>`, `git restore`, `git stash`).
- Keep every PR small and reviewable. Commit after each passing task group.
- Diagnostics-level `off` must not allocate trace payloads or emit debug events.
- Runtime owns truth. React, Playground, Devtools, CLI, and domain packages may only consume/project existing truth.

## Functional Requirements
- **FR-001:** Public docs/examples must not teach `FieldKernel`, `ReadQuery`, `selector graph`, `dirty evidence`, `runtime topic key`, `useForm*`, `useCompanion`, `useFormSelector`, or whole-state selector as canonical authoring concepts.
- **FR-002:** Examples must prefer `fieldValue(...)` / exact selector primitives and core `useSelector` route.
- **FR-003:** Playground docs must state that Playground is product witness/projection, not owner of kernel selector law or runtime truth.
- **FR-004:** Docs may mention internal terms only in internal/spec/diagnostics context with clear non-public language.
- **FR-005:** Text sweep must classify allowed internal mentions, negative examples, and violations separately.
## Non-Goals
- **NG-001:** Do not rewrite Playground UI.
- **NG-002:** Do not add toolkit wrappers.
- **NG-003:** Do not change public API.
## Acceptance Criteria
- **AC-001:** Public residue text sweep passes with allowlist for internal-only files.
- **AC-002:** React selector docs surface guard passes and examples show exact selector route.
- **AC-003:** Core/Form/React root allowlist guards continue to pass.
## Target Files

### Create
- `packages/logix-core/test/Contracts/PublicResidueTextSweep.contract.test.ts`
- `docs/next/public-residue-sweep-2026-05-11.md`
### Modify
- `docs/ssot/runtime/01-public-api-spine.md`
- `docs/ssot/runtime/02-hot-path-direction.md`
- `docs/ssot/runtime/06-form-field-kernel-boundary.md`
- `docs/ssot/runtime/10-react-host-projection-boundary.md`
- `docs/ssot/form/13-exact-surface-contract.md`
- `examples/logix-react/src/demos/DiShowcaseLayout.tsx`
- `examples/logix-react/src/demos/form/*.tsx`
- `packages/logix-react/test/Contracts/ReactSelectorDocsSurface.contract.test.ts`
- `packages/logix-core/test/Contracts/CoreRootBarrel.allowlist.test.ts`
- `packages/logix-form/test/Contracts/FormRootBarrel.allowlist.test.ts`
### Focused Tests
- `packages/logix-core/test/Contracts/PublicResidueTextSweep.contract.test.ts`
- `packages/logix-core/test/Contracts/CoreRootBarrel.allowlist.test.ts`
- `packages/logix-react/test/Contracts/ReactSelectorDocsSurface.contract.test.ts`
- `packages/logix-form/test/Contracts/FormRootBarrel.allowlist.test.ts`
- `examples/logix-react/test/frozen-api-shape.contract.test.ts`
## Dependency and Sequencing Notes

- Complete all dependency specs first.
- Treat this spec as independent once dependencies pass their focused tests.
- If an upstream dependency is partially complete, do not compensate here by widening public API or adding temporary shims.
