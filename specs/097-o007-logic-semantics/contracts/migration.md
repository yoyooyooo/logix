# Contract: Migration Notes (Forward-Only)

## 背景

O-007 将 `ModuleRuntime` 的 logic 启动收敛为 canonical setup/run 执行模型，淘汰历史多重兼容分支。

## 影响范围

- `@logixjs/core` runtime 内核（`ModuleRuntime.logics`）
- 依赖隐式兼容行为的旧 logic 写法
- 依赖“单相 logic 返回值被二次解释为 LogicPlan” 的历史代码

## 迁移原则

- 不提供兼容层/弃用期（forward-only）。
- 依赖旧行为的逻辑必须迁移到显式 setup/run 边界。

## 迁移步骤

1. 检查 setup 中是否有 run-only API（`$.use`、`$.onAction`、`$.onState` 等），全部迁移到 run。
2. 检查 run 中是否有 setup-only API（`$.lifecycle.*`、`$.traits.declare`），全部迁移到 setup。
3. 使用新增测试模板覆盖三类输入（单相/plan/plan-effect）并确认 phase 诊断稳定。
4. 运行质量门 + perf diff，确认无回归。
5. 若原先依赖“单相 logic 返回 plan 后自动再执行 setup/run”，改为：
   - 直接返回显式 `LogicPlan`；或
   - 使用 LogicPlanEffect（显式标记 effect 产出 plan）。

## 验收信号

- `logic::invalid_phase` 错误可解释；
- 启动链路分支收敛；
- perf evidence 显示核心指标在预算内。
