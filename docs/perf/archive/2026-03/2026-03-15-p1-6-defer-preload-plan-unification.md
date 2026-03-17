# 2026-03-15 · P1-6 defer preload plan unification

## 这刀做了什么

目标只做 `RuntimeProvider` 的第一刀：

- 不碰 async config snapshot load
- 不碰 `ModuleCache` 身份模型
- 只把 `defer` 模式下 render 期 `syncWarmPreloadReady` 和 effect 期 `preload(...)` 的重复 preload 解析路径统一成一份共享 plan

实现：

1. 新增 `preloadPlan.ts`
- 负责把同一批 handle 解析成稳定 plan
- 每条 plan entry 预先固定：
  - `ownerId`
  - `key`
  - `gcTime`
  - `factory`
  - `handleKind/tokenId`

2. `RuntimeProvider.tsx`
- 新增 `deferPreloadPlan` 的 `useMemo`
- render 期的 `syncWarmPreloadReady` 改为消费 plan
- effect 期的 `preload(...)` 也改为消费同一份 plan

## 为什么值

当前 `defer` 路径里，render 和 effect 会各自重复做：

- key 解析
- owner 解析
- factory 构造
- `gcTime` 读取

这刀先不碰 `ModuleCache` 和 config load，只砍 provider 内部的重复解析壳。

## 证据

### 直接相位证据

新增测试：

- `packages/logix-react/test/internal/integration/runtimeProviderDeferPreloadPlan.test.tsx`

场景：

- `defer` 模式
- preload handle 为 async `ModuleImpl`
- render 期 `warmSync` 失败，effect 期继续 `preload`

验证点：

- 同一个 async preload handle 的 `layer` 解析次数为 `1`
- 说明 render/effect 已共享同一份 plan

本轮直接证据值：

- `layerAccessCount=1`

### 语义守门

通过：

```bash
node <vitest> run packages/logix-react/test/internal/integration/runtimeProviderDeferPreloadPlan.test.tsx --pool forks
node <vitest> run packages/logix-react/test/integration/runtimeProviderSuspendSyncFastPath.test.tsx --pool forks
node <tsc> -p packages/logix-react/tsconfig.test.json --noEmit
```

结果：

- 新增 preload plan 共享测试通过
- 现有 `defer+preload` 语义守门 2 条用例通过
- `packages/logix-react` 的 test typecheck 通过

## 裁决

- 当前建议合入
- 这刀先拿到了 direct phase evidence
- 语义守门与类型门都通过

## 当前还剩什么

如果后续继续推进 `P1-6`，建议顺序是：

1. 把 `defer preload` 的 plan 证据再扩成耗时型 bench
2. 再看是否值得继续把 `sync / suspend / defer / preload` 四套状态机进一步统一

当前不建议回到 `neutral config singleflight` 失败切口。
