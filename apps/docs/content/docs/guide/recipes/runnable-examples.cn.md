---
title: 可运行示例索引
description: 把 Patterns/Recipes 与 examples/logix、examples/logix-react 的可运行代码对齐起来。
---

本页把“Cookbook 风格”的文档（Patterns/Recipes）与 `examples/*` 下的可运行代码做映射，方便直接跑起来对照理解。

## 示例目录在哪里

- `examples/logix`：脚本化场景（无 UI）。运行单文件：`pnpm -C examples/logix exec tsx <path>`
- `examples/logix-react`：可运行 React 应用 + DevTools。启动：`pnpm -C examples/logix-react dev`

## 映射表

### Patterns

| Guide 页面 | 可运行代码 |
| --- | --- |
| [分页加载](../patterns/pagination) | `apps/docs/content/docs/guide/get-started/tutorial-complex-list.md`（教程）· `examples/logix-react/src/modules/querySearchDemo.ts` |
| [乐观更新](../patterns/optimistic-update) | `examples/logix/src/scenarios/optimistic-toggle.ts` · `examples/logix/src/scenarios/optimistic-toggle-from-pattern.ts` · `examples/logix/src/patterns/optimistic-toggle.ts` |
| [搜索 + 详情联动](../patterns/search-detail) | `examples/logix/src/scenarios/search-with-debounce-latest.ts` · `examples/logix/src/scenarios/cross-module-link.ts` · `examples/logix-react/src/modules/querySearchDemo.ts` |
| [国际化（i18n）](../patterns/i18n) | `examples/logix/src/i18n-message-token.ts` · `examples/logix/src/i18n-async-ready.ts` · `examples/logix-react/src/modules/i18n-demo.ts` |
| [多步表单（Wizard）](../patterns/form-wizard) | 暂无专门 wizard 示例；最接近的 form-heavy demos：`examples/logix-react/src/modules/trait-form.ts` · `examples/logix-react/src/modules/complex-trait-form.ts` |

### Recipes

| Guide 页面 | 可运行代码 |
| --- | --- |
| [ExternalStore](./external-store) | `examples/logix/src/scenarios/external-store-tick.ts` |
