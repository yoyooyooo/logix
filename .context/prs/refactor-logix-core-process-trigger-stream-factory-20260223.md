# PR Draft: refactor/logix-core-process-trigger-stream-factory-20260223

## 目标
- 将 `ProcessRuntime.make.ts` 中非平台触发器流构建逻辑拆分为独立模块，降低核心入口文件复杂度。
- 保持行为与对外契约不变，重点提升可维护性与后续可扩展性。

## 模块阅读范围
- `packages/logix-core/src/internal/runtime/core/process/ProcessRuntime.make.ts`
- `packages/logix-core/src/internal/runtime/core/process/selectorSchema.ts`
- `packages/logix-core/src/internal/runtime/core/process/selectorDiagnostics.ts`
- `packages/logix-core/test/Process/*`（触发器与诊断相关用例）

## Spec 对齐（灵感来源）
- `specs/020-runtime-internals-contracts/spec.md`：内部契约化与注入边界收敛。
- `specs/027-runtime-observability-hardening/spec.md`：触发链路可观测性与高频路径稳态要求。
- `specs/001-effectop-unify-boundaries/spec.md`：边界执行统一入口与一致策略。

## 本轮改动
- 新增 `process/triggerStreams.ts`：承载 `timer/moduleAction/moduleStateChange` 三类 non-platform trigger stream 构建。
- `ProcessRuntime.make.ts` 改为通过 `makeNonPlatformTriggerStreamFactory(...)` 注入依赖后使用，移除内联触发器构建实现。
- 保持原有 warning/error code、hint、txnSeq 默认值与 selector diagnostics 策略不变。
- 同步更新 `.codex/skills/refactor-pr-ci-loop/SKILL.md`：明确“每个 PR 单独落盘到 `.context/prs/`，`REFACTOR.md` 仅保留索引”的新约定。

## 验证
- `pnpm --filter @logixjs/core typecheck`
- `pnpm --filter @logixjs/core exec vitest run test/Process test/Runtime/ModuleRuntime/SelectorGraph.test.ts`

## 独立审查
- subagent `019c8667-e538-7583-a88f-6e1f1a011c51`（explorer）只读审查结论：无阻塞问题，可合并。
- 审查关注点已覆盖：触发器语义保持、错误码与 hint 保持、diagnostics 保持、热路径额外开销低。

## 风险与关注点
- 需确认依赖注入后不会丢失 `baseEnv`/`shouldRecordChainEvents`/warning emit 上下文。
- 需确认 trigger stream 的错误语义与现有测试断言完全一致。
