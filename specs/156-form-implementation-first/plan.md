# Implementation Plan: Form Implementation First

**Branch**: `156-form-implementation-first` | **Date**: 2026-04-23 | **Spec**: [/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/156-form-implementation-first/spec.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/156-form-implementation-first/spec.md)
**Input**: Feature specification from `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/156-form-implementation-first/spec.md`

## Summary

把 `155` 当前已经阶段性定型的表面 API 视为 implementation baseline，不继续争 public surface；本计划先补齐 `G1 / G2 / G3 / G4` 所需的 internal mechanism、lowering ownership 与 evidence enabler，再在 closure 之后整顿 `examples/logix-react` 的 form demos 与相关用户文档落点，保证 examples、docs、`06` `SC-*` 与派生 `WF*` 只讲一条故事。

## Stage Role

- 本文件只承接执行约束，不重写 `155` / `156` 的 owner truth。
- 本文件必须把 implementation 波次、required witness、verification matrix、result writeback targets 写清。
- 本文件不得发明第二 declaration authority、第二 semantic owner 或第二 public route。
- 详细执行配方收口到 `specs/156-form-implementation-first/implement-plan.md`；本文件继续保持波次级视角。
- examples/docs alignment 只作为 post-closure writeback consumer 存在，不反向拥有 owner truth。

## North Stars & Kill Features _(optional)_

- **North Stars (NS)**: NS-3, NS-4, NS-7, NS-8, NS-10
- **Kill Features (KF)**: KF-3, KF-8, KF-9, KF-10

## Technical Context

**Language/Version**: TypeScript 5.x + Effect V4 beta baseline  
**Primary Dependencies**: `@logixjs/form`, `@logixjs/core`, `@logixjs/react`, `effect@4.0.0-beta.28`, `@effect/vitest@4.0.0-beta.28`, Vitest  
**Storage**: N/A  
**Testing**: Vitest + `@effect/vitest` + browser perf-boundary suites + `examples/logix-react` build/typecheck + docs build when touched  
**Target Platform**: Node.js runtime + modern browsers + pnpm workspace packages  
**Project Type**: pnpm workspace / packages + examples  
**Performance Goals**: 不引入 `form-list-scope-check`、`diagnostics-overhead`、`runtime-store-no-tearing` 这类既有 witness 的明显回归；新增 internal enabler 必须能被 `runtime.trial / runtime.compare` 观察  
**Constraints**: 不改 public surface；不改 semantic owner；不引入第二 declaration authority / 第二 IR truth / 第二 diagnostics truth；核心实现结果必须直接服务 `G1 / G2 / G3 / G4`；example/docs refresh 不得讲第二叙事  
**Scale/Scope**: 主要影响 `packages/logix-form`、`packages/logix-core`、`packages/logix-react`，并在 closure 后触及 `examples/logix-react` 与 `apps/docs/content/docs/form/*`；必要时补 `packages/logix-sandbox` 的 witness

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- North Stars / Kill Features：`156` 已在 `spec.md` 记录 `NS-3 / NS-4 / NS-7 / NS-8 / NS-10` 与 `KF-3 / KF-8 / KF-9 / KF-10`，本计划保持一致。
- 与 `Intent → Flow/Logix → Code → Runtime` 链路的关系：
  - 本特性不改 `Intent` 与公开作者面
  - 只补 `Code → Runtime` 之间的 internal mechanism / evidence closure
- 依赖的 specs / authority：
  - `155 spec / candidate / C007`
  - `runtime/06 form-field-kernel-boundary`
  - `form/13 exact-surface-contract`
  - `2026-04-12 field-kernel declaration cutover`
  - `docs/standards/user-docs-writing-standard.md` when docs alignment is touched
