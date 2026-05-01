---
title: Runtime
description: 构造 Logix runtime，在 React 中挂载它，并在不同宿主环境里执行 programs。
---

`Runtime` 是 Logix 的执行容器。

它承载：

- 模块状态
- logic 执行
- process 和 link 安装
- runtime 作用域内的服务

## 构造

当前 canonical 构造路线是：

```ts
import * as Logix from "@logixjs/core"
import { Layer } from "effect"

const RootProgram = Logix.Program.make(RootModule, {
  initial: { /* ... */ },
  capabilities: {
    services: [/* ... */],
    imports: [/* ... */],
  },
  logics: [/* ... */],
})

const runtime = Logix.Runtime.make(RootProgram, {
  layer: Layer.empty,
})
```

## 在 React 中挂载

```tsx
import { RuntimeProvider } from "@logixjs/react"

export function App() {
  return (
    <RuntimeProvider runtime={runtime}>
      <Router />
    </RuntimeProvider>
  )
}
```

`RuntimeProvider` 会把 runtime 暴露给 React 子树。

## 在 Node 和测试中使用

runtime 也可以直接执行 effects：

```ts
void runtime.runPromise(program)
```

## 一次性 Program 运行

`Runtime.run(Program, main, options)` 是 result face。它启动 Program，把 program run context 传给 `main`，释放 runtime scope，并返回 `main` 产出的值。

```ts
import { Effect, Layer } from "effect"
import * as Logix from "@logixjs/core"

const result = await Logix.Runtime.run(
  RootProgram,
  ({ module }) =>
    Effect.gen(function* () {
      const state = yield* module.getState
      return { count: state.count }
    }),
  {
    layer: Layer.empty,
    handleSignals: false,
  },
)
```

`Runtime.run` 返回应用结果。它不返回 `VerificationControlPlaneReport`。

## 局部覆盖

`RuntimeProvider` 可以为某个子树叠加额外的 `layer`：

```tsx
<RuntimeProvider runtime={runtime} layer={FeatureLayer}>
  <Feature />
</RuntimeProvider>
```

## 说明

- `Runtime.make(Program)` 是当前 canonical runtime 入口
- `Runtime.run(Program, main, options)` 是一次性结果运行入口
- `RuntimeProvider` 负责把 runtime 挂到 React，当前不定义第二条 control plane
- runtime 的释放由创建它的宿主负责

## Verification control plane

runtime control plane 与 authoring 分开。

```ts
Logix.Runtime.run(program, main, options)
Logix.Runtime.check(program)
Logix.Runtime.trial(program, options)
```

Runtime.run is the result face. Runtime.trial is the diagnostic run face. Runtime.check is the static diagnostic face.

`Runtime.check(Program, options?)` 是低成本静态验证门禁。它返回 `stage="check"`、`mode="static"` 的 `VerificationControlPlaneReport`。它不启动 program，也不执行行为。

`Runtime.trial(Program, options)` 执行验证运行，包括基于 `fixtures / env / steps / expect` 的 scenario run。

这些路线不进入 Form authoring surface。

`runtime.compare` 只按 control-plane stage 冻结。root `Runtime.compare` 产品化继续等待明确的 runtime authority intake，它不拥有第二套 correctness truth 或 benchmark truth。

## 相关页面

- [Module](./module)
- [RuntimeProvider](../react/provider)
