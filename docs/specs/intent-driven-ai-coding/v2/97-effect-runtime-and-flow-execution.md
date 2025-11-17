---
title: 97 · Effect 运行时与 Flow 执行
status: draft
version: 0
---

> 本文聚焦一件事：在 v2 模型下，如何基于 `effect-ts` 为 Behavior & Flow Intent 提供**确定性、可组合、可观测**的运行时，以及这层在平台中的职责边界。后续 PoC 可直接以本文件为蓝本。

## 1. 角色与目标

在整体架构中，Effect 运行时承担的角色是：

- **Behavior & Flow Intent 的唯一执行内核**：  
  - FlowIntent / FlowDslV2 表达“业务步骤链”；  
  - `.flow.ts` 中的 Effect 程序是其唯一合法运行时实现。
- **横切能力的集中落点**：  
  - 性能/重试/超时/熔断/审计/Tracing 等约束不散落在业务代码中，而统一通过 Layer/中间件实现；  
  - 这些策略来自 ConstraintIntent 和平台配置。
- **开发者 Escape Hatch 的保障者**：  
  - 开发者可以随时手写复杂 Effect 与自定义 Layer；  
  - 平台不要求理解其内部，只要签名清晰就能在 Flow 中调用。

目标边界：

- 能做：让「事件 → 流程步骤 → 服务调用 → 横切约束 → 可观测性」这一整条链条稳定且可追踪；  
- 不做：试图用 Flow/Effect 替代复杂领域算法本身（计费、推荐、风控内核等），这些保留为领域代码中的黑盒 Effect。

## 2. 从 FlowIntent / FlowDslV2 到 Effect 程序

核心链路：

```text
BehaviorIntent.flows[]        // 高层业务流程意图
    ↓ 规范化、补全约束
FlowDslV2                     // 声明式 AST（v2/03 中的类型）
    ↓ 编译（deterministic）
Effect 程序 (.flow.ts)        // TS 源码，供构建/运行时使用
```

### 2.1 FlowDslV2 回顾

`v2/03-assets-and-schemas.md` 中定义了：

- `FlowDslV2.id`：Flow 标识；  
- `trigger.eventId`：引用 InteractionIntent.events[].id，统一事件事实源；  
- `steps: FlowStepIntent[]`：业务步骤链；  
- `constraints?: ConstraintIntent`：该 Flow 的运行时约束（重试/超时/审计等）。

PoC 编译器需要实现：

- 对 `kind: 'callService' | 'branch' | 'delay' | 'parallel'` 等 step 做有限集转换；  
- 保证相同的 FlowDslV2 每次编译出的 Effect 结构相同（不依赖 LLM、无随机性）。

### 2.2 Effect 程序形态示例

以导出流程为例（简化）：

```ts
// 环境依赖：由 Layer 提供实现
export interface ExportOrdersEnv {
  FilterService: { getCurrentFilters: () => Promise<Record<string, unknown>> }
  TableUiStateService: { getCurrentState: () => Promise<{ visibleColumns: string[] }> }
  ExportService: { submitExportTask: (input: { filters: any; columns: string[] }) => Promise<void> }
}

export const exportOrdersFlow = (env: ExportOrdersEnv) =>
  Effect.gen(function* () {
    const filters = yield* Effect.promise(() => env.FilterService.getCurrentFilters())
    const tableState = yield* Effect.promise(() => env.TableUiStateService.getCurrentState())
    yield* Effect.promise(() =>
      env.ExportService.submitExportTask({ filters, columns: tableState.visibleColumns }),
    )
  })
```

原则：

- 编译器生成的是「结构化组合」（gen/flatMap/all 等），而不是内联业务逻辑；  
- 复杂业务逻辑（例如导出参数组装、权限判断）可以下沉到具体服务实现中。

## 3. 环境与 Layer 设计

### 3.1 Env：按服务分桶，而不是按 API 调用分桶

约定：

- 每个服务（领域服务或技术服务）在 Env 中有一个命名接口，例如 `OrderService`、`ExportService`、`AuditService`；  
- FlowStepIntent 中的 `serviceId/method` 只引用这些接口，不直接写 Http 细节。

好处：

- Flow 只依赖领域语义（服务+方法），具体调用 HTTP/消息队列/本地逻辑由服务实现决定；  
- 以后迁移基础设施（例如从 REST 改成 gRPC）时，不需要改 FlowIntent。

