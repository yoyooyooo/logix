# 2. 性能模型：成本从哪里来

## 2.1 单条 watcher 的成本

对单条 `$.on*` watcher 来说，处理一个事件的成本包括：

1. 源流调度：`actions$` / `changes(selector)` 发出一条事件；
2. 前置处理：
   - `onAction`：跑一次 predicate（例如 `_tag === "xxx"`、Schema 校验等）；
   - `onState`：跑一次 selector + `Stream.changes` 的新旧值比较；
3. handler：
   - `run(handler)`：执行 handler Effect；
   - `update` / `mutate`：`getState → reducer → setState`，再触发下一轮 `changes`。

在实现层，selector / predicate 本身都是纯函数调用，单次成本非常小，真正决定性能的是：

- handler 做的事（尤其是大规模 state 更新、IO）；
- 每个事件命中的 watcher 数量（fan-out）。

## 2.2 多条 watcher 时的线性放大

当某个 Module 的单段 Logic 内有 N 条 watcher 时：

- 每次 Action / State 变更：
  - 所有 watcher 都会各自“看一眼”事件（跑一遍 predicate/selector 与流式管道），这一层是 **O(N)** 的固定成本；
  - 实际命中的 watcher 子集会执行 handler，这部分成本是 **O(N_hit × C_handler)**。
- 典型场景：
  - 按 `_tag` 分流的 onAction：
    - predicate 成本轻（字符串比较），单个 Action 实际命中 watcher 数量通常远小于 N；
  - “字段联动”的 onState：
    - selector 成本轻，但若盯的是高频更新字段，变更频率本身会放大总工作量。

结论：

- watcher 数量本身不是“灾难”，但会为每次事件引入一层 O(N) 的固定前处理成本；
- 真正需要警惕的是：“高频事件 + 大量 watcher 同时命中 + 重 handler”的组合。
