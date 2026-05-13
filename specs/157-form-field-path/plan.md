# Implementation Plan: Form Companion Formalization

**Branch**: `157-form-field-path` | **Date**: 2026-04-23 | **Spec**: [/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/157-form-field-path/spec.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/157-form-field-path/spec.md)
**Input**: Feature specification from `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/157-form-field-path/spec.md`

## Summary

把 `155` 的 `field(path).companion({ deps, lower })` 从候选 shape 推进到正式实现。`157` 主线只关闭 5 件事：

1. `FormDefineApi` 接回 companion authoring
2. `field-only` owner scope 与 `clear | bundle + atomic commit` law 落成实现
3. companion facts 在既有 `useModule + useSelector(handle, selectorFn)` canonical selector law 下完成 admissibility proof，并采纳最小 `Form.Companion.field(path)` 与 `Form.Companion.byRowId(listPath, rowId, fieldPath)` selector primitive
4. `source -> companion -> rule / submit` 的 diagnostics、row-heavy、runtime control plane proof 闭合
5. authority freeze 完成后，再做 retained example alignment

当前不在主线内关闭的项目继续保持 reopen-gated：

- 新 public helper noun
- 新 public helper noun
- exact read carrier noun
- exact `ui` landing path
- companion 的 type-only public contract：`SourceReceipt / AvailabilityFact / CandidateSet / CompanionBundle / CompanionLowerContext / CompanionDepsMap / CanonicalDepValue`

## Stage Role

- 本文件是 `157` 的静态执行 contract，不重写 `155 / 157` 的 owner truth。
- `tasks.md` 是唯一执行与 proof ledger。
- `discussion.md` 只保留 residual reopen evidence，不承接实施台账、边界裁决或 pass/fail 结果。
- 本文件不得发明第二 read family、第二 diagnostics truth、第二 declaration authority。

## North Stars & Kill Features _(optional)_

- **North Stars (NS)**: NS-3, NS-4, NS-7, NS-10
- **Kill Features (KF)**: KF-3, KF-8, KF-9, KF-10

## Technical Context

**Language/Version**: TypeScript 5.x + Effect V4 beta.28  
**Primary Dependencies**: `@logixjs/form`, `@logixjs/core`, `@logixjs/react`, `@logixjs/query`, `effect@4.0.0-beta.28`, Vitest, `@effect/vitest`  
**Storage**: N/A  
**Testing**: `runtime.check`、`runtime.trial(mode="startup")`、`runtime.trial(mode="scenario")`、按需 `runtime.compare`，再叠加包内 targeted tests、条件化 browser perf-boundary proof 与 authority freeze 后的 example build  
**Target Platform**: Node.js 20+ + modern browsers  
**Project Type**: pnpm workspace / packages + examples  
**Performance Goals**: companion formalization 不得让 field-level derive/read path、row-heavy proof、React host no-tearing proof 出现明显回归；只有当 hot path 受触及时，才升级到 compare/perf collect  
**Constraints**: `field-only` owner scope；day-one slot 只认 `availability / candidates`；不重开 `list/root companion`；`lower(ctx)` 同步纯计算；read-side mainline 固定为 recipe-only selector proof；exact helper noun 与 exact `ui` landing path 继续 deferred；helper/public primitive/type promotion 全部 reopen-gated；不新增第二 host family / 第二 diagnostics truth / 第二 runtime truth  
**Scale/Scope**: 主要影响 `packages/logix-form` 的 authoring/lowering/evidence，必要时最小触及 `packages/logix-react` 的内部 projection plumbing；`examples/logix-react` 与相关 docs 只在 authority freeze 后对齐

## Constitution Check

_GATE: Must pass before implementation. Re-check after every writeback freeze._

- North Stars / Kill Features：`157` 已在 `spec.md` 记录 `NS-3 / NS-4 / NS-7 / NS-10` 与 `KF-3 / KF-8 / KF-9 / KF-10`，本计划保持一致。
- 与 `Intent -> Flow/Logix -> Code -> Runtime` 的关系：
  - 本特性把 `155 companion lane` 从 spec shape 推到 Form public authoring 与 runtime closure
  - companion 读侧只证明 canonical selector law 可承接，不顺手发明新 route
- 依赖的 specs / authority：
  - `155 spec / candidate-ac3.3 / signoff-brief / proof-family`
  - `docs/ssot/form/06-capability-scenario-api-support-map.md` 作为唯一 `SC-*` 场景矩阵，`proof-family` 只作 `WF* / W*` projection
  - `156 implementation-first`
  - `docs/ssot/form/13-exact-surface-contract.md`
  - `docs/ssot/form/05-public-api-families.md`
  - `docs/ssot/runtime/06-form-field-kernel-boundary.md`
  - `docs/ssot/runtime/09-verification-control-plane.md`
  - `docs/ssot/runtime/10-react-host-projection-boundary.md`
  - `docs/standards/logix-api-next-guardrails.md`
