# Drafts Index

> **Note**: This index tracks the status and location of all drafts in the `docs/specs/drafts` tiered system.

## Topics (Consolidated)

### Core Topics（当前优先关注）

- [SDD Platform](./topics/sdd-platform) - SDD 生命周期总入口（Specify/Plan/Tasks/Implement + Agent 分工 + Context Supply Chain + Intent→Code→Alignment Lab）
- [State Graph & Field Capabilities](./topics/state-graph-and-capabilities) - 统一的字段能力模型（Computed/Source/Link）与 State Graph 视角，对齐 Capability Plugin 与 runtime-logix/core
- [Reactive & Linkage](./topics/reactive-and-linkage) - 响应式范式、计算属性与复杂联动（字段/列表/资源字段）
- [Query Integration](./topics/query-integration) - Logix + Query/异步数据管理集成（三层 API、Reactive Schema 等）
- [Capability Plugin System](./topics/capability-plugin-system) - CapabilityPlugin 蓝图与能力插件体系（Config as Service + SCD + 分形 Runtime）
- [Runtime Observability](./topics/runtime-observability) - 调试、追踪与可观测性能力（Tracer / TraceBus / Observability 插件）
- [Runtime Readiness](./topics/runtime-readiness) - Runtime 生产就绪、性能与架构演进
- [Runtime Middleware & EffectOp](./topics/runtime-middleware-and-effectop) - Runtime 边界与中间件总线设计（EffectOp、Observer/Runner/Guard 与 Action/Flow/State/Service 边界）
- [DevTools & Studio](./topics/devtools-and-studio) - CLI、DevTools 与 Studio 全双工集成
- [React Adapter](./topics/react-adapter) - React 适配层规范（hooks、SSR、测试）
- [Sandbox & Verifiable Intent](./topics/sandbox-runtime) - Web Worker Sandbox / Verifiable Intent Engine 主题（前端优先运行时、依赖治理、Mock、后续 Intent 覆盖/AI 反馈/多运行时漏斗）
- [Draft Pattern](./topics/draft-pattern) - Ephemeral Interaction / Draft 会话模式
- [Module Lifecycle & Session](./topics/module-lifecycle-and-session) - 模块生命周期、统一资源缓存与 Session 模式

### Vision / Long-Term Topics（愿景与远期规划）

- [AI Native Core](./topics/ai-native-core) - Effect AI / AI Runtime 与 v3 Intent/Runtime 的整体集成愿景
- [AI Native UI](./topics/ai-native-ui) - Grand Bidirectional Architecture（Skeleton / AISlot / Live Component / Toolchain）
- [API Evolution](./topics/api-evolution) - 下一代 Bound API / Agent.gen / `$.whenAI` 等 Killer Feature 提案
- [Platform Vision](./topics/platform-vision) - 平台终局形态（Generative Language Server / JSON Definition & Runtime Separation 等）
- [Platform Patterns](./topics/platform-patterns) - 平台级生成式 Pattern 体系与 SCD 对齐

## Tiered Drafts

### L1 (Stable Candidates)

_(None)_

### L2 (Refining)

_(None)_

### L3 (Structured)

_(None)_

### L4 (Defined)

- ~~[Logix Sandbox & Verifiable Intent Architecture](./L4/logix-sandbox-verifiable-intent-architecture.md)~~ — (superseded → [topics/sandbox-runtime](./topics/sandbox-runtime))

### L5 (Comparative)

- [Logix Runtime Core Evolution](./L5/runtime-core-evolution.md) - 整合观测性重构、规范边界优化、Runtime 适配扩展三个维度的演进路线
- [Logix DSL Evolution Roadmap](./L5/dsl-evolution-roadmap.md) - 整合 Sugar 可能性愿景与 Env-First API 设计的 DSL 演进方向
- [Runtime Logic Phase Guard & Diagnostics](./L5/runtime-logic-phase-guard-and-diagnostics.md) - 收敛 Logic 两阶段 bootstrap + Phase Guard + 诊断链路的 v3 终极形态，约束 runSync / React 集成下的错误本地化行为

### L6 (Exploratory)

_(None)_

### L7 (Fragments)

_(None)_

### L8 (Transient)

- [Matrix Acceptance Logix Support](./L8/matrix-acceptance-case-study.md) - 矩阵验收详情页复杂逻辑支撑案例

### L9 (Raw Ideas)

- [Beyond State & Action](./L9/beyond-state-and-action.md) - The Unified Schema Vision (元编程发散：Module Schema 的全维度演进)
- [Forward-Only AI Coding](./L9/forward-only-ai-coding.md) - The "Intent-to-Code" Skill Pack (极致正向思考：Pattern-Rich, Schema-Less)
- [Progressive Escape Hatch](./L9/progressive-escape-hatch.md) - The Compression-Decompression Model (渐进式逃生舱：AI 作为意图编解码器)
- [From Requirement to Schema](./L9/from-requirement-to-schema.md) - The "Intent Pipeline" (意图流水线：从 L0 需求到 L9 Schema 的结晶过程)
- [Logix React Components Without useEffect/useRef](./L9/logix-react-no-useeffect-useref-gaps.md) - 盘点在「组件不写 useEffect/useRef」目标下，当前 Logix/React 能力的覆盖面与潜在缺口
- [State-First Logix Module Codegen](./L9/logix-state-first-module-codegen.md) - State-Only Module 设计 + TanStack Router 风格 Codegen/Vite 插件方案

## Recently Organized (2025-12-04)

### New Topics

- **devtools-and-studio**: Consolidated CLI, DevTools, and Studio integration drafts.
- **runtime-readiness**: Consolidated Runtime readiness, performance, and architecture drafts.

### Moved/Promoted

- L9 → L8: `matrix-acceptance-logix-support.md`
- L9 → topics/platform-patterns: `platform-patterns-as-flow-templates.md`
- L9 → topics/draft-pattern: `form-session-draft-pattern-convergence.md`
- L9 → topics/ai-native-ui: `react-live-component-host-poc.md`

### Deleted (Superseded)

- `logix-instrumentation-overhaul.md`
- `logix-sugar-possibilities.md`
- `logic-for-shape-env-first-roadmap.md`
- `module-runtime-adapter-and-customization.md`
- `runtime-logix-spec-adjustments.md`
- `topics/spec-studio/*` — 已被收束到 `topics/sdd-platform/03-spec-studio-l0.md` 及相关子章节
- `topics/module-traits-sdd-roadmap/*` — 已被收束到 `topics/sdd-platform/01-module-traits-integration.md` 与 `04-module-traits-sdd-roadmap.md`
