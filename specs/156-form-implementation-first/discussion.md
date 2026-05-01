# Form Implementation First Discussion

**Purpose**: 承接 `156` 里值得继续细化、但尚未冻结进 `spec.md` / `plan.md` / `tasks.md` 的实施讨论材料。  
**Status**: Working  
**Feature**: [spec.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/156-form-implementation-first/spec.md)

## Rules

- `spec.md` 继续持有 owner / boundary / closure gate
- 本文件只承接实施讨论材料，authority 继续由 `spec.md` 持有
- 任何已达成实施裁决的内容，必须回写到 `spec.md` / `plan.md` / `tasks.md`
- 本文件只承接实施顺序、波次拆分、待验证假设与 reopen evidence
- 不得把 public surface 候选重新带回这里

## Audit Ledger

| slice | gate | current files | target files | proof trigger | class |
| --- | --- | --- | --- | --- | --- |
| source scheduling / task substrate | G1, G4 | `packages/logix-core/src/internal/field-kernel/source.impl.ts`, `packages/logix-core/src/internal/field-kernel/source.ts`, `packages/logix-form/src/internal/form/install.ts` | same as current | exact `field(path).source(...)` act stays fixed while scheduling/stale/submitImpact witness tightens | needed enabler |
| receipt -> reason/evidence/bundle patch ownership | G3, G4 | `packages/logix-form/src/internal/form/artifacts.ts`, `packages/logix-form/src/internal/form/fields.ts`, `packages/logix-core/src/internal/field-kernel/converge-diagnostics.ts`, `packages/logix-core/src/internal/field-kernel/meta-diagnostics.ts` | same as current | `source receipt -> reason / evidence / bundle patch` causal chain becomes directly inspectable without second truth | needed enabler |
| row-heavy remap / cleanup / stale hooks | G2, G4 | `packages/logix-form/src/internal/form/rowid.ts`, `packages/logix-form/src/internal/form/arrays.ts`, `packages/logix-form/test/Form/Form.RowIdentityContinuity.contract.test.ts` | same as current | reorder / replace / delete keep row identity, cleanup receipt, stale hooks aligned under row guards | needed enabler |
| trial / compare evidence feed | G4 | `packages/logix-core/src/ControlPlane.ts`, `packages/logix-core/src/internal/verification/trialRun.ts`, `packages/logix-core/src/internal/verification/evidence.ts`, `packages/logix-core/src/internal/verification/evidenceCollector.ts` | same as current | internal refinement can be observed by trial/compare/artifact feed without new public surface | needed enabler |

## Adopted Outcomes

- boundary lock 已落到 `form/install.ts`、`form/impl.ts`、`field-kernel/install.ts`、`field-kernel/build.ts` 的显式 owner guard
- source scheduling 已收口到 `source.impl.ts` 的 `recordSourceSnapshotPhase` / `writeSourceSnapshotIfCurrentKeyHash`，`source.ts` 继续保持薄 re-export
- array structural change 的 source refresh + validate handoff 已收口到 `form/install.ts` 的 `refreshArraySourcesAndMaybeValidate`
- source ownership 已从 `impl.ts` 下沉到 `fields.ts` 的静态 collector；`@logixjs/form.evidenceContract@v1` 导出 submitAttempt / cleanup receipt / source ownership contract
- cleanup receipt authority 已收口到 `cleanupReceiptPath`、`cleanupReceiptReasonSlotId`、`makeCleanupSubjectRef`
- diagnostics substrate 本轮未新增第二 truth；`converge-diagnostics.ts` 与 `meta-diagnostics.ts` 无需额外改动

## Frozen And Excluded Surfaces

### already frozen

- `AC3.3` public surface baseline
- semantic owner stays in Form domain DSL and Form runtime glue
- declaration authority stays above field-kernel build/install
- exact `field(path).source(...)` act
- public noun / public route / exact carrier

### reopen-gated

- `companion / lower / availability / candidates`
- `rule / submit / decode / blocking verdict`
- semantic-owner descent
- declaration-authority descent
- public-noun descent
- exact-act descent
- docs IA or non-form example rewrite

