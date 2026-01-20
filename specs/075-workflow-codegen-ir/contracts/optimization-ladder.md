# Contract: Optimization Ladder（NFR-005）

> 目标：把“性能/诊断问题怎么推进”固化为可执行的阶梯，避免拍脑袋调参与并行真相源。

## Ladder（v1）

### L0：默认（baseline）

- 配置：`diagnostics=off`、`tape=off`
- 预期：
  - 近零诊断成本（不得引入 O(programNodes) 扫描或额外常驻分配）
  - 行为只由 `WorkflowDef/Static IR` 决定（无运行时闭包语义）
- 证据：
  - 075 perf suite（`workflow.*`）满足预算（见 `specs/075-workflow-codegen-ir/perf/*`）

### L1：观察（observe）

- 配置：`diagnostics=light` 或 `diagnostics=sampled`
- 输出（Slim，JSON-safe）：
  - `programId/runId/tickSeq/serviceId`
  - cancel 语义：`cancelledByRunId` + `reason`
  - timer 语义：schedule/fire/cancel 的最小摘要（不携带 IR 全量）
- 目标：能回答“发生了什么/为何发生/由谁触发/影响了什么”，并可回链到 stepKey。

### L2：收敛（converge）

- 触发源收敛：
  - 推荐 `Module.withWorkflows(programs)`，保证单订阅 + `O(1+k)` action 路由
  - 拒绝扩散性 watcher（避免每个 Flow 一套黑盒调度）
- 服务引用收敛：
  - `call`/IR/Trace/Tape 只存 `serviceId: string`（来源 078 单点 helper）

### L3：调参/拆分（tune/split）

- 调参：
  - `latest/exhaust/parallel` 仅在证据支持下调整（perf report + trace）
  - 对热点 `call/delay` 组合，优先通过 fragment 拆分并保持 stepKey 稳定锚点
- 拆分：
  - 将“大 program”拆成多个 program/fragment（避免单一图过大导致治理与解释困难）

## Non-Negotiables

- 默认路径（L0）必须近零成本；任何成本泄漏到 off 视为 bug。
- 阶梯推进必须可复现：每一步都有对应的“开关/输出/证据”。
