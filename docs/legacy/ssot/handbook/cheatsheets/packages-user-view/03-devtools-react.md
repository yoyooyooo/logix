# 3) `@logixjs/devtools-react`（Devtools UI）

## 你在什么情况下会用它

- 需要在浏览器里看 Timeline/事件/收敛/回放等调试视图。

## 最小用法

- 在 App 根部挂载 `<LogixDevtools />`：`examples/logix-react/src/App.tsx`
- 同时在 Runtime 开启 devtools（推荐）：`Logix.Runtime.make(..., { devtools: true })`
- 进阶：需要导入/离线分析时，才使用 `DevtoolsLayer`（见 `packages/logix-devtools-react/src/DevtoolsLayer.tsx`）

## 文档入口

- `apps/docs/content/docs/guide/advanced/debugging-and-devtools.md`
