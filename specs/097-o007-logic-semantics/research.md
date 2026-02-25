# Research: O-007 Logic 执行语义收敛

## 研究目标

- 找到可落地的 canonical setup/run 执行模型，替换 `ModuleRuntime.logics.ts` 里的多重兼容分支。
- 保证 phase 违规诊断可解释，且不破坏 `runSync` 启动路径稳定性。
- 给出可复现性能证据路径，满足核心路径改造门禁。

## 现状摘要

当前实现并存三类输入执行路径：

1. `isLogicPlan(rawLogic)` 直接执行 plan；
2. `LogicPlanMarker.isLogicPlanEffect(rawLogic)` 先执行 effect 再还原 plan；
3. 其他单相 logic 作为 run-only 处理。

问题：执行语义分叉、phaseRef 管理点分散、兼容分支太多，导致定位成本高、启动链路冗长。

## 方案对比

### 方案 A：保留三类分支，仅抽公共函数

- 优点：改动面较小。
- 缺点：分支语义仍存在，O-007 的“收敛执行模型”目标无法真正达成。
- 结论：不采纳。

### 方案 B：统一 canonical normalize + 单执行管线（采纳）

- 做法：所有 raw logic 先走 `normalizeRawLogicToCanonicalPlan`，执行层只保留 setup/run 一条路径。
- 优点：
  - 语义收敛明确；
  - phaseRef 生命周期单点管理；
  - 便于测试与诊断。
- 风险：一次性改动核心路径，需充分测试+perf 证据。
- 结论：采纳。

### 方案 C：强制只接受 `LogicPlan`，移除单相/marker 输入

- 优点：模型最纯粹。
- 缺点：会扩大破坏性范围，不利于本次聚焦 O-007 的主线收敛。
- 结论：本期不采纳，作为后续演进候选。

## 关键裁决

- **R1（执行模型）**：canonical plan 是执行层唯一输入。
- **R2（错误语义）**：phase 违规必须统一归一为 `logic::invalid_phase`，并保留修复 hint。
- **R3（runSync 安全）**：若 normalize 阶段出现 phase 错误，允许降级为 noop run（skipRun）保证构造链路可继续，但必须留下诊断事件。
- **R4（性能证据）**：before/after 同环境同 profile 采样并产出 diff，`comparable=false` 不得给硬结论。

## 非适用项（N/A）

- React tearing：本特性不触及 `logix-react`，N/A。
- 新增 Runtime Service：本特性不新增跨模块服务协作协议，N/A。