### 3.2 Layer：横切能力与平台默认实现

平台提供一个组合 Layer（示意）：

```ts
export interface PlatformDeps {
  Logger: Logger
  Tracer: Tracer
  Clock: Clock
  HttpClient: HttpClient
  Config: Config
  // ...
}

// 每个领域服务的 Layer，可以依赖 PlatformDeps
export const ExportServiceLive = Layer.effect(ExportServiceTag, makeExportService)

export const PlatformLayer = Layer.mergeAll(
  LoggerLive,
  TracerLive,
  HttpClientLive,
  ConfigLive,
  ExportServiceLive,
  // ...
)
```

ConstraintIntent 的信息（重试/超时/审计等）通过：

- 全局中间件 Layer：对所有服务调用通用注入；  
- 或按 Flow/Step 粒度配置的 Layer：从 FlowDslV2.constraints 中读取配置，再包一层。

开发者可以：

- 在测试中替换为 Mock Layer；  
- 在特定环境用自定义 Layer 覆盖平台默认实现（例如自定义日志、特殊 HttpClient）。

## 4. 与平台其它层的集成方式

### 4.1 代码生成与构建

CLI 流程建议：

- `imd intent apply`：  
  - 解析 Intent/FlowIntent，生成/更新 FlowDslV2 文件；  
  - 基于 FlowDslV2 编译 `.flow.ts` 文件（Effect 程序）；  
  - 放入遵循 Code Structure Intent 的目录（例如 `src/features/order/flows/*.flow.ts`）。

构建时：

- bundler 只看到普通的 `.ts` 源码和 Effect 程序；  
- FlowDslV2 可以选择是否参与运行时（只作为调试/文档存在）。

### 4.2 Flow Studio / Intent Studio 中的运行时体验

- Flow Studio：  
  - 使用同一套 Effect 程序，在沙箱 env 下执行 Flow，展示每一步的输入/输出/耗时；  
  - 结合 Layer 中的 Tracer/Logger，展示重试/超时/审计行为。
- Intent Studio：  
  - 在 Behavior & Flow Tab 中，左侧「步骤列表」对应 FlowIntent；  
  - 右侧 `.flow.ts` 预览仅供阅读/审查，不鼓励直接手改；  
  - 日后可以提供“从手写 Effect 反推 FlowIntent 草稿”的辅助工具，但不是主路径。

### 4.3 与 Interaction 录制/回放、可观测性的关系

- Interaction 录制：记录 eventId + 相关状态快照；  
- 回放：  
  - 使用同一 Flow 程序与 Layer，在沙箱中重放事件链；  
  - 与真实运行时的 trace 对比，发现行为偏差。  
- 监控：  
  - 每个 Flow 执行在 Tracer 中形成一个 span 树，携带 UseCase/Intent/FlowId 等上下文；  
  - 可以从告警直接跳回 Flow Studio/Intent Studio。

## 5. PoC 建议范围

为避免一口吃太胖，建议首轮 effect-ts PoC 聚焦以下能力：

1. **支持最小 Flow 步骤集**：  
   - `callService`（顺序调用）、`branch`（基于简单条件分支）、`parallel`（简单并行）；  
   - 先不实现 delay/复杂控制流。
2. **实现一个简单 Env + 1–2 个领域服务**：  
   - 如 `OrderService`、`ExportService`，用内存或简单 HTTP Mock 实现即可。  
3. **提供一个基础 PlatformLayer**：  
   - 内置 Logger（console）、简单重试策略、超时；  
   - 从 FlowDslV2.constraints 中读取重试/超时配置（即使暂时只支持少数字段）。  
4. **打通一条端到端演示线**：  
   - 选一个真实页面（例如订单导出），写 FlowIntent/FlowDslV2；  
   - 生成 `.flow.ts` 并在简单 React 页面中调用；  
   - 在 Flow Studio/简单控制台中展示执行日志。

PoC 目标不是功能覆盖 100%，而是验证：

- FlowIntent → FlowDslV2 → Effect 程序的编译路径是否清晰可维护；  
- Layer 能否方便地注入横切能力，而不侵入业务逻辑；  
- 这套运行时是否足以承载未来约束/可观测性/回放等蓝图。

