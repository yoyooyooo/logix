# Workflow/编排 DSL 与“可执行规范”（Executable Specs）

目标：补齐“流程就是规范”的上层工具：它们往往不强调写 PRD，而是把“过程/状态机”本身当作可执行规范，并提供回放、审计、可视化与治理能力。

## 1) Durable Execution：Temporal（Event History + Replay）

定位：把 workflow 运行过程记录为 Event History，靠 replay 提供持久执行与可回放调试能力。

可追溯入口：

- Event History（概念与恢复机制）：https://docs.temporal.io/encyclopedia/event-history
- Workflow Execution / Replay 概念：https://docs.temporal.io/workflow-execution

对 intent-flow 的启示：

- Temporal 的核心资产不是“文档 spec”，而是“可回放历史”（Event History）——这是最接近 intent-flow “Dynamic Trace 作为裁决点”的产业化先例。

## 2) 状态机 DSL：AWS Step Functions（Amazon States Language, ASL）

定位：用 JSON 定义状态机（Task/Choice/Fail 等），并提供“定义校验 API”支持把验证前置到 CI/代码审查。

可追溯入口：

- ASL 概念与语法入口：https://docs.aws.amazon.com/step-functions/latest/dg/concepts-amazon-states-language.html
- `ValidateStateMachineDefinition`（可在 CI 做语法/诊断校验）：  
  https://docs.aws.amazon.com/step-functions/latest/apireference/API_ValidateStateMachineDefinition.html

对 intent-flow 的启示：

- “定义可校验（Validate）+ 诊断可结构化输出（diagnostics）”是把流程规范产品化的关键配方之一。

## 3) BPMN：可视化流程建模 + 执行语义（以 Camunda Zeebe 为代表）

定位：用 BPMN 表达业务流程，执行引擎负责编排任务（人/系统/消息），并提供模型与运行时连接方式。

可追溯入口：

- BPMN 标准入口（OMG）：https://www.omg.org/bpmn/
- Camunda 文档：Connecting the workflow engine with your world（Zeebe 与外部系统集成视角）：  
  https://docs.camunda.io/docs/components/best-practices/development/connecting-the-workflow-engine-with-your-world/

对 intent-flow 的启示：

- BPMN/Zeebe 证明“流程模型 + 引擎执行 + 可视化运维”是稳定需求；但其“最小 IR”与“诊断事件协议”并非通用、也不面向 AI 生成优化。

## 4) Workflow-as-Code（JSON DSL）：Netflix Conductor（开源延续）

定位：用 JSON DSL 定义 workflow（blueprint），支持版本化、控制流（fork/join/decision/subworkflow），并配套 UI 监控与 API。

可追溯入口：

- Conductor 开源仓库：https://github.com/conductor-oss/conductor
- Netflix 早期技术博客（DSL/版本化等概念）：http://techblog.netflix.com/2016/12/netflix-conductor-microservices.html

对 intent-flow 的启示：

- Conductor 把“workflow 定义（JSON）”当资产，并强调版本化与可视化；这与“spec 资产化”的方向一致，但仍缺少“统一 IR + trace 解释链”这种更底层的抽象。

## 5) K8s 工作流 CRD：Argo Workflows

定位：用 YAML/CRD 定义 DAG/step workflows，执行单元是容器；常用于 ML/data/CI 场景的编排。

可追溯入口：

- 项目官网：https://argoproj.github.io/workflows/
- GitHub：https://github.com/argoproj/argo-workflows

对 intent-flow 的启示：

- “把 workflow 作为基础设施配置资产（CRD）+ GitOps/审查”是成熟路径；但它的语义偏“任务编排”，对业务交互/状态一致性解释较弱。

## 6) Executable Specifications（BDD/Living Documentation）：Cucumber 生态

定位：用 Gherkin 编写可读的行为场景（Given/When/Then），通过自动化测试让文档保持“活着”，并在协作工具里可视化。

可追溯入口：

- Cucumber for Jira 文档（living documentation + 与 Git/CI 同步）：  
  https://cucumberforjira.atlassian.net/wiki/spaces/C4JD/overview
- Cucumber for Jira 产品页（SmartBear）：https://smartbear.com/living-documentation/

对 intent-flow 的启示：

- BDD 的“可读 spec + 运行验证”是经典范式，但其验证通常停留在测试层，缺少“运行时 IR/Trace”这种更细粒度、可解释的执行链路资产。

## 7) 形式化规格：TLA+（模型检查 TLC + error trace）

定位：用形式化语言描述系统性质与不变量，通过模型检查得到可追溯的 error trace。

可追溯入口：

- TLA+ Toolbox（含 TLC、error trace 浏览）：https://lamport.azurewebsites.net/tla/toolbox.html
- 工业使用案例汇总（非详尽，但说明落地可能性）：https://lamport.azurewebsites.net/tla/industrial-use.html

对 intent-flow 的启示：

- 形式化规格提供“trace 反例”这一强解释机制；intent-flow 走的是工程化 IR/Trace 路线，但可以借鉴其“错误轨迹=可复现证据”的输出范式。

