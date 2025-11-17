# Logix 实现范围锁（Scope Lock）

> **状态**：LOCKED  
> **日期**：2025-11-29  
> **目的**：明确 core engine 的显式边界，防止 scope creep，保证交付聚焦。

## 1. 能力范围（Must vs. Defer）

| 能力类别 | **必须（Core）** | **暂缓（Out of scope）** |
| :-- | :-- | :-- |
| **Core Logic** | - 单模块响应式（L1）<br>- 跨模块协作（`$.use`）<br>- 异步 Effect & Flow<br>- 外部源（Timer/WebSocket 等） | - 通配监听（`items.*.field`）<br>- 运行期动态规则注入<br>- 多租户隔离 |
| **Concurrency** | - `run`（顺序/队列）<br>- `runLatest` / `runExhaust`（并发策略） | - 复杂背压策略<br>- 细粒度 Fiber Supervision |
| **Lifecycle** | - `onInit`（阻塞）<br>- `onDestroy`（清理）<br>- `onSuspend` / `onResume`（平台） | - 热状态迁移（HMR 下的数据迁移仅做 best-effort） |
| **Data** | - Schema 驱动 State/Action<br>- 不可变更新 | - JSON AST 双表征<br>- CRDT / 协同编辑 |
| **Draft/Session** | - **无**（用 Local Modules 替代） | - Transactional Draft API（`start/commit`）<br>- STM（Software Transactional Memory） |

## 2. Public API 白名单

只有以下 API 被视为“面向应用开发者的公共面”。其余均视为内部实现细节，可 forward-only 演进。

### 应用开发者（User）

- **定义**：`Logix.Module.make`（ModuleDef）、`ModuleDef.implement(...)`（返回带 `.impl` 的 Module）、`Logix.Runtime.make`（基于 Root Module 的 `.impl` 构造 Runtime）
- **Logic API**：`ModuleDef.logic` / `Module.logic`、`ModuleDef.live` / `Module.live`
- **Process/Link**：`Logix.Process` / `Logix.Link`（长期进程与跨模块胶水）
- **Bound API（`$`）**：
  - `$.state`、`$.actions`
  - `$.onAction`、`$.onState`、`$.on`
  - `$.use`（依赖注入/跨模块只读访问）
  - `$.lifecycle`（`onInit`、`onDestroy`、`onSuspend`、`onResume`）
- **React 集成**：`useModule`、`useLocalModule`、`useSelector`、`useDispatch`、`RuntimeProvider`

### 库/平台作者（Extender）

- **Types**：`Logix.ModuleRuntime`、`Logic.Of`、`Logic.Env`
- **Interfaces**：`Platform`（Service Interface）
- **Effect 基础**：`Layer`、`Context.Tag`、`Effect`、`Schema`

## 3. Runtime 策略

### HMR（Hot Module Replacement）

- **策略**：Safe Restart
- **行为**：代码变更时，dispose 旧 Scope（触发 `onDestroy`），再初始化新 Scope
- **状态**：Schema 兼容则尽力保留；不兼容则回到 initial；当前范围内不做复杂迁移

### Code ↔ Graph

- **策略**：One-Way Visualization
- **行为**：引擎可以基于 `$.on*` 声明导出静态图用于调试
- **约束**：当前范围内不做“可视化编程”（Graph → Code）

## 4. 使用约束（软约束）

这些约束不由编译器强制，但对可维护性很关键：

1. **Single Writer**：同一 state 字段尽量由单一逻辑流/单一 reducer 家族负责写入，避免散点更新。
2. **Cross-Module Read-Only**：不要直接修改其它模块的状态；通过 `dispatch` 或 `$.use(Other).read()`/`changes(...)` 协作。
3. **UI is Dumb**：UI 不承载业务逻辑，只负责 `dispatch` 意图与 `read` 状态。
