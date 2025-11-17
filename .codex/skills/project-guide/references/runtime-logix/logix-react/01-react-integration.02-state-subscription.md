# 2. 状态订阅 (State Subscription)

## 2.1 细粒度订阅与 Memoization

为了优化性能，Logix 提供了两种处理 Computed State 的方式：

### 方式 A：使用 `equalityFn` (Shallow Compare)

类似 Zustand，你可以传入一个比较函数（如 `shallow`）来允许 Selector 返回新对象，只要内容没变就不重渲染。

```typescript
import { shallow } from '@logix/react';

// ✅ Safe: 虽然每次返回新对象，但 shallow 比较会发现内容没变，不会重渲染
const userView = useSelector(runtime, s => ({
  name: s.name,
  role: s.role
}), shallow);
```

### 方式 B：使用 Memoized Selector (Reselect / Proxy-Memoize)

对于复杂的派生计算（如过滤列表），建议使用 `reselect` 或 `proxy-memoize` 创建一个稳定的 Selector。

```typescript
import { createSelector } from 'reselect';

// 定义 memoized selector (在组件外)
const selectActiveUsers = createSelector(
  [(s: State) => s.users, (s: State) => s.filter],
  (users, filter) => users.filter(u => u.name.includes(filter))
);

function UserList() {
  const runtime = useModule(UserModule);
  // ✅ Safe: 只有当 users 或 filter 变化时，selectActiveUsers 才会重新计算并返回新引用
  const activeUsers = useSelector(runtime, selectActiveUsers);
  return ...
}
```

> **性能最佳实践**：
>
> 1. **Selector 返回原子值**：尽量让 Selector 返回 string/number/boolean 等基本类型。
> 2. **Stable Runtime**：`useModule(handle)` 获取的 runtime 引用永远不变，可放心作为 Props 传递给子组件，不会触发 `React.memo` 失效。
> 3. **Logic 独立线程**：Logix 的业务逻辑在 Effect Runtime 中运行，不会阻塞 React 渲染线程（Main Thread），只有最终状态变更才会通知 UI。

> 实现约束（Adapter 层）：
>
> - **Level 2（推荐 API 形状）**：`useSelector` / `useModule(handle, selector)` 签名建议为 `(handle | runtime, selector, equalityFn?)`，默认 `equalityFn` 为 `Object.is`；
> - **Level 1（行为约束）**：订阅必须通过 `useSyncExternalStore` 或等价机制实现，React Adapter 负责封装 selector / equality 行为，业务侧无需接触底层订阅实现；
> - React Runtime Adapter 在运行 Effect 前需自动补齐所有 Layer/Context，保证 selector/dispatch 与 App Runtime 相同的依赖视图。
