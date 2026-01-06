# Spec 驱动上层工具/平台版图与机会窗口调研

目标：回答“市面上是否有机遇 spec 驱动思想实现的上层工具、应用、平台？机会在哪里？与 intent-flow 的差异化怎么对齐？”

适用范围与已验证边界：

- 本调研以公开资料为主（官网文档/README/文章），关注“能力边界、落地形态、生态集成、常见缺口”，不包含系统性试用与 benchmark。
- 引用保证至少可追溯到“仓库/产品 + 关键入口文档或关键文件路径”，便于复查。

## TL;DR（最短结论）

- 市面上“spec-driven”主要分裂为三类：`workflow/spec 工件驱动`、`contract/schema 驱动`、`policy/workflow 驱动`；其中 **Contract/Schema 驱动已高度成熟**，而“SDD（spec→plan→tasks→implement）”更多是 **AI 工作流与工件组织**。
- 最大的结构性空白不是“再做一个写 spec 的工具”，而是把 spec 落到可验证的统一语义上：**统一最小 IR（Static IR + Dynamic Trace）+ 可解释的运行时合规证明**，并把“breaking change 治理”从 schema 扩展到行为/流程。

本调研的细分条目按主题拆在同目录下，便于后续引用与增量更新：

- `sdd-workflow-tools.md`：Spec Kit / Kiro / Tessl 与“spec-first/anchored/source”分层
- `contract-schema-checks.md`：OpenAPI/AsyncAPI/Schema 的 diff、gate、mock、workflow 规范（oasdiff/Optic/Microcks/Arazzo/Overlay…）
- `event-contracts-and-registries.md`：事件/消息契约与 Schema Registry（Confluent/Apicurio/AWS Glue/CloudEvents…）
- `policy-and-guardrails.md`：Policy-as-Code / Authorization spec（OPA/Conftest/Kyverno/Cedar/Zanzibar 系…）
- `idp-golden-path-and-workload-specs.md`：IDP/Golden Path 与 Workload Spec（Backstage/Score/EventCatalog…）
- `opportunity-hypotheses.md`：面向 intent-flow 的机会假设（产品形态、MVP、集成点）
- `workflow-and-executable-specs.md`：Workflow/编排 DSL 与“可执行规范”（Temporal/ASL/BPMN/BDD/TLA+…）

## 1) 市场语境里，“spec”到底指什么？

目前没有统一定义（概念扩散很快）。一种实用分法是按“驱动强度”分三档：

- `spec-first`：先写 spec，再用 AI 辅助实现（spec 是输入）。
- `spec-anchored`：spec 作为长期资产保留并随代码演进（spec 与 code 共存）。
- `spec-as-source`：人只改 spec，代码由系统生成/再生（spec 是主产物）。

参考文章：Martin Fowler `Understanding Spec-Driven-Development: Kiro, spec-kit, and Tessl`  
https://martinfowler.com/articles/exploring-gen-ai/sdd-3-tools.html

## 2) 工具版图（按“可验证/可执行程度”排序）

### 2.1 SDD/AI 工作流类：管理“spec→plan→tasks→implement”的工件链路

代表：

- `GitHub spec-kit`：模板 + CLI + “constitution” 项目原则，将 spec/plan/tasks 的阶段化流程产品化。  
  - 仓库：https://github.com/github/spec-kit  
  - 关键文档：`spec-driven.md`（定义 SDD/constitution/流程）  
    https://github.com/github/spec-kit/blob/main/spec-driven.md
- 相关解读（流程与定位）：GitHub Blog / Microsoft DevBlog（Spec Kit 介绍与使用方式）  
  - https://github.blog/ai-and-ml/generative-ai/spec-driven-development-with-ai-get-started-with-a-new-open-source-toolkit/  
  - https://developer.microsoft.com/blog/spec-driven-development-spec-kit

典型能力：

- 结构化模板、阶段化 gate、任务拆解、让 agent 在同一套工件上协作。

典型缺口（对 intent-flow 很关键）：

- 多数停留在“写得更清楚 + 生成得更有序”，缺少一个统一的“可回放执行语义/trace”锚点，难形成强约束与解释闭环。

### 2.2 API 契约优先：OpenAPI / AsyncAPI 生态（成熟且产业化）

代表能力簇：

- 设计/协作/文档：Stoplight / SwaggerHub / Postman / Redocly 等（以 OpenAPI 为中心）。
- Mock/验证：Stoplight `Prism`（OpenAPI mock server + validation proxy）。  
  - 仓库：https://github.com/stoplightio/prism
- Lint/治理：Spectral / Redocly CLI（规则集、组织级规范、CI gate）。  
  - Redocly 配置与 lint：`redocly.yaml` + `redocly lint`  
    https://redocly.com/docs/cli/guides/configure-rules
- 变更管理：Bump.sh（OpenAPI/AsyncAPI 文档 + changelog + breaking change 识别）。  
  - https://bump.sh/
- 国内一体化协作（示例）：Apifox（文档/设计/mock/测试/协作）。  
  - https://apifox.com/

结论：

- 这条赛道“spec=接口契约”已经有完整工具链与商业化产品。
- 但治理对象主要是“接口边界”，对“业务流程/状态演化/副作用约束”的表达与验证仍弱。

### 2.3 Schema Registry + Checks：把 schema 当作“产品资产”治理（强门禁）

代表：

- GraphQL：Apollo GraphOS（schema checks / contract checks 等）。  
  - Schema Checks：https://www.apollographql.com/docs/graphos/platform/schema-management/checks
- GraphQL（开源/自托管倾向）：WunderGraph Cosmo（Schema Registry / Schema Checks / Contracts）。  
  - Schema Contracts：https://cosmo-docs.wundergraph.com/concepts/schema-contracts