- Effect / Logix contracts：会影响 internal mechanism / runtime substrate，但不引入新的 public contract；如实现中发现需要新 runtime service contract，必须回写 `docs/ssot/runtime/*`。
- IR & anchors：不重开 unified minimal IR；只允许 refinement internal lowering ownership，且不得形成第二 IR truth。
- Deterministic identity：继续依赖稳定 `rowId / reasonSlotId / sourceRef`；新 enabler 不得引入随机或时间驱动标识。
- Transaction boundary：不允许 IO 进入 transaction window；新的 substrate 只能增强 scheduling / evidence，不得引入写逃生口。
- React consistency：不改 host law；若新增 internal mechanism 会影响 store sync，必须跑 `runtime-store-no-tearing` 与相关 perf-boundary witness。
- Internal contracts & trial runs：若引入新 internal hook，必须是 explicit injectable contract 或明确的 internal substrate，不得依赖 process-global singleton。
- Dual kernels：不得额外引入 `core-ng` 消费分叉；若内核层改动触及 shared contract，必须在 plan 执行时显式做 support matrix 说明。
- Performance budget：所有内部 enabler 至少要说明如何在 `runtime.trial / runtime.compare` 或浏览器 perf-boundary 里验证无明显退化。
- Diagnosability & explainability：新增逻辑必须增强或保持 `source receipt -> reason / evidence / bundle patch` 的解释链。
- Breaking changes：当前明确禁止 public API breaking change。
- Single-track implementation：本计划只允许单轨推进，不搞双写、shadow path、compat mode。
- Public submodules：如果修改 `packages/*`，继续遵守 barrel/public submodule 规则，不把 internal 结构暴露出去。
- Large modules/files：若碰到超大文件，优先把语义变化与无损拆分分开执行。
- Quality gates：至少跑相关 typecheck / lint / targeted tests；若触及 perf boundary，再跑对应 browser suites。
- Example/docs alignment：只允许复用 `06` 的 `SC-*` 主场景矩阵、派生 `WF*` projection 与 canonical docs route，不允许新长第二套 narrative taxonomy。

**Gate Verdict**: Pass。当前没有发现需要在 plan 阶段前重开 owner truth 的问题。

## Entry Gates

### Gate A: Planning Admission

`spec.md` 已回答：

- 谁拥有这次工作：`156` 只拥有 implementation-first 执行边界
- 边界在哪里：public surface 不动；core waves 只做 internal mechanism / evidence enabler；post-closure wave 只做 examples/docs alignment consumer
- 什么算闭合：core internal-enabler 映射到 `G1 / G2 / G3 / G4`，post-closure examples/docs alignment 回链到 `06` `SC-*`、派生 `WF*` 或 canonical docs route，且两者都不越界

### Gate B: Implementation Admission

实现开始前，本计划已经定义：

- likely landing files
- required witness set
- verification matrix
- result writeback targets
- non-goals
- closure 后的 examples/docs alignment targets

## Perf Evidence Plan（MUST）

- Baseline 语义：策略前后对比
- envId：`darwin-arm64.browser-node-mixed`
- profile：`default`
- 重点 witness：
  - `packages/logix-react/test/browser/perf-boundaries/form-list-scope-check.test.tsx`
  - `packages/logix-react/test/browser/perf-boundaries/diagnostics-overhead.test.tsx`
  - `packages/logix-react/test/browser/perf-boundaries/runtime-store-no-tearing.test.tsx`
- collect before/after：仅在真正触及 perf boundary 的 implementation wave 时执行，输出落在 `specs/156-form-implementation-first/perf/`
- Failure Policy：
  - 若 `comparable=false`，不下结论
  - 若 witness 不稳定，先缩小到子集再补证

## Project Structure

### Documentation (this feature)

```text
specs/156-form-implementation-first/
├── discussion.md
├── implement-plan.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── README.md
└── checklists/
    └── requirements.md
```

### Source Code (repository root)

```text
packages/logix-form/
├── src/Form.ts
├── src/internal/form/
├── src/internal/dsl/
└── test/Form/

packages/logix-core/
└── src/internal/field-kernel/

packages/logix-react/
├── src/internal/hooks/
├── src/internal/store/
└── test/browser/perf-boundaries/

examples/logix-react/
├── src/App.tsx
├── src/demos/form/
├── src/modules/
└── test/

apps/docs/content/docs/form/
├── index*.mdx
├── introduction*.md
├── quick-start*.md
└── field-arrays*.md

packages/logix-sandbox/
└── src/internal/
```

**Structure Decision**: 本特性按“Form 领域 DSL / core field-kernel / React host witness”三层落地，优先修改 `packages/logix-form` 与 `packages/logix-core`，仅在验证或 bridge 需要时触及 `packages/logix-react`。`examples/logix-react` 与 `apps/docs/content/docs/form/*` 只在 Wave 5 作为 post-closure alignment consumer 进入。

## Required Witness Set

- W1 `G1 Read Route`
  - 现有 canonical selector route 读取不变
  - internal enabler 不得逼出组件 glue
- W2 `G2 Row-Heavy`
  - reorder / replace / byRowId / cleanup hooks 的行为与 row identity guard 一致
