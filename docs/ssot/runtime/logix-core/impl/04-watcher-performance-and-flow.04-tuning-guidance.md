# 4. 设计与调优建议

结合实现与压测，可以给出以下实践建议：

## 4.1 watch 数量基线（单 Module · 单段 Logic 内）

- **绿区（推荐）**：`on*` watcher 数量 **≤ 128**
  - 适合大部分业务场景；
  - 即便部分 watcher 有中等复杂的 handler，整体交互仍然顺滑。
- **黄区（警戒）**：约 **256** 条 watcher
  - 需要明确：
    - 单个 Action 实际命中的 watcher 数量（例如是否有“大多数规则都盯同一个 `_tag`”的情况）；
    - handler 内是否存在大规模 state 更新或高频 IO；
  - 建议在进入黄区之前，优先考虑：
    - 合并相似规则为一条 watcher 内的结构化 match；
    - 拆分 Logic（例如按领域或 trigger 分段）；
    - 将重 handler 下沉到专门的 Flow/Service。
- **红区（避免）**：单段 Logic 内 **≥ 512** 条 watcher
  - 只建议用于极端实验；
  - 正式业务实现应视为违背「易调优」约束，优先通过：
    - 拆 Module（按业务子域拆分）；
    - 拆 Logic（按触发源 / 高频 vs 低频拆分）；
    - 为热点规则引入单独的 Flow/Service；
    - 在同一 Action 上合并多个 handler 为一个统一的 reducer / pipeline。

## 4.2 Dispatch 路径的实际瓶颈

- `dispatch` 本身（DebugSink + PubSub.publish）成本较低；
- 实际瓶颈在于：
  - 所有 watcher 的 predicate/selector 都要执行一次；
  - 命中的 watcher 各自执行 handler，并可能进行：
    - 状态更新（触发新的 `changes`）；
    - 额外 dispatch（形成级联）；
    - IO / 重计算。
- 因此：
  - “轻 handler + 低/中频事件”（例如按钮点击）场景下，哪怕有几百个 watcher，一次 dispatch 的成本总体仍然可控；
  - “重 handler + 高频事件”（输入联想、滚动同步）场景中，应尽量：
    - 减少实际命中的 watcher 数量；
    - 使用 `runLatest` / `debounce` 等 Flow 形态限制 fan-out；
    - 将复杂 handler 降级为专门的 Flow / Service，保持 watcher 本体轻量。

## 4.3 优化方向备忘

如果未来发现某些项目中 watcher 成为了明显瓶颈，可以考虑的优化方向包括：

- 在实现层对 `onAction("tag")` / `onAction(schema)` 进行合并：
  - 在 `actions$` 上先做一次 `_tag` 维度的路由；
  - 针对同一 `_tag` 的多个 watcher，在内核里合并 predicate 或共享部分 pipeline；
  - 但需要权衡实现复杂度与透明度。
- 为热点 Action 引入专门的 Flow/Service：
  - 将多个 handler 合并为一条 Flow pipeline，在其中进行结构化分支；
  - 减少“每个规则一条 `$.onAction`”的 fan-out 数量。
- 针对高频 `onState` watcher，避免监听整棵 state：
  - 始终推荐通过 selector 抽取最小必要视图；
  - 在业务层避免在 `onState` handler 内直接大规模 mutate 整棵 state。

上述优化一旦落地，应同步更新本文件和 `../api/03-logic-and-flow.md` 中的相关说明，并视情况扩展或调整压测用例。
