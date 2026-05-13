# References: Field/FieldKernel → Module（Form/Query）→ UI（React）链路叙事（自底向上）

> 目标：把「Field（内核）→（可选）FieldKernel（支点）→ 领域包（Form/Query/…）→ UI 适配层」这条链路，从底层到上层一层层讲清楚，并明确：`FieldKernel.node / FieldKernel.list` 属于 **FieldKernel 基础体系**（`@logixjs/core`），不是 Form/Query 的私货。

---

## 0. 一句话总览

- **你写的业务代码**最终都会变成：`Logix.Module`（state+actions+reducers+logics+fields）在 Runtime 里运行；
- **Field/FieldKernel**负责把“字段级声明（computed/source/link/check）”编译为可安装的 Program/Plan，并在 Runtime Scope 内安装 watcher/刷新入口；
- **领域包（Form/Query）**把“行业语义（表单交互、搜索触发、竞态策略…）”收敛成 Blueprint + Controller，业务侧默认不直接手写 wiring；
- **UI 适配层（@logixjs/react）**只负责投影订阅 + DOM/事件适配，不维护第二套状态。

DX 原则（按优先级接触 API）：

1) **Form/Query API（最高优先级）**：最低心智 + 最少样板，业务默认只用这一层
2) **FieldKernel DSL（第二优先级）**：为框架/高级用例提供表达力与可组合性（可 mix-in 到领域包的 fields）
3) **fields 原始形态（最低优先级）**：视为可降解 IR/实现细节，除非在写领域包/底层工具，否则不鼓励业务直接操作

---

## 1. Layer 0：Module/Runtime（`@logixjs/core` 的分形基础）

### 1.1 你最终要交付的“运行单元”是什么？

- `Module`（模块定义对象）：`Logix.Module.make(...)` 的返回值（带 `.tag: ModuleTag`）
- `Program`（公开装配蓝图/可 imports）：由 `Logix.Program.make(module, config)` 产生
- `ModuleRuntime`（模块运行时实例）：由 Runtime/AppRuntime 或 `@logixjs/react` hooks 在 Scope 内构造并持有

这三者是分形组合的核心：**领域包可以创建自己的 Module（定义对象），然后像普通模块一样被 import/live/useLocalModule。**

落点（代码）：

- `packages/logix-core/src/Module.ts`：`Module.make` / `Module.logic` 的定义期行为
- `packages/logix-core/src/Program.ts`：`Program.make(module, config)` 的装配行为
- `packages/logix-core/src/Runtime.ts`：`Runtime.make(program, ...)` 的 AppRuntime 入口
- `packages/logix-react/src/hooks/useLocalModule.ts`：组件级生命周期的局部模块运行时

---

## 2. Layer 1：Field Kernel（`@logixjs/core` 的“可安装声明”）

### 2.1 Field 的三段式生命周期（蓝图 / setup / run）

- **Blueprint**：纯数据/纯函数，把声明编译成结构化 Program（Graph/Plan）
- **Setup**：在 Runtime 初始化阶段做结构 wiring（注册入口/挂载索引）
- **Run**：在 Runtime Scope 内以 Fiber/watcher 形式运行（可观测、可回放）

在 004 的主线里，**FieldKernel 是第一个支点 Field**：先把“字段能力”这类最常见、最可复用的模式吃透。

---

## 3. Layer 2：FieldKernel 基础体系（`@logixjs/core`）

### 3.1 FieldKernel 的核心 IR：只保留三种 kind

- `computed`：纯派生（给某个目标字段产值）
- `source`：声明资源依赖（真实 IO 在 `ResourceSpec.load: Effect`）
- `link`：跨字段传播

`check` 是语义糖：本质是“写 `state.errors` 的 computed”，不引入新的 kind。

004 的硬语义（为“可诊断/可生成/可回放”服务）：

- `computed/source` MUST 显式声明 `deps`（相对 scope 的字段路径），运行时 watcher 只订阅 deps（不再监听整棵 state）。
- 写回必须有门控：默认 `equals = Object.is`，值不变则不写回，避免无意义 patch 与潜在自激循环。

