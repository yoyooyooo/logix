---
title: Runtime
description: 创建 runtime container，并运行 verification control-plane 命令。
---

`Runtime` 是 execution-time surface。它消费 `Program`，持有 module runtimes 与 services，并区分 result face 与 verification face。

## 创建 runtime

```ts
const runtime = Logix.Runtime.make(RootProgram, {
  layer: AppLayer,
  devtools: { diagnosticsLevel: "light" },
})
```

传给 React：

```tsx
<RuntimeProvider runtime={runtime}>
  <App />
</RuntimeProvider>
```

`RuntimeProvider` 只是把 runtime 投影到 React；它不创建第二套 control plane。

## One-shot run

`Runtime.run(Program, main, options?)` 是 result face。它启动 Program，用 program run context 运行 `main`，关闭 scope，并返回应用结果。

```ts
const result = await Logix.Runtime.run(RootProgram, (ctx) =>
  ctx.runtime.runPromise(/* Effect work */),
)
```

它不返回 verification report。

## Verification faces

```ts
const checkReport = Logix.Runtime.check(RootProgram)
const trialReport = await Logix.Runtime.trial(RootProgram, options)
```

- `Runtime.check(...)` 是 static diagnostic face。
- `Runtime.trial(...)` 是 startup/scenario diagnostic face。
- `Runtime.compare(...)` 属于 verification control plane，用于 report comparison/admissibility。

## React 中的局部实例路线

Program 也可以直接被 React 用于 local/keyed module instance：

```tsx
const editor = useModule(EditorProgram, { key: `editor:${id}` })
```

这条路线仍使用当前 runtime scope，不替代应用根部的 `Runtime.make(...)`。

## See also

- [Program](./program)
- [RuntimeProvider](/cn/docs/api/react/provider)
- [useModule](/cn/docs/api/react/use-module)
