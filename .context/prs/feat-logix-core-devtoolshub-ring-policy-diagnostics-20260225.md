# DevtoolsHub ring trim policy 可观测性（PR3）

## Branch
- perf/cr88-devtoolshub-ring-policy
- PR: 待创建（本文件提交后创建）

## 目标
- 在不改对外 API 的前提下，为 `refreshRingTrimPolicy` 的策略变化补充可序列化 slim 诊断信号。
- payload 固定包含：`mode` / `threshold` / `bufferSize`。

## 核心改动
- `packages/logix-core/src/internal/runtime/core/DevtoolsHub.ts`
  - `refreshRingTrimPolicy` 返回“是否变更”。
  - 在 `configureDevtoolsHub` 的 bufferSize 变更路径上，复用 `toRuntimeDebugEventRef` 发射 `trace:devtools:ring-trim-policy`。
  - 事件发射受 `diagnosticsLevel` 与 `bufferSize>0` 约束，避免 off/disabled 路径额外写入。
- `packages/logix-core/src/internal/runtime/core/DebugSink.record.ts`
  - 新增 `trace:devtools:ring-trim-policy` 专门映射分支，统一输出 slim meta：`{ mode, threshold, bufferSize }`。
- `packages/logix-core/test/Debug/DevtoolsHub.BufferResize.test.ts`
  - 覆盖 shrink/expand 场景下的 policy 事件内容与序列化。
- `packages/logix-core/test/Debug/DevtoolsHub.test.ts`
  - 覆盖 policy 事件的 slim payload 与 `diagnosticsLevel=off` 不写 ring。

## 行为与轻量证据
- 行为证据：定向测试已覆盖策略变化信号出现、payload 字段、序列化、off 语义。
- 轻量性能说明：策略事件仅在 `configureDevtoolsHub` 的 bufferSize 改变时触发，不在热路径每事件写入；日常 `devtoolsHubSink.record` 开销模型不变。

## 验证
- `pnpm -C packages/logix-core exec vitest run test/Debug/DevtoolsHub.BufferResize.test.ts test/Debug/DevtoolsHub.test.ts`

## 机器人 Review 消化
- Gemini Code Assist：
  - inline 建议 1：`DebugSink.record.ts` 中 ring-trim-policy 分支去掉 `any`，已采纳；
  - inline 建议 2：`DevtoolsHubOptions` 增加 `diagnosticsLevel` 字段并简化读取，已采纳。
- 对应修复提交：`6e1a1aa5`（保持单 commit）。
- CodeRabbit：本轮仅 rate-limit 提示，无 actionable 代码建议。