### 3.2 为什么 `FieldKernel.node / FieldKernel.list` 应当属于基础体系？

因为它们是 **IR 的组织形状**（compile-time combinators），不是领域语义：

- `FieldKernel.node(...)`：统一承载同一作用域上的 `computed/source/link/check` 声明形状（便于生成、对比、Devtools 还原）
- `FieldKernel.list({ item, list })`：把“数组字段”一等公民化为 item/list 两个 scope（而不是靠字符串 path 在业务里手写约定）

它们应该归属 `@logixjs/core/FieldKernel`，原因：

- **跨领域复用**：Form/Query/Permission/Workflow 都会遇到“列表 scope / 局部 scope”这类组织问题
- **Devtools 解释性**：Graph/Plan 需要稳定的 scope 结构来对齐节点/边/步骤
- **全双工可回放**：错误树、UI 交互态、资源快照都需要可枚举、可定位的结构锚点

### 3.3 FieldKernel 的“编译→安装”主线

1) 业务/领域包产出 `fields`（等价 `FieldKernelSpec`）
2) `FieldKernel.build(stateSchema, fields)` → `FieldProgram`（Graph/Plan）
3) `FieldKernel.install($, program)` 在 Runtime Scope 内安装行为（watcher/刷新入口）

落点（代码）：

- `packages/logix-core/src/FieldKernel.ts`：对外 FieldKernel 命名空间（当前仍是 Phase 占位形态）
- `packages/logix-core/src/internal/state-field/model.ts`：Spec/Entry/Program/Graph/Plan 数据模型
- `packages/logix-core/src/internal/state-field/build.ts`：纯构建（Graph/Plan）
- `packages/logix-core/src/internal/state-field/install.ts`：安装 watcher/入口（run）

> 说明：目前代码层的 `FieldKernel.node/list/check` 仍以 spec 为主线推进（API 先固化叙事与语义，再落实现）。

---

## 4. Layer 3：领域包（Form / Query）= Blueprint + Controller（业务默认入口）

领域包的职责不是“自建引擎”，而是：

- 定义 **领域 state/action 协议**（比如表单交互态、query 触发语义）
- 提供 **Blueprint**：把 Module 图纸（含 fields）和默认 logics 一次性组装好
- 提供 **Controller**：把 ModuleRuntime 投影为业务可用的操作集合（field/array/submit/refresh…）

### 4.1 Form（`@logixjs/form`）

- Blueprint：`Form.make(...) -> Module + Program`（内部持有 `form.tag: ModuleTag` 与 `form.program`）
- Module 集成：Root 侧在 `capabilities.imports` 引入 `form.program`
- React 集成：`useModule(form.program)` + `useSelector/useDispatch` 做投影

详见：`references/06-form-business-api.md`

### 4.2 Query（`@logixjs/query`）

同样采用 Blueprint + Controller：

- Blueprint：`Query.make(...) -> QueryBlueprint`
- 触发/并发/门控语义回落到 FieldKernel/Resource 主线；缓存/去重由 TanStack Query 承担

详见：`references/07-query-business-api.md`

---

## 5. Layer 4：UI 适配层（`@logixjs/react`）

UI 层只做两件事：

1) 订阅投影：`useSelector` / `useModule(handle, selector)`
2) 事件派发：`useDispatch`（把 DOM 事件映射为领域 action）

局部模块用 `useLocalModule`，避免把“表单/搜索页级状态”强行放到全局 Runtime。

---

## 6. 给读者的“从下往上阅读路线”

1) Module/Runtime：`packages/logix-core/src/Module.ts`、`packages/logix-core/src/Runtime.ts`
2) FieldKernel：`packages/logix-core/src/FieldKernel.ts` + `packages/logix-core/src/internal/state-field/*`
3) 领域包 API：`references/06-form-business-api.md`、`references/07-query-business-api.md`
4) Quickstart：`specs/004-field-bridge-form/quickstart.md`、`references/04-query-quickstart.md`
5) UI 适配：`packages/logix-react/README.md`、`packages/logix-react/src/hooks/*`
