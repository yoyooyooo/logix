# Contracts: Public API（FlowProgram）

> 本文定义对外 API 口径；实现细节下沉 `packages/*/src/internal/**`。

## 1) `@logixjs/core`：FlowProgram（公共子模块）

目标：用“声明式 Program”表达自由工作流（Control Laws），并可被 mount 为 ModuleLogic。

### 1.1 入口（概念）

- `FlowProgram.make(programId, spec)`：定义一个 Program（纯数据/可导出）
- `FlowProgram.install(moduleTag, program)`：把 Program mount 到 module runtime（产出 ModuleLogic）
  - DX sugar（可选）：`Module.withFlow(program)`（内部等价于 `Module.withLogic(program.install(Module.tag))`）

### 1.2 触发源（最小集合）

- `FlowProgram.onAction(actionTag)`
- `FlowProgram.onStart()` / `FlowProgram.onInit()`
  - `FlowProgram.onTimer(timerId)`（内部用于 delay 节点；对外可选不暴露）

### 1.3 步骤（最小集合）

- `dispatch(actionTag, payload?)`：默认写侧（可追踪）
- `serviceCall(serviceId, builder)`：事务窗口外执行 IO；可产生 success/failure 分支
  - builder 允许携带 `timeoutMs` / `retry` 等控制参数（时间语义必须进入 tick 证据链）
- `delay(ms)`：必须进入 tick 参考系（禁止影子 setTimeout）
- `traits.source.refresh(fieldPath, options?)`：显式触发 source 刷新（用于 manual-only source 或工作流中的强制刷新；写回仍走事务窗口）

### 1.4 策略

- 并发：`latest | exhaust | parallel`（与既有 FlowRuntime 语义一致）
- priority：`urgent | nonUrgent`（与 073 lanes 对齐）

## 2) 约束（必须）

- Program 必须可导出为 Static IR（JSON 可序列化，带 version+digest）。
- 写侧默认仅允许 dispatch；禁止把 direct state write 作为 Program step（避免写逃逸）。
- 时间算子必须可回放/可解释：timer 触发必须能归因到 tickSeq。
