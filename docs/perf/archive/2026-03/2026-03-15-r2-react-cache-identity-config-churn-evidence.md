# 2026-03-15 · R2 React cache identity config churn evidence

## 目标

给已合入 `v4-perf` 的 `react cache identity decouple` 补一条直接打在 boot/config churn 的收益证据，判断它能否从 `merged_but_provisional` 升级。

## 证据设计

新增 targeted integration test：

- `packages/logix-react/test/internal/integration/reactConfigRuntimeProvider.test.tsx`
  - `avoids cache dispose and runtime rebuild during boot-time gcTime churn`

测试语义：

1. Provider 首屏 render 后，在 `useLayoutEffect` 阶段把 runtime 级 `gcTime` 从 `500` 改到 `1500`
2. 等待 `RuntimeProvider` 的异步 config snapshot 刷新
3. 直接检查 4 个 boot/config churn 指标
   - `configVersion` 是否仍保持 `1`
   - `ModuleCache` 对象是否保持同一实例
   - 初始 cache 的 `dispose()` 是否被调用
   - `ModuleRuntime.instanceId` 是否发生重建

## 证据命令

```bash
TSC=$(find node_modules/.pnpm -maxdepth 4 -path '*typescript@5.9.3*/node_modules/typescript/bin/tsc' | head -n 1)
node "$TSC" -p packages/logix-react/tsconfig.test.json --noEmit

VITEST=$(find node_modules/.pnpm -maxdepth 4 -path '*vitest@4.0.15*/node_modules/vitest/vitest.mjs' | head -n 1)
node "$VITEST" run packages/logix-react/test/internal/integration/reactConfigRuntimeProvider.test.tsx --pool forks
```

## 结果

类型检查：

- `packages/logix-react/tsconfig.test.json` 通过

测试：

- `reactConfigRuntimeProvider.test.tsx` 共 `8` 条用例通过
- 新增的 config churn evidence 用例结果为：
  - `gcTime=1500`
  - `configVersion=1`
  - `cacheStable=true`
  - `disposeCount=0`
  - `distinctRuntimeCount=1`

## 结论

结论：`accepted_with_evidence`

原因：

1. 这条证据直接打在 boot/config churn 主路径。
2. 它证明了 `gcTime` 变化不会再触发整仓 cache dispose。
3. 它证明了异步 config snapshot 刷新不会重建 `ModuleRuntime`。
4. 这已经超出“语义看起来合理”的 provisional 阶段，属于直接、可重复的 churn elimination 证据。

## 边界

这次补的是“churn elimination”证据，不是 wall-clock perf boundary。

当前还没有补的内容：

- 浏览器侧 boot timeline 的耗时对照
- 多次连续 config refresh 下的累计耗时对照

若后续还要继续加码，建议新增一条 focused micro-bench，只测 `RuntimeProvider` 在 config snapshot 变化时的 rebuild 次数与耗时。*** End Patch
