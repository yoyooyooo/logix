# Review: FlowProgram Codegen IR

> 本文聚焦于后续方案需要优化的细节，不赘述现状分析。

## 1. 输入映射 DSL 的演进路径

### 问题

v1 输入映射仅支持 `payload/const/object/merge`，禁止读取 state/traits。当业务需要根据当前 state 决定 service 调用参数时，必须拆成多个 Program 通过 action 串联，可能导致：

- action 数量膨胀（每个"读 state → 计算 → 调用"链路需要额外 action）
- 业务心智负担增加（需要理解"为什么不能直接读 state"）

### 建议

1. **v1 保持现状（硬裁决）**：严格限制是对的，保证 IR 纯粹性；v1 不引入 `state.path`（避免把“读状态”塞回 Program DSL）
2. **quickstart 补充最佳实践**：给出"复杂映射下沉到 service"的标准模式示例：

   ```ts
   // 推荐：把 state 读取封装在 service 内部
   const ImportService = Context.Tag<ImportService>()('Import.Pipeline')
   // service 实现内部通过 ModuleRuntime.getState() 读取所需 state
   ```

3. **v2/backlog（非 v1）**：若未来确需支持有限 state 读取，可引入可 IR 化的表达式（如 `{ kind: 'state.path', pointer: '/form/userId' }`），但必须：
   - 仍然是纯数据结构，不是闭包
   - 明确标注为"快照读取"（读取时刻固定在 Program run 开始）
   - 进入 Static IR 供 Devtools 展示依赖关系

## 2. call（原 serviceCall）结果数据流的演进

### 问题

v1 裁决 `call`（原 `serviceCall`）不提供结果数据流，当需要基于 service 结果计算后续 payload 时，必须通过 action 串联。典型链路变成：

```
submit → API → submitSucceeded({ result }) → reducer 写入 state → 后续 Program 从 state 读
```

这增加了 action 定义和 reducer 编写的负担。

### 建议

1. **先不动 v1（遵守硬裁决）**：v1 明确不提供结果数据流（包括“结果透传”），避免把 service 结果依赖引入 Program 层导致 IR/回放/预算复杂度失控。
2. **v2/backlog（非 v1）**：如确需“结果透传”，可讨论一种受限表达：
   - 只允许在 `onSuccess` 分支内引用“最近一次 call 的返回值”
   - Static IR 必须显式标注来源（`callId`/`nodeId`），并把“结果大小/序列化”纳入预算治理

3. **在 data-model.md 补充透传语法**（若采纳，且必须是 v2 版本化演进）：

   ```ts
   type InputExprV1 =
     | { readonly kind: 'serviceResult' }  // 新增：引用最近 call 的返回值
     | ...
   ```

4. **约束**：`serviceResult` 只能在 `onSuccess` 分支内使用；IR 中必须显式标注来源 `callId`

## 3. Fragment/Compose 组合模型细节

> 更新：组合模型细节已固化于 `data-model.md#flowprogram-composition`（fragmentId 规则、compose 顺序语义、stepKey 冲突 fail-fast、withPolicy 合并优先级）。

### 问题

`FlowProgram.fragment/compose/withPolicy` 在 public-api.md 中只有概念描述，缺少：

- fragmentId 的生成规则与唯一性约束
- 嵌套 fragment 的 stepKey 冲突检测策略
- compose 的执行语义（顺序 vs 并行 vs 条件）

### 建议

1. **在 data-model.md 或独立 contracts/composition.md 中固化**：

   ```ts
   type FlowFragment = {
     readonly fragmentId: string  // 必须全局唯一（推荐 moduleId.fragmentName）
     readonly steps: ReadonlyArray<CanonicalStepV1>
   }

   // compose 语义：顺序拼接，stepKey 冲突 fail-fast
   type ComposeResult = {
     readonly steps: ReadonlyArray<CanonicalStepV1>
     readonly sourceMap: { readonly [stepKey: string]: FragmentId }
   }
   ```

2. **stepKey 冲突检测**：compose 时若发现重复 stepKey，必须 fail-fast 并提示来源 fragment

3. **考虑 withPolicy 的作用域**：

   ```ts
   // 策略是覆盖还是合并？需要明确
   withPolicy({ concurrency: 'latest' }, existingSteps)
   // 若 existingSteps 已有 policy，如何处理？
   ```

## 4. Perf Evidence 具体化

### 问题

plan.md 中 Perf Evidence Plan 较模糊（"timer 触发 + submit 两条链路的 tick overhead"），缺少：

- 具体的 baseline 定义
- 量化的预算阈值
- 测量方法的可复现描述

