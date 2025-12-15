---
title: Dynamic List & Linkage (v3)
status: draft
version: 2025-12-14
value: pattern
priority: later
related:
  - ./10-scenarios-and-gaps.md
  - ../../../../specs/007-unify-trait-system/contracts/form.md
---

# Dynamic List & Linkage (v3)

> 收敛说明：本文最初以 `@logix/reactive/DynamicList` 等 Helper 叙事组织。  
> 007 之后，这类能力应被视为“Form/Trait 的场景与验收样本”，而不是另一套 Runtime/Helper 事实源。

**场景**：复杂动态列表（Form Array），含增删改查、异步上传、字段联动。

## 1. The Dynamic List Helper

在 V3 中，复杂的增删改逻辑被封装为一个 **Logic Helper**。

```ts
import { DynamicList } from '@logix/reactive'

const EducationLogic = ResumeModule.logic(($) =>
  // 🌟 DynamicList.logic($, ...)
  DynamicList.logic($, {
    path: (s) => s.educationList,
    key: 'id',

    // Auto-binds actions if likely named, or explicit map
    actions: {
      add: 'edu/add',
      remove: 'edu/remove',
      update: 'edu/update',
    },

    // Initial Item Factory
    factory: () => ({ id: nanoid(), degree: '' }),
  }),
)
```

## 2. 字段联动 (Linkage)

联动逻辑使用 `Reactive.effect` 或 `Reactive.computed` Helper 实现。

```ts
const ValidationLogic = ResumeModule.logic(($) =>
  Reactive.effect($, {
    deps: (s) => s.educationList,
    fn: (list) =>
      Effect.gen(function* () {
        const errors = validate(list)
        if (errors.length) yield* $.actions.setErrors(errors)
      }),
  }),
)
```

## 3. 异步项操作 (Async Item Logic)

针对列表项的异步操作（如上传），推荐使用带有 `key` 过滤的 Helper（未来可在 `@logix/reactive` 中扩充）。

```ts
// 概念示例
Reactive.forEachItem($, {
  list: (s) => s.educationList,
  key: 'id',
  trigger: (item) => item.uploadTrigger, // 假设有个 trigger 字段
  fn: (item) => UploadService.upload(item.file),
})
```

## 4. 总结

`DynamicList` 只是一个高级的 Helper。它证明了 Logix V3 架构的强大：
**任何复杂的 UI 模式，都可以沉淀为一个 `($) => Effect` 函数。**
