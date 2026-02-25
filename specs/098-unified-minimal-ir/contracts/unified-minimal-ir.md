# Contract: Unified Minimal IR（O-005 增量）

## 目标

在不扩展非目标 IR 逻辑的前提下，落实默认 full cutover 行为，使 Runtime 对 unified minimal IR 的执行门禁与失败语义可解释。

## 本次变更边界

- 允许变更:
  - `ModuleRuntime.impl` 默认 gate 模式解析；
  - `FullCutoverGate` 结果解释字段（`reason/evidence`）；
  - 对应 Runtime/Contracts 测试。
- 禁止变更:
  - Static IR 结构定义；
  - Dynamic Trace 主体事件编排；
  - 与本任务无关的 IR 汇聚逻辑。

## 不变量

- 统一事实链不变: Static IR + Dynamic Trace 仍是唯一解释来源。
- 无配置时默认严格: 非 core kernel 场景默认 `fullCutover`。
- 显式试运行保留: 仅显式 `trial` 配置可启用降级通道。
- 失败或降级可解释: 必须可从 gate 结果读取 `reason` 与 `evidence`。
