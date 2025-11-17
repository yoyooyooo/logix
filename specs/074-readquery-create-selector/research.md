# Research: ReadQuery.createSelector（reselect 风格组合器）

## 现状盘点（ReadQuery / SelectorGraph）

- `ReadQuery.compile` 当前可以把以下 selector 归一为 static lane：
  - 显式 `fieldPaths`（相当于手动声明 deps）；
  - `s => s.a.b` 单一路径；
  - `({ x: s.a, y: s.b })` 的浅 struct（并默认 shallowStruct equals）。
- 一旦 selector 语法超出可解析子集（条件/解构/临时变量/动态索引/闭包参数等），就会进入 dynamic lane：
  - `reads=[]`、`readsDigest` 缺失；
  - `SelectorGraph` 在每次 commit 时都会把它当作“可能受影响”，需要评估才能靠 equals 抑制通知（等价 dirtyAll 的成本特征）。
- 现有 `ReadQueryStrictGate` 能在 runtime 侧对 dynamic lane 做 warn/error gate，但它解决的是“发现问题”，不是“让用户更容易写出 static”。

## 方案对比

### A) 引入 reselect（外部库）

优点：

- 心智成熟；输入 selector 的 memoization 直观。

缺点（与本仓约束冲突）：

- reselect 的 memoization 主要围绕“输入值相等则跳过 recompute”，但不解决“静态依赖表达/IR 导出”的问题；
- 增加依赖与 bundle；无法统一 selectorId/readsDigest 的口径（还要再包一层）。

结论：**不引入依赖，只采纳心智**。

### B) 引入 proxy-memoize（Proxy 追踪 property access）

优点：

- 可在运行期自动收集 reads，理论上能覆盖更丰富的 selector 写法。

缺点（关键）：

- 与 `057-core-ng-static-deps-without-proxy` 的路线冲突；
- Proxy 追踪不是可导出、可比对的 Static IR（更难形成稳定 evidence/IR）；
- 性能与可诊断性不可控：会把“依赖发现”变成运行期行为（热路径风险），且在 diagnostics off 下也难做到接近零成本。

结论：**明确拒绝**。

### C) 在 ReadQuery 内实现 createSelector（本特性）

要点：

- 让用户主动提供 inputs（显式 deps），系统负责 union(reads) 并产出 static lane；
- 任一输入 dynamic → 默认 fail-fast，避免生成 deps 不完整的伪静态；
- selectorId/readsDigest 统一走现有 `stableStringify + fnv1a32`，并要求确定性。

结论：**选择 C**。

## 与 073 的关系

- 073 的 topic 分片订阅会受益于 `readsDigest` 的可用性：当用户用 createSelector 构造 selector，`readsDigest` 将稳定存在，更容易按 digest 分片而不退化到粗 topic。
- 073 不依赖本特性才能推进：它只需要消费现有 `ReadQueryStaticIr`；因此本特性单独成 074，避免把“API 设计”耦合进 073 大改造。

## 决策列表（落到 plan/spec）

- 不引入外部库；不走 Proxy；
- correctness-first：dynamic 输入禁止生成 static 输出；
- 提供可选 `params` 参与 selectorId 计算，用于显式区分闭包参数；
- 组合器不解决参数化 selector 的静态化（另开需求）。

