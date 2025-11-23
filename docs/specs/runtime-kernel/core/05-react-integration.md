# React Integration Strategy (React 集成规划)

> **Status**: Definitive (v2.1 Robust Adapter)
> **Layer**: Adapter Layer (`@logix/react`)
> **Purpose**: 定义如何将 Logix 的状态与逻辑优雅地映射到 React 组件树，同时保持高性能和低心智负担。

## 1. 核心原则 (Core Principles)

1.  **The Dumb UI**: React 组件只负责渲染 (Render) 和 交互 (Dispatch)，绝不负责业务逻辑 (No Business Logic)。
2.  **Fine-Grained Subscription**: 组件只订阅它真正关心的数据切片，避免无效重渲染。
3.  **Concurrent Safety**: 严格处理 React 并发模式下的边缘情况（Tearing, Suspense, Strict Mode）。

## 2. 关键机制设计 (Key Mechanisms)

为了解决 React 并发模式下的痛点，Adapter 层必须实现以下三个核心机制：

### 2.1 Event Staging (事件暂存区)

**问题**: 在 Suspense 模式下，组件可能被挂起。如果 Logix 在此期间派发瞬态事件（如 Toast），组件恢复后会丢失该事件。

**解决方案**: **Commit-Phase Consumption**
1.  Logix 将瞬态事件推入 `StagingQueue`。
2.  React 组件通过 `useEventSubscription` 订阅。
3.  只有在组件的 Commit 阶段（`useEffect` 执行时），才从队列中消费事件。
4.  如果组件被卸载或挂起，事件保留在队列中，等待下一次挂载消费。

### 2.2 Resource Reference Counting (资源引用计数)

**问题**: React 18+ Strict Mode 会导致组件快速 `Mount -> Unmount -> Mount`。如果 Store 包含昂贵资源（如 WebSocket），会导致连接风暴。

**解决方案**: **Delayed Destruction**
1.  `useLocalStore` 维护 Store 的引用计数 `refCount`。
2.  **Mount**: `refCount++`。如果 Store 不存在，创建并启动。
3.  **Unmount**: `refCount--`。如果 `refCount === 0`，启动一个短延时（如 100ms）的销毁定时器。
4.  **Re-Mount**: `refCount++`。如果定时器存在，取消销毁，复用 Store。

### 2.3 Auto-Memoized Selectors (自动记忆化)

**问题**: 用户编写的 Selector 容易返回新引用（如 `s => ({ a: s.a })`），导致 `useSyncExternalStore` 触发无限重渲染。

**解决方案**: **Shallow Equality by Default**
1.  `useSelector` 内部默认使用 `shallowEqual` 对比新旧值。
2.  只有当浅比较不相等时，才触发组件重渲染。
3.  提供 `equalityFn` 参数供特殊场景覆盖。

## 3. Adapter 能力视图

从 Logix 视角看，React Adapter 需要完成三类工作：

1. **生命周期与 Runtime 承载**：在组件树中创建/销毁 Store，并通过 `RuntimeProvider` 注入 Effect Runtime 与 Services。
2. **高性能订阅与 Selector**：基于 `useSyncExternalStore` + Selector 模式，将 `state$` 转换为 React 组件可消费的切片。
3. **事件桥接与错误通道**：把用户交互映射为 Logix 事件/信号，并将 `error$` 等调试流桥接到 React Error Boundary 或全局提示。

## 4. 派生状态分层 (Derived State Layering)

Logix 仅负责持久化业务数据与必要的业务级派生状态；UI 层的瞬态派生数据由 React 端的 Selector 承担。实践上：

- 需要回放、审计、传输给后端或被其他逻辑依赖的字段（如 `orderTotal`、`isAdult`），应通过 Logic 规则写入 Logix State；
- 只服务于本组件渲染的瞬态字段（如格式化日期、拼接展示文案），应通过 `useSelector` 在渲染期计算。

## 5. 与领域层（Form 等）的配合

表单等领域库不直接操作 React Adapter，而是作为其「上层客户」：

- Form Engine 在 Logix 之上定义 `FormState` / `FormEvent` 等领域模型，并通过 Logic 规则与 Logix 交互；
- React Adapter 暴露通用 Hooks（`useStore` / `useSelector` 等），Form 领域在此基础上封装 `useForm` / `useField` / `FormProvider` 等领域特化 API。
