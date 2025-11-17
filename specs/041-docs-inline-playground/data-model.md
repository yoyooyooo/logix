# Data Model: 文档内联教学 Playground

**Date**: 2025-12-26  
**Feature**: [041-docs-inline-playground](./plan.md)

> 说明：此处的数据模型用于约束“文档作者声明 → 运行配置 → UI 展示”的结构化边界；不要求引入持久化存储。

## Entity: PlaygroundBlock

文档中的一个可运行示例单元（作者显式标记）。

**Fields**
- `blockId` (string, stable): 示例块稳定标识（同一页面/同一路径下保持稳定）。
- `title` (string, optional): 示例标题（用于 UI 与可访问性）。
- `level` ("basic" | "debug", default "basic"): 难度级别，决定是否允许启用深度观测面板。
- `observe` (ReadonlyArray<string>, optional): 观察点列表（建议 1–3 条）。
- `defaultPanels` (ReadonlyArray<PanelId>, optional): 默认展示的面板集合；未提供时使用教学默认面板。
- `moduleExport` (string, default "AppRoot"): 被试运行的模块导出名。
- `code` (string): 用户可编辑的初始示例代码（模块定义/逻辑）。
- `runBudgets` (RunBudgets, optional): 单次运行的预算上限（事件数、报告大小、超时等）。

**Validation Rules**
- `observe.length` 建议 ≤ 3（超过时 UI 仍可展示，但默认只强调前 3 条）。
- `level === "basic"` 时禁止开启深度观测面板（仅允许教学默认面板）。

## Entity: RunBudgets

单次运行的资源与输出预算，避免卡死与无界增长。

**Fields**
- `maxEvents` (number, optional): 最大事件/观测条数（用于限制 trace/log 等）。
- `reportMaxBytes` (number, optional): 运行报告最大字节数（用于限制结构化报告体积）。
- `timeoutMs` (number, optional): 单次试运行超时（超过视为失败/被取消）。

## Entity: RunResult

单次运行结果摘要（用于渲染 UI）。

**Fields**
- `runId` (string): 运行标识（由 `blockId` + 递增序号派生，确保确定性与可对比）。
- `kernelImplementationRef` (unknown, optional): 本次试运行使用的内核实现标识（例如 core/core-ng 的实现引用）；从 TrialRunReport 的 `environment.kernelImplementationRef` 提取，用于 debug 示例的对照与解释。
- `status` ("success" | "error" | "cancelled" | "timeout"): 结果状态。
- `durationMs` (number, optional): 运行耗时。
- `summary` (string, optional): 面向读者的结果摘要（教学导向）。
- `logs` (ReadonlyArray<LogEntrySummary>, bounded): 控制台输出摘要（有界缓存）。
- `traces` (ReadonlyArray<TraceSummary>, bounded): Trace/时间线摘要（仅在 debug 示例可见；有界缓存）。
- `stateSnapshot` (unknown, optional): 可选的状态/结果快照（用于教学“看结果/看状态”）。
- `error` (ErrorSummary, optional): 可理解的错误摘要（含定位信息与恢复建议）。

## Value Object: PanelId

用于描述 UI 面板集合（教学默认与高级观测的最小分层）。

- 教学默认：`"notes" | "console" | "result" | "state"`
- 高级/Debug：`"trace" | "timeline" | "events"`（仅在 `level === "debug"` 时允许）

## Value Object: ErrorSummary

- `message` (string): 面向读者的错误摘要（避免泄漏内部细节）。
- `location` (string, optional): 位置提示（行/列/片段名等）。
- `recoveryHint` (string, optional): 恢复建议（例如“重置示例”“检查导出名”等）。

## Notes

- 任何“运行中间产物”（例如编译 bundle）默认视为内部实现细节；数据模型只约束对外可观察与可解释的信息。
