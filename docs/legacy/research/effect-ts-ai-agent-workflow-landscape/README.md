# 基于 Effect（effect-ts）的 AI Agent / Workflow 开源生态调研

目标：回答“市面上开源是否有基于 Effect（effect-ts / `effect`）实现的 AI agent / workflow 的东西？有哪些能直接复用，哪些是可借鉴的工程样例？”

适用范围与已验证边界：

- 本文聚焦 Effect v3 生态（`effect`）与官方 `@effect/ai` 套件；结论来自公开资料（README/关键源码文件），**未做系统性 benchmark 与深度试用**。
- 每个条目至少提供“仓库 + 关键文件路径”，便于快速复查与二次验证。

## TL;DR（最短结论）

- **有**：Effect 官方已提供 AI 集成底座 `@effect/ai`（provider-agnostic 的 LLM / tool calling / streaming）以及 `ExecutionPlan`（可组合的重试/退避/回退编排）。
- **生态形态偏“底座 + 示例/垂直项目”**：相比 LangGraph/LangChain 那种一站式 agent/workflow 框架，Effect 生态更多是用 Effect 的抽象自行搭建 agent loop、工具系统与持久化；因此“可直接拿来用的通用框架”相对少，但“可复用的可靠性/可观测/依赖注入积木”很强。
- 如果你同时需要“多步工作流编排 + 多工具 agent”，目前更现实的路径是：以 `@effect/ai` + `ExecutionPlan`/`@effect/workflow` 作为引擎能力，结合业务侧自己定义“状态/记忆/回合循环/工具集”。

## 1) 官方底座：Effect AI packages & ExecutionPlan

### 1.1 `@effect/ai`（provider-agnostic AI service）

- 仓库：https://github.com/Effect-TS/effect
- 关键目录（AI 套件）：
  - `packages/ai/ai`（核心抽象）：`packages/ai/ai/README.md`
  - `packages/ai/openai`：`packages/ai/openai/README.md`
  - `packages/ai/anthropic`：`packages/ai/anthropic/README.md`
  - `packages/ai/google`：`packages/ai/google/README.md`
  - `packages/ai/amazon-bedrock`：`packages/ai/amazon-bedrock/README.md`
  - `packages/ai/openrouter`：`packages/ai/openrouter/README.md`
- 对应文档（概念/用法）：
  - https://effect.website/docs/ai/introduction/

### 1.2 `ExecutionPlan`（重试/退避/多 Provider fallback 的执行计划）

- 仓库：https://github.com/Effect-TS/effect
- 关键文件：`packages/effect/src/ExecutionPlan.ts`
- 备注：该模块在源码头部标注 `@experimental`；适合做“可靠执行编排”的底座能力（尤其是多 provider fallback、控制 attempts/schedule、与 `Effect.withExecutionPlan` / `Stream.withExecutionPlan` 组合）。
- 对应文档（LLM 交互执行计划示例）：https://effect.website/docs/ai/planning-llm-interactions/

### 1.3 `@effect/workflow`（durable workflows，长任务/可恢复流程）

- 仓库：https://github.com/Effect-TS/effect
- 关键文件：`packages/workflow/README.md`
- 备注：不是 AI 专属，但在“长流程可靠执行（暂停/恢复/补偿/幂等）”方向属于更强的 workflow 基建；可与 `@effect/ai` 组合使用。

## 2) 更像“框架/运行时”的开源项目（Effect-heavy）

### 2.1 artimath/agientic（Standard Agent Runtime）

- 仓库：https://github.com/artimath/agientic
- 定位：README 声称提供一套面向“审计/幂等/配额/策略”等强约束的 agent runtime（偏 runtime law，而非轻量工具库）。
- 关键文件：
  - `README.md`（整体设计叙事、K-12/G-9/M-7 三层）
  - `package.json`（依赖中包含 `effect`，以及大量 `@effect/*` 工具链）

## 3) 可运行/可借鉴的 workflow 样例（多步编排）

### 3.1 PaulJPhilp/effect-ai-cli（CLI 工作流 + ExecutionPlan fallback）

- 仓库：https://github.com/PaulJPhilp/effect-ai-cli
- 关键文件：
  - `README.md`（plan 命令、fallback 配置、可观测/运行管理）
  - `src/services/llm-service/service.ts`（使用 `ExecutionPlan.make(...)` + `Stream.withExecutionPlan(...)`，并用 `Layer` 组合 provider/model）
