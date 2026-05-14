---
title: useModule
description: 获取共享 module instance 或局部/keyed program instance。
---

`useModule` 有两条公开路线。

## 共享托管实例

```tsx
const counter = useModule(Counter.tag)
```

当前 runtime 已经通过 root program 或 imports 托管该 module 时，使用 tag。

## 局部/keyed program 实例

```tsx
const preview = useModule(PreviewProgram, { key: productId })
```

组件或路由需要拥有实例时，使用 program。`key` 允许同一 provider 下跨组件复用。

## Suspense

```tsx
const preview = useModule(PreviewProgram, {
  key: productId,
  suspend: true,
  initTimeoutMs: 3000,
})
```

Suspense 只影响 acquisition fallback，不改变 runtime 语义。

## Reads and writes

读取使用 `useSelector(handle, selector)`。写入使用 `useDispatch(handle)` 或领域 handle commands。
