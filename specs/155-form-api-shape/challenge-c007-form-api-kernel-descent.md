# C007 Kernel Enabler And Lowering Ownership Audit

**Role**: `AC3.3` 的 kernel enabler / lowering ownership 审计 brief  
**Status**: Freeze Recorded  
**Feature**: [spec.md](./spec.md)

## Why Now

`155` 的顶层 API 形状已经基本进入实施前平台期：

- `AC3.3` 继续作为唯一 implementation baseline
- `C004 / C004-R1 / C006` 已冻结 current no-better verdict
- 当前 active gap 已收口到 `G1 / G2 / G3 / G4`

所以这轮不再讨论“更多 Form API 是否要继续下沉到 kernel”。

这轮只回答一个更窄的问题：

> 为了让 `AC3.3` 后续 implementation + evidence 跑通，是否还存在尚未明确归位的 kernel enabler / lowering ownership 残余。

## Challenge Target

在固定现有 public surface、owner split、declaration authority 与 read law 的前提下，评估下面这个问题：

> 哪些东西已经是已冻结的 kernel substrate；哪些东西只是 implementation/evidence 所需的 residual mechanism enabler；哪些东西必须继续留在 Form 语义层，直到命中 reopen trigger 才能讨论。

## Current Freeze

- current freeze：`C007.1 residual mechanism-only kernel enabler audit`
- current verdict：`不再把 kernel descent 当成顶层目标函数`
- allowed outcome：
  - `R0 no strictly better residual descent plan yet`
  - `R1 residual mechanism-only descent / enabler clarification`

## Fixed Baseline

下面这些内容在 `C007` 内全部冻结：

- Form exact public surface 继续看 [../../docs/ssot/form/13-exact-surface-contract.md](../../docs/ssot/form/13-exact-surface-contract.md)
- Form 与 field-kernel 边界继续看 [../../docs/ssot/runtime/06-form-field-kernel-boundary.md](../../docs/ssot/runtime/06-form-field-kernel-boundary.md)
- `FormDeclarationContract` 继续是唯一 declaration authority
- `field(path).source({ resource, deps, key, triggers?, debounceMs?, concurrency?, submitImpact? })` 继续是 Form exact declaration act
- `source / companion / rule / submit / host` owner split 不重开
- `rule / submit / decode / blocking verdict` 不进入本轮 kernel 候选
- `companion / lower / availability / candidates` 不进入本轮 kernel 候选
- row-heavy exact read carrier 与 exact diagnostics object 不进入本轮 kernel 候选
- 不开始实现，只产出 planning 结论

## Current Audit Surface

本轮只允许使用三栏审计，不再开新的顶层方向名：

### A. Already Frozen Kernel Substrate

这些内容已经由现有 authority / ADR 冻结，不再进入 candidate ranking：

- compile-time declaration asset / graph / plan / digest
- ownership / remap / row identity / cleanup substrate
- task / stale substrate
- reasons / evidence canonicality

### B. Residual Open Mechanism Enablers

本轮只允许审这类 residual：

- exact `source(...)` act 背后的 scheduling / task substrate 是否还需更明确下沉
- `source receipt -> reason / evidence / bundle patch` 的 lowering ownership 是否还需更明确归位
- row-heavy remap / cleanup / stale hooks 是否还缺 kernel enabler 说明
- 哪些 internal mechanism 直接关系到 `G1 / G2 / G3 / G4` 的 implementation evidence

### C. Reopen-Gated Or Non-Goals

下面这些内容当前只允许写成 non-goal 或 reopen-gated item：

- kernel-level semantic owner
- `FormDeclarationContract` 下沉
- `field(path).source(...)` exact act 下沉
- `submit / decode / blocking verdict`
- `companion / lower / availability / candidates`
- row-heavy exact read carrier
- exact diagnostics object
- 任何 public noun 下沉

## Success Bar

要想形成 strictly better candidate，必须同时满足：

1. 直接缩小 `G1 / G2 / G3 / G4` 之一的 residual
2. 或删除一层公开翻译，同时不引入新 authority
3. 不扩大 public surface
4. 不引入第二 declaration authority / 第二 IR truth / 第二 semantic owner
5. 在 `concept-count / public-surface / compat-budget / migration-cost / proof-strength / future-headroom` 上形成严格改进，或核心轴不恶化时显著提高 `proof-strength`

## Required Questions

本轮 reviewer 必须按下面的矩阵输出判断：

- `candidate_item`
- `current_layer`
- `proposed_layer`
- `deleted_objects`
- `proof_trigger`

并明确标记它属于：

- `already frozen`
- `needed enabler`
- `reopen-gated`

## Expected Outputs

本轮只允许两种输出：

- `R0 no strictly better residual descent plan yet`
- `R1 residual mechanism-only descent / enabler clarification`

## Writeback Targets

- challenge queue：`discussion.md`
- ledger：`../../docs/review-plan/runs/2026-04-23-form-api-shape-c007-form-api-kernel-descent.md`

## Backlinks

- field-kernel boundary：`../../docs/ssot/runtime/06-form-field-kernel-boundary.md`
- field-kernel cutover：`../../docs/adr/2026-04-12-field-kernel-declaration-cutover.md`
- Form exact surface：`../../docs/ssot/form/13-exact-surface-contract.md`
- current strongest candidate：`[candidate-ac3.3.md](./candidate-ac3.3.md)`
