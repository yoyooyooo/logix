---
title: API
description: Logix 公开 packages 的契约页。
---

这些页面用于说明公开契约。完整签名和导出类型查看生成的 [API Reference](/api-reference)。

## Core

| 页面 | Export |
| --- | --- |
| [Module](/cn/docs/api/core/module) | `@logixjs/core/Module` 和 `Logix.Module` |
| [Program](/cn/docs/api/core/program) | `@logixjs/core/Program` 和 `Logix.Program` |
| [Runtime](/cn/docs/api/core/runtime) | `@logixjs/core/Runtime` 和 `Logix.Runtime` |
| [Bound API](/cn/docs/api/core/bound-api) | `Module.logic` 内的 `$` |
| [Handle](/cn/docs/api/core/handle) | module handle read/dispatch view |
| [Match builder](/cn/docs/api/core/match-builder) | fluent matching helper |

## React

| 页面 | Export |
| --- | --- |
| [RuntimeProvider](/cn/docs/api/react/provider) | `RuntimeProvider` |
| [useModule](/cn/docs/api/react/use-module) | shared/local 实例获取 |
| [useSelector](/cn/docs/api/react/use-selector) | 精确读取 |
| [useDispatch](/cn/docs/api/react/use-dispatch) | dispatch helper |
| [useImportedModule](/cn/docs/api/react/use-imported-module) | child program handle lookup |

## Domain packages

Form 的指南在 [Form](/cn/docs/form)。它仍然编译回同一条 `Program` 与 React host law。
