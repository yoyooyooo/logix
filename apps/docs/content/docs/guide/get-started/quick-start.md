---
title: 快速开始
description: 构建你的第一个 Logix 应用。
---



本指南将带你构建一个简单的计数器应用。

## 1. 安装

```bash
npm install @logix/core @logix/react effect
```

## 2. 定义模块

```typescript
// counter.ts
import { Logix, Schema } from '@logix/core';

export const Counter = Logix.Module('Counter', {
  state: Schema.Struct({ count: Schema.Number }),
  actions: { increment: Schema.Void },
});
```

## 3. 实现逻辑

```typescript
// logic.ts
import { Effect } from 'effect';
import { Counter } from './counter';

Counter.logic(($) =>
  $.onAction(Counter.actions.increment, () =>
    $.update(Counter.state.count, (n) => n + 1)
  )
);
```

## 4. 连接 UI

```tsx
// App.tsx
import { useModule } from '@logix/react';
import { Counter } from './counter';
import './logic'; // 导入 logic 以注册它

export function App() {
  const { state, actions } = useModule(Counter);

  return (
    <button onClick={() => actions.increment()}>
      Count: {state.count}
    </button>
  );
}
```
