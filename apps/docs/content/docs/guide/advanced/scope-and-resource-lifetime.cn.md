---
title: Scope 与 resource lifetime
description: 理解 runtime、provider、local Program 与 service layer 的生命周期。
---

Resource lifetime 跟随创建它的 owner。

## Runtime scope

`Runtime.make(Program, options?)` 创建的 runtime 持有 module runtime graph 与 root service layer，直到被 dispose。

## Provider scope

`RuntimeProvider` 把 runtime 暴露给 React。provider 可以增加 subtree `layer`，但不会自动 dispose 从外部传入的 shared runtime。

## Local Program scope

`useModule(Program, options)` 在当前 provider runtime scope 内创建或复用 Program instance。

```tsx
const editor = useModule(EditorProgram, {
  key: `editor:${id}`,
  gcTime: 60_000,
})
```

`gcTime` 控制最后一个 holder 卸载后的 keep-alive 窗口。

## Service layers

应用级 services 放在 `Runtime.make(...)` 附近安装。只属于 route/subtree 的 services 可以通过 `RuntimeProvider layer` 安装，让它们跟随 React subtree lifetime。

## Avoid

- 每次 render 创建新的 Layer object；
- 在 React local state 中复制 resource truth；
- 添加绕过 Runtime ownership 的 lifecycle helper；
- 依赖已移除的 local-module 或 scope helper APIs。
