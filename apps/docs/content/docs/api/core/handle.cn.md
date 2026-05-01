---
title: Handle
description: 在 logic 内通过稳定的 handle 消费模块和服务。
---

在 logic 内，依赖消费最终会解析为一种 handle。

当前主要有两种：

- imported child handle，用于消费当前 parent imports scope 内的 child Program
- service handle，用于消费 runtime service tag

## imported child handle

当被消费的依赖是当前父 scope 拥有的 child Program 时，使用 imported child handle：

```ts
const child = yield* $.imports.get(Child.tag)
const value = yield* child.read((s) => s.value)
```

典型能力包括：

- 读取状态
- 观察变化
- 派发动作

child Program 必须通过 `Program.make(..., { capabilities: { imports: [ChildProgram] } })` 提供。

## service handle

当被消费的依赖是注入进 runtime 的服务时，使用 service handle：

```ts
const api = yield* $.use(UserService)
```

这适合这样一类场景：外部系统仍然是真理源，Logix 只负责消费它，而不把它镜像成模块状态。

## 说明

- 当依赖应该成为 parent scope 内的 Logix 状态资产时，用 imported child Program
- 当外部系统应该继续保留真理源角色时，用服务

## 相关页面

- [Bound API ($)](./bound-api)
- [跨模块协作](../../guide/learn/cross-module-communication)
