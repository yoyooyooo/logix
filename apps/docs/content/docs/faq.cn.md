---
title: 常见问题 (FAQ)
description: Logix 常见问题解答，帮助你快速找到答案。
---

# 常见问题 (FAQ)

## 概念与选型

### Logix 和 Redux/Zustand 有什么区别？

| 对比点   | Redux/Zustand            | Logix                       |
| -------- | ------------------------ | --------------------------- |
| 异步处理 | 需要中间件（thunk/saga） | 内置 Effect + Flow          |
| 并发控制 | 手动管理                 | `runLatest/runExhaust` 内置 |
| 类型安全 | 手动维护                 | Schema 自动推导             |
| 可观测性 | 需配合 DevTools          | 内置事件管道                |

**简单来说**：如果你的业务有复杂的异步/并发逻辑，Logix 会更合适；如果只是简单的全局状态，Zustand 可能更轻量。

### Logix 和 XState 有什么区别？

- **XState** 适合需要严格状态机建模的场景（有限状态 + 明确转换）
- **Logix** 适合数据驱动的业务逻辑（状态可以是任意结构 + 响应式流）

两者可以结合使用：用 XState 管理流程状态机，用 Logix 管理业务数据。

### 什么时候用 @logixjs/form 而不是普通 Module？

**用普通 Module**：

- 单字段输入（搜索框、开关）
- 不需要复杂校验

**用 @logixjs/form**：

- 多字段表单（3+ 字段）
- 需要字段级校验 + 错误展示
- 动态数组（增删改排序）
- 跨字段联动派生

### Effect 的学习曲线会不会很陡？

不需要一开始就学会 Effect 的所有概念。Logix 的 Bound API (`$`) 封装了大部分底层细节：

```ts
// 不需要知道 Effect 细节，只需要知道：
yield* $.onAction('save').run(() =>
  $.state.mutate((draft) => {
    draft.saved = true
  }),
)
```

只有在需要高级能力（重试、超时、资源管理）时，再深入学习 Effect。

---

## 使用与调试

### 如何在 DevTools 中查看 Action 历史？

1. 在 Runtime 配置中启用 DevTools：
   ```ts
   const runtime = Logix.Runtime.make(RootImpl, { devtools: true })
   ```
2. 在 React 应用中添加 DevTools 组件：
   ```tsx
   import { LogixDevtools } from '@logixjs/devtools-react'
   ;<LogixDevtools position="bottom-left" />
   ```
3. 打开浏览器，在时间线中查看 Action 事件

### 为什么我的 watcher 没有触发？

常见原因：

1. **Selector 返回相同引用**：`$.onState(s => s)` 会在每次状态变化时触发，但 `$.onState(s => s.user)` 只在 `user` 变化时触发
2. **watcher 位于 setup 段**：确保 `$.onAction/$.onState` 在 run 段（`Effect.gen` 内部）调用
3. **Logic 未挂载**：检查 `implement({ logics: [...] })` 是否包含该 Logic

### 如何正确取消正在进行的请求？

使用 `runLatest`：

```ts
yield* $.onAction('search').runLatest(({ payload: keyword }) =>
  Effect.gen(function* () {
    const results = yield* api.search(keyword)
    yield* $.state.mutate((draft) => {
      draft.results = results
    })
  }),
)
```

当新的 `search` Action 到来时，之前的请求会被自动取消。

---

## 性能与生产

### Logix 的性能开销是多少？

- **状态更新**：使用 `SubscriptionRef`，变化检测是 O(1)
- **派生计算**：支持脏检查，只重算受影响的 trait
- **DevTools**：可通过 `diagnosticsLevel` 控制开销

在大多数场景下，Logix 的开销可以忽略不计。如有性能敏感场景，参考 [性能与优化](./guide/advanced/performance-and-optimization)。

### 如何在生产环境关闭调试输出？

```ts
const runtime = Logix.Runtime.make(RootImpl, {
  layer: Layer.mergeAll(
    AppInfraLayer,
    Logix.Debug.layer({ mode: 'prod' }), // 生产模式
  ),
  devtools: false, // 关闭 DevTools
})
```

### SSR/RSC 支持情况如何？

- **SSR**：通过 `Runtime.runPromise` 可以在服务端预渲染状态
- **RSC**：目前不直接支持 Server Components 内运行 Module，推荐在 Client 边界使用

---

## 更多资源

- [常见问题排查](./guide/advanced/troubleshooting)：诊断代码与错误修复
- [调试与 DevTools](./guide/advanced/debugging-and-devtools)：完整调试指南
- [React 集成配方](./guide/recipes/react-integration)：常用模式
