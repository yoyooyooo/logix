# Tier-1/2/3 辩论共识深化（$linus-tech-debate）

## 1. 本轮结论总览

- 总方向不变：全面 `v4-only + forward-only`，不保留兼容层、不做双栈。
- 三层不是“是否做”的分歧，而是“先后节奏 + 门禁强度”的分歧。
- 统一裁决：
  - Tier-1：拆两波，先拿热路径确定性收益，再做全仓 Tag 体系清理。
  - Tier-2：S2 后段先收口运行时边界，S3 与 STM 联动完成语义闭环。
  - Tier-3：方向成立，但不进 1.0 主线；G1 后进入受控附加轨道。

## 2. 分层裁决（最终版）

## 2.1 Tier-1（快收益层）

- 裁决：不一次性打包；拆两波执行。
- 第一波（S2 前半优先）：`#2 setup 端口解析前移` -> `#1 ModuleRuntimeRegistry` -> `#3 txnQueue 注入扁平化`。
- 第二波（S2 后半或 S3 前）：`#4 GenericTag -> Tag class` 全仓清理 + lint/error 禁回流。
- 关键门禁：
  - 稳定标识：`instanceId/txnSeq/opSeq` 可复现、可 diff。
  - 事务窗口：禁止 IO。
  - 证据：性能基线/对比 + replay 一致性 + Slim 可序列化诊断事件。

## 2.2 Tier-2（中收益层）

- 裁决：不后移到纯 S3，也不在 S2 无门禁一把梭。
- 节奏：`S2 后段基础收口 + S3 语义闭环`。
- S2 后段要完成：
  - `DebugSink.record` FiberRef 读取聚合收敛。
  - `ExternalStore` 禁新增长直连 `runSync/runFork`，统一 runtime/scope 入口。
  - `TaskRunner` 由全局 `inSyncTransaction` 深度迁到 scope 隔离影子模式。
  - CI 硬门禁：事务窗口 IO fail-fast、业务写 `SubscriptionRef` fail-fast、遗留入口 fail-fast。
- S3 联动 STM 要完成：
  - 影子路径退场、语义切换收口、并发取消/重试/超时矩阵回归。

## 2.3 Tier-3（深重构层）

- 裁决：不纳入 1.0 主迁移主线；进入 G1 后受控附加轨道。
- 1.0 内仅允许落地“低风险铺垫项”：
  - 稳定 ID 去随机化。
  - 诊断事件 Slim 化与 IR 链路补齐。
- G1 后才推进的主体：
  - AppRuntime 装配链显式状态化。
  - transaction 同步窗口 DSL 化。
  - STM 在 `WorkflowRuntime/ProcessRuntime` 局部深用（禁区不变）。
- 禁区（始终不变）：`ModuleRuntime.transaction`、`TaskRunner`、外部 IO step 执行体。

## 3. 跨 Tier 统一共识

- 单一真相源：只认 `Static IR + Dynamic Trace`，禁止 run 期回跳解析。
- 单入口策略：业务只走 runtime API；旧入口不长期保留。
- 约束前移：可编译期拦截的问题，优先 lint/typecheck；运行时负责 fail-fast 兜底。
- 证据优先：核心路径变更必须附可复现 perf diff 与诊断链证据。
- 渐进不是妥协：允许分阶段，但每阶段必须有明确 DoD 与退场条件。

## 4. 执行顺序（与现有 S0~S6 对齐）

1. P-1/GP-1：等待 `feat/perf-dynamic-capacity-maxlevel` 合入 `main`，冻结基线能力。
2. S0-S1：完成命中台账、before 基线、版本矩阵收敛。
3. S2-A：Tier-1 第一波（`#2 -> #1 -> #3`）+ Tier-2 基础收口。
4. S2-B：Tier-1 第二波（`#4` 清理）+ Tier-2 影子验证完成。
5. S3：Tier-2 与 STM 联动做语义闭环；按 G2 做 GO/NO-GO。
6. G1 后附加轨道：启动 Tier-3 主体试点（小范围 canary -> 扩面）。
7. S4-S6：生态包、文档与 1.0 发布闸门收口。

## 5. 新增硬门禁建议（从本轮辩论提炼）

- Gate-A（S2-A 结束）：
  - run 期端口兜底解析命中为 0。
  - 新增 `GenericTag` 命中为 0（至少 warning，建议 error）。
- Gate-B（S2-B 结束）：
  - 旧执行入口（`runSync/runFork` 直连）新增命中为 0。
  - `TaskRunner` 全局深度变量路径仅保留影子验证，不再主路径生效。
- Gate-C（S3 结束）：
  - 并发/取消/超时/重试矩阵全绿。
  - replay 一致性与稳定 ID diff 校验通过。

## 6. 明确不做项

- 不做任何长期兼容层、双入口、双真相源。
- 不将 Tier-3 三大改造整包塞入 1.0 主线。
- 不在没有 perf+diagnostics 证据的情况下合并核心热路径改动。
