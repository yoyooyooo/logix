---
title: 性能与优化
description: 大表单/大列表下保持交互流畅的关键实践。
---

## 1) UI 订阅：优先用 `useFormState(form, selector)`

避免在 React 侧订阅整棵 values/errors：这会把小改动放大成大范围渲染。

推荐只订阅你真正需要的“视图状态切片”：

```ts
const canSubmit = useFormState(form, (v) => v.canSubmit)
const submitCount = useFormState(form, (v) => v.submitCount)
```

## 2) 校验触发：把“每次输入”留给增量

对复杂表单的常见策略是：

- 提交前：`validateOn=["onSubmit"]`（更省）
- 提交后：`reValidateOn=["onChange"]`（更即时）

当你只想校验某一段路径时，优先用 `controller.validatePaths(...)` 精准触发。

> 建议：把“跨字段联动触发”写成显式 `deps`，把“什么时候自动校验”写成 `validateOn/reValidateOn`（表单级）或规则上的 `validateOn`（规则级，仅 onChange/onBlur）。

## 3) 动态列表：提供稳定 identity（trackBy）

对长列表来说，显式声明 list identity（推荐 `trackBy`）的收益通常体现在：

- React `key` 稳定，重排/插入时少重渲染
- 行级错误与 UI 状态更稳定，不容易错位

## 4) 把重型逻辑移出同步校验

同步校验与同步派生适合轻量工作（纯函数、快速、可预测）。当你需要 IO 或重计算时，优先用 `source` 或把重逻辑下沉到服务调用，避免把每次输入的事务窗口拖得过长。

> 实践：列表场景里，跨行规则尽量写成 list scope（一次扫描 + 写回 `errors.<list>.$list/rows[]`），避免在 item scope 里重复做 O(n) 扫描。

## 5) 写回方式：优先字段级写入（`mutate`/controller），避免全量替换

`useFormState(form, selector)` 能减少 React 重渲染，但并不能抵消“全量写入”带来的派生/校验成本。

在 Logix 中，`update/setState` 这类“全量替换”写法通常无法提供明确的变更路径证据，运行时更容易把派生/校验退化为全量处理；表单越大、输入越频繁，这个差距越明显。

在高频输入与联动场景下，优先使用：

- `field.onChange/onBlur`、`controller.setValue/setError/clearErrors/...`（让表单内部保持字段级影响域）
- 在自定义 Logic 中用 `$.state.mutate(...)`（让运行时自动采集变更路径）
- 在 `Module.make({ immerReducers })` 中直接写 draft 风格 reducers（或在 `Module.make({ reducers })` 中用 `Logix.Module.Reducer.mutate(...)` / `Logix.Module.Reducer.mutateMap({...})` 批量包装）

如果你的表单很小、更新频率很低，那么 `update` + selector 在大多数日常场景也可以工作；只是当你开始关心性能上界时，应优先把高频写回迁到 `mutate`/controller。
