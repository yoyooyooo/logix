---
title: Effect 运行时与 Flow 场景规范（PoC）
status: draft
version: 0
---

> 本目录用于沉淀「意图驱动 + effect-ts 运行时」下的编码规范与场景模式，优先围绕 ToB 典型场景做业务压力测试，再反向收敛成 Env/Flow/Constraint 的约定。

## 1. 总体目标

- 为 Behavior & Flow Intent 提供一套 **可复用的 effect-ts 写法**，而不是把 Intent 变成“YAML 版代码”；  
- 用一批复杂 ToB 场景（订单列表+筛选+批量+导出、文件导入+预览+错误回放等）验证 Env/Flow/Constraint 的边界是否合理；  
- 为后续 Studio/平台化预留清晰契约：`FlowDslV2` → `.flow.ts` Effect 程序 → Env/Layer/Constraint。

## 2. Env 约定：按服务分桶，而不是按 API

在 `packages/effect-runtime-poc/src/shared/base.ts` 中定义了：

- `BasePlatformEnv`：提供 `logger`、`clock` 等平台级能力；  
- 各场景 Env 必须通过扩展 `BasePlatformEnv` 来引入领域服务，例如：

```ts
export interface OrdersComplexEnv extends BasePlatformEnv {
  OrderFilterService: OrderFilterService
  OrderListService: OrderListService
  OrderSelectionService: OrderSelectionService
  OrderBulkUpdateService: OrderBulkUpdateService
  OrderExportService: OrderExportService
  TableStateService: TableStateService
  NotificationService: OrdersNotificationService
  AuditService: OrdersAuditService
}
```

规范要点：

- [[MUST]] Env 采用“领域/技术服务”为粒度，例如 `OrderListService`、`OrderExportService`、`AuditService`，**禁止**按单个 HTTP API 或 URL 分桶；  
- [[MUST]] Flow 只依赖服务语义（方法入参/出参），不感知 HTTP 细节（URL、header、status code）；  
- [[SHOULD]] 场景 Env 命名为 `<UseCase>Env`，例如 `OrdersComplexEnv`、`FileImportWithPreviewEnv`；
- [[SHOULD]] 横切能力（日志/审计/重试等）通过 `BasePlatformEnv` 扩展或 Layer 提供，而不是在每个 Flow 内手动堆叠。

## 3. Flow 命名与职责划分

所有 Flow 均以 `Fx<R, E, A>` 形式存在（`Fx` 为 `Effect.Effect` 类型别名），命名上遵循：

- [[MUST]] 使用动词开头，表达完整业务动作，而非单步技术细节，例如：  
  - `refreshListFlow`：刷新订单列表；  
  - `bulkUpdateThenExportFlow`：批量更新订单状态并提交导出任务；  
  - `pollExportStatusFlow`：轮询导出任务进度；  
  - `analyzeAndMaybeImportFlow`：文件预览并按条件启动导入；  
  - `fetchImportResultFlow`：获取导入结果与失败明细。
- [[MUST]] 单个 Flow 保持“单一责任 + 完整闭环”：  
  - 要么完成一次业务动作（提交导出、启动导入、批量更新并审计）；  
  - 要么完成一段独立控制流（轮询、预览分析、结果查询）。  
- [[SHOULD]] 更长的业务链条通过多个 Flow 组合，而不是在单个 Flow 中塞下所有步骤，以便在 FlowIntent/FlowDslV2 中有映射空间。

## 4. 典型场景模式

### 4.1 订单列表 + 筛选 + 批量更新 + 导出 + 轮询

对应文件：`packages/effect-runtime-poc/src/scenarios/ordersComplex.ts`。

模式要点：

- [[MUST]] 列表刷新单独一个 `refreshListFlow`，只处理「filters → list」；  
- [[MUST]] 批量操作 Flow（`bulkUpdateThenExportFlow`）内部：  
  - 先读取当前筛选条件 `OrderFilterService.getCurrentFilters`；  
  - 按 scope 决定操作对象（`selected` 使用 `OrderSelectionService`，`allByFilter` 只带 filters）；  
  - 调用 `OrderBulkUpdateService.applyStatusChange` 完成批量更新；  
  - 通过 `AuditService.record` 记录操作审计；  
  - 读取 `TableStateService.getCurrentState`，用可见列发起 `OrderExportService.submitExportTask`；  
  - 再次审计导出行为。  
- [[SHOULD]] 轮询逻辑单独由 `pollExportStatusFlow` 承担，内部使用简单 `while` + `Effect.async`，未来可替换为基于 `Effect.Schedule` 的策略 Layer；  
- [[MUST]] Flow 内部允许使用 `NotificationService` 提示用户，但文本语义保持通用（不绑定具体组件）。

### 4.2 文件导入 + 预览 + 错误明细

对应文件：`packages/effect-runtime-poc/src/scenarios/fileImport.ts` 与 `fileImportWithPreview.ts`。

模式要点：

- `uploadAndStartImportFlow`：负责「上传文件 → 启动导入任务」，不包含轮询；  
- `pollImportStatusFlow`：负责「轮询任务状态 → 结束时记录状态」；  
- `analyzeAndMaybeImportFlow`：  
  - 通过 `PreviewService.analyze` 生成 `ImportPreview`（总行数/合法行数/示例行）；  
  - 根据 `autoStart` 与 `invalidCount` 决定是否直接启动导入（`uploadAndStartImportFlow`）；  
  - 通过可选 `NotificationService` 给出用户提示（有无错误行、是否已提交任务）。  
- `fetchImportResultFlow`：  
  - 调用 `ImportResultService.getImportResult` 获取任务状态与失败行；  
  - 根据结果发出成功/部分失败/失败的提示；  
  - 记录日志，方便后续在 Flow Studio/监控中回放。

## 5. 可观测性与约束（草案）

当前 PoC 中：

- [[MUST]] 所有 Flow 在关键步骤前后调用 `env.logger.info`，携带必要上下文（例如 `taskId`、`scope`、`filters`、`columns` 等）；  
- [[SHOULD]] 将审计类需求统一下沉到 `AuditService`，Flow 只描述“何时记录什么类型”；  
- [[MAY]] 在未来通过 ConstraintIntent + Layer，将重试/超时/退避等策略从 Flow 中抽离成可配置项。

后续演进方向：

- 从这些场景中抽取共性约束（标准轮询策略、批量操作默认审计字段、导出/导入任务统一状态机），收敛到单独的 Constraint/Layer 规范；  
- 为 FlowIntent/FlowDslV2 定义一组最小必要字段，使其既能表达上述模式，又不泄漏具体实现细节。

