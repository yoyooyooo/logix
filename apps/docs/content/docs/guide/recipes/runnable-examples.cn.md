---
title: 可运行示例索引
description: 把 guide 中的 pattern 和 recipe 映射到仓库里的可运行示例。
---

这个索引把 guide 页面映射到 `examples/*` 下的可运行示例。

## 示例位置

- `examples/logix`：无 UI 的场景脚本
- `examples/logix-react`：带 DevTools 的可运行 React 应用

## Docs runner 约定

无 UI 的可运行 Program 示例使用应用侧 adapter：

```ts
export const Program = Logix.Program.make(RootModule, {
  initial: { count: 0 },
  logics: [],
})

export const main = (ctx, args) =>
  Effect.gen(function* () {
    const state = yield* ctx.module.getState
    return { count: state.count, args }
  })
```

docs runner 使用 `Runtime.run(Program, main, options)` 生成结果面板。Check 和 Trial 是按需诊断，返回 `VerificationControlPlaneReport`。

## Patterns

| Guide 页面 | 可运行代码 |
| --- | --- |
| pagination | `examples/logix-react/src/modules/querySearchDemo.ts` |
| optimistic update | `examples/logix/src/scenarios/optimistic-toggle.ts` |
| search and detail linkage | `examples/logix/src/scenarios/search-with-debounce-latest.ts` |
| i18n | `examples/logix/src/i18n-message-token.ts`、`examples/logix-react/src/modules/i18n-demo.ts` |

## 说明

- 可运行示例只提供证据，不提供 authority
- 公开 contract 继续由 API 文档和 SSoT 定义
- raw Effect smoke 示例可以作为 smoke run，但不展示 Check 或 Trial
