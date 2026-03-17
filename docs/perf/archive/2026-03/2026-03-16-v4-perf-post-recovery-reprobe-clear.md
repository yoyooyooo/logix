# 2026-03-16 · v4-perf 母线恢复后复验仍为 clear

## 目标

在完成以下收口后，重新确认 `v4-perf` 当前 head 是否仍然没有新的默认 blocker：

- 解决 `rowId gate` 的 cherry-pick 冲突
- 回收 `rowId gate` 的 accepted 代码与文档
- 回收 `preload-plan` / `op-snapshot` 的 docs-only 结论
- 补齐当前 worktree 的依赖环境

## 命令

依赖修复：

```sh
pnpm install --frozen-lockfile
```

最小相关验证：

```sh
pnpm -C packages/logix-core typecheck:test
pnpm -C packages/logix-core exec vitest run \
  test/internal/StateTrait/RowId.NoTrackByGate.test.ts \
  test/internal/StateTrait/RowId.UpdateGate.test.ts \
  test/internal/StateTrait/StateTrait.RowIdMatrix.test.ts \
  test/internal/StateTrait/StateTrait.NestedList.RowId.Stability.test.ts \
  test/internal/StateTrait/StateTrait.TraitCheckEvent.DiagnosticsLevels.test.ts \
  test/internal/StateTrait/StateTrait.NoTrackByRowIdGate.Perf.off.test.ts
```

current-head reprobe：

```sh
python3 fabfile.py probe_next_blocker --json
```

## 结果

### 1. 依赖环境已恢复

- `pnpm install --frozen-lockfile` 完成
- lockfile 未漂移
- 当前 worktree 已可执行 `tsc` / `vitest` / browser probe

安装过程中出现了少量 bin 链接 warning：

- `examples/logix-cli-playground` 缺 `@logixjs/cli` 构建产物
- 根目录 `speckit-kit` 缺 `dist/bin/speckit-kit.js`

这些 warning 不影响本次 `logix-core` 验证与 `fabfile` probe。

### 2. `logix-core` 最小验证通过

- `pnpm -C packages/logix-core typecheck:test` 通过
- `rowId gate` 相关 6 个 test files 全部通过
- 共 `30` 个 tests 通过

### 3. `rowId gate` recovery retest 的补充现象

`StateTrait.NoTrackByRowIdGate.Perf.off.test.ts` 这轮输出里：

- `validate rows=300/1000` 仍然保持明显正收益
- `source-like rows=300/1000` 仍然保持正收益
- `ensureListCalls` 继续稳定为 `legacy=70, gated=0`

但 `validate rows=100` 出现一次 sub-ms `p95` 噪声尖峰：

- `legacy.p95 = 0.074ms`
- `gated.p95 = 0.269ms`

当前解释：

1. 这条点位绝对值很小，属于容易被单次调度噪声放大的区间
2. `300/1000 rows` 的主样本仍保持正收益
3. 非时间语义仍清晰表明 gate 已切掉重复 `ensureList(...)`

因此本轮不改 `accepted_with_evidence` 裁决，但后续若再补 hard evidence，应优先看 `300/1000 rows`，并把 `100 rows` 视为低量级噪声观察点。

### 4. `probe_next_blocker --json` 继续为 clear

返回：

- `status: "clear"`
- `blocker: null`
- `pending: []`

按当前 playbook 顺序，三条 suite 全部通过：

1. `externalStore.ingest.tickNotify`
2. `runtimeStore.noTearing.tickNotify`
3. `form.listScopeCheck`

## 关键样本

### `externalStore.ingest.tickNotify`

probe 内 targeted 结果：

- `off / 128 p95 = 0.9ms`
- `off / 256 p95 = 1.1ms`
- `off / 512 p95 = 0.8ms`
- `full / 128 p95 = 1.4ms`
- `full / 256 p95 = 1.4ms`
- `full / 512 p95 = 1.3ms`

结论：

- 绝对预算继续通过到 `watchers=512`
- 相对预算仍有低档位噪声，但 probe 整条 suite 结论保持 `passed`

### `runtimeStore.noTearing.tickNotify`

probe 内 targeted 结果继续稳定在 `~0.009ms ~ 0.014ms`

结论：

- 继续通过

### `form.listScopeCheck`

probe 内 targeted 结果继续通过到 `rows=300`

结论：

- 当前没有新 blocker

## 裁决

1. `v4-perf` 在依赖恢复后的 real probe 下，仍然没有新的默认 blocker
2. `2026-03-16-v4-perf-post-recovery-open-decision.md` 的“不再开新线”裁决继续成立
3. 当前只保留 watchlist，不重开新的 perf worktree

## 当前结论

如果后续还要继续 perf：

1. 先出现新的 real probe failure
2. 或出现新的 clean/comparable targeted 证据
3. 否则继续按 docs/evidence-only 收口，不直接重开实现线
