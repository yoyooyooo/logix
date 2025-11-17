# Drafts Index

> **Note**: This index tracks the status and location of all drafts in the `docs/specs/drafts` tiered system.

## Topics (Consolidated)

### Core Topics（当前优先关注）

- [SDD Platform](./topics/sdd-platform/README.md) - SDD 生命周期总入口（Specify/Plan/Tasks/Implement + Agent 分工 + Context Supply Chain + Intent→Code→Alignment Lab）
- [Spec Graph](./topics/spec-graph/README.md) - Drafts × Speckit 的统一依赖/生命周期可视化（Track/Artifact/Stage 模型）
- [Platform Workbench PRD](./topics/platform-workbench-prd/README.md) - 平台侧“需求原型/交互/系统设计”深度规划落点（对齐 sdd-platform 与 v3/platform SSoT）
- [Trait System](./topics/trait-system/README.md) - 007 Trait/StateTrait 主线收敛后的残渣归档与回归样本清单
- [Runtime Observability](./topics/runtime-observability/README.md) - 调试、追踪与可观测性能力（Tracer / TraceBus / Observability 插件）
- [Runtime v3 Core](./topics/runtime-v3-core/README.md) - Runtime 核心不变量与性能门禁（事务/锚点/Diagnostics/React ModuleCache/014 跑道）
- [Runtime Middleware & EffectOp](./topics/runtime-middleware-and-effectop/README.md) - Runtime 边界与中间件总线设计（EffectOp、Observer/Runner/Guard 与 Action/Flow/State/Service 边界）
- [DevTools & Studio](./topics/devtools-and-studio/README.md) - CLI、DevTools 与 Studio 全双工集成
- [React Adapter](./topics/react-adapter/README.md) - React 适配层规范（hooks、SSR、测试）
- [Module Definition Future](./topics/module-definition-future/README.md) - 模块定义 API（Module.make / actions / reducers / primary reducer / watcher）的未来演进草案收敛
- [Sandbox & Verifiable Intent](./topics/sandbox-runtime/README.md) - Web Worker Sandbox / Verifiable Intent Engine 主题（前端优先运行时、依赖治理、Mock、后续 Intent 覆盖/AI 反馈/多运行时漏斗）
- [Draft Pattern](./topics/draft-pattern/README.md) - Ephemeral Interaction / Draft 会话模式

### Vision / Long-Term Topics（愿景与远期规划）

- [AI Native Core](./topics/ai-native-core/README.md) - Effect AI / AI Runtime 与 v3 Intent/Runtime 的整体集成愿景
- [AI Native UI](./topics/ai-native-ui/README.md) - Grand Bidirectional Architecture（Skeleton / AISlot / Live Component / Toolchain）
- [API Evolution](./topics/api-evolution/README.md) - 下一代 Bound API / Agent.gen / `$.whenAI` 等 Killer Feature 提案
- [Logix WASM Endgame](./topics/logix-wasm-endgame/README.md) - 面向 WASM 的编译/IR/执行形态极致化路线（一次 txn 一次调用、线性内存、可编译逻辑）
- [Platform Vision](./topics/platform-vision/README.md) - 平台终局形态（Generative Language Server / JSON Definition & Runtime Separation 等）
- [Platform Patterns](./topics/platform-patterns/README.md) - 平台级生成式 Pattern 体系
- [Intent Studio UX](./topics/intent-studio-ux/README.md) - Excel Killer / 决策表 / 场景驱动定义相关 UX 草案收敛

## Tiered Drafts

### L1 (Stable Candidates)

_(None)_

### L2 (Refining)

_(None)_

### L3 (Structured)

_(None)_

### L4 (Defined)

- ~~[Logix Sandbox & Verifiable Intent Architecture](./L4/logix-sandbox-verifiable-intent-architecture.md)~~ — (superseded → [topics/sandbox-runtime](./topics/sandbox-runtime/README.md))

### L5 (Comparative)

- [Logix DSL Evolution Roadmap](./L5/dsl-evolution-roadmap.md) - 整合 Sugar 可能性愿景与 Env-First API 设计的 DSL 演进方向

### L6 (Exploratory)

- [Devtools React Render Metrics · Auto Dedup (Heuristic)](./L6/devtools-react-render-metrics-auto-dedup.md) - Devtools 侧对 `trace:react-render` 做近似去重的自动方案（不依赖 React 私有 API）

### L7 (Fragments)

_(None)_

### L8 (Transient)

- [@effect/platform HttpApi（Unstable）风险调研与落地护栏](./L8/effect-platform-httpapi-unstable-research.md) - 关于 HttpApi/HttpClient/HttpServer 的不稳定点、证据链接与落地护栏

### L9 (Raw Ideas)

_(None)_

## 最近整理（2025-12-19）

### 收敛到 Topics

- **runtime-v3-core**：收编并替代 `runtime-architecture-v3` + `runtime-performance-architecture`，只保留高 ROI 的不变量/门禁/回归清单。
- **react-adapter**：吸收 `react-integration` 的重复内容，并将关键 React runtime 接线草案提升到 Topic 内。

### 删除 / 去重

- 删除 `archive/*`（重复快照），历史版本交给 Git。
- 删除已被 Topics 收编的 tiered drafts 重复稿。

## 最近整理（2025-12-26）

- 移除 drafts 中对已删除 `effect-runtime-poc` 的引用，改指向现有样本与建议落点。
- 对齐 `$`/BoundApi 写法：修订 `topics/platform-patterns/06-universal-crud-pattern.md` 与 `topics/draft-pattern/00-design.md` 的示例（`$.state.read/mutate/update`、`Option`、`run/runFork/runLatest` 等）。
- 合并 AI Native 冗余示例：`topics/platform-vision/10-platform-deep-dive.md` 的 Round 1 统一引用 `topics/ai-native-core/00-architecture.md`。
- 校正 `topics/runtime-observability/README.md` 的文档清单，避免“缺文件”的误导。
