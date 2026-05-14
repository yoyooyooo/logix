---
title: React 集成
description: RuntimeProvider、useModule、useSelector、dispatch 与局部 ownership。
---

React 集成只有一个 provider 和几个常用 hook。provider 提供 runtime。组件获取 module instance，读取窄切片，派发 actions。

## Provider

```tsx
const runtime = Logix.Runtime.make(AppProgram)

<RuntimeProvider runtime={runtime}>
  <App />
</RuntimeProvider>
```

`RuntimeProvider` 也可以给某个 subtree 合并局部 `layer`。事务策略留在 `Program` 或 `Runtime`，不放在 React props 上。

开发期 HMR 由一个 host dev lifecycle carrier 处理，不在组件里写零散 cleanup。Vite 中一次性启用 `logixReactDevLifecycle()`，测试 setup 中一次性启用 `installLogixDevLifecycleForVitest()`。dev lifecycle carrier 拥有 hot boundary，并让 runtime owner 选择 `reset` 或 `dispose`；`RuntimeProvider` 只投影当前 runtime。hot lifecycle evidence 统一记录为 `runtime.hot-lifecycle`。

## 共享 runtime 实例

```tsx
const counter = useModule(Counter.tag)
```

当实例已经由 root program 或 imports 提供时，使用 module tag。

## 局部 program 实例

```tsx
const preview = useModule(PreviewProgram, { key: productId })
```

当实例应由 React 组件或路由拥有时，使用 program。`key` 用来分区实例；没有 key 时，实例是组件级私有。

## 读取

```tsx
const count = useSelector(counter, fieldValue("count"))
const [count, label] = useSelector(counter, fieldValues(["count", "label"]))
const isEmpty = useSelector(counter, (state) => state.count === 0)
```

状态字段优先用 `fieldValue` 和 `fieldValues`。派生 UI 读取可以用 selector function。读取对象时，如需避免等价结构引发重渲染，传入 `equalityFn`。

## Dispatch

```tsx
const dispatch = useDispatch(counter)
dispatch({ _tag: "increment", payload: undefined })
```

Dispatch 是进入 runtime 的输入。Effect 和 writeback 留在 logic。
