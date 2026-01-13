---
title: 什么时候用 @logixjs/form？
description: 帮助你判断是否需要使用 @logixjs/form 而不是普通 Module。
---

`@logixjs/form` 是专门为表单场景设计的领域包。但不是所有涉及输入的场景都需要它。

## 用普通 Module 即可

以下场景，直接用 `Logix.Module` 管理状态就够了：

- **单字段输入**：搜索框、开关、简单筛选器
- **无校验需求**：不需要字段级错误提示
- **状态简单**：只是几个独立的值，没有复杂联动

```ts
// 简单搜索框，用普通 Module 就够了
const SearchModule = Logix.Module.make('Search', {
  state: Schema.Struct({ keyword: Schema.String }),
  actions: { setKeyword: Schema.String },
})
```

## 推荐使用 @logixjs/form

当你的表单具备以下特征时，`@logixjs/form` 会让你更轻松：

| 特征                     | 普通 Module           | @logixjs/form              |
| ------------------------ | --------------------- | ------------------------ |
| **多字段**（3+ 字段）    | 手写状态合并          | 内置管理                 |
| **字段级校验**           | 手写校验逻辑          | Rules DSL + 内置错误树   |
| **动态数组**（增删排序） | 手写 key/索引管理     | 稳定 identity + 优化渲染 |
| **跨字段联动派生**       | 手写 watcher          | Trait 声明式             |
| **提交状态**             | 手写 loading/disabled | 内置 meta                |

## 典型场景

### ✅ 用 @logixjs/form

- 用户注册表单（姓名、邮箱、密码 + 校验）
- 商品编辑表单（多字段 + 图片列表）
- 动态问卷（可增删的题目列表）
- 审批流配置（多步骤 + 字段联动）

### ⚠️ 可能不需要

- 搜索框 + 筛选条件（用普通 Module）
- 开关/Tab 切换（用普通 state）
- 只读数据展示（不是表单）

## 混合使用

你可以在同一个应用中混合使用：

- **普通 Module**：管理页面/路由/全局状态
- **@logixjs/form**：管理表单区域

```ts
// PageModule 管理页面状态
const PageModule = Logix.Module.make('OrderPage', {
  state: Schema.Struct({ activeTab: Schema.String }),
  // ...
})

// Form.make 管理表单
const OrderForm = Form.make({
  /* ... */
})
```

两者都运行在同一个 Runtime 中，共享调试、事务语义和 DevTools 能力。

## 下一步

- [Form 快速开始](./quick-start)
- [Rules DSL](./rules)
- [动态列表](./field-arrays)
