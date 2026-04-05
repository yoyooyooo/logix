---
title: Form Field Kernel Boundary
status: living
version: 2
---

# Form Field Kernel Boundary

## 当前总判断

Form 的合理定位是：

- 上层保留领域 DSL
- 下层共享 `field-kernel`

## field-kernel 承接什么

更适合进入 field-kernel 的能力：

- `field / list / root`
- `deps`
- `check / computed / source / link`
- 通用 writeback 形式
- `patchPaths / dirtySet`
- 字段 path canonical
- `Program / Graph / Plan`
- `identityHint / trackBy / rowId`
- item/list/root scope 的统一表达

## Form 层保留什么

更适合留在 Form 层的能力：

- `values + errors + ui + $form`
- `touched / dirty / submitCount / isSubmitting / canSubmit`
- `validateOn / reValidateOn`
- `controller`
- `useForm / useField / useFieldArray / useFormState`
- `errors/ui` 对 list identity 的领域映射

## `derived` 的位置

当前规则：

- `derived` 退出 Form 顶层概念
- 它继续承接联动 / 派生语义
- 底层严格降到 `computed / source / link`

## Form 作者面

当前推荐把 Form 顶层入口收敛为：

- `logic`

方向是：

- 校验、联动、提交前约束都直接归入 `logic` 家族的明确分区
- 不再为过渡保留单独 `rules` 顶层壳层
- 直接 `StateTrait.from(...)` 继续停留在 field-kernel expert 入口

## 当前一句话结论

Form 不再围绕 `derived + rules + traits` 三套顶层入口组织，后续方向是“Form 保领域 DSL，field-kernel 保底层能力，作者面统一向 `logic` 家族收敛”。