- Effect / Logix contracts：新增的是 `FormDefineApi.field(...).companion(...)`；read 侧只允许复用既有 selector law，不预承诺新 helper。
- IR & anchors：不引入第二 IR；companion 只能沿既有 Form / field-kernel lowering 路径进入 unified minimal runtime truth。
- Deterministic identity：companion proof 若涉及 field/row/read attribution，必须继续依赖稳定 `fieldPath / rowId / reasonSlotId / sourceRef`。
- Transaction boundary：`lower(ctx)` 必须同步纯计算；禁止 IO / async 进入 companion derive。
- React consistency：`useModule + useSelector(handle, selectorFn)` 是唯一 sanctioned read route；如这条路无法闭合，必须先 reopen，再谈新 primitive。
- Internal contracts & trial runs：companion-specific proof 当前必须先过 `runtime.check -> runtime.trial(startup)` 与 control-plane proofes；public scenario carrier 继续归 runtime verification lane，`runtime.compare` 只在需要解释差异或回归时启用。
- Performance budget：browser proof 只在 React host / diagnostics hot path 被触及时进入主线验证；否则维持 supporting evidence 身份。
- Diagnosability & explainability：必须能解释 `source -> companion -> rule / submit` 因果链，不得新增第二 diagnostics truth。
- Breaking changes：这是公开 authoring surface 增量，不提供兼容层；若旧文档与现状冲突，直接回写事实源。
- Single-track implementation：直接朝 companion 终局形态 cutover，不搞并行旧 lane。
- Public submodules：若新增/改动 `packages/logix-form/src/*`，继续遵守 public barrel + internal 下沉约束。
- Quality gates：至少跑 `runtime.check`、`runtime.trial(mode="startup")`、PF-08 exactness proof bundle、`pnpm -C packages/logix-form typecheck`、`pnpm -C packages/logix-react typecheck`；example build 与 browser proof 按条件升级。

**Gate Verdict**: Pass。当前没有必须在 plan 阶段重开 owner truth 的硬冲突，但 read route、verification、writeback 与 type budget 已改成更窄 contract。

## Entry Gates

### Gate A: Planning Admission

`spec.md` 已回答：

- 谁拥有本特性：`157` 拥有 companion formalization
- 边界在哪里：只实现 `field-only companion lane`，不重开 `list/root companion`
- 什么算闭合：authoring + recipe-only sanctioned read admissibility + diagnostics / row-heavy / control-plane proof + authority freeze 后的 example alignment

### Gate B: Implementation Admission

实现开始前，本计划必须已经冻结：

- classification matrix
- read route freeze
- verification spine
- writeback matrix
- non-goals

## Planning Contract

- required artifacts：
  - `spec.md`
  - `plan.md`
  - `tasks.md`
- optional support artifacts：
  - `discussion.md`
    - 只保留 reopen evidence
  - `quickstart.md`
    - 只保留命令索引
  - `research.md` / `data-model.md` / `contracts/README.md` / `checklists/*`
    - 只作 support，不进入 hard prerequisite

## Classification Matrix

| item | class | current layer | target layer | proof trigger | allowed writeback |
| --- | --- | --- | --- | --- | --- |
| `field(path).companion({ deps, lower })` authoring act | `already frozen` | `155/157 spec` | implementation landing | `AC3.3` baseline | `13` / `06` / `157 spec` |
| `field-only + availability/candidates + clear|bundle` law | `already frozen` | `155/157 spec` | implementation landing | `SC-C/SC-D/SC-E` plus `WF1/WF2/WF5` coverage | `13` / `06` / `157 spec` |
| recipe-only read admissibility via `useModule + useSelector(handle, selectorFn)` | `needed enabler` | core host law | companion proof | no raw-path dependency, no second host family | `157 spec/plan/tasks`，必要时补 `10` 的 no-change rationale |
| new public helper noun | `reopen-gated` | deferred | authority reopen only | adopted selector primitive 仍无法覆盖需求时才允许 | `10` / `05` / `13` / `157 spec` / `discussion.md` |
| exact read carrier noun / exact `ui` landing path | `reopen-gated` | deferred | authority reopen only | irreducible proof 明确要求 | `13` / `157 spec` / `discussion.md` |
| companion type-only contract | `needed enabler` | authoring type surface | public type-only contract | lower ctx / bundle slot 需要静态约束 | `13` / `157 spec` / `tasks.md` |
| companion runtime helper / read carrier promotion | `reopen-gated` | deferred | runtime public surface | strict-dominance 证据 + authority freeze | `05` / `10` / `13` / `157 spec` / `discussion.md` |
| example/demo alignment | `needed enabler` | example narrative | post-freeze alignment | authority freeze 完成且 proof mapping 稳定 | examples + 按需 user docs |

