# Logix

[English](README.md) | [中文](README.zh-CN.md)

Logix 是一个 **Effect-native 的前端状态与业务逻辑运行时**。

本仓库是 Logix 的孵化用 Monorepo：包含运行时内核、React 适配层、Devtools、浏览器 Sandbox，以及可运行的示例与文档站。
仓库演进速度快，遵循 **forward-only**（不承诺向后兼容）。
本 README 只聚焦 Logix；其它目录可能包含实验内容，随演进被替换或删除。

## Logix 用来解决什么？

- 用 `effect/Schema` 定义 **强类型模块**（State + Actions）。
- 用 **Effect 程序**编排异步业务流程，替代散落各处的 `useEffect` 胶水与竞态修补。
- 用清晰的模块边界组织复杂业务，天然可测试，并为可观测/诊断预留链路。

## 核心心智模型

- **Module**：业务边界单元（身份 + State/Actions 形状）。
- **Logic**：通过绑定 API `$` 监听 Actions / State 变化的 Effect 程序。
- **Runtime**：托管模块实例，运行 Logic/Processes，并注入依赖 Layer。

## 最小示例

```ts
import * as Logix from '@logix/core'
import { Effect, Schema } from 'effect'

export const CounterDef = Logix.Module.make('Counter', {
  state: Schema.Struct({ count: Schema.Number }),
  actions: { inc: Schema.Void },
})

export const CounterLogic = CounterDef.logic(($) =>
  Effect.gen(function* () {
    yield* $.onAction('inc').update((s) => ({ ...s, count: s.count + 1 }))
  }),
)

export const CounterModule = CounterDef.implement({
  initial: { count: 0 },
  logics: [CounterLogic],
})
```

## 快速开始（从本仓库跑起来）

1. 安装依赖：

```bash
pnpm install
```

2. 跑 React Demo：

```bash
pnpm -C examples/logix-react dev
```

3. 跑一个 Node 场景脚本：

```bash
pnpm tsx examples/logix/src/scenarios/and-update-on-action.ts
```

4. 阅读双语文档站：

```bash
pnpm -C apps/docs dev
# 打开 http://localhost:3000
```

## 包结构

- `packages/logix-core` → `@logix/core`（内核：Module / Logic / Flow / Runtime / `$`）
- `packages/logix-react` → `@logix/react`（React 适配：`RuntimeProvider`、hooks）
- `packages/logix-devtools-react` → `@logix/devtools-react`（Devtools UI）
- `packages/logix-sandbox` → `@logix/sandbox`（浏览器 Worker Sandbox）
- `packages/logix-test` → `@logix/test`（测试工具）

扩展与能力包：`packages/logix-form`、`packages/logix-query`、`packages/i18n`、`packages/domain`。

## 文档入口

- 入门介绍：`apps/docs/content/docs/guide/get-started/introduction.md`
- 快速上手：`apps/docs/content/docs/guide/get-started/quick-start.md`
- 教程（表单）：`apps/docs/content/docs/guide/get-started/tutorial-first-app.md`

## 开发命令

- 构建 packages（部分示例/工具依赖产物）：`pnpm build:pkg`
- 类型检查：`pnpm typecheck`
- 代码规范：`pnpm lint`
- 测试：`pnpm test`（或 `pnpm test:turbo`）
