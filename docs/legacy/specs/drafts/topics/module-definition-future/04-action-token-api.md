---
title: ActionToken API（值级 Action 符号）· 最小表面积 & 极致 DX
status: draft
version: 0.1.0
value: core
priority: next
related:
  - ./01-state-first-codegen.md
  - ./02-reducer-redesign.md
  - ./03-primary-reducer.md
---

# ActionToken API（值级 Action 符号）· 最小表面积 & 极致 DX

> 目标：用 **极小的新增 API**，把 Action 从“字符串 tag/动态属性”升级成“可跳转的值级符号”，从而让 IDE 的 **F12 / Find References / Rename** 成为默认能力，同时保持 Runtime 心智模型与性能边界清晰。
>
> 本文包含两部分：
>
> 1. **方案草案**：ActionToken 最小 API（主文）。
> 2. **调研附录**：Sigi 的 `dispatcher.<actionName>` 跳转机制（用于校准“点号 DX”能否在纯 TS 语义下成立）。

---

## 1. 背景与问题

在“Action 通过字符串 tag 匹配 + 调用侧用 `runtime.actions.<tag>(payload)` 触发”的模式下，最常见的 DX 缺口是：

- `runtime.actions.<tag>` 往往由动态机制（如 Proxy）生成：在源码里没有“对应的 value-level 声明符号”；
- TypeScript 的“跳转到定义”依赖符号定位：因此无法从 `.actions.<tag>` 跳到 reducer/logic/schema；
- 结果：用户能拿到类型提示，但很难把“使用点”映射回“语义定义点”（Action 的 schema / primary reducer / watchers）。

本草案假设：**允许改写使用方式**，以换取更好的编辑器体验（尽量不依赖 tsserver 插件/索引器）。

---

## 2. 核心洞见：把 Action 变成可引用的值级符号

我们引入一个最小的值对象：**ActionToken**。

- 它是业务侧导出的一个 `const`（值级符号），可被 UI/Logic/测试/工具链统一引用；
- 它既是 **action creator**（创建 action 值），也是 **action 定义锚点**（携带 schema、可选的 primary reducer 等元信息）；
- 只要所有 reducer/watchers 都引用同一个 token，IDE 的“查找引用”自然就能得到完整的“语义图”。

---

## 3. 目标与非目标

### 3.1 目标

1. **极致 DX（默认可用）**
   - F12：从 UI/logic 中的 `CreateProject` 跳到 `CreateProject` 的定义（同处可看到 schema + reducer）。
   - Find References：自然枚举出所有 watcher / dispatch / reducer 注册点。
   - Rename：安全重命名（避免字符串 tag 漂移）。

2. **API 表面积最小**
   - 新增的核心入口只需要 `Action.make(...)`。
   - 运行时侧尽量不新增方法；dispatch 可保持原型（可选提供 overload）。

3. **语义结构清晰**
   - primary reducer 是纯函数；
   - watcher 是可并发/可产生 IO 的逻辑层行为；
   - token 是两者的共同锚点（语义 ID）。

### 3.2 非目标（MVP 不做）

- 不追求 100% 覆盖动态 action tag（运行时拼接 tag、从配置加载 tag 等）；
- 不依赖编译器插件/tsserver 插件来“猜”字符串与 watcher 的关系；
- 不强行把所有现有 DSL 都迁到新形态（可渐进引入）。

---

## 4. API 形态（虚拟设计）

### 4.1 Action 值的形态

约定 action 值是一个普通对象（Runtime 只消费这个对象）：

```ts
type ActionValue<Tag extends string, Payload> = Payload extends void
  ? { readonly _tag: Tag }
  : { readonly _tag: Tag; readonly payload: Payload }
```

> `_tag` vs `type`：这里用 `_tag` 仅作示例；实际可以支持二者之一或并存，但需要统一选择一个“权威字段”。

### 4.2 ActionToken（可调用的值级符号）

```ts
type ActionToken<Tag extends string, Payload> = ((
  ...args: Payload extends void ? [] | [Payload] : [Payload]
) => ActionValue<Tag, Payload>) & {
  readonly tag: Tag
  readonly schema: unknown // payload schema（例如 effect/Schema）
  readonly reduce?: (state: unknown, action: ActionValue<Tag, Payload>) => unknown
}

declare const Action: {
  make: <Tag extends string, Payload>(
    tag: Tag,
    payloadSchema: unknown,
    options?: {
      readonly reduce?: (state: unknown, payload: Payload) => unknown
    },
  ) => ActionToken<Tag, Payload>
}
```

设计要点：