## Verification Spine（MUST）

### Primary Gate

- `runtime.check`
  - declaration / contract / static gate
- `runtime.trial(mode="startup")`
  - installation / boot / close / dependency closure
- `runtime.trial(mode="scenario")`
  - companion proof 的主 proof route
- `runtime.compare`
  - 只有 scenario 差异、证据歧义或 hot-path 回归需要解释时才启用

### Supporting Evidence

- `packages/logix-form` companion targeted tests
- `packages/logix-react` selector recipe tests
- 条件化 browser perf-boundary proof：
  - `diagnostics-overhead`
  - `runtime-store-no-tearing`
- authority freeze 后的 example contract / build

### Perf Compare Policy

- envId：`darwin-arm64.browser-node-mixed`
- profile：`default`
- before/after collect：只在 companion lowering、selector path 或 diagnostics hot path 出现回归迹象时执行，输出到 `specs/157-form-field-path/perf/`
- Failure Policy：
  - `comparable=false` 不下硬结论
  - 若 proof 不稳定，先缩小到 companion 相关子集再补证

## Working Set

### Primary Planning Surfaces

- `specs/157-form-field-path/spec.md`
- `specs/157-form-field-path/plan.md`
- `specs/157-form-field-path/tasks.md`

### Likely Landing Files

```text
packages/logix-form/
├── src/Form.ts
├── src/internal/form/impl.ts
├── src/internal/form/fields.ts
├── src/internal/form/artifacts.ts
├── src/internal/form/errors.ts
└── test/Form/

packages/logix-react/
├── src/FormProjection.ts
└── test/

packages/logix-core/
├── src/ControlPlane.ts
└── src/internal/verification/

examples/logix-react/
├── src/App.tsx
├── src/demos/form/
└── test/

docs/ssot/form/
├── 05-public-api-families.md
└── 13-exact-surface-contract.md

docs/ssot/runtime/
├── 06-form-field-kernel-boundary.md
├── 09-verification-control-plane.md
└── 10-react-host-projection-boundary.md
```

**Structure Decision**: 主线按“authoring/lowering -> recipe-only read proof -> control-plane proof -> authority freeze -> post-freeze examples”推进。`packages/logix-react` 只在 recipe proof 被 internal exposure gap 阻塞时才触及，且不允许借机长出 public helper。

## Coverage Map

`157` 不自造新的 `W1..Wn` 编号。所有 proof 都必须回链到 `docs/ssot/form/06-capability-scenario-api-support-map.md` 的 `SC-*` 主矩阵；`WF1..WF6` 与 `W1..W5` 只作为该矩阵的 projection。

| scenario / projection subset | 157 delta | primary proof route | failure means |
| --- | --- | --- | --- |
| `SC-C/SC-D` plus `WF1` + `W1 source-refresh-multi-lower` | companion 正式进入 authoring，并能从 `value / deps / source?` 降出 `availability / candidates` | authoring tests + startup report artifact + selector proof | companion lane 仍停在候选态，或 source 之外长第二 ingress |
| `SC-E` plus `WF2/WF3` + `W3/W4` | reorder / replace / byRowId / cleanup 下维持 field-only owner | row-heavy tests + cleanup / selector proof | 逼出 `list/root companion`，或 owner binding 漂移 |
| `SC-D/SC-F` plus `WF4/WF5` + `W5 rule-submit-backlink` | `source -> companion -> rule / submit` 在单一 evidence chain 内闭合 | diagnostics tests + startup report floor + executed `PF-04` state proof；`CAP-15` exact backlink 已正式转交 runtime verification lane | 长第二 explain/report truth，或 submit backlink 失链 |
| `SC-B..SC-F` benchmark-admissible subset plus `WF6` | compare/perf 只在需要时升级 | conditional `runtime.compare` + perf collect | perf gate 反向污染 correctness truth |
| `SC-C/SC-D` plus `WF1/WF5` 的 example mapping | retained demo 只消费 frozen contract | example contract/build | demo 反向塑形 authority，或 proof mapping 漂移 |

## Read Route Freeze

- `157` mainline 固定为 canonical host gate：
  - `useModule(formProgram, options?)`
  - `useSelector(handle, selectorFn, equalityFn?)`
