---
title: React 集成 recipe
description: 创建 runtime、挂载、获取实例、精确读取并安全写入。
---

## Runtime

```ts
const CounterProgram = Logix.Program.make(Counter, {
  initial: { value: 0 },
  logics: [CounterLogic],
})

const runtime = Logix.Runtime.make(CounterProgram)
```

## Provider

```tsx
<RuntimeProvider runtime={runtime}>
  <App />
</RuntimeProvider>
```

## Shared instance

```tsx
const counter = useModule(Counter.tag)
```

## Keyed local instance

```tsx
const form = useModule(ContactForm, { key: `contact:${id}` })
```

## Read and write

```tsx
const value = useSelector(counter, (state) => state.value)
const dispatch = useDispatch(counter)
dispatch({ _tag: "inc", payload: undefined })
```

## Imported child

```tsx
const host = useModule(HostProgram, { key: "session-a" })
const child = useImportedModule(host, Child.tag)
```

child 必须通过 `Program.make(..., { capabilities: { imports: [ChildProgram] } })` 提供。

## Do not use

- 在 `useModule(...)` 中使用裸 module objects；
- 无参数 `useSelector(handle)`；
- `useLocalModule`、`useModuleList` 或 `ModuleScope` 等已移除 API。
