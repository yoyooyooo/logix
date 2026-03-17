# 2026-03-17 · P1-6 boot config owner conflict

## 结论类型

- `docs/evidence-only`
- `discarded_or_pending`

## 问题

这次尝试想把 `P1-6 RuntimeProvider boot-epoch config singleflight` 收成一条可接受的小切口。

目标原本有两条：

1. 同一次 boot epoch 内，async config load 只飞一趟
2. 如果 async layer 自己提供 `ReactRuntimeConfig`，首次 ready render 就必须拿到新 snapshot

结果是这两条在当前切口下发生了直接冲突。

## 证据

### 1. 原始 boot singleflight 测试

测试：

- `singleflights async config load within one boot epoch and still applies post-ready config refresh`

这条测试要求：

- `boot async trace count = 1`
- `post-ready async trace count = 1`
- ready 之后改写 `gcTime / initTimeoutMs` 仍会刷新 snapshot，且 cache / instanceId 不变

### 2. reviewer 指出的回归风险

高严重度 finding：

- 如果 async layer 自己提供 `ReactRuntimeConfig` 或 `ConfigProvider`
- boot 单飞把整个 boot 窗口压成第一次 async 读取
- 首次 ready render 可能先拿到旧 snapshot，等 post-ready 才修正

### 3. 新补的回归测试

测试：

- `uses async layer config on the first ready render during boot`

它要求：

- async layer 提供 `gcTime=1500`
- 首次 ready render 就必须看到 `gcTime=1500`
- `entryGcTime` 也必须已经是 `1500`

### 4. 冲突结果

为修掉 reviewer finding，尝试把 boot owner 从“单 Promise”收紧到 runtime 版本语义后：

- `uses async layer config on the first ready render during boot` 可以转绿
- 但原先的 boot singleflight 测试稳定变成：
  - `boot async trace count = 2`
  - `post-ready async trace count = 1`

也就是说：

- 若优先满足“首个 ready render 必须拿到 async layer config”
- 当前实现就不再满足“boot epoch 内只飞 1 次 async config load”

## 当前裁决

这说明当前 `P1-6` 小切口定义还不够稳定：

- “boot-epoch config singleflight”
- “config-bearing async layer 的首个 ready render 正确性”

这两件事还没有被收成同一个可接受的小切口。

所以当前不能把这条线算作 `accepted_with_evidence`。

## 对后续的含义

当前保留的事实只有两条：

1. reviewer 提到的 async-layer-config 风险是真问题
2. 现有 boot singleflight 语义没有把 owner 边界裁清

因此后续若重开 `P1-6`，应该先改题目，再改测试，再做实现。

更准确的下一题应接近：

- `config-bearing runtime owner refresh`

而不是继续沿用：

- `boot-epoch config singleflight`

## Routing 回写

本次只保留 blocker note，并同步回写：

- `docs/perf/README.md`
- `docs/perf/2026-03-15-v4-perf-next-cut-candidates.md`
- `docs/perf/archive/2026-03/2026-03-17-v4-perf-next-cut-identification-p1-4-vs-p1-6-vs-p1-7.md`

统一口径：

- `P1-6` 仍然是三选一里的第二位
- 但 `boot-epoch config singleflight` 这条更窄切口当前被 owner conflict 卡住
- 默认不把它记作 accepted
