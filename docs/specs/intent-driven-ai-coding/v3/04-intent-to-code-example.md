---
title: 04 · 从意图到代码：v3 演练 (Example)
status: draft
version: 11 (Effect-Native)
---

> 本文档通过一个“乐观更新的点赞按钮”示例，展示在 **Effect-Native** 架构下，意图是如何从 Spec 显影为带有 **全双工锚点** 的高质量代码的。

## 场景：点赞 (Toggle Like)

### 1. Module Intent (记忆)

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
import { useModule, useDispatch } from '@logix/react';
import { ArticleModule } from '@/features/article/store'; // Corrected path to ArticleModule

export const LikeButton = () => { // Kept component name as LikeButton for consistency with the example
  // 1. 获取 Runtime (Stable)
  const runtime = useModule(ArticleModule);
  const dispatch = useDispatch(runtime);

  // 2. 订阅状态
  const liked = useModule(ArticleModule, s => s.liked); // Subscribing to 'liked' state

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
> 注意：代码采用了 Module-first + Fluent Intent (`$.onAction().then(...)`) 的 Effect-Native 风格，Logic 本身是运行在其上的长生命周期 Effect 程序。

```typescript
// src/features/article/store.ts
import { Effect } from 'effect';
import { Logix } from '@logix/core';
import { ArticleServiceTag } from '@/domain/article/service';
import { OptimisticToggle } from '@patterns/common';

// 1. 定义领域 Module（state/actions 形状）
export const ArticleModule = Logix.Module('Article', {
  state: ArticleStateSchema,
  actions: ArticleActionSchema,
});

// 2. 定义 Logic 程序（基于 Fluent Intent + Pattern）
export const ArticleLogic = ArticleModule.logic(($) =>
  Effect.gen(function* () {
    // @intent-rule: toggle-like { x: 100, y: 200 }
    yield* $.onAction(
      (a): a is { _tag: 'toggleLike'; payload: { id: string } } => a._tag === 'toggleLike',
    ).then(
      // 使用 Pattern 复用逻辑
      OptimisticToggle({
        statePath: 'liked',
        action: (ctx) =>
          Effect.gen(function* () {
            const service = yield* $.use(ArticleServiceTag);
            yield* service.toggleLike(ctx.payload.id);
          }),
      }),
      { mode: 'exhaust' },
    );
  }),
);

// 3. 组装 Module Live（基于领域定义 + Logic 程序）
export const ArticleLive = ArticleModule.live(
  {
    status: 'idle',
    title: '',
    content: '',
  },
  ArticleLogic,
);
```

### 4. 总结

通过引入 **Effect-Native** 架构：
1.  **纯粹性**：逻辑定义完全基于 Effect 和 Stream，没有黑盒配置。
2.  **复用性**：`Flow.run(Logic.run(Pattern))` 作为“默认串行挂载点”，使得业务积木的组合与复用变得自然、可预期；需要高吞吐时可以显式选择 `Flow.runParallel(...)` 等变体。
3.  **全双工**：Parser 依然可以通过识别 `Flow.from(...).pipe(...)` 结构，将这段纯代码还原为可视化的流程图。