- 值得借鉴的点：
  - “provider/model 选择 + client layer + retries/fallback”全都收敛进一个 `buildLlmExecutionPlanEffect(...)`，把可靠性与策略从业务代码中抽离。

### 3.2 IMax153/effect-days-2025-keynote（多步 LLM workflow 示例）

- 仓库：https://github.com/IMax153/effect-days-2025-keynote
- 关键文件：`src/workflows/001_sequential.ts`
- 定位：多步骤串联（extract → sanitize → sort → format），展示 `@effect/ai` 的基础工作流组装方式（以及通过 Layer 提供 OpenAI client）。

### 3.3 stevepeak/docflowy（文档处理 pipeline：抽取/embedding/检索/分析）

- 仓库：https://github.com/stevepeak/docflowy
- 关键文件：`README.md`
- 定位：README 声明 `apps/api` 用 Effect-TS 构建文档处理服务；更偏业务 pipeline（RAG/文档 ingestion）而非通用 agent 框架。

## 4) Tool-calling / Chat agent & MCP 相关样例

### 4.1 IMax153/netlify-ai-gateway（DadBot：Chat + tool calling + 持久化）

- 仓库：https://github.com/IMax153/netlify-ai-gateway
- 关键文件：
  - `README.md`（项目定位与依赖）
  - `src/routes/api/chat.ts`（使用 `@effect/ai/Chat`、`@effect/ai/Prompt`、`@effect/ai-openai/*`、`@effect/experimental/Persistence`；并实现 tool calling 循环与消息流）
- 值得借鉴的点：
  - 把“toolkit + UI message stream + chat persistence”组合成可运行的 chat agent endpoint，且 Layer 注入清晰（HTTP client / NodeContext / KVS）。

### 4.2 livestorejs/livestore（CLI “coach” 工具：用 LLM 做代码评审/建议）

- 仓库：https://github.com/livestorejs/livestore
- 关键文件：`packages/@livestore/cli/src/commands/mcp-coach.ts`
- 定位：定义 `Tool.make(...)` 的 schema + handler，并用 `LanguageModel`（OpenAI）生成反馈；属于“单工具/单步”场景，但实现展示了 Effect AI 的基本接入方式。

### 4.3 ryanbas21/ping-mcp（MCP server：AiTool schema + 文档检索工具）

- 仓库：https://github.com/ryanbas21/ping-mcp
- 关键文件：
  - `README.md`（MCP server 定位）
  - `package.json`（依赖 `@effect/ai` / `@effect/platform-node` 等）
  - `src/pingDocSearchTool.ts`（使用 `AiTool.make(...)` 定义工具 schema：`ping_doc_search` / `get_ping_doc`）

### 4.4 mysticfall/eldermind（LLM-driven Skyrim mod framework）

- 仓库：https://github.com/mysticfall/eldermind
- 关键文件：`README.md`（声明使用 Effect-TS）
- 备注：偏垂直领域（游戏 mod），更适合作为“Effect + LLM 驱动应用”的参照样例。

## 5) 容易混淆/非 Effect 的条目（本次探索中出现的“误报/对照”）

### 5.1 effectz-ai/effectz-gpt（名字像 Effect，但 README 指向 LlamaIndex）

- 仓库：https://github.com/effectz-ai/effectz-gpt
- 关键文件：`README.md`
- 备注：README 写明 “developed using LlamaIndex”，并非 Effect（effect-ts）生态项目；容易在关键词检索时误入。

### 5.2 TrafficGuard/typedai（TypeScript agent 平台，但不是 Effect）

- 仓库：https://github.com/TrafficGuard/typedai
- 关键文件：`README.md`
- 备注：属于完整 agent 平台（CLI/Web UI/observability 等），但技术栈与抽象不基于 Effect；可作为“产品形态/能力对照”，而不是 Effect 落地参考。

## 6) 后续可扩展的探索清单（可选）

- 在 GitHub code search 里追加关键词（更容易定位到真实使用 `@effect/ai` 的代码而不是仅依赖）：
  - `\"@effect/ai\" \"AiTool.make\"`
  - `\"@effect/ai\" \"Chat.layer\"` / `\"Chat.Persistence\"`
  - `\"Stream.withExecutionPlan\"` / `\"Effect.withExecutionPlan\"`
  - `\"@effect/workflow\" \"Workflow.make\"`
- 进一步把条目按“可运行 demo / 可复用库 / 框架化 runtime”分层，并补充：是否包含持久化、是否支持并发/取消、是否有可观测/trace、是否有 replay/恢复机制。