- token 本身可调用：`CreateProject({ name: 'x' })` 直接生成 action 值；
- `token.tag` 提供字符串（必要时与旧 DSL 兼容）；
- `token.reduce`（可选）承载 primary reducer 的纯逻辑，作为“权威定义点”；
- schema 是 devtools/校验/生成器/文档工具链的输入（但 Runtime 不必在热路径强制解析）。

### 4.3 Module：收集 token（单一事实源）

```ts
declare const Module: {
  make: <Id extends string>(id: Id, def: {
    readonly state: unknown
    readonly actions: readonly ActionToken<string, any>[]
  }) => ModuleDef<Id>
}
```

Module 的 `actions` 作为 token 集合，它的价值主要是：

- 形成 action union（类型层面）；
- 允许 Runtime/Devtools 反射 “有哪些 action + schema + reducer”；
- 自动注册 `token.reduce` 为 primary reducer（如果存在）。

> 可选增强：若需要“点号 DX”（`dispatcher.<actionName>`）的可跳转锚点，可以把 token 固化在具名对象属性上（如 `Module.actions.createProject = Action.make(...)`），参考附录 A。

### 4.4 Logic：watcher 直接引用 token

```ts
declare const $: {
  onAction: <Tag extends string, Payload>(
    token: ActionToken<Tag, Payload>,
  ) => {
    run: (fn: (payload: Payload) => void) => void
  }

  dispatch: (action: { readonly _tag: string; readonly payload?: unknown }) => void
}
```

> 只要 watcher 直接引用 token（而不是仅引用字符串 tag），IDE 的“查找引用”就天然成立。

### 4.5 Runtime：仅保留一个 dispatch（可选 overload）

最小形态：

```ts
type Runtime = {
  dispatch: (action: { readonly _tag: string; readonly payload?: unknown }) => void
}
```

可选 DX sugar（仍然不增加方法，只是 overload）：

```ts
type Runtime = {
  dispatch: (action: { readonly _tag: string; readonly payload?: unknown }) => void
  dispatch: <Tag extends string, Payload>(token: ActionToken<Tag, Payload>, payload: Payload) => void
}
```

这样 UI 侧可以写 `runtime.dispatch(CreateProject, { name })`，避免“双括号”。

---

## 5. 端到端虚拟示例：Projects（创建项目）

### 5.1 定义 actions（单一事实源）

```ts
export const CreateProject = Action.make(
  'createProject',
  /* payload schema */ { name: 'string' },
  {
    // primary reducer：纯更新（比如插入一条 creating 占位）
    reduce: (state, payload) => state,
  },
)

export const ProjectCreated = Action.make(
  'projectCreated',
  { tempId: 'string', id: 'string' },
  { reduce: (state, payload) => state },
)
```

### 5.2 定义 Module

```ts
export const Projects = Module.make('Projects', {
  state: /* state schema */ {},
  actions: [CreateProject, ProjectCreated],
})
```

### 5.3 定义 Logic watcher（引用 token）

```ts
Projects.logic(($) => {
  $.onAction(CreateProject).run((payload) => {
    // 这里做 IO：调用 API 成功后再 dispatch ProjectCreated
    $.dispatch(ProjectCreated({ tempId: 't1', id: 'p1' }))
  })
})
```

### 5.4 UI 调用

```ts
const projects = useModule(Projects)
projects.dispatch(CreateProject({ name: 'test' }))
```

DX 效果（用户视角）：

- F12：点 `CreateProject` → 直接到 `export const CreateProject = ...`；
- Find References：对 `CreateProject` 查引用 → 自动得到：
  - UI 派发点（`dispatch(CreateProject(...))`）
  - watcher（`$.onAction(CreateProject)`）
  - primary reducer（`Action.make(... { reduce })`）。

---

## 6. 支持矩阵（MVP）

### 6.1 强支持（应当稳定工作）

- UI：`dispatch(Token(payload))`
- Logic：`$.onAction(Token)`（类型收窄到 token 的 payload）
- primary reducer：`Action.make(..., { reduce })`
- 重命名：`Token` 符号级 rename（避免字符串漂移）

### 6.2 有限支持（可选增强）

- 字符串兼容：`$.onAction(Token.tag)`（可工作但引用链会弱化）
- dispatch sugar：`dispatch(Token, payload)`（依赖 overload）

### 6.3 不支持（除非引入工具链/插件）

- 动态拼接 tag（`Action.make(prefix + name)` 之类）
- watcher 用复杂 predicate/Schema filter 却不引用 token

---

## 7. 迁移路径（从字符串/动态 actions 迁到 ActionToken）

