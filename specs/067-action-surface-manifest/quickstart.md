# Quickstart: Action Surface（actions/dispatchers/reducers/effects）与 Manifest

本 quickstart 描述本特性实现完成后的最小用法（偏 runtime/工具链消费者视角）。

## 1) 提取模块 Module Manifest（免 AST）

- 输入：用户导出的 `Module` / `ModuleImpl`
- 输出：可序列化 JSON（`ModuleManifest`；deterministic，可 diff）

示例（概念性）：

```ts
import * as Logix from '@logixjs/core'

const manifest = Logix.Reflection.extractManifest(MyModule, {
  budgets: { maxBytes: 64 * 1024 },
})
```

## 2) 事件 → 定义锚点对齐（Studio/Devtools）

- 事件侧：`RuntimeDebugEventRef.kind === "action"` 时使用 `moduleId + label(actionTag)` 定位 action。
- 定义侧：`ModuleManifest.actions[]` 提供 action 摘要（payload/primaryReducer/source?）。
- 若找不到 action：展示为 `unknown/opaque`，但时间线与统计不被破坏。

## 3) 开发者写法：可跳转的 ActionToken（定义）+ token-first（执行/监听）

目标：dispatch 的调用点引用源码里显式声明的符号，从而获得 IDE 跳转定义/查找引用/安全重命名；同时保持 Action 产物可序列化、可回放、可用于 `ModuleManifest`/事件 join。

### 3.1 定义：`actions` 使用 schema map（定义点）

```ts
import * as Logix from '@logixjs/core'
import { Schema } from 'effect'

export const Counter = Logix.Module.make('Counter', {
  state: CounterState,
  actions: {
    add: Schema.Number,
    inc: Schema.Void,
  },
})
```

`Module.make({ actions })` 接受 schema map（推荐写法）；内部 canonical 仍然是 ActionToken map（每个 token 携带 payload Schema，且 `actionTag = key`）。

推荐：actions 定义尽量保持“一种形态”，要么全用 schema map，要么用 `Logix.Action.makeActions(...)` 抽出 token map；不建议 Schema/Token 混用（避免 TS 推导与提示出现不必要的复杂度）。

或：显式构造 token map（注意 `key` 必须等于 `token.tag`，否则会在规范化阶段抛错）：

```ts
const actions = Logix.Action.makeActions({
  add: Schema.Number,
  inc: Schema.Void,
})

export const Counter = Logix.Module.make('Counter', {
  state: CounterState,
  actions,
})
```

如果你的目标包含 “IDE 跳转到定义/查找引用/安全重命名”，推荐把 token 抽成**具名常量**（值级符号）：

```ts
export const CounterActions = Logix.Action.makeActions({
  add: Schema.Number,
  inc: Schema.Void,
})

export const Counter = Logix.Module.make('Counter', {
  state: CounterState,
  actions: CounterActions,
})
```

### 3.2 执行：优先让代码里显式出现 ActionToken

```ts
yield* $.dispatch(CounterActions.add, 1)
```

> `$.dispatchers.<K>(payload)` 仍然是常用短写，但它是运行时生成的语法糖，不保证 IDE 的“跳转/找引用/重命名”能落到源码定义；需要稳定锚点时，以 ActionToken 常量为准。

### 3.2.1 IDE 人工验收（SC-003）

> 说明：这部分属于“人工验收”，不做自动化断言；自动化部分由类型回归用例兜底（`packages/logix-core/test/types/ActionSurface.d.ts.test.ts`）。

- 在 `$.dispatch(CounterActions.add, 1)` 的 `add` 上执行“跳转到定义”，应定位到 `CounterActions.add` 的定义处。
- 对 `CounterActions.add` 执行“查找引用”，结果应同时覆盖 dispatch 与 watcher/订阅两侧使用点（同一个 token 符号）。
- 对 `CounterActions.add` 执行“重命名”，IDE 应同时重写 dispatch 与 watcher/订阅两侧引用（不需要手工维护字符串 tag）。

### 3.3 定义视图：`$.actions.<K>(payload)` 只创建 action object（纯数据）

```ts
const action = $.actions.add(1) // { _tag: "add", payload: 1 }
yield* $.dispatch(action)
```

### 3.4 监听：`$.onAction(token)` 以 token 为主路径

```ts
yield* $.onAction(CounterActions.add).run((payload) => {
  // payload === 1
})
```

当 `onAction` 以“单个 ActionToken”做精确监听时，回调参数为 `payload`（payload-first）；若以 predicate 或字符串 tag 监听，则回调参数仍为完整 action object（用于区分 `_tag` 与访问元信息）。

> 注：原先基于 Proxy 动态属性的 `runtime.actions.<tag>(payload)`/`$.actions.<tag>(payload)` 无法提供稳定 symbol，无法保证 IDE “跳转到定义”。067 的推荐写法以 token 为主路径。

### 3.5 reducer（payload-first）

`Reducer.mutate(mutator)` 的 **mutator 回调**为 payload-first：`(draft, payload)`（避免 `action.payload` 样板）。  
但 `mutate` 返回的 reducer 仍然以 `(state, action, sink?) => state` 的形态运行：运行时会从 action 上提取 payload，并在需要时通过 `sink` 记录 patchPaths（保持事务窗口纯同步与 patchPaths 机制不变）。

### 3.6 effects（副作用注册面）

目的：把副作用从散落的 `onAction(...).runFork(...)` 收敛为可治理的注册面；同一 actionTag 允许多个 handler（1→N），默认并发且不承诺顺序；去重键为 `(actionTag, sourceKey)`，重复注册不会导致副作用翻倍，并会产出诊断。

`effects` 可在模块定义中静态声明（图纸级别）：

```ts
export const Counter = Logix.Module.make('Counter', {
  state: CounterState,
  actions: {
    add: Schema.Number,
    inc: Schema.Void,
  },
  effects: {
    inc: [
      ($, _payload) => Effect.log('analytics: inc'),
      ($, _payload) => Effect.log('sync: inc'),
    ],
  },
})
```

也可在逻辑单元中通过 `$.effect(token, handler)` 注册（推荐在 setup 注册；run 动态注册作为高级能力）：

```ts
$.effect($.actions.add, (payload) => Effect.log(`add: ${payload}`))
```

> CodeGen：面向 Schema-first + actions/dispatchers/reducers 的样板自动化作为独立需求见 `specs/069-schema-first-codegen-action-surface/`。
