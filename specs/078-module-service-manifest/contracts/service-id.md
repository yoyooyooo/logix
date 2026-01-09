# Contract: ServiceId（Context.Tag 的稳定标识）

## 目标

定义一份跨模块/跨进程一致的服务标识 `ServiceId`，用于：

- Manifest IR 中表达 Module↔Service 关系；
- Trial Run/回放对齐；
- Devtools 展示与 diff 聚合。

## 定义

`ServiceId` 是一个 **稳定字符串**，从 `effect` 的 `Context.Tag` 派生。

约束：

- MUST 为 JSON 可序列化字符串。
- MUST 在同一仓库/同一 Tag 定义下跨进程一致（禁止随机/时间）。

## 规范化算法（权威）

给定 `tag: Context.Tag<any, any>`，`ServiceId` 取值按以下优先级选择第一个可用的非空字符串：

1. `tag.key`
2. `tag.id`
3. `tag._id`

若以上均不可用，则该 Tag 视为 **不合格**：禁止将其写入 Manifest/IR 的 `ServiceId`。

> `tag.toString()` 仅允许用于 dev 错误信息/诊断展示（human-readable），不得作为 `ServiceId` 的来源。  
> 原因：`toString()` 的稳定性无法在运行时被可靠证明，且一旦漂移会破坏回放/对齐/门禁的确定性。

注意：

- 平台/运行时/Devtools 任何地方需要把 Tag 转为稳定字符串时，必须复用同一实现（单点 helper），禁止各处复制逻辑导致漂移。
- 若无法得到稳定字符串（空串或缺失），视为契约违规：在 dev 环境应输出明确诊断并指导修复（要求 Tag 使用稳定字符串 `key`）。

## 推荐用法（业务侧）

定义 Tag 时显式使用稳定字符串 key：

- 推荐：`class ArchiveServiceTag extends Context.Tag('my-svc/archive')<ArchiveServiceTag, ArchiveService>() {}`
- 避免：依赖运行时生成的匿名/不稳定标识

## 兼容性与 forward-only

- 本 contract 是平台 IR 的一部分：一旦发布并被消费，变更必须通过 bump 版本与迁移说明完成（禁止静默改口径）。