## Verification Entry Draft

| gate | targeted tests | supporting witness | expected proof |
| --- | --- | --- | --- |
| G1 | `packages/logix-form/test/Form/Form.Source.Authoring.test.ts`, `packages/logix-form/test/Form/Form.Source.RowScope.Authoring.test.ts` | `packages/logix-form/test/Form/Form.InternalBoundary.test.ts` | authoring route unchanged, only internal scheduling path refined |
| G2 | `packages/logix-form/test/Form/Form.RowIdentityContinuity.contract.test.ts`, `packages/logix-form/test/Form/Form.CleanupReceipt.contract.test.ts` | `packages/logix-react/test/browser/perf-boundaries/form-list-scope-check.test.tsx` | row-heavy remap / cleanup stays rowId-stable |
| G3 | `packages/logix-form/test/Form/Form.ReasonEvidence.contract.test.ts`, `packages/logix-form/test/Form/Form.CleanupReceipt.contract.test.ts` | `packages/logix-react/test/browser/perf-boundaries/diagnostics-overhead.test.tsx` | reason / evidence / bundle patch chain remains singular and explainable |
| G4 | `packages/logix-form/test/Form/Form.Source.StaleSubmitSnapshot.test.ts`, `packages/logix-form/test/Form/Form.Source.SubmitImpact.test.ts` | `packages/logix-react/test/browser/perf-boundaries/runtime-store-no-tearing.test.tsx`, `runtime.trial / runtime.compare` evidence feed | internal mechanism changes are observable without host-law drift |

## Witness Outcomes

| gate | status | proof | notes |
| --- | --- | --- | --- |
| G1 | pass | boundary suite + source authoring suite | exact `field(path).source(...)` act 未变，source scheduling 只在 internal path 收口 |
| G2 | pass | cleanup receipt witness + row identity witness + `form-list-scope-check` | rowId / cleanup receipt / row-heavy remap 维持同一条 guard |
| G3 | pass | reason contract witness + cleanup receipt witness + `diagnostics-overhead` | submitAttempt 与 cleanup receipt 继续是单一 diagnostics/evidence owner |
| G4 | pass | stale snapshot + submitImpact + `runtime-store-no-tearing` + evidence contract artifact | implementation trace 已能通过 artifact/witness 观察，无 host drift |

## Non-Goals Freeze

- 不把 internal enabler 重新包装成 public helper
- 不让 field-kernel build/install 吸收 Form declaration authority
- 不让 docs/examples 反向定义 canonical route
- 不为了 closure 引入第二 diagnostics truth、第二 evidence truth、第二 runtime truth
- 不把历史 demo 惯性当成保留理由

## Open Questions

- [x] Q001 `needed enabler` 的第一波是否应严格只落 `source scheduling / receipt-evidence ownership / row-heavy cleanup hooks`
- [x] Q002 `G1-G4` 与 implementation wave 的最小一一映射应如何组织，才能避免后续 plan 过胖
- [x] Q003 哪些 internal hook 需要先抽成 runtime service contract，才能保证 trial / compare 可验证
- [x] Q004 `examples/logix-react` 的历史 form demos 应如何映射到 `06` 的 `SC-*` 主场景矩阵与派生 `WF*` projection，才能服务后续文档叙事与预览接入评估

## Residual

- 若后续 `runtime.compare` 需要更细的 form-specific focusRef，只能复用现有 control-plane / artifact route，不另开 public contract

## Retained Demo Matrix

