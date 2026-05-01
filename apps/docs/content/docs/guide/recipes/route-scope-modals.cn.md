---
title: 路由 Scope 下的弹框 Keepalive
description: 通过 host 实例拥有 imported child modules，把弹框状态限制在路由 scope 内。
---

这份配方用一个 host 实例来建模路由范围内的弹框状态。

路由 host 持有 scope。
弹框模块作为 imported child，从这个 host scope 中解析。

## Host program

```ts
export const RouteHostProgram = Logix.Program.make(RouteHostDef, {
  initial: {},
  capabilities: {
    imports: [ModalAProgram],
  },
})
```

## 路由边界

```tsx
export function RoutePage() {
  const host = useModule(RouteHostProgram, { gcTime: 0 })
  return <ModalAView host={host} />
}
```

## 弹框解析

```tsx
function ModalAView({ host }: { host: any }) {
  const modalA = host.imports.get(ModalA.tag)
  const text = useSelector(modalA, (s) => s.text)
  return <div>{text}</div>
}
```

这种结构下：

- 关闭弹框只会卸载 UI
- 离开路由时，host 和它 imports 下的弹框模块会一起销毁

## ModuleScope 变体

当不希望透传 props 时，可以用 `ModuleScope` 打包同一模式：

```ts
export const RouteHostScope = ModuleScope.make(RouteHostProgram, { gcTime: 0 })
```

## 相关页面

- [ModuleScope](../../api/react/module-scope)
- [useImportedModule](../../api/react/use-imported-module)
