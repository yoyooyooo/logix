---
title: 04 · 从意图到代码：v3 演练 (Example)
status: draft
version: 3 (Anchor-Enhanced)
---

> 本文档通过一个“乐观更新的点赞按钮”示例，展示在三位一体模型下，意图是如何从 Spec 显影为带有 **全双工锚点** 的高质量代码的。

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
// @intent-component: like-btn
export const LikeButton = () => {
  const liked = useSelector(s => s.article.liked);
  const emit = useEmit();
  
  return (
    <IconButton 
      icon="heart" 
      active={liked} 
      onClick={() => emit('signal:toggleLike')} 
    />
  );
};
```

### 3. Logic Intent (灵魂)

**Spec**: “点击后立即变色（乐观更新），然后调接口。失败则回滚并提示。”

**Generated Code (Logix Rule with Anchors)**:
> 注意：注释中的 Hash 用于检测人工修改。

```typescript
// src/features/article/logic.ts
import { defineRule } from '@logix/core';
import { ArticleServiceTag } from '@/domain/article/service';

export const likeFlow = defineRule((api) => api.rule({
  // @intent-trigger: signal:toggleLike
  trigger: api.on.signal('signal:toggleLike'),
  mode: 'switch',
  
  do: (payload) => Effect.gen(function* () {
    // @intent-start: node-1 { type: "update-state", hash: "a1b2" }
    const currentLiked = yield* api.ops.get(s => s.article.liked);
    yield* api.ops.set(s => s.article.liked, !currentLiked);
    // @intent-end: node-1

    // @intent-start: node-2 { type: "retry-block", hash: "c3d4" }
    yield* Effect.gen(function* () {
      const service = yield* ArticleServiceTag;
      // @intent-call: ArticleService.toggleLike
      yield* service.toggleLike(payload.id);
    }).pipe(
      Effect.retry(Schedule.exponential('1 second', 3))
    ).pipe(
      // @intent-start: node-3 { type: "catch-all", hash: "e5f6" }
      Effect.catchAll(() => Effect.gen(function* () {
        // @intent-slot: fallback
        yield* api.ops.set(s => s.article.liked, currentLiked);
        yield* api.ops.emit('toast', 'Error');
      }))
      // @intent-end: node-3
    );
    // @intent-end: node-2
  })
}));
```

### 4. 总结

通过引入锚点系统：
1.  **可读性**：代码依然清晰，注释仅作为元数据存在。
2.  **鲁棒性**：如果开发者手动修改了 `node-1` 中的逻辑（导致 Hash 不匹配），Parser 会将其标记为 **Ejected Block**，在画布上显示为“已修改”，防止图结构崩塌。
3.  **全双工**：支持从代码反向生成精确的 Intent 图。
