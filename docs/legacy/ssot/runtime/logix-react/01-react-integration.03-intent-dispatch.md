# 3. 意图派发 (Intent Dispatch)

## 3.1 `dispatch` 函数

`useDispatch` 返回的 `dispatch` 函数用于向 Module 发送 Action。它是类型安全的，会自动推导 `ActionSchema` 中定义的 Action 类型。

```typescript
const moduleRuntime = useModule(myModule);
const dispatch = useDispatch(moduleRuntime);
dispatch({ _tag: 'updateUser', payload: { name: 'Alice' } });
```

> UI Intent 绑定约定：
>
> - UI 层所有业务事件最终应映射到已有的 Action 或 IntentRule/Flow Anchor；
> - React Adapter 层只提供 `dispatch` 这个稳定锚点，不感知 UI Schema 或组件树结构。

## 3.2 派生状态与瞬态 UI 状态

在设计 React 层的状态使用方式时，需要区分三类数据：

- **Persistent Derived（持久派生状态）**：
  - 业务上有语义、需要参与回放/审计的派生数据（如 `orderTotal`、`hasOverdue`）；
  - 应通过 Logic 规则（Bound API `$` + Fluent DSL / Flow）落在 Module State 中，由 Logix 管理。
- **Transient Derived（视图派生状态）**：
  - 仅用于视图呈现，不需要持久化或跨逻辑复用（如格式化文案、局部显隐）；
  - 推荐在 React 渲染时通过 `useSelector` 计算，保持 Module State 精简。
- **Ephemeral UI State（瞬态 UI 状态）**：
  - 完全属于 UI 表现层，如 hover 状态、某个折叠项是否展开、临时输入框内容等；
  - 推荐保留在 React 本地 state 或 UI Intent 中以 `$local` 源表达，不应长期写入 Module State。

90: 实践上：

- “需要回放和审计”的状态一律进入 Logix；
- “只是为了这一屏好看/好用”的状态尽量通过 `useSelector` 或本地 state 解决；
- React Adapter 不新增状态概念，只提供访问领域模块运行时的 Hook 与订阅桥接。
