# PR Draft: refactor/logix-core-concurrency-policy-resolve-cache-20260224

- PR：`待创建`
- 合并策略：创建后开启 `auto-merge(rebase)`
- CI watcher：创建后补充 `.context/pr-ci-watch/pr-<id>-*.log`

## 目标
- 降低 `ModuleRuntime` 核心链路中并发策略解析 (`resolveConcurrencyPolicy`) 的重复开销。
- 在不改变并发/背压语义的前提下，把策略解析从“同次流程多次解析”收敛为“按需一次解析 + 复用”。

## 模块阅读范围
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.concurrencyPolicy.ts`
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.dispatch.ts`
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.txnQueue.ts`
- `packages/logix-core/src/internal/runtime/core/ConcurrencyDiagnostics.ts`
- `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnQueue.Lanes.test.ts`
- `packages/logix-core/test/internal/Runtime/ConcurrencyPolicy/ConcurrencyPolicy.*.test.ts`
- `specs/021-limit-unbounded-concurrency/handoff.md`

## 本轮改动
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.concurrencyPolicy.ts`
  - 为 `makeResolveConcurrencyPolicy` 增加字段指纹缓存：当 `runtime_default/runtime_module/provider_default/provider_module` 四层策略字段签名未变化时，复用上次 `ResolvedConcurrencyPolicy`。
  - 保留 `emitUnboundedPolicyIfNeeded` 调用语义，确保诊断事件行为不漂移。
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.txnQueue.ts`
  - `acquireBacklogSlot` 改为接收已解析 `policy`，阻塞等待路径复用同一策略，不再在等待循环里重复解析。
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.dispatch.ts`
  - 新增“单次 dispatch 发布链路”的懒加载策略解析器；主 hub + topic hub 背压诊断共享同一策略快照，避免一次 dispatch 内重复解析。
- 测试
  - 新增 `packages/logix-core/test/internal/Runtime/ConcurrencyPolicy/ConcurrencyPolicy.ResolveCache.test.ts`，覆盖缓存命中、引用变更失效、同引用对象就地变更失效。
  - 扩展 `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnQueue.Lanes.test.ts`，验证阻塞诊断路径复用解析结果。
- `refactor-pr-ci-loop` 协作机制
  - 新增 `.codex/skills/refactor-pr-ci-loop/scripts/refactor-task-state.sh`，提供跨 worktree 共享任务状态（`claim/check/set/list`）机制。
  - 更新 `.codex/skills/refactor-pr-ci-loop/SKILL.md`，把“编码前 claim 检查”与“完成后状态回写”纳入固定流程。

## 验证
- `pnpm test -- test/internal/Runtime/ConcurrencyPolicy/ConcurrencyPolicy.ResolveCache.test.ts`（@logixjs/core）✅
- `pnpm test -- test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnQueue.Lanes.test.ts`（@logixjs/core）✅
- `pnpm typecheck` ✅
- `pnpm test:turbo` ✅

## 性能收益与风险
- 收益：
  - 减少 txnQueue 阻塞路径和 dispatch fan-out 路径中的重复 `serviceOption + merge` 解析。
  - 在高频 dispatch / 背压场景下降低热路径 Effect 组装与对象构建开销。
- 风险：
  - 若缓存失效条件不完整，可能复用过期策略。
- 保障：
  - 失效键改为四层策略字段指纹，避免“同引用对象字段变化”误命中。
  - 通过新增测试覆盖缓存命中、引用变更失效与同引用对象就地变更失效场景。

## 独立审查（subagent）
- reviewer: `agent_id=019c8de9-93a2-7082-946c-9d224006584d`
- round 1：发现阻断问题（引用级缓存会遗漏 in-place override 变更）。
- round 2（修复后复审）：`no blocking issue`，结论 `可合并`。

## 机器人评论消化（CodeRabbit）
- 待 PR 创建后补充。
