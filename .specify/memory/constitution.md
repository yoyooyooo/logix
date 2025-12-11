<!--
Sync Impact Report
- Version change: - → 1.0.0
- Modified principles: 首次从模板占位符落地为具体原则（I–V）
- Added sections:
  - 运行时与仓库约束（Runtime & Codebase Constraints）
  - Spec-Driven 开发流程与质量门槛
- Removed sections: 无
- Templates:
  - ✅ .specify/templates/plan-template.md（Constitution Check 门槛与本宪章对齐）
  - ✅ .specify/templates/spec-template.md（已复核，无需修改）
  - ✅ .specify/templates/tasks-template.md（补充 logix-* 包测试约定说明）
  - ✅ .specify/templates/agent-file-template.md（已复核，无需修改）
  - ✅ .specify/templates/checklist-template.md（已复核，无需修改）
  - ⚠ .specify/templates/commands/*（当前仓库中不存在该目录，如后续添加需按本宪章补充说明）
- Runtime guidance:
  - ✅ README.md（与“文档分层 / 代码主线”原则一致，无需修改）
- Deferred TODOs: 无
-->

# intent-flow Constitution

## Core Principles

### I. Intent → Flow → Code → Runtime 可回放

- 每一项特性或改动 MUST 能沿着「业务需求 / Intent → Flow / Logix → 代码 → 运行行为」
  这条链路被追踪与回放，避免只存在于局部实现或一次性脚本中。
- 任何可复用能力 MUST 在 `docs/specs/intent-driven-ai-coding/v3` 与
  `docs/specs/runtime-logix` 中拥有对应的 Intent / Flow / Runtime 契约描述，
  禁止只在代码里“先跑起来”再补文档。
- 当 PoC / 脚本演进为长期使用能力时，MUST 将其升级为规范化资产：
  将规则抽象为 IntentRule / Module / Store / Flow，并在规范与用户文档中登记。

*Rationale*: 确保真实仓库中可以重建与审计「意图 → 行为 → 代码」全链路，为 AI
和人类提供统一的溯源与重放能力。

### II. LLM 一等公民

- 所有 DSL / Schema / Flow / 配置设计 MUST 以
  「LLM 易生成、易校验、易对比」为首要目标，避免过多隐式约定或人肉记忆。
- effect / Logix 相关知识冲突时，MUST 以本仓 `node_modules` 中的 d.ts
  与 TypeScript 提示为最终裁决；固有认知与本地类型不符时，必须以本地类型为准。
- 面向 Agent / 开发者的示例（含 `apps/docs` 教程与本地 Skill） SHOULD
  保证可直接编译运行；若存在前置条件或缺失依赖，必须在示例附近清晰标注。

*Rationale*: 默认维护者是「LLM + 工具链」，人类更多做审阅与少量 override，
因此需要让机器易读、易产、易验证。

### III. 引擎优先

- 当「引擎正确性 / 可回放 / 可观测性」与「Studio / Playground / Demo 体验」
  发生冲突时，前者 MUST 优先。
- 新能力优先落地在 `packages/logix-core` / `packages/logix-react`
  与 `docs/specs/runtime-logix` 中：先稳定 Module / Logic / Flow / IntentRule
  契约，再扩展 Sandbox / Studio / 可视化。
- 任何会改变 Module / Logic / Flow / IntentRule 契约的改动 MUST
  先在 `docs/specs/runtime-logix/core/*` 与 `impl/README.md` 中达成共识，再在
  运行时代码中实现，并同步更新相关示例与用户文档。

*Rationale*: Logix 作为运行时引擎是一切上层能力的基座，必须先保证正确、幂等、
可调试，再追求交互与表现。

### IV. Effect 作为统一运行时

- 默认使用 `effect` v3 作为行为与流程执行的统一运行时；其他运行时只可作为 PoC
  或迁移垫片，MUST 在代码与文档中标明实验性质。
- 所有公共 Flow API 推荐签名形态为
  `<R>() => Effect.Effect<A, E, R>`，并 MUST 遵守
  `Effect.Effect<A, E, R>` 的泛型顺序（成功值 / 业务错误 / 依赖环境），禁止写成
  `Effect.Effect<R, E, A>`。
- 业务层代码 MUST 通过 Tag 模式按需获取服务
  （`class X extends Context.Tag("X")<X, Service>() {}`），禁止在业务 Flow / Service
  层直接操作 `Context.Context` 构造“胖 Env 对象”。
- 运行入口 MUST 在通过 `Layer` / `Effect.provide*` 提供完整环境之后再调用
  `Effect.run*` 系列 API；禁止对仍带依赖的 Effect 直接运行。

*Rationale*: 通过统一的 Effect 运行时约束行为与错误语义，保证 Flow/Logic
具备一致的组合方式与可观测性。

### V. 文档先行 & SSoT

- 任何影响 Intent 模型、Flow DSL、Logix / Effect 契约的决策 MUST
  先更新 `docs/specs/intent-driven-ai-coding/v3` 与
  `docs/specs/runtime-logix` 中的规范，再在子包中实现。
- `docs/specs` 是规范层单一事实源（SSoT），`apps/docs`
  是最终产品用户文档；两者内容不一致时 MUST 先修正 `docs/specs`，再同步
  `apps/docs`。
- 每次「大模块改造」（如重构 Flow/Env、重排 React feature 目录、引入新运行时能力）
  完成后 MUST：
  - 至少运行 `pnpm typecheck` 与 `pnpm lint`，确保类型与基础质量门槛；
  - 消化变更并回写到 SSoT 文档与用户文档；
  - 如影响 `.specify` 模板或 Skill，及时更新其约束说明。

*Rationale*: 保证规范、实现与工具链共用同一事实源，避免“代码先跑偏、文档跟不上的事实漂移”。

## Runtime & Codebase Constraints

**语言与运行时栈**

- 核心代码（`packages/logix-*`） MUST 使用 TypeScript 5.x，输出 ESM，
  目标运行时为 Node.js 20+ 与现代浏览器。
- 运行时代码 MUST 依赖 `effect` v3 系列库；禁止混用旧版 `@effect-ts/*`
  或其他效果系统作为等价替代。

**logix-core 目录结构铁律**

- `packages/logix-core/src/*.ts` 顶层文件 MUST 包含实际实现代码，
  禁止仅做 re-export。
- 子模块之间的共享实现 MUST 统一放在 `src/internal/**`，由子模块引入；
  禁止从 `src/internal/**` 反向 import 任意 `src/*.ts`。
- `src/internal/**` 内部按「浅 → 深」分层：
  - 核心运行时实现下沉到 `src/internal/runtime/core/**`；
  - `src/internal/*.ts` 与 `src/internal/runtime/*.ts`
    仅通过 re-export 或薄适配依赖这些 core 文件。
- 自检约束：`rg "../" src/internal/runtime` 预期为空（core 目录内部除外），
  以确保 deep internal 不回头依赖浅层。

**Effect 使用与易错边界**

- 将 `Effect.Effect<A, E, R>` 的三个泛型稳定理解为：
  成功值 A、业务错误 E、依赖环境 R；自定义别名可以调整参数顺序，
  但底层含义 MUST 保持一致。
- Tag 本身视为 `Effect.Effect<Service, never, Id>`，在 `Effect.gen`
  中可直接 `const svc = yield* ServiceTag` 获取实现，实现通过
  `Layer.succeed(ServiceTag, impl)` 或 `Effect.provideService` 提供。
- Flow / Service 层 SHOULD 避免显式构造或传递 `Context.Context`；
  所有 Env 一律通过 Tag 模式按需取用。
- Timeout / Retry 等 API MUST 采用 v3 新形式
  （如 `effect.pipe(Effect.timeoutFail({ duration, onTimeout }))`），禁止使用旧版多参数形式。
- 与 Promise 集成时，若需要业务错误通道 MUST 使用 `Effect.tryPromise`
  并在 catch 中构造领域错误，避免将业务错误作为 defect 冒泡。

**测试与脚本约束**

- 在本仓库内执行测试时，Agent 与开发者 MUST 避免使用 watch 模式
  （如 `vitest --watch`、`pnpm test:watch`）；统一使用一次性运行的
  `pnpm test` 或各子包的 `vitest run`。
- 质量基线脚本：
  - `pnpm build`：构建运行时与 React 等子包；
  - `pnpm typecheck` / `pnpm typecheck:test`：作为类型正确性的第一道防线；
  - `pnpm lint`：包含 Effect import 规范等规则；
  - `pnpm test`：以 Vitest 一次性运行测试。
- 在合入影响核心运行时（`packages/logix-core` / `packages/logix-react`）
  的改动前，MUST 至少通过 `pnpm typecheck` 与 `pnpm lint`，并在可行时
  运行相关包的 `pnpm test`。

## Spec-Driven 开发流程与质量门槛

**资产结构与文档分层**

- 每个特性 MUST 以 `specs/[###-feature]/` 目录为单位管理：
  - `spec.md`：用户视角的需求与用户故事；
  - `plan.md`：技术方案与实现计划；
  - `research.md` / `data-model.md` / `contracts/` / `quickstart.md` /
    `tasks.md`：按阶段逐步补全。
- 文档分层 MUST 遵循 README 中的约定：
  - `docs/specs`：规范与设计文档（SSoT）；
  - `apps/docs`：最终用户文档；
  - `specs/`：特性级 Spec / Plan / Tasks。

**Constitution Check 作为必经关口**

- 每个计划文档中的「Constitution Check」段落 MUST
  在进入研究（Phase 0）之前填写并通过自检，并在完成设计（Phase 1）
  后再次复查。
- 至少需要显式回答以下问题：
  - 本特性如何映射到
    「Intent → Flow / Logix → 代码 → Runtime」链路？
  - 涉及哪些 `docs/specs/*` 规范文档？是否已按「文档先行」更新或补充草稿？
  - 是否会引入 / 修改 Effect / Logix 契约？若是，是否已在
    `docs/specs/runtime-logix` 中达成共识？
  - 质量策略：计划运行哪些脚本（typecheck / lint / test），在何处设置验收门槛？

**Plan / Spec / Tasks 协同**

- `spec.md` MUST 以用户故事 + 可度量成功标准为核心，避免直接写成实现方案。
- `plan.md` MUST
  将需求映射为架构与实现策略，并给出清晰的项目结构与依赖关系。
- `tasks.md` MUST
  将实现拆分为最小可独立交付的任务，按用户故事分组，确保每个故事可以
  被独立实现与测试。

**评审与合规检查**

- 所有影响核心运行时或平台规范的 PR MUST：
  - 链接至少一个相关的 `specs/[###-feature]/plan.md`；
  - 在描述中说明对应的 Constitution Check 结果；
  - 说明本次变更所影响的 `docs/specs` 与 `apps/docs` 文档。
- Reviewer 与 Agent 在评审时 MUST
  检查是否违反本宪章中的任一非协商性约束；若有违规但有充分理由，必须在
  plan.md 的「Complexity Tracking」中记录，并在后续迭代中主动还债。

## Governance

- 本宪章适用于 `intent-flow` 仓库内所有与
  Intent / Flow / Logix / Effect 运行时相关的代码与文档，
  尤其是：
  - `docs/specs/**`
  - `packages/logix-*`
  - `apps/docs/**`
  - `.specify/**` 与本地 Skill。
- 当其他目录（例如一次性脚本或临时 PoC）与本宪章相冲突时，MUST
  明确标注实验性质，并在其演进为长期资产之前完成对齐。

**修订流程**

- 任何对核心原则、约束或工作流的修改 MUST 通过 PR 更新本文件，并在 PR 中：
  - 说明修改动机与影响范围；
  - 链接相关的 `docs/specs` 规范或 ADR；
  - 指明预期的版本号变更（MAJOR / MINOR / PATCH）及理由。
- 修订完成后，MUST 同步审视：
  - `.specify/templates/*` 与本地 Skill 是否需要更新；
  - README 与主要用户文档是否需要调整叙事。

**版本策略**

- `CONSTITUTION_VERSION` 采用 SemVer：
  - MAJOR：删除或重定义原则、治理方式，导致既有流程不再适用；
  - MINOR：新增原则或章节，或显著扩展既有指导；
  - PATCH：表述澄清、措辞调整与非语义性修正。
- 若修改类型存在歧义，默认选择更高一级（例如在 MINOR 与 PATCH
  之间犹豫时选择 MINOR），并在 Sync Impact Report 中解释原因。

**合规复查**

- 至少在以下时刻 MUST 执行宪章合规复查：
  - 为新特性生成 `specs/[###-feature]/plan.md` 时；
  - 合并影响核心运行时或规范的 PR 之前；
  - 发布对外可见版本或关键里程碑（如内部演示、对外 PoC）之前。
- 当发现长期偏离本宪章的实现时，团队与 Agent SHOULD
  共同判断是「修宪」还是「还债」，并通过 ADR / plan.md 记录决策。

**Version**: 1.0.0 | **Ratified**: 2025-12-10 | **Last Amended**: 2025-12-10