- W3 `G3 Diagnostics`
  - `source receipt -> reason / evidence / bundle patch` 因果链可解释
- W4 `G4 Implementation Trace`
  - internal mechanism 变化能被 `runtime.trial / runtime.compare` 或等价 evidence feed 观察
- W5 `No Reopen`
  - public surface、semantic owner、declaration authority 均保持不变
- W6 `Example/Docs Alignment`
  - retained form demos 与 docs pages 只复用已经闭合的 `06` `SC-*`、派生 `WF*` 和 canonical route

## Verification Matrix

| gate | required witness | primary files | secondary files | failure means |
| --- | --- | --- | --- | --- |
| G1 Read Route | `Form.Source.Authoring`, `Form.Source.RowScope.Authoring`, `Form.InternalBoundary` | `packages/logix-form/test/Form/Form.Source.Authoring.test.ts`, `packages/logix-form/test/Form/Form.Source.RowScope.Authoring.test.ts`, `packages/logix-form/test/Form/Form.InternalBoundary.test.ts` | `packages/logix-core/src/internal/field-kernel/source.impl.ts`, `packages/logix-form/src/internal/form/install.ts` | source scheduling refinement leaked into authoring route or semantic owner |
| G2 Row-Heavy | `Form.RowIdentityContinuity`, `Form.CleanupReceipt`, `form-list-scope-check` | `packages/logix-form/test/Form/Form.RowIdentityContinuity.contract.test.ts`, `packages/logix-form/test/Form/Form.CleanupReceipt.contract.test.ts`, `packages/logix-react/test/browser/perf-boundaries/form-list-scope-check.test.tsx` | `packages/logix-form/src/internal/form/rowid.ts`, `packages/logix-form/src/internal/form/arrays.ts` | row identity, cleanup receipts, or list-scope witness drifted |
| G3 Diagnostics | `Form.ReasonEvidence`, `Form.CleanupReceipt`, `diagnostics-overhead` | `packages/logix-form/test/Form/Form.ReasonEvidence.contract.test.ts`, `packages/logix-form/test/Form/Form.CleanupReceipt.contract.test.ts`, `packages/logix-react/test/browser/perf-boundaries/diagnostics-overhead.test.tsx` | `packages/logix-form/src/internal/form/artifacts.ts`, `packages/logix-core/src/internal/field-kernel/converge-diagnostics.ts` | receipt to reason/evidence/bundle patch chain stopped being singular or explainable |
| G4 Implementation Trace | `Form.Source.StaleSubmitSnapshot`, `Form.Source.SubmitImpact`, `runtime-store-no-tearing`, `runtime.trial / runtime.compare` | `packages/logix-form/test/Form/Form.Source.StaleSubmitSnapshot.test.ts`, `packages/logix-form/test/Form/Form.Source.SubmitImpact.test.ts`, `packages/logix-react/test/browser/perf-boundaries/runtime-store-no-tearing.test.tsx` | `packages/logix-core/src/ControlPlane.ts`, `packages/logix-core/src/internal/verification/*` | internal mechanism changed but verification substrate cannot observe it, or host/store consistency drifted |

## Admitted Workset

- `needed enabler`
  - source scheduling / task substrate
  - receipt -> reason/evidence/bundle patch ownership
  - row-heavy remap / cleanup / stale hooks
  - trial / compare evidence feed
- `already frozen`
  - semantic owner
  - declaration authority
  - public noun
  - exact `field(path).source(...)` act
- `reopen-gated`
  - any change that touches public surface, exact carrier, or domain owner split

## Adopted Core Outcomes

- `US1 boundary lock`
  - Form semantic owner 继续停在 `Form.make(..., define)` 与 form runtime glue
  - field-kernel build/install 继续只承接 compiled field program，不吸收 declaration authority
- `US2 source / ownership / row-heavy`
  - source scheduling 通过 `source.impl.ts` 共享 helper 收口
  - source ownership 通过 `fields.ts` collector + `@logixjs/form.evidenceContract@v1` 显式导出
  - cleanup receipt authority 通过 shared helper 固定为 `ui.$cleanup.<listPath>`
- `US3 verification closure`
  - browser witnesses 全部通过
  - `runtime-store-no-tearing`、`diagnostics-overhead`、`form-list-scope-check` 均未暴露新的第二 truth
  - 本轮无需扩张 `ControlPlane` public surface

