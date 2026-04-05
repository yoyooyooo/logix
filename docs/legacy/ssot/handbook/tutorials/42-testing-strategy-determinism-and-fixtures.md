---
title: 测试策略教程 · 确定性、Fixtures 与“证据不漂”（从 0 到 1）
status: draft
version: 1
---

# 测试策略教程 · 确定性、Fixtures 与“证据不漂”（从 0 到 1）

> **定位**：本文讲“工程维度”的测试策略：如何在 Effect/Logix-heavy 的代码里写出确定性测试、如何组织 fixtures、以及如何避免“证据漂移”（同一语义不同机器/不同时间跑出不同结果）。  
> **裁决来源**：测试栈与 @effect/vitest 约定见仓库 AGENTS 指南（以及各包 scripts）；本文把它落到可执行剧本与可点的测试锚点。

## 0. 最短阅读路径（10 分钟上手）

1. 读 `docs/ssot/handbook/tutorials/17-testing-and-fixtures.md`：先建立本仓测试的基本范式（it.effect/it.scoped/Layer）。  
2. 读「1.1 什么是证据不漂」：理解为什么“稳定排序/稳定 id/稳定时间”是硬约束。  
3. 读「2.2 用 TestClock 控制时间」：避免 setTimeout/Date.now 带来的非确定性。  
4. 最后读「3.1/3.2」：两类最常写的用例（runtime 行为测试与 contract/diff 测试）。

## 1. 心智模型（为什么测试要“像协议”一样严谨）

### 1.1 “证据不漂”：测试不是只验证功能，还要验证可对比性

本仓大量能力（digest/diff/anchors/evidence）要求 **同输入同输出**：

- 输出 JSON 的字段顺序必须稳定；  
- ids（instanceId/txnSeq/opSeq/stepKey…）必须去随机化；  
- 时间相关必须可控（TestClock）；  
- 预算裁剪必须 deterministic（同输入同 dropped/truncatedArrays）。

所以测试要同时覆盖：

- 功能正确（正确做了什么）  
- 协议正确（输出是否 stable、是否可解释、是否可序列化）

### 1.2 Effect-heavy 测试的关键：Scope 与时间是第一等公民

如果你用 Promise/real timers 写测试，会遇到：

- race condition（偶发失败）  
- 无法收束（测试进程悬挂）  
- 结果不可复现（CI/本地差异）

本仓推荐：

- 用 `@effect/vitest` 的 `it.scoped/it.effect/it.layer` 管理 Scope；  
- 用 `TestClock.adjust(...)` 控制时间推进；  
- 用 Layer 注入替身服务，避免真实 IO。

## 2. 核心范式（从 0 到 1：怎么写、怎么跑、怎么组织）

### 2.1 优先使用 `@effect/vitest`：减少手写 runPromise 样板

参考：`packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.test.ts`

典型写法：

- `it.scoped('...', () => Effect.gen(function* () { ... }))`：自动管理 Scope/资源  
- `it.effect('...', () => Effect.gen(function* () { ... }))`：无需 Scope 的纯 Effect 用例  
- `it.layer(layer)`：用 Layer 作为测试环境（减少每个用例手动 provide）

### 2.2 时间控制：用 `TestClock`，不要用 real timers

仓库里大量测试用 `TestClock.adjust('10 millis')` 推进时间：

- `packages/logix-core/test/Process/Process.Trigger.Timer.test.ts`
- `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.test.ts`

建议规则：

- 测试里避免 `setTimeout`、避免依赖真实 wall clock；  
- 如果代码内部确实用了 `Date.now()`（如某些 Worker/trace），测试要么 mock，要么把断言写成“相对关系”而不是绝对时间。

### 2.3 Fixture 设计：Layer/Tag-only 服务替身 + 最小可运行 runtime

推荐的 fixture 组成：

- **服务替身**：Tag-only service 的测试实现（Layer.succeed）  
- **Runtime 组合根**：最小的 `Runtime.make` + Root module（只装需要的 Layer）  
- **诊断采集**：必要时注入 DebugSink/EvidenceCollector，断言 Slim 事件与预算裁剪  

关键原则：

- fixture 只提供用例需要的最小能力（ISP）；  
- fixture 输出要稳定（不要每次生成随机 id 作为断言锚点）。

## 3. 剧本集（常见测试类型）

### 3.1 剧本 A：验证 runtime 行为（状态一致性/no-tearing/事务边界）

典型目标：

- state 与 ref view 一致  
- derived SubscriptionRef 只读（禁止写）  
- 事务窗口边界 guard 生效（事务内禁止 deliver/schedule/IO）

可参考：

- `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.test.ts`
- `packages/logix-core/test/Process/Process.TransactionBoundary.Guard.test.ts`

### 3.2 剧本 B：验证 IR/合同（manifest/diff/预算裁剪/确定性）

典型目标：

- `Reflection.extractManifest` 输出稳定 digest 与稳定排序  
- budgets 裁剪 deterministic（同输入同 dropped）  
- `diffManifest` 输出 stable changes 顺序与 verdict

可参考：

- `packages/logix-core/src/internal/reflection/manifest.ts`
- `packages/logix-core/src/internal/reflection/diff.ts`

（更系统的 IR 教程见：`docs/ssot/handbook/tutorials/34-surface-manifests-and-impact-analysis.md`）

### 3.3 剧本 C：验证错误语义（typed error vs defect）

典型目标：

- 业务错误走 typed error（E）并可被 catch；  
- Promise reject 不应被当作预期错误（除非用 tryPromise 映射）；  
- 证据里只出现 `SerializableErrorSummary`（不塞 Error 实例）。

可参考：

- `docs/ssot/handbook/tutorials/41-error-model-cause-and-diagnostics.md`

## 4. 代码锚点（Code Anchors）

1. `docs/ssot/handbook/tutorials/17-testing-and-fixtures.md`：测试与 fixture 的基础教程。  
2. `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.test.ts`：@effect/vitest + TestClock 的综合示例。  
3. `packages/logix-core/test/Process/*`：Process 触发/预算/诊断链路的确定性测试。  
4. `packages/logix-core/test/Contracts/*`：合同/IR/验证类用例（kernel contract 等）。  

## 5. 验证方式（Evidence）

最小验证建议：

- 在测试中避免真实 IO 与 wall clock；  
- 断言优先针对“稳定字段”（digest/ids/排序/summary），而不是不稳定的日志文本；  
- 每次新增 runtime 核心路径改动，至少补一条“确定性证据”用例（同输入同输出）。  

## 6. 常见坑（Anti-patterns）

- 用 watch 模式跑测试导致终端阻塞（CI/agent 跑道不接受）。  
- 在测试里用随机数/当前时间做断言锚点。  
- 断言依赖对象 key 的非稳定遍历顺序（应排序后比较）。  
- 把外部 IO 放进测试主线（应 mock 或用 sandbox 受控环境）。  
