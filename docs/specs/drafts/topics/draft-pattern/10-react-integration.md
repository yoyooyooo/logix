---
title: Draft Pattern React Integration & DX
status: draft
version: 1.0
related: []
---

# Draft Pattern React Integration & DX

> **Status**: L4 (Practice & Cookbook)
> **Context**: `v3/react-integration`

本草稿关注 Draft Pattern 在 React 环境下的工程实践，重点解决“怎么用得爽”的问题。

## 1. The `useDraft` Hook

### 1.1 Signature

```typescript
function useDraft<S, C, Comp, A>(draft: Draft<S, C, Comp, any, A>): {
  state: S | null;        // null if not started
  computed: Comp | null;
  actions: A;             // Strongly typed actions
  status: 'idle' | 'starting' | 'ready' | 'committing' | 'destroyed';
  error: Error | null;    // Runtime/Validation errors
  commit: () => Promise<S | Command>;
  destroy: () => void;
}
```

### 1.2 Key Implementation Details

*   **Automatic Subscription**: 内部使用 `useSubscription` (or `useSyncExternalStore`) 订阅 `DraftRuntime.state`。
*   **Concurrency Safety**: 在 React 18 Concurrent Mode 下，确保 Subscription 不会因为 Tearing 导致 UI 不一致。
*   **Null Handling**: 当 Draft 未启动时，`state` 返回 `null`。组件层通常需要处理这个空状态（或封装 `<DraftGuard>` 组件）。

## 2. UI Cookbook (典型场景)

### 2.1 The "Wizard" (分步向导)

**场景**: 用户点击“创建项目”，弹出一个 3 步向导。

```tsx
const CreateProjectWizard = () => {
  const { state, actions, commit } = useDraft(CreateProjectDraft);

  if (!state) return null; // Or <Loading />

  return (
    <Modal open={true}>
      <Steps current={state.step} />

      {state.step === 1 && <BasicInfoForm />}
      {state.step === 2 && <MemberSelectForm />}

      <Footer>
        <Button onClick={actions.prev}>Back</Button>
        {state.step < 3 ? (
          <Button onClick={actions.next}>Next</Button>
        ) : (
          <Button onClick={commit}>Create</Button>
        )}
      </Footer>
    </Modal>
  );
};
```

### 2.2 The "Bulk Edit" (批量编辑)

**场景**: 在列表中勾选 10 行，点击“批量修改状态”。

**Pattern**:
1.  `start(BulkEditDraft, { ids: selectedIds })`
2.  Draft 内部初始化 State，拉取这 10 行的当前状态。
3.  用户修改，Draft State 更新。
4.  `commit()` -> 产生 `BatchUpdateCommand` -> 发送给后端。

### 2.3 The "Canvas Drag" (画布拖拽)

**场景**: 拖拽节点移动。

**Optimization**:
*   不要把 `x, y` 存入 Domain Store。
*   使用 Draft 存储 `draggingNodeId` 和 `currentPosition`。
*   只有画布层订阅 Draft，其他组件不受影响（避免 Re-render）。
*   拖拽结束 -> `commit()` -> 更新 Domain Store。

## 3. Router Integration

**问题**: 用户点击浏览器“后退”按钮，Draft 应该销毁吗？

**策略**:
1.  **Bind to Route**: 将 Draft 的生命周期绑定到某个 Route（例如 `/projects/new`）。Route 退出 -> Draft Destroy。
2.  **Manual Control**: 在 Modal 场景下，Draft 独立于 Route。需要监听 `LocationChange` 事件手动销毁，或依靠 Modal 的 `onClose`。
