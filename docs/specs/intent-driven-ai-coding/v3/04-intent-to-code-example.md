---
title: 04 · 从意图到代码：v3 演练 (Example)
status: draft
version: 11 (Effect-Native)
---

> 本文档通过一个“乐观更新的点赞按钮”示例，展示在 **Effect-Native** 架构下，意图是如何从 Spec 显影为带有 **全双工锚点** 的高质量代码的。

## 场景：点赞 (Toggle Like)

### 1. Domain Intent (记忆)

**Spec**: “文章实体包含点赞状态。需要一个点赞服务。”

**Generated Code (Effect Tag)**:
```typescript
// src/domain/article/service.ts
// @intent-entity: Article
export interface ArticleService {
  toggleLike: (id: string) => Effect.Effect<void, Error>;
}
export class ArticleServiceTag extends Context.Tag('ArticleService')<ArticleServiceTag, ArticleService>() {}
```

### 2. UI Intent (躯壳)

**Spec**: “一个爱心按钮，点击切换状态。”

**Generated Code (React Component)**:
```tsx
// src/ui/LikeButton.tsx
import { useStore } from '@logix/react';
import { ArticleStore } from '@/features/article/store';

// @intent-component: like-btn
export const LikeButton = () => {
  const { dispatch, useSelector } = useStore(ArticleStore);
  const liked = useSelector(s => s.liked);
  
  return (
    <IconButton 
      icon="heart" 
      active={liked} 
      onClick={() => dispatch({ _tag: 'toggleLike' })} 
    />
  );
};
```

### 3. Logic Intent (灵魂)

**Spec**: “点击后立即变色（乐观更新），然后调接口。失败则回滚并提示。”

**Generated Code (Logix Program with Anchors)**:
> 注意：代码采用了 State/Action Layer + Stream 的纯粹风格，Logic 本身是运行在其上的长生命周期 Effect 程序。

```typescript
// src/features/article/store.ts
import { Store, flow, Logic } from '@logix/core';
import { ArticleServiceTag } from '@/domain/article/service';
import { OptimisticToggle } from '@patterns/common';

// 1. 定义 State Layer
const StateLive = Store.State.make(ArticleSchema, { liked: false });

// 2. 定义 Action Layer
const ActionLive = Store.Actions.make(ArticleActionSchema);

// 3. 定义 Logic 程序
const LogicLive = Logic.make(Effect.gen(function*(_) {
  const store = yield* _(Store);

  // @intent-rule: toggle-like { x: 100, y: 200 }
  yield* Effect.all([
    flow.from(store.action((a) => a._tag === 'toggleLike')).pipe(
      // 使用 Pattern 复用逻辑
            flow.run(OptimisticToggle({
        statePath: 'liked',
        action: (ctx) => Effect.gen(function*(_) {
          const service = yield* _(ArticleServiceTag);
          yield* service.toggleLike(ctx.payload.id);
        })
      }))
    )
  ], { concurrency: 'unbounded' });
}));

// 4. 组装 Store (State/Action Layer + Logic 程序)
export const ArticleStore = Store.make(
  StateLive,
  ActionLive,
  LogicLive
);
```

### 4. 总结

通过引入 **Effect-Native** 架构：
1.  **纯粹性**：逻辑定义完全基于 Effect 和 Stream，没有黑盒配置。
2.  **复用性**：`Flow.run(Logic.run(Pattern))` 使得业务积木的挂载变得极其自然。
3.  **全双工**：Parser 依然可以通过识别 `Flow.from(...).pipe(...)` 结构，将这段纯代码还原为可视化的流程图。
