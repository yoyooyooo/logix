---
title: Form Current Capability Map
status: living
version: 6
---

# Form Current Capability Map

## 目标

冻结 `@logixjs/form` 当前已经成立的能力谱系，避免把“host sugar 不对等”误判成 form 领域能力缺口。

## 当前页面角色

- 本页只负责 current-state snapshot
- Form 根语法与成功标准继续看 [./00-north-star.md](./00-north-star.md)
- 真缺口与下一阶段方向继续看 [./02-gap-map-and-target-direction.md](./02-gap-map-and-target-direction.md)
- exact public surface 继续看 [./13-exact-surface-contract.md](./13-exact-surface-contract.md)
- 本页不冻结 root grammar、owner split 或收敛顺序

## 当前定位

Form 当前已经是一个独立的 program-first 领域包。

当前主链与单一真相的冻结口径继续看 [./00-north-star.md](./00-north-star.md) 与 [../runtime/06-form-field-kernel-boundary.md](../runtime/06-form-field-kernel-boundary.md)。
本页只记录当前已经成立的 capability snapshot。

## 当前已经闭环的能力

### 1. 四棵状态树

Form 当前已经稳定承接：

- `values`
- `errors`
- `ui`
- `$form`

其中 `$form` 已提供：

- `submitCount`
- `isSubmitting`
- `isDirty`
- `errorCount`

### 2. 同一套 DSL 内的 field / list / root 规则

Form 当前已经支持：

- field 级校验
- list.item / list.list scope
- root 级校验
- list cardinality basis：`minItems / maxItems`
- field / list.item / list.list / root submit-time Effect rule lowering
- `submitImpact="block"` pending snapshot 进入 submitAttempt，later source settle 不静默改写旧 submitAttempt
- `deps`
- `validateOn / reValidateOn`
- `validatePaths(...)`

这意味着“字段校验、跨字段联动触发、跨行校验”已经是同一套领域语义，不需要再拆第二套作者面。

### 3. computed 与 source 已进入主链

当前 `computed` 与 `source` 已经进入同一条 authoring 主链，并与校验共用同一份 field-kernel substrate。

Form 当前已经能表达：

- 同步派生
- `define.field(path).source({ resource, deps, key, submitImpact?, ... })`
- canonical list-item field path 会自动 lower 成 row-scoped source
- 字段镜像
- 基于 deps 的异步 source
- 行级 source
- 动态列表里的 row-scoped source

### 4. 动态列表已经有稳定 identity

Form 当前已经具备：

- `append / prepend / insert / update / replace / remove / swap / move`
- `byRowId(...).update(...)`
- `byRowId(...).remove(...)`
- `trackBy`
- `rowId`
- 重排后的错误归属稳定
- `values / errors / ui` 同步对齐

这条能力已经超过“只有 index 重排”的普通 field array。

### 5. runtime action residue 已经具备单点收口基础

当前公开主链已经具备一组统一动作：

- `validate`
- `validatePaths`
- `reset`
- `setError`
- `clearErrors`
- `submit`
- `field(path)`
- `fieldArray(path)`

这意味着组件外、测试、runtime 内部逻辑已经有统一动作基础。
legacy `commands` residue 仍可能存在于内部实现或旧测试语境里。当前 exact public surface 已经收口到单一 `submit` noun。

### 6. Schema 错误已经进入统一错误树

当前 schema decode 失败会写回 `errors.$schema`，UI 读取优先级也已经固定：

1. `errors.$manual.<path>`
2. `errors.<path>`
3. `errors.$schema.<path>`

### 7. React host 已经有 canonical thin projection route

当前 canonical host route 已经稳定收口到：

- `useModule(formProgram, options?)`
- `useSelector(handle, selector, equalityFn?)`
- `fieldValue(valuePath)`
- `rawFormMeta()`
- `Form.Error.field(path)`
  - 当前同一 token 已能覆盖 `error / pending / stale / cleanup` 四类最小 explain
  - `error` 当前最小带 `reasonSlotId + sourceRef`
  - list row field error 当前最小带 `subjectRef.kind="row"`

example-side `useFormField / useFormList / useFormMeta` 这类包装可以继续存在，但它们当前不构成 canonical owner。

### 8. builtin rule / i18n authoring 已进入当前主链

当前已经落地：

- builtin rule family：`required / email / minLength / maxLength / min / max / pattern`
- builtin default locale assets：`@logixjs/form/locales`
- builtin default message carrier：`I18nMessageToken`
- raw string sugar 的窄 allowlist：
  - 显式 `message` slot
  - `Form.Rule.make({ required: "..." })`
  - `Form.Rule.make({ email: "..." })`

## 当前只做到一半的能力

### 1. 条件字段生命周期

条件字段隐藏后的清理还没有正式语义。当前示例仍需要手工清理 `errors/ui`。

### 2. 列表结构编辑语义闭环

当前 exact surface 已经覆盖：

- `append / prepend / insert / update / replace / remove / swap / move`
- `byRowId`

当前缺的，是这些入口背后的 presence / cleanup / remap / roster replacement 语义闭环。

### 3. 异步任务状态投影

Form 内部已经有 path-scoped pending fiber、取消与 debounce，但这些状态还没有系统性投影进 `$form` 或 field view。

### 4. decoded submit output

当前 schema decode 主要用于写回错误树；成功后的 decoded payload 还没有成为稳定的提交主链输出。

### 5. reason / explainability / verification

form 侧还没有一条专门面向 Agent、trial 与 compare 的“按 path 解释 invalid/pending/cleanup/stale-drop 原因”的正式入口。

### 6. render boundary + i18n composition

当前 builtin i18n 已经落地，但 `leaf + snapshot + render-only context` 的正式 render contract 还没有闭环。

## 当前不把它算作 form 真缺口的项

这些项可以继续存在，但它们当前不构成 form 领域能力上限：

- RHF 风格的 `register`
- `Controller / useController`
- `FormProvider / useFormContext`
- `watch / useWatch`
- 任何只改变 React host DX、却不改变 runtime 语义的 sugar

这些能力若未来要补，默认继续留在 host projection，不把 form 或 kernel 拉回第二条作者面。

## 当前一句话结论

Form 当前真正已经成立的是“规则、派生、异步 source、稳定 row identity、结构编辑 surface、统一 runtime action、thin host projection 与 builtin i18n”这一条 program-first 领域主链；当前缺口主要落在 active-shape lifecycle、settlement / reason contract、decoded submit、verification feed 与 render boundary。
