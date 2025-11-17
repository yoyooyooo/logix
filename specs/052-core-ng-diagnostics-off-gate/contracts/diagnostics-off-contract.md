# Contract: diagnostics=off 近零成本

## Required

- off 下不得分配 steps/hotspots 等数组；不得拼接 label/traceKey；不得在热循环内计时。
- 允许 begin/commit 的常数级分配（例如一次性最小锚点对象/固定字段写入），但禁止热循环按 step/patch 增长的分配（per-step 数组/字符串/计时）。
- off 仅允许输出固定字段锚点（instanceId/txnSeq/opSeq 等），必须 Slim、可序列化、无数组；可解释字段（mapping/labels/reason 文本）仅 light/full。
- off 下不得 materialize id→readable mapping；mapping 仅 light/full 且必须在事务外/边界一次性生成。
- off 下不得输出自由文本 reason；原因码仅 light/full（Slim、可序列化）。

## Enforcement（实现落点 / SSoT）

- Converge 热路径 off 闸门：`packages/logix-core/src/internal/state-trait/converge.ts`（见 039 的 T030 约束）
- Debug 事件补全闸门：`packages/logix-core/src/internal/runtime/core/DebugSink.ts`
- Exec VM 证据 off 早退：`packages/logix-core-ng/src/ExecVmEvidence.ts`
- Devtools 导出裁剪：`packages/logix-core/src/internal/runtime/core/DevtoolsHub.ts`（`toRuntimeDebugEventRef` 在 off 下返回 `undefined`）
