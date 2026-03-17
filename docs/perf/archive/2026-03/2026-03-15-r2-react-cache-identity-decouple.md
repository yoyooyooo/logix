# 2026-03-15 · R2 React cache identity decouple

## 这刀做了什么

目标只做 `P1-6/P1-7` 的第一刀：

- `ModuleCache` 不再因为 `configVersion` 变化而整仓重建
- `gcTime` 从“cache identity 的一部分”改成“cache 的可更新默认策略”

实现点：

1. `getModuleCache(runtime, snapshot)` 改成单纯按 `runtime` 取 cache，不再使用 `configVersion` 判定身份。
2. `ModuleCache` 新增默认 `gcTime` 更新能力，`runtime` 级默认值变化时不会 `dispose` 整个 cache。
3. 现有 entry 在读取命中时会刷新 `gcTime` 策略，避免 `gcTime` 变化后旧 entry 继续挂着旧的回收窗口。
4. `useModule` / `useModuleRuntime` / `useLocalModule` / `RuntimeProvider` 的 cache 读取依赖从 `configVersion` 脱开。
5. `RuntimeProvider` 异步 config snapshot 刷新时，不再因为 `gcTime` 变化 bump `configVersion`。

## 证据

新增回归用例：

- `packages/logix-react/test/internal/integration/reactConfigRuntimeProvider.test.tsx`
  - `does not dispose ModuleCache when gcTime changes`

验证点：

- `gcTime` 从 `500` 改到 `1500` 后，`configVersion` 保持 `1`
- 同一个 `ModuleCache` 实例被复用
- 同一个 `ModuleRuntime.instanceId` 被复用
- entry 的 `gcTime` 会更新到新值

## 验证

通过：

- `node <typescript/bin/tsc> -p packages/logix-react/tsconfig.test.json --noEmit`
- `node <vitest/vitest.mjs> run packages/logix-react/test/internal/integration/reactConfigRuntimeProvider.test.tsx --pool forks`

结果：

- typecheck 通过
- `reactConfigRuntimeProvider.test.tsx` 共 `7` 条用例全部通过

## 结论

这条方向成立。

它没有重写 resolve engine，只把最明显的 cache churn 切掉了，收益是：

- `RuntimeProvider` 配置刷新不再触发整仓 `ModuleCache.dispose()`
- `useModule` / `useModuleRuntime` 对已有实例的复用更稳
- 后续继续做 `resolve engine` 统一时，基础身份模型已经干净

## 当前还剩什么

下一步若继续沿这条线推进，优先级建议是：

1. 把 `RuntimeProvider` 的 config/preload 控制面继续单飞化
2. 再决定是否统一 `read / readSync / warmSync / preload` 四套状态机

当前不建议立刻把整个 resolve engine 一口气重写。
