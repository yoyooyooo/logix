# Contracts: Diagnostics（FlowProgram 与 tick 关联）

## 原则

- 复用既有边界事件：FlowProgram 不引入“巨型事件流”。
- diagnostics=off 近零成本：不得常态分配/扫全量 Program。
- 解释链以 tickSeq 为参考系：能回答“为何发生这次 dispatch/跳转/刷新”。

## 诊断分级（v1 硬裁决）

FlowProgram v1 明确采用分级门控，避免把可解释性成本常态化：

- **off**：不新增 Program 级运行期 trace；不得在 tick/触发路径扫描 IR；仅在 fail-fast 错误路径产出结构化错误（含最小锚点）。
- **light**：在复用的边界事件上附带最小锚点 meta（不携带 IR）：用于把因果链串到 tickSeq。
- **sampled**：与 light 字段口径一致，但只在确定性采样命中时输出（用于生产环境低成本可观测）；采样必须基于稳定锚点（tickSeq/runId），禁止 `Math.random()`。
- **full**：允许附带更多锚点与取消/计时摘要（仍不得携带 IR 全量），用于解释在途态 `I_t`。

> 说明：Tape（record/replay）是独立开关；diagnostics=off 不等价于 tape=off。

## 事件口径（最小）

- `trace:tick`：来自 073（start/settled/budgetExceeded）
- `EffectOp(kind='flow')`：FlowProgram watcher 的运行（meta 至少含 `programId/nodeId/tickSeq`）
- `EffectOp(kind='service')`：serviceCall 的边界（meta 至少含 `serviceId/programId/tickSeq`）
  - `serviceId` 必须是稳定字符串：按 `specs/078-module-service-manifest/contracts/service-id.md` 从 `Context.Tag` 派生（单点 helper）

## off/light/sampled/full 的最小字段承诺（v1）

为便于平台/AI 自动修复与 Devtools 对齐，v1 固化最小字段集合：

- **off（错误路径）**：结构化错误 `code` + `programId` + `source.stepKey`（若可得）+ `detail`（纯 JSON）
- **light（成功路径）**：
  - `EffectOp(kind='flow').meta`: `programId`、`tickSeq`、`runId`
  - `EffectOp(kind='service').meta`: `programId`、`tickSeq`、`runId`、`serviceId`
- **sampled（成功路径）**：同 light，但只在采样命中时产出（未命中则等价于 off 的成功路径）
- **full（成功路径）**：在 light 基础上增加（示意）
  - `nodeId`、`source.stepKey`、`source.fragmentId`
  - `timerId`（delay schedule/cancel/fire）
  - `cancelReason`、`cancelledByRunId`

约束：

- 以上字段必须 Slim 且 JSON 可序列化
- 运行期不得附带 Static IR 全量（包括 nodes/edges/steps）

## 在途态 I_t（长期公式 Σ_t 的落点）

FlowProgram 的动态语义天然会引入 “in-flight 状态”：

- `delay` 的 timer schedule/cancel/fired
- `latest/exhaust` 的 run 替换/忽略/取消
- `serviceCall` 的 pending/timeout/retry/backoff
- （可选）背压队列/lanes 的水位与延迟

这些都属于长期公式里的 `I_t`（不是业务数据 `S_t`，但决定“下一步会发生什么”）。因此当 diagnostics 打开时，必须能用 Slim、可序列化字段解释：

- **run 锚点**：一次触发的 `flowRunId`（同一 `programId` 下单调递增或可去随机化），并能关联 `tickSeq/instanceId`。
- **timer 锚点**：`timerId` 以及 schedule/cancel/fired 的摘要（至少能回答“为何这个 delay 没发生/被谁取消/何时 fired”）。
- **取消语义**：被取消的 run 的 `reason`（例如 `latest.replaced` / `shutdown` / `timeout`），以及 `cancelledByRunId`（若存在）。
- **service 结果事件化**：success/failure/timeout/retry 的 outcome 必须能关联到对应 run（避免黑盒 Promise 链断因果）。

## 成本门控

- diagnostics=off：不额外记录 Program 级 trace；仅保留必要的错误 fail-fast 诊断。
- diagnostics=light/sampled/full：允许附带少量锚点字段（programId/nodeId），但不得附带 IR 全量内容。
