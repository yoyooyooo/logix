---
title: Reactive Paradigm (v3)
status: merged
version: 3.0.1
related:
  - ../state-graph-and-capabilities/01-field-capabilities-overview.md
  - ../capability-plugin-system/01-capability-plugin-blueprint.md
---

# Reactive Paradigm (v3)

> **说明**：本篇的核心抽象（Computed 字段能力、Reactive Schema 与 Bound Helper 的关系）已收敛到  
> `topics/state-graph-and-capabilities/01-field-capabilities-overview.md` 中，这里保留 Helper 级细节与示例。

**核心理念**：Reactive 不是 Logix Core 的魔法，而是一组标准的 **Bound Helper**。

## 1. Reactive Helpers (Layer 2)

最基础的响应式能力通过 Helper 暴露。

### 1.1 Computed Helper

```ts
import { Reactive } from '@logix/reactive'

export const FullNameLogic = UserModule.logic(($) =>
  // 🌟 Reactive.computed($, ...)
  Reactive.computed($, {
    target: 'fullName',
    deps: (s) => [s.firstName, s.lastName],
    derive: ([first, last]) => `${first} ${last}`,
  }),
)
```

**原理**：
它只是 `$.flow.fromState` + `$.state.update` 的封装：

```ts
// Under HTML hood
$.flow.fromState(config.deps).pipe(
  $.flow.distinctUntilChanged(),
  $.flow.runLatest((vals) =>
    $.state.update((draft) => {
      draft[config.target] = config.derive(vals)
    }),
  ),
)
```

### 1.2 Effect Helper

用于纯副作用（不更新 State）。

```ts
export const TrackLogic = UserModule.logic(($) =>
  Reactive.effect($, {
    deps: (s) => s.currentPage,
    fn: (page) => Analytics.track('view', page),
  }),
)
```

## 2. Reactive Schema (Layer 1)

同样支持 `CapabilityMeta` 协议，在 Schema 中声明响应式关系。

```ts
const UserState = Schema.Struct({
  firstName: Schema.String,
  lastName: Schema.String,

  // 🌟 Reactive.computed (L1 Metadata)
  fullName: Reactive.computed<Schema.String>({
    deps: (s) => [s.firstName, s.lastName],
    derive: ([f, l]) => `${f} ${l}`,
  }),
})
```

当 `Module.live` 时，元数据被扫描，自动调用 Layer 2 Helper。

## 3. 统一数据流

在 V3 架构中，Reactive, Query, Router 本质都是一样的：

- **Layer 1**: Metadata in Schema
- **Layer 2**: Bound Helper in Logic

这种统一性极大地降低了开发者的心智负担。
