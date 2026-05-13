---
title: Instances
description: 在 React 中选择共享 Form 实例、局部 Form 实例和 keyed Form 实例。
---

Form 实例的生命周期由 React host 决定。
`Form.make(...)` 只声明表单程序；真正的运行时实例来自 `RuntimeProvider` 和 `useModule(...)`。

## 默认选择

| 需求 | 写法 | 生命周期 |
| --- | --- | --- |
| 应用或路由只有一个共享表单 | `useModule(UserForm.tag)` | 由当前 `RuntimeProvider` 托管 |
| 组件需要自己的独立副本 | `useModule(UserForm)` | 当前组件私有 |
| 多个组件需要复用同一个局部副本 | `useModule(UserForm, { key })` | 同一个 provider scope 和 key 下复用 |
| 卸载后短时间恢复 | `useModule(UserForm, { key, gcTime })` | 最后一个 holder 卸载后按 `gcTime` 保活 |

## 共享实例

共享实例适合 route 级或 app 级表单，例如一个页面只有一个编辑会话。

```tsx
const runtime = Logix.Runtime.make(UserForm)

function Page() {
  const form = useModule(UserForm.tag)
  const email = useSelector(form, (s) => s.email)
}
```

`useModule(UserForm.tag)` 会查找当前 runtime scope 中已经托管的实例。
它不会创建新的 Form runtime。

## 组件私有实例

同一个页面渲染多个互不影响的表单副本时，使用 program route。

```tsx
function EditorCard() {
  const form = useModule(UserForm)
  const email = useSelector(form, (s) => s.email)
}
```

未传 `key` 时，每个组件调用拥有自己的实例。
即使两个组件使用同一个 `FormProgram`，它们也不会因为默认 suspend 行为而合并成同一个实例。

## Keyed 实例

当一个表单需要跨组件、标签页或 route segment 复用时，显式传入 `key`。

```tsx
function UserEditor({ userId }: { userId: string }) {
  const form = useModule(UserForm, { key: `user:${userId}` })
  const email = useSelector(form, (s) => s.email)
}
```

相同 `Program`、相同 provider runtime scope、相同 `key` 会复用同一个实例。
不同 provider runtime scope 或不同 `Program` 即使 key 相同，也会得到不同实例。

## 路由切换后恢复

如果用户切到别的路由后很快回来，可以给 keyed 实例设置 `gcTime`。

```tsx
const form = useModule(CheckoutForm, {
  key: `checkout:${cartId}`,
  gcTime: 60_000,
})
```

最后一个 holder 卸载后，实例会在 `gcTime` 窗口内保留。
窗口内重新挂载会恢复原实例；窗口过后再挂载会创建新实例。

恢复性能主要取决于：

- 表单状态大小
- 订阅切片数量
- 列表行数和 row identity 模式
- source 是否需要重新发起远端加载

读取仍应保持窄切片：

```tsx
const canSubmit = useSelector(
  form,
  (s) => s.$form.errorCount === 0 && !s.$form.isSubmitting,
)
const visibleRows = useSelector(form, (s) => s.items)
```

## 何时不用共享实例

不要用共享实例承载本应互相独立的表单副本。
如果两个组件都需要编辑同一个 `FormProgram`，但用户预期它们互不影响，就使用 `useModule(FormProgram)` 或不同的 keyed 实例。

## 延伸阅读

- [Quick start](/cn/docs/form/quick-start)
- [Performance](/cn/docs/form/performance)
- [useModule](/cn/docs/api/react/use-module)
- [RuntimeProvider](/cn/docs/api/react/provider)
