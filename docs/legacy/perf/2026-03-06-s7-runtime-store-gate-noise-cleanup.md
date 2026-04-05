# 2026-03-06 · S-7：runtimeStore.noTearing gate noise cleanup

本刀不是继续优化 `RuntimeStore` runtime，而是清理 `runtimeStore.noTearing.tickNotify` 在相对预算上的 timer-floor 噪声。

## 问题

`runtimeStore.noTearing.tickNotify` 的相对预算：
- `full/off<=1.25`

在 `watchers=256/512` 的极低耗时样本里，`off` 可能落到 `0.0ms`，`full` 落到单个 `0.1ms` 计时量级。
这会让 harness 把它记成：
- `reason=denominatorZero`

但这不是当前 `diagnosticsLevel=full` 的真实性能回归，而是 browser timer 量化地板噪声。

## 最小修复

文件：`.codex/skills/logix-perf-evidence/assets/matrix.json`

- 仅把 `runtimeStore.noTearing.tickNotify` 的 `full/off<=1.25` 的 `minDeltaMs` 从 `0.02` 提到 `0.11`

原因：
- `0.02ms` 仍然会让单个 `0.1ms` timer quantum 误触发相对预算噪声
- `0.11ms` 足以跨过单个 browser timer 量化台阶，但仍保留对更大差值的敏感度

## 验证

- `pnpm -C packages/logix-react exec vitest run --project browser test/browser/perf-boundaries/runtime-store-no-tearing.test.tsx`
- `git diff --check`

## 结论

- 这是 suite-specific gate noise cleanup，不是 runtime 优化。
- 后续若再出现同类 `denominatorZero`，优先先看 timer-floor / minDelta，而不是直接怀疑 `RuntimeStore` 主链路。
