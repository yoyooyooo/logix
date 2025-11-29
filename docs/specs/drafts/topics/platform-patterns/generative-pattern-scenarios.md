---
title: Generative Pattern Scenarios (ToB Analysis)
status: draft
version: 2025-11-28
---

# Generative Pattern 实战场景分析 (ToB)

本文档通过三个典型的 ToB 业务场景，深入分析 **Generative Pattern (AI Slots)** 在全链路中的实际价值与运作方式，验证其必要性。

## 场景一：复杂审批流 (Approval Workflow)

这是 ToB 系统中最常见的“骨架 + 差异”场景。

### 1. 痛点
*   **骨架通用**: 串行/并行审批、超时提醒、驳回回退、日志记录。这些逻辑非常复杂且枯燥，每个业务都要写一遍。
*   **差异巨大**: 每个节点的“审批人计算规则”、“自动通过规则”千差万别（如：金额>500且科目是差旅）。

### 2. Pattern 定义 (Architect)
```typescript
// patterns/ApprovalFlow.ts
export const ApprovalFlow = Pattern.make("std/approval", {
  config: Schema.Struct({
    nodes: Schema.Array(Schema.String), // 节点名称列表
    timeout: Schema.Number // 超时时间
  }),
  slots: {
    // 差异点：如何计算某个节点的审批人？
    approverResolver: Slot.make({
      input: Schema.Struct({ node: Schema.String, context: Schema.Any }),
      output: Schema.Array(Schema.String), // 返回 UserID 列表
      ai: { instruction: "根据节点名称和上下文，计算审批人列表。" }
    }),
    // 差异点：是否自动通过？
    autoPassRule: Slot.make({
      input: Schema.Struct({ node: Schema.String, context: Schema.Any }),
      output: Schema.Boolean,
      ai: { instruction: "判断当前节点是否满足自动通过条件。" }
    })
  }
}, ...);
```

### 3. 业务落地 (Developer + AI)
*   **User Intent**: "差旅费报销审批。如果金额小于 200，直接通过；否则需要部门经理审批。"
*   **AI 生成 (Slot Implementation)**:
    *   `autoPassRule`: 生成代码检查 `context.amount < 200`。
    *   `approverResolver`: 生成代码调用 `DeptService.getManager(context.applicantId)`。
*   **价值**: 开发者只需关注业务规则，完全不用管“超时怎么处理”、“驳回怎么回滚”这些复杂的流程控制。

---

## 场景二：数据导入与清洗 (Data Import & ETL)

### 1. 痛点
*   **骨架通用**: 文件读取 (Excel/CSV)、分批处理、进度条更新、错误收集、事务提交。
*   **差异巨大**: 每一列的校验规则、清洗逻辑（如：手机号格式化、字典值映射）。

### 2. Pattern 定义 (Architect)
```typescript
// patterns/BatchImporter.ts
export const BatchImporter = Pattern.make("std/importer", {
  slots: {
    // 差异点：单行数据清洗与校验
    processRow: Slot.make({
      input: Schema.Struct({ row: Schema.Record(Schema.String, Schema.Any) }),
      output: Schema.Option(Schema.Any), // 返回清洗后的数据，None 代表丢弃
      ai: { instruction: "清洗单行数据。如果数据无效返回 None，否则返回清洗后的对象。" }
    })
  }
}, ($, { slots }) => Effect.gen(function*() {
  // 骨架：负责流式读取 Excel，控制并发为 10，每 100 条通过 SSE 推送进度
  // 骨架：负责收集 processRow 返回的 Error，最后生成错误报告 Excel
  // ...
}));
```

### 3. 业务落地 (Developer + AI)
*   **User Intent**: "导入员工名单。把 '入职日期' 转成 ISO 格式，'部门' 映射成 ID。如果 '手机号' 为空则跳过。"
*   **AI 生成**:
    *   `processRow`: 生成代码解析日期、查询字典映射部门、检查手机号。
*   **价值**: 极大地降低了 ETL 任务的开发门槛。开发者以前要写几百行代码处理 Excel 流和并发，现在只需要写（或让 AI 写）一个纯函数。

---

## 场景三：外部 API 集成 (Third-party Integration)

### 1. 痛点
*   **骨架通用**: OAuth2 Token 刷新与缓存、限流重试 (Rate Limiting)、熔断降级、统一日志审计。
*   **差异巨大**: 具体 API 的请求参数构造、响应结果适配。

### 2. Pattern 定义 (Architect)
```typescript
// patterns/ApiClient.ts
export const ApiClient = Pattern.make("std/api-client", {
  slots: {
    // 差异点：构造请求
    buildRequest: Slot.make({
      input: Schema.Struct({ params: Schema.Any }),
      output: Schema.Struct({ url: Schema.String, method: Schema.String, body: Schema.Any }),
      ai: { instruction: "根据业务参数构造 HTTP 请求对象。" }
    }),
    // 差异点：适配响应
    adaptResponse: Slot.make({
      input: Schema.Any, // 原始 JSON
      output: Schema.Any, // 业务模型
      ai: { instruction: "将 API 响应转换为业务所需的格式。" }
    })
  }
}, ($, { slots }) => Effect.gen(function*() {
  // 骨架：负责检查 Token，如果过期自动刷新
  // 骨架：负责调用 fetch，如果 429 则自动退避重试
  // ...
}));
```

### 3. 业务落地 (Developer + AI)
*   **User Intent**: "对接飞书发消息接口。"
*   **AI 生成**:
    *   `buildRequest`: 生成代码构造飞书的 JSON Body。
    *   `adaptResponse`: 提取 `message_id`。
*   **价值**: 保证了所有外部调用都自动具备了“企业级”的健壮性（重试、熔断、审计），而不会因为开发者水平参差不齐而留下隐患。

---

## 总结：全链路分析结论

通过这三个场景，我们可以清晰地看到 **Generative Pattern** 的核心价值：

1.  **屏蔽复杂性 (Encapsulation)**: 骨架封装了并发、事务、重试等“高难度”技术细节。
2.  **聚焦业务 (Focus)**: Slot 强迫开发者（和 AI）只关注“业务规则”本身。
3.  **标准化 (Standardization)**: 强类型的 Slot 接口保证了 AI 生成的代码必须符合契约，极大地提高了生成代码的可用性。

**结论**: 在 ToB 这种逻辑复杂度高、稳定性要求严的场景下，引入 `Pattern` 和 `Slot` 是实现 **"AI 辅助的高质量开发"** 的必经之路。
