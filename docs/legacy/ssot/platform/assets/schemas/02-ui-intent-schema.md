# 2. UI Intent Schema

UI 意图描述界面结构。它是一棵组件树。

```typescript
interface UIImplConfig {
  component: string; // 组件名或 Pattern 资产 ID（平台层概念）
  props: Record<string, any>;
  slots?: Record<string, string>; // 插槽映射到子节点 ID

  // 信号发射配置
  emits?: Record<string, { _tag: string, payload?: any }>; // e.g. { onClick: { _tag: 'submitOrder' } }

  // 视觉交互状态 (Visual State)
  state?: Record<string, any>; // e.g. { isOpen: false }
}
```