### 建议

1. **定义 baseline 场景**：

   ```ts
   // before：手写 watcher
   $.onAction('submit').runExhaust((payload) =>
     Effect.gen(function* () {
       yield* dispatch('started')
       yield* ServiceTag.call(payload)
       yield* dispatch('succeeded')
     })
   )

   // after：FlowProgram
   FlowProgram.make('submit', { ... })
   ```

2. **量化预算**（建议值）：

   | 指标 | 预算 |
   |------|------|
   | tick flush overhead（p95） | ≤ 0.3ms |
   | IR compile time（冷启动） | ≤ 5ms / program |
   | 内存增量（Static IR 缓存） | ≤ 1KB / program |
   | diagnostics=off 分配 | 0 额外分配 |

3. **测量脚本模板**：在 `perf/` 目录提供可复现的 benchmark 脚本

## 5. Timer 归化到 tick 的实现细节

### 问题

spec 要求 `delay/timeout` 必须由 TickScheduler 解释，但未明确：

- timer schedule/cancel/fired 如何产生 tape record
- timer 与 tickSeq 的关联算法
- 测试时 TestClock 的注入方式

### 建议

1. **在 contracts/tape.md 补充 timer 记录的完整语义**：

   ```ts
   // timer.schedule 时记录目标 tickSeq（基于当前 tickSeq + ms/tickInterval）
   // timer.fire 时记录实际触发的 tickSeq
   // timer.cancel 时记录取消原因与 cancelledByRunId
   ```

2. **TestClock 注入**：

   ```ts
   // 测试时通过 Layer 注入 TestClock
   const TestLayer = Layer.succeed(ClockService, TestClock.make())
   // FlowProgramRuntime 必须通过 ClockService 而不是 Effect.sleep
   ```

3. **replay 语义**：tape 中的 `timer.fire` 记录必须包含 `tickSeq`，replay 时按 tickSeq 顺序触发（而不是 wall-clock）

## 6. 错误处理与诊断增强

### 问题

spec 对错误路径的诊断描述较少，仅提到"结构化错误 code + programId + source.stepKey"。

### 建议

1. **定义错误分类**：

   ```ts
   type FlowProgramError =
     | { readonly code: 'INVALID_STEP_KEY'; readonly detail: { duplicateKey: string } }
     | { readonly code: 'SERVICE_TIMEOUT'; readonly detail: { serviceId: string; timeoutMs: number } }
     | { readonly code: 'RETRY_EXHAUSTED'; readonly detail: { serviceId: string; attempts: number } }
     | { readonly code: 'CANCEL_BY_POLICY'; readonly detail: { reason: CancelReason; cancelledByRunId: string } }
   ```

2. **错误归因到步骤**：每个错误必须携带 `source.stepKey`，便于 Devtools 定位

3. **defect vs 业务错误**：明确 `call` 抛出 defect（运行时异常）与业务错误（Effect 错误通道）的不同处理路径

## 7. 任务优先级调整建议

### 建议

1. **T008（build-time 组合器）提前到 T009 之前**：组合模型影响 IR 设计，应先固化
2. **T016（ServiceId 单点）可与 078 合并**：避免重复定义，保持 serviceId 算法的单一真相源
3. **新增 T025（错误分类与诊断）**：补充错误路径的结构化定义

## 8. 文档补充建议

| 文档 | 补充内容 |
|------|----------|
| `quickstart.md` | 添加"复杂映射下沉到 service"的最佳实践示例 |
| `data-model.md` | 补充 Fragment 的精确定义与 compose 语义 |
| `contracts/tape.md` | 补充 timer 记录的完整语义与 replay 算法 |
| `contracts/diagnostics.md` | 补充错误分类与归因规则 |

## 9. 与其他 spec 的协调

### 与 078-module-service-manifest 的关系

- 075 的 `serviceId` 必须使用 078 定义的派生算法
- 建议在 075 中只引用 078，不重复定义

### 与 076-logix-source-auto-trigger-kernel 的边界

- 076 处理"deps 变更 → source 刷新"的自动链路
- 075 处理"Action → 多步工作流"的显式编排
- `source refresh` 不作为独立 core step：以 `callById('logix/kernel/sourceRefresh')` 作为 Platform-Grade/LLM 出码规范形表达（TS sugar：`call(KernelPorts.SourceRefresh)`；KernelPort 作为普通 service port，具备稳定 `serviceId`）；076 负责自动触发主线

### 建议

在 spec.md 的 Out of Scope 或 research.md 中补充与 076/078 的协调说明。