1. 先为核心 action 补 token：`export const Xxx = Action.make('xxx', schema, { reduce? })`；
2. UI 改写：
   - `runtime.actions.xxx(payload)` → `runtime.dispatch(Xxx(payload))`（或 `dispatch(Xxx, payload)`）；
3. watcher 改写：
   - `$.onAction('xxx')` → `$.onAction(Xxx)`；
4. reducers 改写（择一）：
   - 迁到 token 的 `{ reduce }`；
   - 或保留旧 reducers map，但要求其引用 token（避免字符串漂移）。

---

## 8. 待决问题 / 风险

1. `dispatch(Token(payload))` 的“双括号”是否可接受？是否必须提供 overload？
2. `token.reduce` 的签名到底收 action 还是收 payload？
3. token 是否需要携带额外能力（`token.match` / `token.is`）以便 predicate-less 收窄？
4. schema/校验的运行时策略：仅 devtools 使用，还是在 dev 环境做 payload 校验？
5. 兼容性策略：当 Module 的 actionMap 仍以 SchemaMap 为主时，ActionToken 如何与 SchemaMap 互操作？
6. “点号 DX”是否必须：若希望 `dispatcher.<actionName>` 也可跳转，需要一个具名声明锚点（见附录 A）。

---

## 附录 A：调研 Sigi 的 `dispatcher.<actionName>` 跳转机制

这部分回答一个更具体的 DX 问题：**为什么在 Sigi 里写 `dispatcher.fetchList`，IDE 能直接跳到 `fetchList` 的源码定义？**

### A.1 结论（先给答案）

Sigi 能做到 `dispatcher.<actionName>` “跳到源码”，核心不是 runtime 魔法，也不是 VSCode 插件，而是 **TypeScript 的类型关联**：

1. `dispatcher` 在类型层面被声明为一个“以 Module 实例成员名为 key 的对象”（mapped type）；
2. `<actionName>` 这个 property key 本身来自 **Module 类里同名的方法/成员**（有真实的源码声明位置）；
3. TypeScript Language Service 在处理 `dispatcher.fetchList` 时，会把 `fetchList` 这个 symbol 关联回 `AppModule.fetchList` 的 declaration，因此可以跳转。

对应到 Sigi 源码，关键类型是 `ActionOfEffectModule<M, S>`（见 `@sigi/core`）。

对 Logix，如果我们希望在 token 化的同时保留类似的跳转体验，可以把 ActionToken 固化在 `Module.actions.<actionName>` 这种具名声明点上，再从它派生/绑定 `dispatcher.<actionName>`。

---

### A.2 Sigi 的“跳转链路”拆解（从使用到类型定义）

#### A.2.1 用户侧写法

以官方示例为例：

- 组件里：`const [state, dispatcher] = useModule(AppModule)`，然后调用 `dispatcher.fetchList()` / `dispatcher.cancel()`；
- Module 里：把同名方法作为 `@Effect()` / `@Reducer()` 的动作定义（例如 `fetchList`、`cancel`、`setList`）。

#### A.2.2 `useModule` 返回值的类型：把 dispatcher 绑定到 Module 类型参数

React 侧（browser 实现）大意是：

- `useModule(A)` 返回 `[State, ActionOfEffectModule<M, S>]`；
- 其中 `dispatcher` 实际来源是 `effectModule.dispatchers`（runtime 可以是 `any`，但返回类型强约束为 `ActionOfEffectModule<M, S>`）。

这一步很关键：**把 `dispatcher` 的类型参数 `M` 精确推导为 `AppModule`**，后续才能得到 `keyof AppModule` 这组具体成员名。

#### A.2.3 `ActionOfEffectModule<M, S>`：用 `keyof M` 做 key 的 mapped type

Sigi 的核心形态（概念上）是：

- `ActionOfEffectModule<M, S> = { [K in keyof M]: (...) => void }`，然后 `Omit<..., keyof EffectModule<S>>`；
- 同时通过一组 `Unpack*Payload` 从 `M[K]` 的签名中推导 payload 类型，进而给每个 action 生成正确的 dispatcher 调用签名。

对“跳转到源码”而言，真正需要的是第一部分：**`[K in keyof M]` 让 property name 来自 Module 本体**。

---

### A.3 runtime 的 dispatchers 生成方式（与“跳转”无直接关系，但影响契约一致性）

Sigi 在 runtime 构造 `dispatchers` 的方式大意是：

1. 通过 decorators（`@Reducer()` / `@Effect()` / `@DefineAction()`）写入 metadata；
2. `EffectModule` 构造时读取这些 metadata，得到 `actionNames`；
3. 为每个 `actionName` 动态挂上：
   - `actions[name] = (payload) => ({ type: name, payload, ... })`（action creator）；
   - `dispatchers[name] = (payload) => store.dispatch(actions[name](payload))`（bound dispatcher）。

