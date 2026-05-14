---
title: API Reference
description: 当前公开面的手写 API 文档，以及生成的签名索引。
---

这些页面用于确认对象角色与 canonical usage。需要精确签名时，使用生成的 [API Reference](/api-reference)。

## Core

1. [Module](/cn/docs/api/core/module)
2. [Program](/cn/docs/api/core/program)
3. [Runtime](/cn/docs/api/core/runtime)
4. [Bound API ($)](/cn/docs/api/core/bound-api)
5. [Handle](/cn/docs/api/core/handle)
6. [Match builder](/cn/docs/api/core/match-builder)

## React

1. [RuntimeProvider](/cn/docs/api/react/provider)
2. [useModule](/cn/docs/api/react/use-module)
3. [useSelector](/cn/docs/api/react/use-selector)
4. [useDispatch](/cn/docs/api/react/use-dispatch)
5. [useImportedModule](/cn/docs/api/react/use-imported-module)

## 已从用户文档移除的路线

当前公开 React 文档不包含 `useLocalModule`、`useModuleList` 或 `ModuleScope`。局部/带 key 的实例使用 `useModule(Program, options)`；列表映射使用普通组件组合。
