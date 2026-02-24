# triggerStreams runtime/schema 解析缓存

## Branch
- refactor/logix-core-perf-pr5-triggerstreams-runtime-cache
- PR: #71 (https://github.com/yoyooyooo/logix/pull/71)

## 核心改动
- 在 `makeNonPlatformTriggerStreamFactory` 增加 `moduleId -> tag` 与 `moduleId -> runtime` 缓存，减少重复 `Context.Tag(...)` 与 `Context.getOption(...)`。
- 在 `makeNonPlatformTriggerStreamFactory` 增加 `WeakMap<runtime, schemaAst>` 缓存，复用同 runtime 的 `resolveRuntimeStateSchemaAst(...)` 结果。
- 新增 `packages/logix-core/test/internal/Runtime/Process/TriggerStreams.RuntimeSchemaCache.test.ts`，验证同 runtime 多个 `moduleStateChange` trigger 仅触发一次 schema 解析函数调用。

## 验证
- pnpm typecheck
- pnpm test:turbo

## 独立审查
- 待补：本轮尚未发起独立 subagent review。

## 机器人评论处理
- 待补：PR 创建后等待 CodeRabbit/CI 评论再回填处理记录。
