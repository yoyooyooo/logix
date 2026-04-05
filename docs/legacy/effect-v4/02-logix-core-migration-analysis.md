# logix-core 核心路径迁移分析（v4-only）

## 1. 扫描概览（`packages/logix-core/src`）

> 基于 `rg` 静态盘点，作为改造规模估算。

| 项目 | 命中数 |
|---|---:|
| `Context.Tag(` | 53 |
| `Context.GenericTag` | 8 |
| `Context.get(` | 46 |
| `Context.getOption(` | 9 |
| `Effect.catchAll(` | 8 |
| `Effect.catchAllCause(` | 33 |
| `Effect.fork(` | 53 |
| `Effect.forkDaemon(` | 2 |
| `Effect.locally(` | 125 |
| `FiberRef` | 144 |
| `Scope.extend(` | 7 |
| `Runtime.run*`（模块级） | 1 |

结论：这是 runtime 内核级重构，不是“批量 rename”任务。

## 2. 热点文件（按 v3 API 命中聚合）

| 文件 | 命中数 |
|---|---:|
| `internal/runtime/core/DebugSink.record.ts` | 20 |
| `internal/runtime/core/process/ProcessRuntime.make.ts` | 17 |
| `internal/state-trait/source.impl.ts` | 12 |
| `internal/runtime/core/ModuleRuntime.transaction.ts` | 12 |
| `internal/runtime/core/ModuleRuntime.txnQueue.ts` | 11 |
| `internal/runtime/core/env.ts` | 10 |
| `internal/runtime/core/WorkflowRuntime.ts` | 10 |
| `internal/runtime/core/BoundApiRuntime.ts` | 10 |
| `internal/runtime/AppRuntime.ts` | 9 |
| `internal/runtime/core/ModuleRuntime.impl.ts` | 8 |

这些文件是迁移第一批重点改造点。

## 3. API 调整 vs 底层重构矩阵

| 主题 | 处理方式 | 结论 |
|---|---|---|
| `catchAll*` / `fork*` / `Scope.extend` | API 迁移（rename + 行为校验） | 可机械替换，但必须跑并发/错误语义回归 |
| `Runtime.run*` 边界 | API 迁移 + 入口重整 | 需要统一运行入口，避免散落调用 |
| `Context.Tag/GenericTag` | 底层重构 | 必须整体切到 `Context.Tag / Tag class`，含依赖注入拓扑重排 |
| `FiberRef` / `Effect.locally` | 底层重构 | 必须切到 `Context.Reference` + `Effect.provideService`，事务/诊断传播链重写 |
| `Cause` 解析 | 底层重构 | 不能只换函数名，需重做诊断因果表达策略 |
| `Layer memoization` | 底层重构（装配策略） | 需显式审计隔离点（`local: true` / `Layer.fresh`） |

## 4. v4 原生重构蓝图（无 bridge）

## 4.1 Runtime Service 拓扑重建

- 目标：把 runtime 依赖面从 v3 `Context.*` 重建到 v4 `Context.Tag / Tag class`。
- 关键动作：
  - 统一服务定义风格：`Context.Tag / Tag class<Self, Shape>()("Id")`。
  - 禁止继续新增 `Context.Tag/GenericTag`。
  - 动态模块服务标识改为稳定 helper（防止 id 漂移）。

## 4.2 Runtime Reference 拓扑重建

- 目标：把 Fiber-local 语义统一落到 `Context.Reference`。
- 关键动作：
  - 诊断级别、txn 元信息、调度上下文、追踪开关等全部迁移到 Reference。
  - 所有“局部覆盖”统一改为 `Effect.provideService`，不再使用 `Effect.locally`。
  - 事务窗口相关路径先补回归再迁移，避免隐性语义偏移。

## 4.3 运行边界重构

- 目标：统一 effect 执行边界，收敛 `run*` 与 fiber 生命周期管理。
- 关键动作：
  - 清理模块级散落的 `Runtime.run*` 直连调用。
  - `yield* fiber` 改为 `Fiber.join/await` 明确语义。
  - `fork` 行为差异通过 options 与测试固化。

## 4.4 诊断与错误语义重构

- 目标：在 Cause 扁平化后保持可解释链路。
- 关键动作：
  - 错误事件中补齐“阶段/并发语义/来源锚点”字段。
  - 避免依赖旧 Cause 树结构表达顺序/并发。
  - 诊断事件继续保持 Slim + 可序列化。

## 5. 不可破坏约束

- 事务窗口禁止 IO。
- 业务不可写 `SubscriptionRef`。
- 统一最小 IR（Static IR + Dynamic Trace）不新增并行真相源。
- 稳定标识（`instanceId/txnSeq/opSeq`）不可随机化。

## 6. 迁移执行建议（core 侧）

1. 先完成 Stage 0 baseline 与命中台账，锁定评估口径。
2. 在 `logix-core` 先做“语义主干迁移”（Service/Reference/Runtime/Cause），再做广域 rename 收口。
3. 核心门禁通过后，再进入 STM 局部 PoC 与外围包迁移。