- Protobuf：Buf（`buf breaking`，并可对接 Buf Schema Registry）。  
  - Breaking change detection：https://buf.build/docs/breaking/

结论：

- 这类产品化得非常好：diff、breaking 判定、CI 集成、审查体验成熟。
- 缺口：主要覆盖“类型层/接口层”，对“行为与流程”的 breaking change 治理仍缺少通用做法。

### 2.4 Contract Testing：用契约驱动测试，压制 spec-implementation drift

代表：

- Pact（consumer-driven contract testing）：https://docs.pact.io/
- Dredd / Schemathesis（OpenAPI 驱动验证/生成测试）：生态较多（常用于 provider conformance / fuzzing）。
- Specmatic（contract-driven development + mock/stub + CI）：  
  - 文档（contract testing）：https://docs.specmatic.io/contract_driven_development/contract_testing.html

结论：

- 能把“契约”落到可执行门禁，但治理对象通常仍是“API/消息契约”，对内部执行链路解释能力不足。

### 2.5 Policy-as-Code / Authorization Spec：策略即规范

代表：

- OPA/Rego + Conftest：把策略作为代码，对 K8s/IaC/流水线进行 gate。  
  - Conftest：https://github.com/open-policy-agent/conftest
- Cedar（AWS Verified Permissions / Cedar schema + policy）。  
  - 迁移文档示例：https://aws.amazon.com/blogs/security/migrating-from-open-policy-agent-to-amazon-verified-permissions/
- Zanzibar 系：SpiceDB / OpenFGA / Auth0 FGA（关系型权限模型与查询）。  
  - SpiceDB：https://github.com/authzed/spicedb

结论：

- “策略规范化”赛道成熟，且易与组织治理结合（policy repo + review + CI gate）。
- 但策略评估多是点状决策（allow/deny），缺少对“过程性行为/trace”的统一表达。

### 2.6 Durable Execution / Workflow：过程天然可回放（但不负责 spec 文档→语义）

代表：

- Temporal（event history + replay + 可视化运维）：https://temporal.io/

结论：

- 在“可回放/可观测/可靠执行”上非常强；
- 但它解决的是“执行可靠性”而不是“spec 作为真相源并可验证地编译到统一 IR”。

### 2.7 Schema-driven UI / Server-driven UI：UI 结构配置化（覆盖有限）

代表：

- react-jsonschema-form（RJSF）：https://github.com/rjsf-team/react-jsonschema-form
- JSON Forms：https://jsonforms.io/

结论：

- 适合“表单/结构化 UI”，但通常不覆盖复杂交互逻辑/副作用/诊断协议的一体化闭环。

## 3) 机会窗口：把“Checks”从 Schema 扩展到行为/流程（IR + Trace）

对照成熟赛道（Buf/Apollo/Redocly/OPA/Temporal），可复用的“产品级能力形态”已经很清晰：

- `Diff`：结构化 diff + 破坏性判定 + 迁移建议
- `Gate`：CI/PR 门禁（失败即阻断合并/发布）
- `Explain`：可解释报告（为什么失败、定位到哪、怎么修）
- `Asset`：把规范当资产（版本化、审查、可追溯）

但这些能力目前主要作用于：API/schema/policy。**行为/流程层（状态演化、副作用序列、事务窗口）缺少等价物。**

对 intent-flow 的启示（差异化可以非常锐利）：

- 以 `统一最小 IR（Static IR + Dynamic Trace）` 作为“跨域唯一锚点”，把 spec 文档、API 契约、策略规范、运行时执行统一落到 IR/Trace。
- 做一个“类 Buf/Apollo 的产品形态”，但对象是 `Logix IR + Trace`（而不是仅 schema）。

建议的最小切入（可作为单独 spec 项目）：

- `Logix Checks`：对 Static IR 做 diff；对 Trace 做断言（例如稳定 instanceId/txnSeq/opSeq、事务窗口禁止 IO、诊断事件 Slim 且可序列化、业务不可写 SubscriptionRef 等），产出可解释报告。
- `Executable Spec Lab`：把 spec-first 工件链路（spec/plan/tasks）接到 Sandbox 的红/绿裁决，让“跑出来的 trace”成为事实源，避免“文档越写越多但无法裁决”。

## 4) 与仓内规划的映射（便于继续往 spec/plan 落地）

- 本仓已有 draft 视角（平台愿景与 MVP 竖切）：
  - `docs/specs/sdd-platform/workbench/00-overview.md`
  - `docs/specs/sdd-platform/workbench/11-spec-to-code-mvp.md`
  - `docs/specs/sdd-platform/workbench/10-market-landscape.md`（市场扫描汇总）

## 5) 本目录文件索引

- `docs/research/spec-driven-tools-landscape/README.md`：本页（总览与导航）
- `docs/research/spec-driven-tools-landscape/sdd-workflow-tools.md`：SDD/AI 工件链路玩家
- `docs/research/spec-driven-tools-landscape/contract-schema-checks.md`：契约/Schema/Workflow 生态（diff/gate/mock）
- `docs/research/spec-driven-tools-landscape/event-contracts-and-registries.md`：事件契约与 Schema Registry（补充）
- `docs/research/spec-driven-tools-landscape/policy-and-guardrails.md`：策略/权限/守卫（policy-as-code 等）
- `docs/research/spec-driven-tools-landscape/idp-golden-path-and-workload-specs.md`：IDP/Golden Path 与 workload spec（补充）
- `docs/research/spec-driven-tools-landscape/opportunity-hypotheses.md`：机会点与切入建议（面向 intent-flow）
- `docs/research/spec-driven-tools-landscape/workflow-and-executable-specs.md`：流程引擎与可执行规范（补充）
