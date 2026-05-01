---
title: ModuleRuntime 实例与生命周期
description: 追踪 Runtime 边界与 React 局部 scope 中的模块实例身份。
---

ModuleRuntime 的身份由两个因素决定：托管它的 Runtime scope，以及用于解析它的 Module tag。

canonical 概念只有三类：

- `ModuleDef`：`Logix.Module.make(...)` 返回的定义对象，描述 state/actions，并暴露 `.tag`。
- `Program`：`Logix.Program.make(...)` 返回的装配期业务单元。
- `ModuleRuntime`：可读状态、可 dispatch 的运行时实例。

## 基础心智

```ts
export const RegionDef = Logix.Module.make("RegionModule", { state, actions })

export const RegionLogic = RegionDef.logic<RegionService>("region", ($) => {
  // reducers, watchers, effects
  return Effect.void
})

export const RegionProgram = Logix.Program.make(RegionDef, {
  initial,
  logics: [RegionLogic],
})
```

- `RegionDef` 描述数据与事件形状。
- `RegionLogic` 描述行为。
- `RegionProgram` 是传给 Runtime 与 React host API 的 canonical 单元。
- 当某个 Runtime scope 已经托管实例时，`RegionDef.tag` 负责解析该实例。

## 应用级共享实例

如果整个 app 或页面子树应共享同一个实例，用 Runtime 边界托管：

```ts
const AppRuntime = Logix.Runtime.make(RegionProgram, {
  layer: RegionServiceLive,
})
```

```tsx
root.render(
  <RuntimeProvider runtime={AppRuntime}>
    <RegionPage />
  </RuntimeProvider>,
)

function RegionPage() {
  const region = useModule(RegionDef.tag)
  const state = useSelector(region, (s) => s)
}
```

同一个 provider scope 内的 `useModule(RegionDef.tag)` 都会解析到同一个托管实例。

## 组件局部实例

如果每个组件或 key 都应拥有局部实例，用 Program 形态：

```tsx
function RegionSection({ id }: { id: string }) {
  const region = useModule(RegionProgram, { key: `region:${id}` })
  const state = useSelector(region, (s) => s)
}
```

同一个 React scope 内，每个不同 `key` 都对应一个局部实例。

## 局部服务

如果 Program 需要局部 service 绑定，通过 Runtime 或 React host options 提供，不暴露底层实现对象：

```tsx
function RegionSection() {
  const region = useModule(RegionProgram, {
    key: "region:local",
    layer: RegionServiceLive,
  })
  const state = useSelector(region, (s) => s)
}
```

服务需要共享时，优先使用应用级 `Runtime.make(Program, { layer })`。服务需要局部化时，优先使用 `useModule(Program, { key, layer })`。

## 总结

- 相同 Runtime scope + 相同 Module tag -> 相同共享实例。
- 相同 Program + 相同局部 key -> 相同局部实例。
- 不同局部 key -> 不同实例。
- 阅读路径固定为 `Program` 与 `ModuleTag`。低层实现对象不属于 canonical public path。
