# Drafts Index

> **Note**: This index tracks the status and location of all drafts in the `docs/specs/drafts` tiered system.

## Topics (Consolidated)

### AI Native & API

- [AI Native Core](./topics/ai-native-core)
- [AI Native UI](./topics/ai-native-ui)
- [API Evolution](./topics/api-evolution)

### Platform & Patterns

- [Platform Vision](./topics/platform-vision)
- [Platform Patterns](./topics/platform-patterns)
- [Draft Pattern](./topics/draft-pattern)

### Runtime & Data

- [Query Integration](./topics/query-integration) - Logix + Query/异步数据管理集成（三层 API、Reactive Schema 等）

### React & Studio

- [React Adapter](./topics/react-adapter)
- [Spec Studio](./topics/spec-studio)

## Tiered Drafts

### L1 (Stable Candidates)
*(None)*

### L2 (Refining)
*(None)*

### L3 (Structured)

*(None)*

### L4 (Defined)
*(None)*

### L5 (Comparative)

*   [Logix Runtime Core Evolution](./L5/runtime-core-evolution.md) - 整合观测性重构、规范边界优化、Runtime 适配扩展三个维度的演进路线
*   [Logix DSL Evolution Roadmap](./L5/dsl-evolution-roadmap.md) - 整合 Sugar 可能性愿景与 Env-First API 设计的 DSL 演进方向

### L6 (Exploratory)
*(None)*

### L7 (Fragments)
*(None)*

### L8 (Transient)
*(None)*

### L9 (Raw Ideas)

*   [DSL Sugar & Concurrency Safety](./L9/dsl-sugar-and-concurrency.md) - Flow.run 默认语义与并发 API 演进
*   [Dynamic List Form Pattern](./L9/dynamic-list-form-pattern.md) - 复杂动态列表表单支撑方案
*   [Matrix Acceptance Logix Support](./L9/matrix-acceptance-logix-support.md) - 矩阵验收详情页复杂逻辑支撑
*   [Poisoned Effect Pattern](./L9/poisoned-effect-pattern.md) - 架构防御：毒药 Effect 模式
*   [Logix Unified Middleware](./L9/logix-unified-middleware.md) - 统一中间件架构（待扩充后提升）
*   [Runtime Logix Core Gaps & Production Readiness](./L9/runtime-logix-core-gaps-and-production-readiness.md) - 汇总当前 v3 Core 在接近生产可用前仍需补齐的关键缺口与优先级排序
*   [Page Level Module State Retention](./L9/page-level-module-state-retention.md) - 探讨页面级模块的状态保持与优雅实现（避免全局 Module 爆炸）
*   [Resource Field: Unified Data Plane](./L9/resource-field-unified-data-plane.md) - 尝试用 ResourceField 抽象统一 Query/Socket/AI 等“有来源字段”的数据平面
*   [Form Session & Draft Pattern Convergence](./L9/form-session-draft-pattern-convergence.md) - 将 Draft Pattern 收缩为表单领域的 Form/Wizard Session 能力的收敛草案
*   [React LiveComponent Host PoC](./L9/react-live-component-host-poc.md) - 在 examples/logix-react 中尝试 LiveComponent Host 原型以验证 AI Native UI 运行时接口
*   [Platform Patterns as Flow Templates](./L9/platform-patterns-as-flow-templates.md) - 将平台 Pattern 收紧为 BoundApi/Flow 模板与元数据，而非第二套运行时
*   [Builder & Studio Roadmap Alignment](./L9/builder-studio-roadmap-alignment.md) - 从 Generative Language Server/Spec Studio 中提炼 Builder 的近期可落地路线

## Recently Organized (2025-12-02)

### Elevated

- L9 → L3: `logix-react-feature-and-hook-design.md`
- L9 → L5: `runtime-core-evolution.md` (合并 3 篇)
- L9 → L5: `dsl-evolution-roadmap.md` (合并 2 篇)

### Topic Collection

- **query-integration** (新建): 收编 5 篇 Query 相关草稿
- **react-adapter**: 补充 ModuleImpl 设计
- **platform-vision**: 补充 JSON/Intent 方案

### Superseded/Merged

- `logix-instrumentation-overhaul.md` → superseded by L5/runtime-core-evolution.md
- `runtime-logix-spec-adjustments.md` → superseded by L5/runtime-core-evolution.md
- `module-runtime-adapter-and-customization.md` → superseded by L5/runtime-core-evolution.md
- `logix-sugar-possibilities.md` → superseded by L5/dsl-evolution-roadmap.md
- `logic-for-shape-env-first-roadmap.md` → superseded by L5/dsl-evolution-roadmap.md
- `logix-query-unified-api-design.md` → moved to topics/query-integration
- `logix-query-integration-strategies.md` → moved to topics/query-integration
- `logix-module-computed-query.md` → moved to topics/query-integration
- `logix-reactive-schema.md` → merged to topics/query-integration
- `logix-reactive-module-integration.md` → merged to topics/query-integration
- `platform-json-runtime-separation.md` → moved to topics/platform-vision
- `intent-dev-api-and-dollars.md` → moved to topics/platform-vision
