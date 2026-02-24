# PR Draft: refactor/logix-core-staticirdigest-cache-20260224

- PR：`#54` https://github.com/yoyooyooo/logix/pull/54
- 合并策略：`auto-merge(rebase)` 已开启（等待 required checks）
- CI watcher：`.context/pr-ci-watch/pr-54-20260224-121332.log`

## 目标
- 消除 `ModuleRuntime` 提交热路径中重复的 `getConvergeStaticIrDigest` 计算（`stableStringify + fnv1a32`）。
- 将 `staticIrDigest` 下沉到 trait program 注册/重建阶段一次性计算，并在 commit/evidence 路径复用。

## 模块阅读范围
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.impl.ts`
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.internalHooks.ts`
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.transaction.ts`
- `packages/logix-core/src/internal/state-trait/converge-ir.ts`
- `packages/logix-core/test/StateTrait/StateTrait.ConvergeAuto.GenerationInvalidation.test.ts`

## 本轮改动
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.internalHooks.ts`
  - 扩展 `TraitState`：新增 `convergeStaticIrDigest` 缓存字段。
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.impl.ts`
  - 在 `registerStateTraitProgram` 中计算并写入 `traitState.convergeStaticIrDigest`（仅在 convergeIr 可用且非 configError 时）。
  - 将该缓存通过 `traitRuntime.getConvergeStaticIrDigest()` 注入 transaction 侧使用。
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.transaction.ts`
  - commit `state:update` 证据改为直接读取 `traitRuntime.getConvergeStaticIrDigest()`，移除每次提交重算。
  - `__logixGetExecVmAssemblyEvidence` 改为复用缓存 digest + generation（不再现场 hash）。
- `packages/logix-core/test/StateTrait/StateTrait.ConvergeAuto.GenerationInvalidation.test.ts`
  - 新增断言：`registerStateTraitProgram` 导致 generation bump 后，后续 `state:update.staticIrDigest` 必须切换。

## 验证
- `pnpm test -- test/StateTrait/StateTrait.ConvergeAuto.GenerationInvalidation.test.ts`（@logixjs/core）✅
- `pnpm test -- test/StateTrait/StateTrait.ConvergeAuto.DiagnosticsLevels.test.ts`（@logixjs/core）✅
- `pnpm typecheck` ✅
- `pnpm test:turbo` ✅

## 性能与诊断证据
- 优化点：把 digest hashing 从 commit 热路径移到 trait program 冷路径（build/register 时一次性）。
- 语义保持：
  - `staticIrDigest` 的定义仍由 `getConvergeStaticIrDigest` 决定，未改变编码规则。
  - generation 变更时 digest 更新由测试覆盖。

## 独立审查
- Reviewer：subagent（`agent_id=019c8dd6-18db-7c53-b6bf-a3b2fa3dcab1`）
- 审查结论：
  - 未发现阻断问题，核心语义（generation bump 后 digest 切换）被新增测试覆盖。
  - 缓存写入点集中在 `registerStateTraitProgram`，当前路径下可保证 digest 与 trait program 重建同步更新。
- 提醒（低风险开放问题）：
  - 若未来出现绕过 `registerStateTraitProgram` 的 IR 更新路径，需要同步补齐 digest 重算/失效点。
- 最终结论：`可合并`。

## 风险与回滚
- 风险：若缓存失效时机错误，可能导致 digest 未更新或错误复用。
- 回滚：回退到 transaction 内现算 `getConvergeStaticIrDigest(convergeIr)` 的旧路径。

## 机器人评论消化（CodeRabbit）
- 待 PR 创建后补充。
