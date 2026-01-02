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

## 3) 开发者写法：可跳转的 ActionToken（定义）+ `dispatchers`（执行）

目标：dispatch 的调用点引用源码里显式声明的符号，从而获得 IDE 跳转定义/查找引用/安全重命名；同时保持 Action 产物可序列化、可回放、可用于 manifest/事件 join。

### 3.1 定义：`actions` 使用 schema map（定义点）

```ts
import * as Logix from '@logix/core'
import { Schema } from 'effect'

export const Counter = Logix.Module.make('Counter', {
  state: CounterState,
  actions: {
    add: Schema.Number,
    inc: Schema.Void,
  },
})
```

`Module.make({ actions })` 接受 schema map（推荐写法）；内部 canonical 仍然是 ActionToken map（每个 token 携带 payload Schema，且 `actionTag = key`）。如需抽出 actions 常量或显式表达“从 schema 生成 token”，可用 `Logix.Action.makeActions(...)`。

### 3.2 执行：`$.dispatchers.<K>(payload)` 返回可 `yield*` 的 Effect

```ts
yield* $.dispatchers.add(1)
```

点击 `add` 会跳到模块 `actions.add` 的定义行（定义锚点）。

### 3.3 定义视图：`$.actions.<K>(payload)` 只创建 action object（纯数据）

```ts
const action = $.actions.add(1) // { _tag: "add", payload: 1 }
yield* $.dispatch(action)
```

### 3.4 监听：`$.onAction(token)` 以 token 为主路径

```ts
yield* $.onAction($.actions.add).run((payload) => {
  // payload === 1
})
```

当 `onAction` 以“单个 ActionToken”做精确监听时，回调参数为 `payload`（payload-first）；若以 predicate 或字符串 tag 监听，则回调参数仍为完整 action object（用于区分 `_tag` 与访问元信息）。

> 注：原先基于 Proxy 动态属性的 `runtime.actions.<tag>(payload)`/`$.actions.<tag>(payload)` 无法提供稳定 symbol，无法保证 IDE “跳转到定义”。067 的推荐写法以 token 为主路径。

### 3.5 reducer（payload-first）

`Reducer.mutate` 的第二入参改为 payload：`(draft, payload)` / `(state, payload)`，避免 `action.payload` 样板，并保持事务窗口纯同步与 patchPaths 机制不变。

> CodeGen：面向 actions/dispatchers/reducers 的样板自动化作为独立需求见 `specs/069-codegen-action-surface/`。
