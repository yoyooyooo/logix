# 2. 三位一体模型相关术语

## 2.1 Intent（意图）

- **Intent**：对「系统应该做什么」的结构化描述，而不是「怎么做」。
  - 从业务视角：需求、用例、交互规则。
  - 从技术视角：可以被 Codegen / Parser 消费的结构化数据（IntentSpec / IntentRule）。
- Intent 本身不绑定具体技术栈（React / Vue / Effect / REST / gRPC 等），它只描述：
  - 哪些 UI 节点参与；
  - 哪些业务流程发生；
  - 哪些领域概念/数据被读写。

## 2.2 UI / Logic / Module（三位一体）

- **UI (Presentation)**

  - 表达界面结构与展示状态；
  - 关注“看得见的行为”：组件树、布局、交互控件、视觉状态（loading/disabled 等）；
  - 不直接描述业务流程和领域规则，只表达「交互入口」与「展示结果」。

- **Logic (Behavior)**

  - 表达业务规则与流程编排；
  - 关注“事件 → 步骤 → 结果”的链路：
    - 触发条件（按钮点击、字段变化、定时器）；
    - 步骤顺序（串行/并行/重试/补偿）；
    - 状态更新与副作用（写 Module、调用服务、发通知）。
  - 在当前实现中，Logic 通常落在 Logix Runtime 的 `Module / Logic / Flow` 层，并配合 Effect 原生结构化控制流（含 `$.match`/`$.matchTag`）。
  - 形式化工作模型（约束闭包 $C_T$ / 控制律 $\Pi$ / 事务 $\Delta\oplus$）见 `docs/ssot/platform/contracts/00-execution-model.md` 的 “1.2 最小系统方程”。

- **Module (Data)**
  - 表达业务概念与数据模型（实体）及其不变量；
  - 包含：
    - 实体 Schema（Employee、Contract、Task、ImportJob…）；
    - 领域服务契约（ApprovalService、ImportService、NotificationService 等）；
    - 领域错误（ApprovalServiceError、FileImportError…）。
  - 在实现层中，Module 通常以 Effect.Schema + Context.Tag/interface 的形式出现，但概念上先于任何具体实现。
