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
- 2026-02-24（本地只读独立审查，基于 `origin/main...HEAD`）。
- 结论：`non-blocker`，无阻塞问题，可合并。
- 非阻塞建议：当前新增测试已覆盖 `schemaAst` 缓存命中；建议后续补 1 条针对 `moduleRuntime` 缓存命中路径的回归用例，锁定重构安全边界。

## 机器人评论处理
- CodeRabbit：2026-02-24 评论为 `Rate limit exceeded`，未给出具体代码修复建议；当前无待处理阻塞项。
- Vercel：已回传预览部署状态评论（构建信息）。
- github-actions（logix-perf）：summary 为 `status: no_diff`，无回归告警。
