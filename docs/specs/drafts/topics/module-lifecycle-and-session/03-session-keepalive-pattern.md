---
title: Session Pattern (Usage Guide)
status: draft
version: 1.0.0
authors:
  - User
  - Agent
priority: 1400
related:
  - ./01-lifecycle-and-scope.md
  - ./02-unified-resource-cache.md
  - ../../L9/page-level-module-state-retention.md
  - ../draft-pattern/README.md
  - ../draft-pattern/00-design.md
  - ../draft-pattern/10-react-integration.md
  - ../draft-pattern/20-boundary-analysis.md
---

# Session Pattern (Usage Guide)

> **核心目标**：基于统一的 `ModuleCache`，定义如何通过配置 `gcTime` 和 `key` 来实现“会话级模块状态保持”。
- **锚点**：`ModuleCache` 中的 `Key` (组件 ID + Deps)。

## 1. 核心理念：One Cache, Multiple Lifecycles

在引入 Unified ModuleCache 后，我们不再区分“组件级缓存”和“会话级缓存”，而是通过配置不同的 **Retention Policy (gcTime)** 来实现不同的业务目标。

- **Transient (Component-Level)**: `gcTime = 500ms` (默认)。随组件销毁而快速释放，仅防抖动。
- **Persistent (Session-Level)**: `gcTime = 5min / 30min / Infinity`。组件卸载后，Runtime 依然存活，直到超时或被 LRU 淘汰。

## 2. 统一 API 模式 (The Unified Pattern)

我们废弃了 `useSessionModule`，统一使用 `useModule`。

### 2.1 隐式范围：组件级 (Component-Level)

```tsx
// 默认行为：组件私有，卸载后 500ms 销毁
const runtime = useModule(MyImpl);
```

### 2.2 显式范围：区域级 (Section-Level)

```tsx
// 显式 Key：在 Provider 范围内共享
const runtime = useModule(MyImpl, { key: 'section-header' });
```

### 2.3 业务范围：会话级 (Session-Level)

这是原 Session KeepAlive 的实现方式，现在只需配置 `gcTime`。

- **场景**：多 Tab 页切换、草稿箱、后台管理系统。
- **实现**：

```tsx
function TabContent({ tabId }) {
  // 关键点：
  // 1. 显式 Key: 保证跨组件/跨挂载复用同一个 Runtime
  // 2. 长 gcTime: 保证 Tab 切换/关闭后，Runtime 在内存中保留足够长时间
  const runtime = useModule(PageImpl, {
    key: `tab:${tabId}`,
    gcTime: 10 * 60 * 1000, // 10分钟
    suspend: true
  });

  return (
    <RuntimeProvider runtime={runtime}>
      <RealContent />
    </RuntimeProvider>
  );
}
```

## 3. 协议详解

### 3.1 Scope 管理：Module Scope vs Subscription

在统一模型下，Scope 的概念也得到了简化：

1.  **Module Scope (Runtime Scope)**:
    -   由 `ModuleCache` 持有（per ManagedRuntime）；  
    -   生命周期近似为「所有使用该 key 的组件最后一次卸载时间 + gcTime」，更精确地说：从 `refCount` 变为 0 开始计时，若在 `gcTime` 内无人重新持有则触发 GC；
    -   承载 State, Store, Long-running Effects (Data Scope)。
2.  **Subscription (React Effect)**:
    -   由组件的 `useEffect` 持有。
    -   生命周期 = 组件挂载时间。
    -   承载 UI 绑定 (View Scope)。

### 3.2 显式依赖与 Context Bridge

（同前文，保持不变：Session Runtime 需要复用 App 服务时，必须通过 Layer 显式注入，禁止隐式冒泡。）

### 3.3 与 Draft Pattern / Form Session 的关系

- **Session (Module Scope)**: 承载长生命周期的业务状态（如订单编辑页）。
- **Draft (Transaction Scope)**: 在 Session 内部开启的短生命周期事务（如一次编辑操作）。
- **关系**：
  - `useModule(..., { gcTime: 10min })` 保证了 Session Runtime 在“无人持有”的空档期内不会立即销毁，而是按 gcTime 进行 Idle-Based 过期；
  - Session Runtime 内部的 Logic 负责管理 Draft 的开启与提交。

### 3.4 与 Platform lifecycle 的协同（行为 vs 内存）

- **内存维度（由 ModuleCache 决定）**：
  - UI 卸载后，`refCount` 归零 → ModuleCache 按配置的 `gcTime` 计时；
  - 若在 `gcTime` 内重新挂载（例如切回 Tab），`refCount` 再次 > 0 → 取消 GC，Session Runtime 继续存在；
  - 若超过 `gcTime` 仍无人使用 → ModuleCache 关闭 Scope，触发 `onDestroy`，Session 正式结束。
- **行为维度（由 Platform lifecycle 决定）**：
  - UI 从可见 → 不可见的瞬间（Route Leave / visibility hidden 等），Platform 层可以触发 `onSuspend` 暂停高频任务（即使 Session 尚未被 GC）；  
  - 当 UI 回到可见状态（Route Enter / visibility visible）且 Session 仍存在时，可以触发 `onResume` 恢复行为；  
  - 某些业务事件（例如 Logout / 全局 Reset）还可以通过 Platform 或 Module 层显式驱动 reset/evict，而不是等待 `gcTime` 自然到期。

> 约定：Session Pattern 只规定“Runtime Scope 如何保活与回收”（存在问题），**不单独定义行为暂停/恢复策略**；行为侧应通过 Platform lifecycle 与业务 Logic 配合完成。

## 4. TODO 与落地路径

1.  **Implementation**:
    -   在 `ModuleCache` 中实现 `gcTime` 逻辑。
    -   更新 `useModule` 签名，支持 `UseModuleOptions`。
2.  **Testing**:
    -   验证 `gcTime` 的准确性（特别是 500ms vs 10min 的区别）。
    -   验证 Session 恢复场景（Unmount -> Wait < gcTime -> Remount -> State Retained）。
3.  **Documentation**:
    -   更新 `apps/docs` 中的 "State Retention" 章节，推广这种基于 `gcTime` 的简单模式。

## 5. 总结

**One Cache, One API.**

我们不需要引入复杂的 Session Manager 或 KeepAlive 组件。通过简单的 **Time-based Retention**，React 的声明式组件模型就能完美地映射到 Logix 的 Runtime 生命周期模型上。
