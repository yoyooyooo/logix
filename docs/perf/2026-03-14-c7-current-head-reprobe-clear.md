# 2026-03-14 · C-7：current-head reprobe 继续为 clear

## 目标

在连续完成：

- `U-1 externalStore` 收口
- `C-6 bootResolve observer-ready` 语义修正

之后，重新确认 current-head 是否又出现了新的默认 browser/runtime blocker。

## 命令

```sh
python3 fabfile.py probe_next_blocker --json
```

## 结果

返回：

- `status: "clear"`
- `blocker: null`
- `pending: []`

按当前 playbook 的顺序，三条 suite 全部通过：

1. `externalStore.ingest.tickNotify`
2. `runtimeStore.noTearing.tickNotify`
3. `form.listScopeCheck`

## 关键样本

### 1. `externalStore.ingest.tickNotify`

probe 内 targeted 结果：

- `off / 128 = 0.8ms`
- `off / 256 = 1.1ms`
- `off / 512 = 1.1ms`
- `full / 128 = 1.7ms`
- `full / 256 = 1.2ms`
- `full / 512 = 1.3ms`

结论：

- 绝对预算继续通过到 `watchers=512`
- 相对预算在 probe 输出里仍显示低档位噪声，但当前 gate 路由口径下整条 suite 为 `passed`

### 2. `runtimeStore.noTearing.tickNotify`

probe 内 targeted 结果继续稳定在 `~0.008ms ~ 0.012ms`

结论：

- 继续通过

### 3. `form.listScopeCheck`

probe 内 targeted 结果继续通过

结论：

- 当前没有新 blocker

## 裁决

1. current-head 仍无默认 runtime 主线。
2. 当前不应再开新的 perf worktree。
3. `09-worktree-open-decision-template.md` 的默认答案继续成立：
   - 本轮不开新的 perf worktree
   - 当前只保留 `R-2` 架构/API 候选

## 当前结论

如果后续还要继续 perf：

1. 先有新的 real probe failure
2. 或有新的 clean/comparable native-anchor 证据
3. 否则只做 docs/evidence-only 收口