## Retained Demo Matrix

| route | label | group | default docs page |
| --- | --- | --- | --- |
| `/form-quick-start` | `Form · 快速开始` | canonical | `quick-start*` narrative only |
| `/form-field-source` | `Form · Field Source` | canonical | `introduction*` narrative only |
| `/form-field-arrays` | `Form · Field Arrays` | canonical | `field-arrays*` narrative only |
| `/form-source-query` | `Query · Source Witness` | witness | Query contrast only |
| `/form-advanced-field-behavior` | `Form · Advanced Witness` | witness | internal witness only |

## Execution Strategy

### Wave 0: Baseline Lock

- 把 `already frozen / needed enabler / reopen-gated` 对照表拉齐到代码落点
- 明确每个 `needed enabler` 对应 `G1-G4` 的哪一项
- 不做 semantic 变化

### Wave 1: Source Scheduling / Task Substrate

- 聚焦 exact `source(...)` act 背后的 scheduling、task、submitImpact、stale 行为归位
- 目标是让这些 internal mechanism 更明确地落在 kernel substrate / form internal bridge 上
- 不改 exact `source(...)` act

### Wave 2: Receipt / Evidence / Bundle Patch Ownership

- 补齐 `source receipt -> reason / evidence / bundle patch` 的 lowering ownership
- 让 diagnostics / explain / compare 消费的对象归位清楚
- 不创建第二 diagnostics truth

### Wave 3: Row-Heavy Hooks

- 明确 row-heavy remap / cleanup / stale hooks 的 internal enabler
- 保持与 `rowId / cleanup receipt` guards 一致
- 不重开 row-heavy exact read carrier

### Wave 4: Verification Closure

- 把 trial / compare / witness feed 绑定回具体实现项
- 只在已有 enabler 足够时补 perf/boundary witness

### Wave 5: Example / Docs Alignment

- 在 `G1-G4` 闭合后整顿 `examples/logix-react` 的 form demos、route labels 与 supporting modules
- 每个 form demo 都要归到 `retain / rewrite / merge / remove`
- 如 docs 默认路径受到影响，则同步更新 `apps/docs/content/docs/form/*` 的最小对齐页
- 此 wave 只消费 `06` `SC-*`、派生 `WF*` 与 canonical route，不反向发明第二套 story

## Result Writeback

- Authority pages：
  - `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/runtime/06-form-field-kernel-boundary.md`
  - `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/form/13-exact-surface-contract.md`
  - 如触及 runtime service / evidence substrate，再回写相关 `docs/ssot/runtime/*`
- Spec state sync：
  - `specs/156-form-implementation-first/spec.md`
  - 若波次结论成立，更新 `discussion.md` backlinks
- Discussion cleanup：
  - 已采纳的 implementation slice 必须回写到 `plan.md / tasks.md`
- Witness surfaces：
  - `packages/logix-form/test/Form/*`
  - `packages/logix-react/test/browser/perf-boundaries/*`
  - 需要时补 `packages/logix-sandbox`
- Example surfaces：
  - `examples/logix-react/src/App.tsx`
  - `examples/logix-react/src/demos/form/*`
  - `examples/logix-react/src/modules/*`
- User docs surfaces：
  - `apps/docs/content/docs/form/index*`
  - `apps/docs/content/docs/form/introduction*`
  - `apps/docs/content/docs/form/quick-start*`
  - `apps/docs/content/docs/form/field-arrays*`

## Non-Goals

- 不改 public API 表面形状
- 不改 `companion / lower / availability / candidates`
- 不改 `rule / submit / decode / blocking verdict` 的领域 owner
- 不引入新的 public helper / public route
- 不把 `FormDeclarationContract`、exact `source(...)` act、public noun 下沉到 kernel
- 不在本计划阶段提前拆 `tasks.md`
- 不做非 form demos 的统一重写
- 不在本 wave 重做 docs IA、视觉系统或通用 demo embedding infra
- 不让 implementation enabler 借由 docs/examples/writeback 重新发明 canonical route

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --- | --- | --- |
| `packages/logix-form` 与 `packages/logix-core` 双落点 | Form internal bridge 与 field-kernel substrate 同时存在 | 单改一边会把既有边界重新变成口头约定 |
| 浏览器 perf-boundary witness 保留 | 需要防止 internal mechanism 改动破坏 host consistency | 只跑 unit/integration 无法证明 no-tearing / diagnostics overhead |
