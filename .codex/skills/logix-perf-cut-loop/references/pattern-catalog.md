# Pattern Catalog

## 1. watcher -> action txn fusion

适用：
- `onAction(tag)` 上的纯状态写回 watcher

价值：
- 少一次离开原 action txn 再回来

## 2. direct draft write

适用：
- 上述 watcher 已并回 action txn，仍有通用 Effect 层税

价值：
- 直接改 draft/patch，继续去样板层

## 3. suspend/defer sync-first

适用：
- 模块/标签本身纯同步可解，但框架无脑先挂起

价值：
- 直接去掉不必要的 fallback

## 4. near_full slim decision

适用：
- `auto` 实际执行成 `full`，只剩 decision 资产税

价值：
- 保住必要 evidence，同时去掉 heavy summary

## 5. explicit mode axis

适用：
- suite 依赖 env 默认值决定模式

价值：
- broad/full matrix 不再测偏

## 6. click-anchored timing

适用：
- benchmark 通过 `setTimeout/RAF` 排队再触发动作

价值：
- 把 timer 排队噪声从 runtime 指标里剥离