这说明：**runtime 的 action identity 仍然是 string（method name）**；而 IDE 跳转发生在 TS 类型层，与 runtime 的 metadata 拼装无关。

> 备注：Sigi 的类型层并不会“精确过滤”只保留被 decorator 标记的成员；它是一个近似映射，依赖约定（模块里除了 actions 之外不要塞太多非 action 成员）。这点对我们做 ActionToken 也会带来启发与警惕。

---

### A.4 对 Logix「ActionToken API」的直接启发

如果我们希望复刻“`dispatcher.<actionName>` 可跳转”的 DX，必须满足一个很朴素的条件：

- 调用点出现的 `<actionName>`，在 TS 里必须能解析到一个 **有源码位置的 symbol**（class member / object literal property / `const`/`function` 声明）。

因此，“纯 token 化”经常会天然破坏这件事：

- `dispatcher[actionToken]()`：`actionToken` 作为表达式参与索引访问，IDE 跳转通常只能跳到 `actionToken` 变量定义，无法做到“从点号右侧跳到 action 源码”；
- `dispatcher.dispatch(ActionToken.of(...))`：跳转只会落到 `dispatch` 或 `ActionToken` 构造处。

反过来，想保住跳转能力，通常要保留一个 **“以静态属性名表达 action 的入口”**：

- `dispatcher.fetchList()`：`fetchList` 这个名字必须对应到某个源代码里的声明（Sigi 用 Module 类方法做到这一点）。

对我们来说，最直接的“桥梁”是把 Token **固化在一个具名的声明点**上，例如：

- `AppModule.actions.fetchList`（一个真实存在的 object literal property / `const` 属性）= ActionToken；
- `dispatcher.fetchList(...)` 只是对 `AppModule.actions.fetchList` 的绑定调用（bound dispatch）。

这样即使 runtime 身份彻底 token 化（不再依赖 string tag），我们依然保留了一个**可点击、可重构、可跳转**的锚点：`Module.actions.<name>`。

---

### A.5 两条可落地的设计路线（与 Token 化的融合方式）

#### 路线 A：Action 仍以“命名成员”作为 SSoT（最贴近 Sigi）

- Action 的“声明点”就是 Module 里的命名成员（method / field / getter）；
- Token（如果需要）只是这个成员的派生物或内部实现细节；
- `dispatcher.<actionName>` 的类型 key 直接来自 `keyof Module` / `keyof ModuleActions`，天然可跳转。

适用：把“IDE 可跳转”视为一等公民，愿意让 action 命名保持可重构（rename-safe）且与声明点强绑定。

#### 路线 B（推荐）：Token 作为 SSoT，且固定挂在 `Module.actions.<name>`（保留跳转锚点）

把 Token 绑定在 Module 定义物上的 `actions` 命名空间下，让“名字”与“身份”同时成立：

- `Module.actions.fetchList`：**声明点**（IDE 跳转锚点） + **稳定身份**（token id） + **payload schema**（类型/运行时校验）
- `dispatcher.fetchList(payload)`：对外的 dot-call（最佳 DX），内部等价于 `dispatch(Module.actions.fetchList, payload)`

这样带来的效果：

1. **IDE 锚点明确**：至少 `Module.actions.fetchList` 一定有可跳转的定义点（可作为“action 的声明位置”）；
2. **Token 身份稳定**：runtime/trace/IR 只认 `token.id`（不必依赖字符串 tag），同时仍保留 `fetchList` 这个人类友好名字；
3. **对齐 ActionMap 思路**：`Module.actions` 本质上就是“ActionMap 的升级版载体”（key 仍是 name，value 从 `Schema` 升级为 `ActionToken`）。

---

### A.6 下一步（建议验证项）

为了把这套机制“变成规范而不是经验”，建议补一个最小验证：

1. 做一个最小 module 原型：`Module.actions.<name> = ActionToken` + `dispatcher.<name>(payload)`；
2. 在 IDE 里验证两件事：
   - `Go to Definition` 从 `Module.actions.fetchList` 是否稳定（应当稳定）；
   - `Go to Definition` 从 `dispatcher.fetchList` 是否能落到 `Module.actions.fetchList`（若不行，记录行为作为约束，并考虑用 codegen/ts-plugin 把 dispatcher 的属性声明“显式化”以改善跳转落点）。
3. 把验证结论固化到本 Topic 的 DX 约束（避免后续实现阶段“以为能跳、实际不能跳”）。