- `157` 当前已采纳最小 form-owned selector primitive：
  - `useSelector(handle, Form.Companion.field(path))`
  - `useSelector(handle, Form.Companion.byRowId(listPath, rowId, fieldPath))`
- `157` mainline 不新增：
  - public helper noun
  - second host family
- 若 existing projection surface 无法在不暴露 raw path 的前提下闭合 recipe proof，必须先停下并 reopen。reopen 后才允许触发：
  - `docs/ssot/runtime/10-react-host-projection-boundary.md`
  - `docs/ssot/form/05-public-api-families.md`
  - `docs/ssot/form/13-exact-surface-contract.md`
  - `specs/157-form-field-path/spec.md`

## Verification Matrix

| gate | proof owner | primary files | secondary files | failure means |
| --- | --- | --- | --- | --- |
| Authoring & Boundary | `SC-C/SC-D` plus `WF1/WF5` | `packages/logix-form/test/Form/` companion tests | `packages/logix-form/src/internal/form/impl.ts`, `fields.ts` | companion 未进入 public authoring，或 owner drift |
| Recipe-Only Read Admissibility | `SC-C/SC-E/SC-F` plus `WF1/WF2/WF5` | `packages/logix-react/test/` selector recipe tests | `packages/logix-react/src/FormProjection.ts` 只在 internal exposure gap 阻塞 proof 时触达 | 读取 companion facts 需要 raw path，或必须新增 helper/第二 host family |
| Control-Plane Proof | `SC-C/SC-D/SC-E/SC-F` plus `WF1/WF2/WF4/WF5` | `runtime.check`、`runtime.trial(mode="startup")`、reason contract、startup report artifact、selector primitive、cleanup proof；`SC-D` residual 继续进入 `VOB-01` minimal packet | `packages/logix-core/src/ControlPlane.ts`, `internal/verification/**`, `packages/logix-form/test/Form/` | proof chain 不闭合，或只能靠包内散测解释 |
| Row-Heavy Sufficiency | `SC-E` plus `WF2/WF3/WF5` | `packages/logix-form/test/Form/` row identity / cleanup proofes | `packages/logix-form/src/internal/form/fields.ts`, `arrays.ts`, `rowid.ts` | field-only companion 在 row-heavy 下失真，或逼出 `list/root` reopen |
| Post-Freeze Example Alignment | `SC-C/SC-D` plus `WF1/WF5` mapping | `examples/logix-react/test/form-demo-matrix.contract.test.ts` | `examples/logix-react/src/demos/form/*`, `App.tsx` | example route 与 frozen contract 漂移，或 narrative 先于 authority |

## Result Writeback Matrix

| surface | when | note |
| --- | --- | --- |
| `docs/ssot/form/13-exact-surface-contract.md` | always | 回写 adopted companion authoring、deferred read carrier status、public type budget变化 |
| `docs/ssot/runtime/06-form-field-kernel-boundary.md` | always | 回写 lowering boundary、field-only owner law、companion internal substrate |
| `docs/ssot/runtime/10-react-host-projection-boundary.md` | conditional | 只有 read authority 或 helper/selector primitive 发生变化时更新；若无变化，在 `tasks.md` 记录 no-change rationale |
| `docs/ssot/form/05-public-api-families.md` | conditional | 只有 public route / data-support primitive 发生变化时更新；若无变化，在 `tasks.md` 记录 no-change rationale |
| `specs/157-form-field-path/spec.md` | always | 同步 adopted candidate、proof outcome、reopen surface |
| `specs/157-form-field-path/plan.md` | always | 只维护 freeze 过的 contract，不回放执行流水 |
| `specs/157-form-field-path/tasks.md` | always | 唯一 execution/proof ledger |
| `specs/157-form-field-path/discussion.md` | always | 只保留 residual reopen evidence |
| user docs surfaces | conditional | 若 retained demo 改动教学默认路径，按 `156` 的最小 docs 面一并更新 |

## Non-Goals

- 不在本特性里重做 `source / rule / submit / host` 全部 surface
- 不在 `157` 主线内冻结 exact helper noun、exact `ui` landing path、exact read carrier noun
- 不在 `157` 主线内把 companion type-only contract 升成 runtime value、read helper 或 selector primitive
- 不为了 companion 顺手开放 `list().companion`、`root().companion`
- 不让 companion 承接 render policy、display formatting、placeholder policy 或官方 React wrapper family

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --- | --- | --- |
| `impl.ts` / `fields.ts` 可能继续长大；`FormProjection.ts` 只在 recipe proof 被 internal exposure gap 阻塞时才触达 | companion formalization 会同时碰 authoring、lowering、evidence、row-heavy | 新增 public helper、第二 selector family、第二 ledger 都会放大公开面、迁移成本与 drift 风险 |
