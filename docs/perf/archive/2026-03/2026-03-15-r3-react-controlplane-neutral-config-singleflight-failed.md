# 2026-03-15 · R3 React controlplane neutral config singleflight failed

## 目标

尝试把 `RuntimeProvider` 的 controlplane 再切一刀：

- 只针对“配置无关的 binding 变化”
- 避免 `render` 期同步 snapshot 之后，`effect` 期又因为 neutral binding settle 再跑一轮 async config snapshot load

这刀不触碰：

- `ModuleCache`
- resolve engine 重写
- preload 调度器

## RED 证据

新增过一条贴边集成用例，目标是复现：

- async config-neutral `layerBinding` settle 后
- `trace:react.runtime.config.snapshot(mode=async)` 出现两次

实验用例思路：

- `runtime` 只带 `Debug` sink
- `RuntimeProvider` 传入一个异步、且对 React config 无关的 layer
- `policy.syncBudgetMs=0`
- 用 sink 统计 async config trace 次数

结论：

- RED 稳定成立
- 当前 controlplane 确实存在“neutral layer settle 触发第二轮 async config load”的现象

## 试探实现

本轮尝试过两类最小修复：

1. 把 config load runtime 从 `runtimeWithBindings` 切到更窄的 neutral owner
2. 给 async config load 增加 provider-local single-flight / owner dedupe

## 为什么判失败

两类最小修复都没能在不破坏现有语义的前提下收口：

1. 一旦把 neutral 路径也并入单飞，现有 `gcTime / initTimeoutMs` 动态刷新测试会被误伤
2. 若继续细分 owner / neutral 规则，controlplane 语义开始快速复杂化，已经超出“最小一刀”的合理范围
3. 当前没有足够小且足够稳的切口，继续叠补丁只会把 `RuntimeProvider` 变脏

因此本轮裁决：

- 保留 RED 认识
- 回退所有代码试探
- 不合入 `v4-perf`

## 验证

回退后基线再次通过：

```bash
node /Users/yoyo/Documents/code/personal/logix.worktrees/effect-v4/node_modules/vitest/vitest.mjs run packages/logix-react/test/internal/integration/reactConfigRuntimeProvider.test.tsx --pool forks
node /Users/yoyo/Documents/code/personal/logix.worktrees/effect-v4/node_modules/typescript/bin/tsc -p packages/logix-react/tsconfig.test.json --noEmit
```

## 当前结论

这条“neutral config singleflight”作为最小切口，先记为：

- `discarded_or_pending`

它没有被证明方向错误，但当前这版切法不够好。

## 后续建议

若未来重开，优先改走这两个方向中的一个：

1. 把 config load 控制面与 provider readiness state 彻底拆成显式 state machine
2. 先做 preload/controlplane 的 shared plan，再把 config single-flight 合并进去

在这之前，不建议继续在当前 `RuntimeProvider` effect 上叠条件分支。
