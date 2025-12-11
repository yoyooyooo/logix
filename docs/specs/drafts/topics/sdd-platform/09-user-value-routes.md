---
title: 09 · 平台用户价值路线图
status: draft
version: 2025-12-12
value: core
priority: next
related:
  - ./00-overview.md
  - ./03-spec-studio-l0.md
  - ./04-module-traits-sdd-roadmap.md
  - ./05-intent-pipeline.md
  - ./06-dev-server-and-digital-twin.md
  - ./07-intent-compiler-and-json-definition.md
  - ./08-alignment-lab-and-sandbox.md
---

# 平台用户价值路线图（User Value Routes）

> 视角：站在平台“最终用户”（PM / 架构师 / 开发者 / QA）的角度，自上而下按**业务价值**而不是按实现分层，梳理几条可独立感知的高价值路线。  
> 目标：为后续产品规划与实现排期提供“从体验出发”的骨架，具体技术细节仍以本主题其他文档为准。

## 1. 从业务需求到「跑得起来的页面」

- **目标用户**：PM / 业务负责人 + 对应前端开发  
- **核心承诺**：从“把需求写清楚”到“看到能点得动的页面”，主要由平台/AI 完成，开发者只补关键逻辑。  
- **主链路**：
  - 在 Spec Studio 中录入/迭代 FeatureSpec + ScenarioSpec（`03-spec-studio-l0.md`）；  
  - Intent Pipeline 将需求结晶为 Domain/Module Schema 与初步 Intent（`05-intent-pipeline.md`）；  
  - 平台生成一组 Logix Module + 页面骨架（UI Intent + Module Intent），并通过 Dev Server 注入到本地项目；  
  - 使用 Sandbox/Alignment Lab 跑通关键 Scenario，得到红/绿反馈（`08-alignment-lab-and-sandbox.md`）。  
- **关键依赖**：稳定的 Intent Pipeline 模型、Module 图纸/Traits 形态、最小可用的 Sandbox 场景。

## 2. 从「一坨老代码」到「可观测 Universe」

- **目标用户**：Tech Lead / 架构师 / 维护团队  
- **核心承诺**：无需重写业务代码，只要接上平台，就能获得系统级“X 光片”：模块拓扑、数据流、逻辑流、运行时时间线。  
- **主链路**：
  - 本地启动 `logix dev`，Dev Server 扫描现有仓库并构建 Module/IntentRule 索引（`06-dev-server-and-digital-twin.md`）；  
  - 基于 Logix/Traits/IntentRule 解析，构建 Universe/Galaxy 视图与字段级数据流视图（部分依赖 `01-module-traits-integration.md` 与 `04-module-traits-sdd-roadmap.md`）；  
  - 连接运行中的 Runtime，将 Debug/EffectOp 事件与 Graph/IntentRule 绑定，形成“动态 Universe”视图（`02-full-duplex-architecture.md` + Devtools 主题）。  
- **关键依赖**：Parsable 的 Fluent DSL/Traits、Runtime Debug 事件契约、Dev Server 与 Studio 的协议。

## 3. 从「字段能力设计」到「跨模块数据治理」

- **目标用户**：领域架构师 / 数据架构师  
- **核心承诺**：把字段能力（computed/source/link）当作一等资产，获得一张可以做治理和演进规划的“领域数据地图”。  
- **主链路**：
  - 使用 Module Traits 定义模块内部的字段能力（001 spec + `01-module-traits-integration.md`）；  
  - 通过 StateTraitGraph 构建模块内/跨模块的数据依赖视图（`04-module-traits-sdd-roadmap.md`）；  
  - 在 Studio 中按资源/实体/字段维度查询、过滤和 Diff，识别高耦合区域与关键领域数据路径；  
  - 将治理决定（例如拆分模块、调整资源归属）反推到 Module 图纸与 Intent/Spec。  
- **关键依赖**：StateTraitProgram/Graph/Plan 导出、跨模块数据流可视化、与 Spec/Domain Intent 的映射。

## 4. 从「失败用例」到「自愈代码」

- **目标用户**：QA / 开发者 / 平台 AI Agent  
- **核心承诺**：每一个失败用例都能被平台结构化记录、自动定位到 Intent/逻辑/字段规则，并驱动 AI 或开发者完成自愈。  
- **主链路**：
  - 在 Spec 层定义/维护 ScenarioSpec（`03-spec-studio-l0.md`）；  
  - Alignment Lab 调用 Sandbox 运行场景，并产生 RunResult + AlignmentReport（`08-alignment-lab-and-sandbox.md` + `04-module-traits-sdd-roadmap.md`）；  
  - 将 Scenario、Graph、EffectOp Timeline、TraitDelta 等打包成 Context Pack，供 Coder Agent 生成补丁或给开发者建议；  
  - 补丁经 Review/Sign-off 后，自动更新 Intent/Blueprint/Code（闭环回到 SDD 的 TASKS & IMPLEMENT）。  
- **关键依赖**：AlignmentReport 模型、Trait/IntentRule 锚点、Dev Server 提供的双向编辑能力。

## 5. 从拖拽/配置到「意图编译器」

- **目标用户**：低代码用户 / 解决方案工程师 / 平台集成团队  
- **核心承诺**：普通用户主要在 JSON/画布层工作（拖拽、配置、复用 Pattern），平台负责把这些 Intent/Definition 编译为高质量的 Effect/Logix 代码，并保持与运行时行为、Spec 的一致。  
- **主链路**：
  - Studio 提供 JSON Definition / Visual Logic / Pattern 配置界面（Graph + 表单），对应 Intent/Module/Traits 的 JSON 表示；  
  - Intent Compiler 将 JSON Definition 注水为 TypeScript + Effect Program（`07-intent-compiler-and-json-definition.md`），并通过 Dev Server 写入仓库；  
  - Alignment Lab 与 Universe 视图持续校验“JSON 定义 ↔ 代码 ↔ Runtime”三者的一致性，防止 Drift。  
- **关键依赖**：稳定的 JSON Definition Schema、Compiler/模板体系、与 Dev Server/Runtime 的协作协议。

---

> 后续演进建议：  
> - 产品规划/路线图可以直接以这 5 条路线为“纵轴”，横向再对齐技术主题（traits / sandbox / dev-server / intent-compiler 等），明确每一版要把哪条路线走通到什么程度；  
> - 在 `sdd-platform/00-overview.md` 中添加简短引用，让新读者可以从“愿景 → 用户价值路线 → 技术子篇”顺畅导航。 

