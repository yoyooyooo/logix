# PR Draft: refactor/logix-core-action-topic-routing-20260224

## 目标
- 在 `logix-core` 核心 action 链路引入按 tag 主题流，降低 `$.onAction("tag")` 的热路径过滤开销。
- 保持现有 API 与语义兼容：未命中主题流时继续回退到 `actions$` 过滤。

## 模块阅读范围
- `packages/logix-core/src/internal/runtime/core/module.ts`
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.impl.ts`
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.dispatch.ts`
- `packages/logix-core/src/internal/runtime/core/BoundApiRuntime.ts`
- `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.test.ts`
- `docs/specs/drafts/topics/runtime-v3-core/*`（参考）
- `specs/068-watcher-pure-wins/tasks.md`（灵感来源）

## 本轮改动
- `packages/logix-core/src/internal/runtime/core/module.ts`
  - 为 `ModuleRuntime` 增加可选接口 `actionsByTag$?: (tag: string) => Stream.Stream<A>`，作为按 tag 路由的可选优化通道。
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.impl.ts`
  - 在 runtime 装配阶段为声明的 action tags 预建 `PubSub` 主题索引（`actionTagHubsByTag`）。
  - 暴露 `actionsByTag$`：命中主题索引走 `Stream.fromPubSub(topicHub)`；未命中回退到 `actions$` 过滤，并保持 `_tag/type` OR 兼容语义。
  - `makeDispatchOps` 装配新增 `actionTagHubsByTag` 传入。
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.dispatch.ts`
  - dispatch/dispatchBatch/dispatchLowPriority 的 publish 链路从“仅 publish actionHub”改为“actionHub + 命中 tag 的 topicHub”。
  - batch 场景按原始 actions 顺序逐条 fan-out 到 topic hub，保持顺序兼容。
  - 保持原有背压诊断入口 `publishWithPressureDiagnostics`，仅替换底层 publish effect。
- `packages/logix-core/src/internal/runtime/core/BoundApiRuntime.ts`
  - `$.onAction(token|string|_tag|property)` 优先使用 `runtime.actionsByTag$`；若 runtime 未提供则回退旧过滤路径。
  - `predicate/schema` 分支保持原行为。
- `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.test.ts`
  - 新增回归 `should route actionsByTag$ without cross-tag noise`，覆盖按 tag 路由的正确性与隔离性。
  - 新增回归 `actionsByTag$ should keep _tag/type OR semantics for topic routing`，覆盖命中 topic hub 的 OR 兼容。
  - 新增回归 `actionsByTag$ fallback should keep _tag/type OR semantics for undeclared topics`，覆盖未命中 topic hub 的回退语义。

## 验证
- `pnpm --filter @logixjs/core test -- test/internal/Runtime/ModuleRuntime/ModuleRuntime.test.ts` ✅
- `pnpm typecheck` ✅
- `pnpm test:turbo` ✅
- CI follow-up:
  - `verify` 首轮失败：`typecheck:test` 报 TS2722（`actionsByTag$` 可选调用未收窄）。
  - 已改为显式 guard helper（`requireActionsByTag(...)`）并复验：
    - `pnpm --filter @logixjs/core typecheck:test` ✅
    - `pnpm test:turbo` ✅

## 性能与诊断证据
- 性能基线来源：PR CI `perf-quick`（run `22316826705`，job `64564039178`，artifact `logix-perf-quick-50`）。
- 可比性结论：`comparable=true`，`regressions=0`，`improvements=0`，`head budgetExceeded=0`（base `2b25b0b9` -> head `75c293e8`）。
- 诊断/Devtools 影响：本轮未新增诊断事件；仍复用既有 `publishWithPressureDiagnostics` 路径与 `actionHub` trigger 语义。
- 本地策略说明：按当前约定，本地仅做类型与测试门禁；性能测量统一以 PR CI 工件为准。

## 独立审查
- Reviewer：subagent（`agent_id=019c8b59-5ee9-7160-b848-882754311412`）
- 初审结论：发现 1 条中风险（fallback 路径仍是单值匹配，`_tag/type` OR 语义未完全覆盖）。
- 处理：已修复 `actionsByTag$` fallback 过滤逻辑并补回归测试。
- 复审结论：未发现阻塞问题，可合并；仅剩 1 条低风险建议（可补 `dispatchBatch` topic fan-out 顺序的定向回归测试）。

## 风险与回滚
- 风险：
  - action publish 现在会额外触达 topic hub，若 topic hub 数量异常增长可能带来额外内存占用。
  - `actionsByTag$` 是可选接口，外部实现若自定义 ModuleRuntime 需确保类型兼容（可不实现，保持回退）。
  - 当前缺少 `dispatchBatch` topic fan-out 顺序的独立回归断言（实现已保持顺序，建议后续补测试锁定）。
- 回滚：
  - 直接移除 `actionsByTag$` 与 topic hub 发布路径，恢复 `actions$ + Stream.filter` 单通道。

## 备注
- 按用户要求，已将“PR 合并前必须消化 CodeRabbit 评论并记录结论”的流程更新到：`.codex/skills/refactor-pr-ci-loop/SKILL.md`。

## 机器人评论消化（CodeRabbit）
- 评论：建议把 `refactor-pr-ci-loop` 本地默认验证改为 `typecheck -> lint -> test`。
  - 处理：`暂不采纳`（与当前用户口径“本地只测类型和测试，性能交 PR CI”冲突）。
  - 风险：lint 问题可能延后到 CI 暴露；当前由 PR CI 兜底。
- 评论：指出性能与诊断证据缺失。
  - 处理：`已采纳`，补充 CI `perf-quick` 可比性结论、artifact 标识与诊断事件影响说明（见“性能与诊断证据”）。
- 评论：指出测试使用非空断言 `actionsByTag$!`。
  - 处理：`已采纳`，改为显式 guard helper（`requireActionsByTag`）并通过 `typecheck:test` 复验。
- 评论：建议为 topic hub 内存策略与 batch fan-out 顺序开后续 issue。
  - 处理：`部分采纳`。已在本文档保留顺序风险与后续测试建议；topic hub 当前基于静态声明 action tags 预建，不存在运行期无限扩张路径，暂不单独开“内存上限”议题。
