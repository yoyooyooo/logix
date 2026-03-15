# Research: Effect v4 前向式全仓重构

> 2026-03-07 说明：本文件继续作为 `103` 主线研究档案保留。runtime-core truthful closure 现在被视为 `103` 的当前已完成 slice，而不是替代主线定位的新 spec。

## 1. 研究输入

- 官方迁移入口：`https://github.com/Effect-TS/effect-smol/tree/main/migration`
- 核心文档：`services.md`、`fiberref.md`、`yieldable.md`、`cause.md`、`layer-memoization.md`、`runtime.md`、`forking.md`
- 仓库现状：`effect` 与 `@effect/*` 生态仍在 v3 代际版本，且 `logix-core` 存在高密度 `Context/FiberRef/locally` 依赖。

## 2. 关键结论

## 2.1 为什么必须 v4-only

- 本仓尚未对外服务，迁移兼容收益接近 0，复杂度成本显著。
- v3/v4 双栈会制造并行真相源，直接冲突本仓 forward-only 原则。
- 以迁移说明替代兼容层，能换取更干净的 1.0 基线。

## 2.2 哪些可以机械替换，哪些必须重构

可机械替换：

- `catchAll*`、`fork*`、`Scope.extend` 等命名迁移。

必须重构：

- `Context.* -> Context.Tag / Tag class`（服务拓扑重建）。
- `FiberRef/locally -> Context.Reference/provideService`（上下文传播模型重建）。
- Cause 扁平化后的诊断表达（不再依赖树形结构）。
- Layer memoization（实例隔离策略重新审计）。

## 2.3 STM 的最优引入时机

结论：**在 core P0（G1）通过后插入，不能等全仓迁完，也不能一开始就上。**

理由：

- 过早引入会把“迁移风险”和“范式创新风险”耦合，排障代价高。
- 过晚引入会导致外围包已固化非 STM 设计，二次改造成本高。
- `G1 -> G2` 插入点能确保主干已稳定，同时保留结构优化窗口。

## 3. 方案对比

| 方案 | 描述 | 结论 |
|---|---|---|
| A | 全仓先迁 v4，再补 STM | 风险低但二次改造成本高，不选 |
| B | 从第一阶段就全面 STM | 风险过高，问题定位困难，不选 |
| C | `G1` 后局部 STM PoC 决策 | 风险可控，收益可验证，选用 |

## 4. 风险条目

- v4 beta 仍在变化：阶段内锁版本，阶段间才升级。
- Cause/layer/fork 行为可能出现隐性回归：用专项回归和诊断对照兜底。
- STM 误扩散到事务核心：以白名单/黑名单 + gate 审核强控。

## 5. 实施建议

1. 先做 S0/S1，冻结基线与依赖矩阵。
2. S2 只攻 `logix-core` 主干，不分散到外围包。
3. G1 通过后做 S3 STM PoC，迅速形成 go/no-go。
4. S4/S5 按既定顺序推进并同步文档。
