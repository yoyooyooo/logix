# Quickstart: Action 级别定义锚点（ActionToken-ready Manifest）

本 quickstart 描述本特性实现完成后的最小用法（偏 runtime/工具链消费者视角）。

## 1) 提取模块 Action Manifest（免 AST）

- 输入：用户导出的 `Module` / `ModuleImpl`
- 输出：可序列化 JSON（deterministic，可 diff）

示例（概念性）：

```ts
import * as Logix from '@logix/core'

const manifest = Logix.Reflection.extractManifest(MyModule, {
  budgets: { maxBytes: 64 * 1024 },
})
```

## 2) 事件 → 定义锚点对齐（Studio/Devtools）

- 事件侧：`RuntimeDebugEventRef.kind === "action"` 时使用 `moduleId + label(actionTag)` 定位 action。
- 定义侧：manifest 的 `actions[]` 提供 action 摘要（payload/primaryReducer/source?）。
- 若找不到 action：展示为 `unknown/opaque`，但时间线与统计不被破坏。

## 3) token-first（不依赖 codegen）的最小写法

目标：让同一个值级符号同时出现在 dispatch 与 watcher 侧，以获得 IDE 跳转/引用/重命名。

```ts
// ActionToken 的最小形态：值级对象，至少带 `_tag`
export const Inc = { _tag: 'inc' } as const

// watcher：BoundApi 已支持传入带 `_tag` 的对象
yield* $.onAction(Inc).run((action) => {
  // ...
})

// dispatch：使用同一个 token（action object / action creator 的具体形态以后续实现为准）
yield* $.actions.dispatch({ _tag: Inc._tag, payload: 1 })
```

> 注：仅在运行时内部引入 token、但用户仍通过 `runtime.actions.xxx(payload)`（Proxy 动态属性）调用时，IDE 无法建立静态符号关系，因此无法“跳转到定义”。
