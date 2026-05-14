---
title: Canonical spine
description: 在 core、React 和领域包之间保持稳定的对象角色。
---

Logix 的公开路线是一条很小的 spine。把这些角色分清，大多数 API 选择都会变成机械判断。

## 对象

| 对象 | 角色 | 常见 owner |
| --- | --- | --- |
| `Module` | 定义期 state 和 action 契约。 | package 或 feature 文件 |
| `Module.logic` | 绑定到一个 module 的 logic authoring。 | feature logic 文件 |
| `Program` | 装配期业务单元。 | app、route、领域 factory |
| `Runtime` | 执行容器与控制面。 | app shell、测试、CLI |
| `RuntimeProvider` | runtime 的 React 投影。 | React root 或 subtree |
| `useModule` | 获取实例。 | 组件边界 |
| `useSelector` | 窄 state/read 投影。 | 组件读取点 |

## 默认应用形态

```text
feature.ts
  Module.make(...)
  Module.logic(...)
  Program.make(...)

runtime.ts
  Runtime.make(Program, { layer, devtools, middleware })

view.tsx
  <RuntimeProvider runtime={runtime}>
  const feature = useModule(Feature.tag)
  const value = useSelector(feature, fieldValue("value"))
```

`Program` 是复用单元。root 应用可以通过 `Program.capabilities.imports` 引入子 program。React 需要由组件或路由拥有局部实例时，使用 `useModule(Program, { key })`。

## 边界规则

- `Module` 定义形状，不运行应用。
- `Program` 装配声明、initial state、imports 和 services。
- `Runtime` 执行并产出报告，不是 authoring surface。
- React 通过 selector descriptor 或 selector function 读取；无参数整 state 读取不是公开路线。
- Form 等领域包会编译回同一条 `Program` 与 React host law。

## 延伸阅读

- [Modules and state](/cn/docs/guide/essentials/modules-and-state)
- [React 集成](/cn/docs/guide/essentials/react-integration)
- [Program API](/cn/docs/api/core/program)