| route | layout | backing module | scenario ids / witness families | decision |
| --- | --- | --- | --- | --- |
| `/form-quick-start` | `FormDemoLayout` | inline `Form.make` quick-start demo | `SC-A` | retain |
| `/form-field-source` | `FormFieldSourceDemoLayout` | inline `Form.make` + Query resource layer | `SC-B`, `SC-D` / `WF1`, `WF4`, `WF5` | retain |
| `/form-field-companion` | `FormCompanionDemoLayout` | inline `Form.make` companion demo | `SC-C`, `SC-D` / `WF1`, `WF5` | retain |
| `/form-field-arrays` | `FormFieldArraysDemoLayout` | `rules-composition-mixed-form.ts` | `SC-E` / `WF2`, `WF3`, `WF5` | retain |
| `/form-source-query` | `QuerySearchDemoLayout` | `querySearchDemo.ts` | `SC-B` / `WF1` | retain as witness |
| `/form-advanced-field-behavior` | `FieldFormDemoLayout` | `field-form.ts` | `SC-F` / `WF5` | retain as witness |

## Merged / Removed Historical Routes

- `/form-demo` -> merge into `/form-quick-start`
- `/query-search-demo` -> merge into `/form-source-query`
- `/field-form-demo` -> merge into `/form-advanced-field-behavior`
- `complex-field-form.ts` continues as perf/internal study material and does not become canonical Form docs route

## Docs Alignment

- aligned pages
  - `apps/docs/content/docs/form/index.cn.mdx`
  - `apps/docs/content/docs/form/index.mdx`
  - `apps/docs/content/docs/form/introduction.cn.md`
  - `apps/docs/content/docs/form/introduction.md`
  - `apps/docs/content/docs/form/quick-start.cn.md`
  - `apps/docs/content/docs/form/quick-start.md`
  - `apps/docs/content/docs/form/field-arrays.cn.md`
  - `apps/docs/content/docs/form/field-arrays.md`
- deferred pages
  - none

## User Docs Exposure Decision

- 当前用户文档不直接暴露 demo route
- examples 保留 SSoT-backed retained demo matrix，显式回链 `06` 的 `SC-*` 主矩阵，供内部验证与后续预览接入评估
- CodeSandbox 或其他可预览方案后置，不在这一轮用户文档里承诺

## Alternatives

- [ ] ALT001 直接按 `G1-G4` 逐项拆 plan
- [ ] ALT002 先按 internal enabler 分组，再映射回 `G1-G4`
- [ ] ALT003 在 core closure 后单独做 SSoT-backed retained demo matrix，再决定 docs 是否需要 writeback

## Decision Backlinks

- `spec.md` `Context`
- `spec.md` `Scope`
- `spec.md` `Closure & Guardrails`
- `spec.md` `Requirements`
- `plan.md` `Execution Strategy`
- `plan.md` `Verification Matrix`

## Verification Log

- `pnpm -C packages/logix-form exec vitest run test/Form/Form.InternalBoundary.test.ts test/Form/Form.DomainBoundary.test.ts` pass
- `pnpm -C packages/logix-form exec vitest run test/Form/Form.Source.Authoring.test.ts test/Form/Form.Source.RowScope.Authoring.test.ts test/Form/Form.Source.StaleSubmitSnapshot.test.ts test/Form/Form.Source.SubmitImpact.test.ts` pass
- `pnpm -C packages/logix-form exec vitest run test/Form/Form.ReasonEvidence.contract.test.ts test/Form/Form.CleanupReceipt.contract.test.ts test/Form/Form.RowIdentityContinuity.contract.test.ts` pass
- `pnpm -C packages/logix-core typecheck` pass
- `pnpm -C packages/logix-form typecheck` pass
- `pnpm -C packages/logix-react exec vitest run test/browser/perf-boundaries/form-list-scope-check.test.tsx --project browser` pass
- `pnpm -C packages/logix-react exec vitest run test/browser/perf-boundaries/diagnostics-overhead.test.tsx --project browser` pass
- `pnpm -C packages/logix-react exec vitest run test/browser/perf-boundaries/runtime-store-no-tearing.test.tsx --project browser` pass
- `pnpm -C packages/logix-react typecheck` pass
- `pnpm -C examples/logix-react exec vitest run test/form-demo-matrix.contract.test.ts` pass
- `pnpm -C examples/logix-react typecheck` pass
- `pnpm -C examples/logix-react build` pass
- `pnpm -C apps/docs types:check` pass
- `pnpm -C apps/docs build` pass
