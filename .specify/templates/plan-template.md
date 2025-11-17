# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]
**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

**Note**: This template is copied into `specs/[###-feature-name]/plan.md` by
`.specify/scripts/bash/setup-plan.sh` (invoked by the feature workflow).

## Summary

[Extract from feature spec: primary requirement + technical approach from research]

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: [e.g., Python 3.11, Swift 5.9, Rust 1.75 or NEEDS CLARIFICATION]  
**Primary Dependencies**: [e.g., effect v3, @logix/*, React, Next.js or NEEDS CLARIFICATION]  
**Storage**: [if applicable, e.g., files / N/A]  
**Testing**: [e.g., Vitest, @effect/vitest (for Effect-heavy tests) or NEEDS CLARIFICATION]  
**Target Platform**: [e.g., Node.js 20+ + modern browsers]  
**Project Type**: [pnpm workspace / packages + apps]  
**Performance Goals**: [budgets + measurement method (benchmark/profile) or NEEDS CLARIFICATION]  
**Constraints**: [include diagnostics overhead budgets if applicable]  
**Scale/Scope**: [domain-specific, e.g., 10k users, 1M LOC, 50 screens or NEEDS CLARIFICATION]

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- Answer the following BEFORE starting research, and re-check after Phase 1:
  - How does this feature map to the
    `Intent → Flow/Logix → Code → Runtime` chain?
  - Which `docs/specs/*` specs does it depend on or modify, and are they
    updated first (docs-first & SSoT)?
  - Does it introduce or change any Effect/Logix contracts? If yes, which
    `.codex/skills/project-guide/references/runtime-logix/*` docs capture the new contract?
  - IR & anchors: does it change the unified minimal IR or the Platform-Grade
    subset/anchors; are parser/codegen + docs updated together (no drift)?
  - Deterministic identity: are instance/txn/op IDs stable and reproducible
    (no random/time defaults); is the identity model documented?
  - Transaction boundary: is any IO/async work occurring inside a transaction
    window; are write-escape hatches (writable refs) prevented and diagnosed?
  - Internal contracts & trial runs: does this feature introduce/modify internal
    hooks or implicit collaboration protocols; are they encapsulated as explicit
    injectable Runtime Services (no magic fields / parameter explosion), mockable
    per instance/session, and able to export evidence/IR without relying on
    process-global singletons?
  - Dual kernels (core + core-ng): if this feature touches kernel/hot paths or
    Kernel Contract / Runtime Services, does the plan define a kernel support
    matrix (core vs core-ng), avoid direct @logix/core-ng dependencies in
    consumers, and specify how contract verification + perf evidence gate changes?
  - Performance budget: which hot paths are touched, what metrics/baselines
    exist, and how will regressions be prevented?
  - Diagnosability & explainability: what diagnostic events/Devtools surfaces
    are added or changed, and what is the cost when diagnostics are enabled?
  - User-facing performance mental model: if this changes runtime performance
    boundaries or an automatic policy, are the (≤5) keywords, coarse cost model,
    and “optimization ladder” documented and aligned across docs/benchmarks/diagnostics?
  - Breaking changes (forward-only evolution): does this change any public API/behavior/event protocol;
    where is the migration note documented (no compatibility layer / no deprecation period)?
  - Public submodules: if this touches any `packages/*`, does it preserve the
    `src/index.ts` barrel + PascalCase public submodules (top-level `src/*.ts`,
    except `index.ts`/`global.d.ts`), move non-submodule code into
    `src/internal/**`, and keep `package.json#exports` from exposing internals?
  - What quality gates (typecheck / lint / test) will be run before merge,
    and what counts as “pass” for this feature?

## Perf Evidence Plan（MUST）

> 若本特性触及 Logix Runtime 核心路径 / 渲染关键路径 / 对外性能边界：此节必须填写；否则标注 `N/A`。
> 详细口径见：`.codex/skills/logix-perf-evidence/references/perf-evidence.md`

- Baseline 语义：代码前后 / 策略 A/B（填其一）
- envId：<os-arch.cpu.browser-version.headless>
- profile：default（交付）/ soak（更稳）｜quick 仅探路
- collect（before）：`pnpm perf collect -- --profile <profile> --out specs/<id>/perf/before.<sha>.<envId>.<profile>.json [--files ...]`
- collect（after）：`pnpm perf collect -- --profile <profile> --out specs/<id>/perf/after.<sha|worktree>.<envId>.<profile>.json [--files ...]`
- diff：`pnpm perf diff -- --before specs/<id>/perf/before...json --after specs/<id>/perf/after...json --out specs/<id>/perf/diff.before...__after....json`
- Failure Policy：出现 `stabilityWarning/timeout/missing suite` → 复测（profile 升级或缩小子集），`comparable=false` 禁止下硬结论

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file ($speckit plan output)
├── research.md          # Phase 0 output ($speckit plan)
├── data-model.md        # Phase 1 output ($speckit plan)
├── quickstart.md        # Phase 1 output ($speckit plan)
├── contracts/           # Phase 1 output ($speckit plan)
└── tasks.md             # Phase 2 output ($speckit tasks - NOT created by $speckit plan)
```

### Source Code (repository root)

<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
# [REMOVE IF UNUSED] Option 1: Single project (DEFAULT)
src/
├── models/
├── services/
├── cli/
└── lib/

tests/
├── contract/
├── integration/
└── unit/

# [REMOVE IF UNUSED] Option 2: Web application (when "frontend" + "backend" detected)
backend/
├── src/
│   ├── models/
│   ├── services/
│   └── api/
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── tests/

# [REMOVE IF UNUSED] Option 3: Mobile + API (when "iOS/Android" detected)
api/
└── [same as backend above]

ios/ or android/
└── [platform-specific structure: feature modules, UI flows, platform tests]
```

**Structure Decision**: [Document the selected structure and reference the real
directories captured above]

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation                  | Why Needed         | Simpler Alternative Rejected Because |
| -------------------------- | ------------------ | ------------------------------------ |
| [e.g., 4th project]        | [current need]     | [why 3 projects insufficient]        |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient]  |
