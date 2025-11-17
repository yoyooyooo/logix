<!--
Sync Impact Report
- Version change: 2.5.0 → 2.6.0
- Modified principles:
  - Core Principles:
    - I（性能与可诊断性优先）：明确“向前兼容（forward-only evolution）”口径：冲突时以新规划/规范为准，删除/重写旧实现；以迁移说明替代兼容层与弃用期。
    - VII（文档先行 & SSoT）：修正过时路径引用 `docs/specs/intent-driven-ai-coding/v3` → `docs/specs/intent-driven-ai-coding`。
  - Runtime & Codebase Constraints:
    - 兼容性与迁移策略：补充“向前兼容（forward-only evolution）”为首要演进策略，并显式写入冲突处理规则。
- Added sections: 无
- Removed sections: 无
- Templates:
  - ✅ .specify/templates/plan-template.md
  - ✅ .codex/skills/speckit/assets/templates/plan-template.md
  - ✅ .specify/templates/spec-template.md
  - ✅ .codex/skills/speckit/assets/templates/spec-template.md
  - ✅ .specify/templates/checklist-template.md
  - ✅ .codex/skills/speckit/assets/templates/checklist-template.md
  - ✅ .specify/templates/tasks-template.md
  - ✅ .codex/skills/speckit/assets/templates/tasks-template.md
- Other sync:
  - ✅ AGENTS.md
  - ✅ docs/specs/drafts/topics/platform-vision/README.md
  - ✅ docs/specs/drafts/topics/sdd-platform/README.md
- Deferred TODOs: 无
-->

# intent-flow Constitution

## Core Principles

### I. 性能与可诊断性优先（勇敢向前兼容，拒绝向后兼容）

- Logix Runtime 的核心路径（调度、Flow 执行、State 更新、订阅传播、Devtools 事件采集）
  MUST 以性能为第一约束：在设计阶段明确热点与复杂度，在实现阶段以可复现的测量验证
  （基准、profile 或等价证据）。
- 任何影响核心路径复杂度或分配行为的改动 MUST 提供性能证据（至少包含时间、分配、
  内存三类指标中的一类），并记录在对应 `specs/<###-feature>/plan.md` 或 PR 描述中；
  若存在回退，MUST 先修复或在 plan.md 的「Complexity Tracking」中给出可还债的理由。
- 可诊断性 MUST 与性能同等优先：运行时与 Devtools MUST 能回答
  “发生了什么 / 为何发生 / 由谁触发 / 影响了什么”，并以结构化事件支持聚合与回放。
- 诊断能力 MUST 设计为“默认零成本或接近零成本”：禁用时不得引入显著额外分配或
  O(n) 扫描；启用时成本 MUST 可预估，并在 plan.md 中声明“启用诊断的性能代价”。
- 本仓库采用“向前兼容”（forward-only evolution）策略，不提供向后兼容承诺：当更优设计出现，
  或新的规划/规范与既有实现冲突时，旧接口/旧行为 MUST 直接删除或重写；如产生 breaking change，
  MUST 同步更新 `docs/specs`、`apps/docs` 与示例，并在 plan.md / PR 中提供迁移说明
  （禁止保留兼容层或 deprecation 期）。

_Rationale_: Logix 作为“逻辑编排领域的 React”，性能与可诊断性都是产品能力本身，
必须被同等对待与量化约束。

### II. Logix-as-React：声明式、可推导、自动优化、可解释

- 公共 API / DSL MUST 偏向声明式：表达 What（意图、约束、依赖、行为）而非 How；
  如需 imperative escape hatch，MUST 收敛为少数受控边界，并在 `docs/specs` 中解释。
- 运行时与 DSL MUST 可推导：依赖关系、执行顺序、资源/服务依赖 MUST 在类型或数据结构上
  可被推断或显式表达，避免把关键语义隐藏在闭包捕获或隐式全局状态里。
- 所有高层抽象（Rule/Logic/Trait/Task/领域包） MUST 100% 降解到统一最小 IR，
  且 IR MUST 明确区分：
  - Static IR（可编译、可合并、可冲突检测）；
  - Dynamic Trace（运行期时间线，完全用稳定 id 串起因果链）。
- 为了让运行时可以自动优化，核心数据结构 MUST 结构稳定、可比较、可复用
  （例如 stable id、结构化 IR/AST、可序列化的诊断事件）；任何“不可推导”的魔法
  MUST 被视为性能与诊断风险并显式登记。
- 可解释性作为一等能力：每个 Flow/Logic 的执行与状态变更 MUST 能映射回声明式输入
  （Intent/Rule/DSL）与触发源，支持 Devtools 展示与回放。

_Rationale_: 只有在“声明式 + 可推导”的前提下，运行时才可能进行系统级优化与解释。

### III. Intent → Flow → Code → Runtime 可回放

- 每一项特性或改动 MUST 能沿着「业务需求 / Intent → Flow / Logix → 代码 → 运行行为」
  这条链路被追踪与回放，避免只存在于局部实现或一次性脚本中。
- 任何可复用能力 MUST 在 `docs/specs/intent-driven-ai-coding/*` 与
  `.codex/skills/project-guide/references/runtime-logix` 中拥有对应的 Intent / Flow / Runtime 契约描述，
  禁止只在代码里“先跑起来”再补文档。
- 当 PoC / 脚本演进为长期使用能力时，MUST 将其升级为规范化资产：
  将规则抽象为 IntentRule / Module / Store / Flow，并在规范与用户文档中登记。

_Rationale_: 确保真实仓库中可以重建与审计「意图 → 行为 → 代码」全链路，为 AI
和人类提供统一的溯源与重放能力。

### IV. LLM 一等公民

- 所有 DSL / Schema / Flow / 配置设计 MUST 以
  「LLM 易生成、易校验、易对比」为首要目标，避免过多隐式约定或人肉记忆。
- effect / Logix 相关知识冲突时，MUST 以本仓 `node_modules` 中的 d.ts
  与 TypeScript 提示为最终裁决；固有认知与本地类型不符时，必须以本地类型为准。
- 面向 Agent / 开发者的示例（含 `apps/docs` 教程与本地 Skill） SHOULD
  保证可直接编译运行；若存在前置条件或缺失依赖，必须在示例附近清晰标注。

_Rationale_: 默认维护者是「LLM + 工具链」，人类更多做审阅与少量 override，
因此需要让机器易读、易产、易验证。

### V. 引擎优先

- 当「引擎正确性 / 性能 / 可回放 / 可诊断性」与「Studio / Playground / Demo 体验」
  发生冲突时，前者 MUST 优先。
- 新能力优先落地在 `packages/logix-core` / `packages/logix-react`
  与 `.codex/skills/project-guide/references/runtime-logix` 中：先稳定 Module / Logic / Flow / IntentRule
  契约，再扩展 Sandbox / Studio / 可视化。
- 任何会改变 Module / Logic / Flow / IntentRule 契约的改动 MUST
  先在 `.codex/skills/project-guide/references/runtime-logix/logix-core/*` 与 `impl/README.md` 中达成共识，再在
  运行时代码中实现，并同步更新相关示例与用户文档。

_Rationale_: Logix 作为运行时引擎是一切上层能力的基座，必须先保证正确、幂等、
高性能、可调试，再追求交互与表现。

### VI. Effect 作为统一运行时

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

_Rationale_: 通过统一的 Effect 运行时约束行为与错误语义，保证 Flow/Logic
具备一致的组合方式与可观测性。

### VII. 文档先行 & SSoT

- 任何影响 Intent 模型、Flow DSL、Logix / Effect 契约的决策 MUST
  先更新 `docs/specs/intent-driven-ai-coding` 与
  `.codex/skills/project-guide/references/runtime-logix` 中的规范，再在子包中实现。
- `docs/specs` 是规范层单一事实源（SSoT），`apps/docs`
  是最终产品用户文档；两者内容不一致时 MUST 先修正 `docs/specs`，再同步
  `apps/docs`。
- 每次「大模块改造」（如重构 Flow/Env、重排 React feature 目录、引入新运行时能力）
  完成后 MUST：
  - 至少运行 `pnpm typecheck` 与 `pnpm lint`，确保类型与基础质量门槛；
  - 消化变更并回写到 SSoT 文档与用户文档；
  - 如影响 `.specify` 模板或 Skill，及时更新其约束说明。

_Rationale_: 保证规范、实现与工具链共用同一事实源，避免“代码先跑偏、文档跟不上的事实漂移”。

## Runtime & Codebase Constraints

**语言与运行时栈**

- 核心代码（`packages/logix-*`） MUST 使用 TypeScript 5.x，输出 ESM，
  目标运行时为 Node.js 20+ 与现代浏览器。
- 运行时代码 MUST 依赖 `effect` v3 系列库；禁止混用旧版 `@effect-ts/*`
  或其他效果系统作为等价替代。

**统一最小 IR（Static IR + Dynamic Trace）**

- Runtime / Devtools / Sandbox / 平台侧 MUST 以统一最小 IR 作为唯一事实源；
  禁止并行维护多套“都能代表真相”的模型（例如规则 IR 与 Trait Graph 并列且无法合并）。
- Platform-Grade 子集 MUST 唯一且可 AST Pattern 匹配；当子集、锚点或 DSL 发生变更时，
  MUST 同步更新 parser/codegen、`docs/specs` 与 `apps/docs`，禁止出现“文档/脚本解析的写法”
  与“真实运行时代码写法”漂移共存。
- Gray/Black Box 允许存在，但 MUST 能降级为最小可诊断信息（含 loc/owner/粗粒度 source/sink
  摘要），不得形成“完全看不见”的黑洞。

**稳定标识（Runtime Identity Model）**

- Runtime 实例 MUST 使用可注入的稳定 `instanceId`（来自 React key、Sandbox runId 或宿主实例键），
  禁止默认用 `Math.random()` 生成实例标识；时间戳仅允许作为 `startedAt` 等元信息。
- `txnId/opId/linkId` 等运行期标识 MUST 在同一 instance 内可确定重建（建议单调序号），
  禁止默认用 `Math.random()/Date.now()` 作为 id 源；需要随机性的场景必须显式注入并可替换。
- 诊断事件 MUST 同时携带 `moduleId + instanceId + txnId`（或可推导等价集合），以支持回放对齐、
  性能回归与跨进程桥接。

**事务边界与写入纪律（禁止逃逸）**

- 事务窗口 MUST 是纯同步边界：事务内禁止 IO/await/异步边界；任何 IO MUST 通过 Task 模式拆分为
  多事务（pending → IO → writeback），或在事务外执行后再写回为独立事务。
- `update/mutate`（以及 reducer、同步 watcher 等进入事务闭包的路径） MUST 是纯同步写入；
  禁止返回 `Effect`、禁止在内部 `fork` 长任务或引入不可控副作用。
- 所有写入 MUST 进入事务队列并产出 dirty-set（与可选的 patch）；禁止业务侧绕过事务通过
  `SubscriptionRef` 等可写 Ref 直接修改 state。

**性能预算与回归防线**

- 任何改动若触及核心路径（调度、Flow 执行、State 更新、订阅传播），MUST 明确：
  - 热点在哪里、复杂度是否变化、内存/分配是否变化；
  - 如何验证：基准、profile、或可复现的测量脚本与数据。
- 当仓库尚未为该路径建立基准测试时，MUST 先把“可复现的测量方式 + 基线数据”
  写入 `specs/<###-feature>/plan.md`，并在后续迭代中补齐基准测试或回归防线。
- 性能优化不得以牺牲可诊断性为代价；若需要在性能与诊断之间做权衡，MUST
  在 plan.md 中明确“诊断能力的可用性与启用成本”，并给出折衷方案。
- Patch/Dirty-set MUST 是一等公民：
  - 禁止以 `path="*"` 表达“未知写入”作为常态；若确实未知，必须显式标记为 `dirtyAll=true`
    或等价结构，并在诊断中给出原因；
  - dirty-set 生成 MUST 是 O(写入量)，不得在生产热路径默认通过“深 diff / 全量扫描 state”
    推导 dirtyPaths；
  - 需要“重活”的计算（拓扑排序、依赖索引、path normalize） SHOULD 下沉到 build 阶段，
    runtime 每笔事务尽量接近 O(改动量 + 受影响 steps)；
  - 必须提供负优化降级阀门（dirtyRoots 过粗/过多时直接全量收敛），并输出可解释诊断。

**对外性能心智模型与优化梯子（可预测、可行动）**

- 当特性触及核心路径或对外性能边界时，MUST 同步更新对外文档与基线报告，形成稳定心智模型：
  - 关键词（≤5）；
  - 粗粒度成本模型；
  - 优化梯子（默认 → 观测 → 缩小写入 → 稳定 rowId → 模块/Provider 覆盖与调参 → 拆分/重构）。
- 术语与证据字段 MUST 统一且稳定：`apps/docs`、`specs/*`、基准报告（例如 `specs/014-*`）
  与诊断事件字段不得同义词漂移；若口径发生 breaking change，MUST 提供迁移说明与对比口径更新。
- 自动策略 MUST “保守可解释”：超过预算或证据不足时必须回退到保守路径（例如 `full`），并输出最小
  可序列化证据（回退原因/阈值/配置来源范围）以支撑定位与回放。

**可诊断性与解释链路**

- 运行时 MUST 提供结构化的诊断事件，并满足：
  - 可关联：事件之间可用 stable id 串起因果链（触发源、Flow、状态变更、effect）；
  - 可裁剪：不同级别（开发/生产）可选择性启用；
  - 可回放：关键路径事件可用于重建与解释运行行为。
- Devtools / Debug 能力的协议与语义 MUST 以 `.codex/skills/project-guide/references/runtime-logix/logix-core/observability/09-debugging.md`
  为单一事实源；如协议调整，必须同步更新该文档与 `apps/docs` 相关章节。
- 诊断事件载荷 MUST Slim & 可序列化：禁止把 `Effect` 本体、闭包或大型对象图塞进事件并进入
  DevtoolsHub/Sandbox 的 ring buffer；需要携带的仅为结构化元信息与可引用的 id。
- Devtools / Sandbox 的事件存储 MUST 有容量上限（ring buffer）与裁剪策略；禁止无界数组累积。

**兼容性与迁移策略**

- 本仓库采用“向前兼容”（forward-only evolution）策略，拒绝向后兼容：对外 API / 行为 / 诊断事件协议的
  破坏性变更是常态手段；当新规划/规范与既有实现冲突时，MUST 以新规划/规范为准推进并删除/重写旧实现。
- 对 breaking change，MUST：
  - 直接删除旧接口/旧行为（禁止长期保留 deprecated 入口与兼容层）；
  - 同步更新 `docs/specs`、`apps/docs`、`examples/*`；
  - 在 `specs/<###-feature>/plan.md` 或 PR 中提供“迁移说明”（可包含替代写法与
    需要批量替换的模式），以迁移文档替代兼容期。

**作用域与多实例语义（Strict by Default）**

- core MUST 删除“进程级全局 runtime registry fallback”等隐式解析路径；跨模块解析必须基于显式
  Context/imports-scope。若需要全局单例语义，必须通过 `mode:"global"` 或等价显式配置开启。
- 当 strict 与 global 语义同时存在时，默认 MUST 为 strict；任何静默回退到 global 的行为视为
  诊断缺陷与确定性破坏。

**内部契约与依赖注入（Effect‑Native, 可 Mock, 可隔离）**

- 仓库内的“内部协作协议”（例如 lifecycle/txn/traits/dispatch 的内部 hooks） MUST
  被建模为明确的内部契约（Runtime Services），并通过 Effect Env（Tag/Layer）注入与装配；
  禁止新增散落的 `runtime.__*` magic 字段、duck-typing 或跨文件长参数列表作为长期依赖方式。
- 迁移期允许存在 legacy `__*` 字段，但 MUST：
  - 仅作为薄 shim，内部转调显式契约实现；
  - 具备统一访问入口（例如 `getRuntimeInternals(runtime)` 或等价），避免仓库内多处自行猜测字段；
  - 新增代码 MUST 只依赖显式契约，不得依赖 shim；
  - 迁移说明 MUST 写入对应特性的 `specs/<###-feature>/plan.md`（以迁移文档替代兼容层）。
- 内部契约 MUST 支持局部覆写与 Mock：至少支持按模块实例 Scope 注入替代实现，
  用于测试、性能基线与平台对齐实验；覆写不得泄漏到其他实例。
- 若存在进程/页面级单例（例如 devtools hub），它 MUST 是可选 consumer，
  不得成为运行正确性或证据导出的必要依赖；平台/基线试运行不得依赖全局单例才能完成导出。

**双内核演进（core + core-ng）与契约边界（AOT-ready, not AOT-required）**

- `@logix/core` MUST 是上层生态（`@logix/react` / Devtools / Sandbox / 平台侧）的唯一硬依赖；
  除 `packages/logix-core-ng/**` 与少量测试/试跑/基准工具外，仓库内代码 MUST 不直接依赖
  `@logix/core-ng`（避免生态分叉与重复迁移成本）。
- 所有需要“内核级替换/并行演进”的能力 MUST 通过显式内部契约表达（Runtime Services / Kernel Contract），
  并由 `@logix/core` 导出契约类型与证据形态；禁止通过 `src/internal/**` 直连 import 或 magic 字段绕过契约。
- 任何触及内核/核心路径的新特性，`specs/<###-feature>/plan.md` MUST 显式声明
  “kernel support matrix”（core / core-ng：`supported` | `trial-only` | `not-yet`）与对应 gate
  （契约一致性验证 + `$logix-perf-evidence` 的 Node+Browser before/after/diff）。
  禁止“默认假设 core-ng 也能跑但没有证据/门槛”的隐式漂移。
- 为了支持未来的构建阶段优化，内核关键工件 MUST 保持可数据化：Static IR / Exec IR 需可序列化、可对比、带稳定锚点；
  运行时 MUST 能在构造期生成等价工件（JIT-style）；构建阶段仅允许作为可选生产方式（AOT-style），不得成为默认语义或运行的前置依赖。
- 若引入构建阶段优化（插件/AOT），MUST 另立 feature spec 并在 plan/tasks 中明确：触发条件、回退策略（无工件时回到 JIT）、
  Node+Browser 证据门禁与对外心智模型（≤5 关键词）；禁止把工具链长期税隐式扩散到所有特性。

**受控试运行与证据导出（RunSession）**

- 平台侧若需要“跑一次拿 IR/证据”，运行时 MUST 能在 Node/浏览器环境以 RunSession 为边界：
  - 使用 Effect Layer 注入 Mock/覆写；
  - 导出 EvidencePackage（Dynamic Trace）与可用的 Static IR 摘要；
  - 结果 MUST Slim、可序列化、可裁剪、可对比；
  - 并行 RunSession MUST 无串扰（事件序列、绑定证据、IR 摘要隔离）。
- 证据与 IR MUST 复用统一协议与最小 IR 原则，禁止另起一套“平台专用真相源”。

**Sandbox / Alignment Lab（Executable Spec）**

- Sandbox MUST 作为 Alignment Lab 的基础设施，而不是“代码 runner + 日志窗口”：
  - 协议 MUST IR-first：输出 Static IR + Dynamic Trace（txn/op/diagnostic/replay/react-trace），Host 只做渲染与裁剪；
  - `RUN.actions` MUST 可消费（可脚本化回放），`TERMINATE` MUST 可取消运行中的 fiber/effect；
  - `UI_CALLBACK` MUST 全双工回注入用户程序，支持语义 UI Mock；
  - Worker/Host MUST 使用 ring buffer + 批处理通知，避免观测导致负优化；
  - Alignment Lab 底座 MUST 避免远程运行时依赖导致版本漂移（禁止在 worker 内另行加载第二份 `effect` 实例）。

**Devtools UI 与依赖约束**

- Devtools 包（例如 `packages/logix-devtools-react`） MAY 在内部使用
  Tailwind CSS、shadcn/ui、Radix UI、Recharts 等 UI 依赖；这些依赖视为
  Devtools 专用栈，不得反向要求业务项目采用相同 UI 技术栈。
- 业务项目在接入 Devtools 能力时 SHOULD 通过「@source 编译本包」
  的方式使用源码（TS/JS）而非预构建 UMD/Bundled 产物，以便沿用自身的
  构建配置（如 PostCSS/Tailwind/主题系统）并获得更好的 Tree-Shaking。
- 为避免 Tailwind 成为业务项目的隐性全局依赖，Devtools 包 MUST
  将 Tailwind 使用限制在自身作用域内（例如通过独立入口、样式前缀或局部样式），
  不得要求业务应用在全局注入 Devtools 专用的 Tailwind 基础设施。
- 如对 Devtools UI 栈进行重大调整（迁移 UI 库、拆分样式运行时等），MUST
  在对应特性的 `specs/<###-feature>/plan.md` / `spec.md` 中显式记录，并在
  `apps/docs` 的 Devtools 章节中同步更新使用说明。

**Devtools 组件复杂度与状态管理约束**

- `packages/logix-devtools-react` 中的 React 组件（UI 层） SHOULD 视为“纯渲染组件”：
  - 业务状态与副作用 MUST 由 Logix Module/Runtime 管理，通过 props 与 action 回调
    与 UI 组件交互；
  - 组件内部 SHOULD 仅使用最小化的 React hooks（如 `useId` / `useMemo` /
    `useCallback` / 为布局测量所需的少量 `useEffect`），SHOULD NOT 在 UI 层直接
    通过 `useState` / `useReducer` 维护跨组件共享的业务状态。
- Devtools UI 组件文件（`.tsx`）的复杂度约束：
  - 当单文件总行数超过 ~300 行时，视为预警：作者或 Agent SHOULD 评估是否需要将
    业务逻辑下沉到 Logix 层或拆分为子组件；
  - 当单文件总行数超过 ~500 行时 MUST 进行拆解，不得继续在同一文件中累积逻辑与
    渲染结构；
  - 建议在 CI 中通过脚本或 lint 规则对 `packages/logix-devtools-react/src/ui/**`
    做文件行数检查，将 >300 行标记为 warning、>500 行标记为 error。
- 该约束优先适用于 Devtools UI 与后续可能新增的 `@logix-devtools/*` 系列包；
  对业务示例与 apps/docs UI 层同样推荐遵守，但不作为强制门槛。

**packages 子包对外子模块铁律**

- 所有 `packages/*` 子包 MUST 统一对外子模块形态：
  - `src/index.ts` 作为对外入口的 barrel；除 `index.ts` 与 `global.d.ts`
    外，顶层 `src/*.ts` MUST 是对外子模块入口文件。
  - 对外子模块文件名 MUST 使用 PascalCase（首字母大写），并与对外暴露的核心概念同名；
    若概念簇需要分层，可使用 `Foo.Bar.ts`（同前缀）表达从属关系。
  - 任何不希望成为对外子模块的实现（私有 helper、适配层、目录式实现如 `hooks/`、
    `components/`、`ui/`、`worker/` 等） MUST 下沉到 `src/internal/**`；
    对外只能通过对外子模块文件与 `src/index.ts` 组织导出。
  - `package.json#exports` MUST 显式声明允许的对外子模块入口，并显式屏蔽
    `./internal/*`（或等价机制），避免内部实现被外部 import。

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

- 每个特性 MUST 以 `specs/<###-feature>/` 目录为单位管理：
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
    `.codex/skills/project-guide/references/runtime-logix` 中达成共识？
  - IR 与锚点：是否新增/调整统一最小 IR 或 Platform-Grade 子集？是否存在 specs/scripts/examples 漂移点？
  - 稳定标识：instanceId/txnId/opId 是否可确定重建？是否引入随机/时间作为默认 identity？
  - 事务边界：是否引入事务窗口 IO、或写入逃逸（可写 SubscriptionRef/Ref）？是否有硬约束与诊断兜底？
  - 内部契约与试运行：是否引入/修改内部 hooks 或隐式协作协议？是否封装为可注入 Runtime Services，
    支持按实例/会话 Mock 与覆写，并能在需要时导出证据/IR 且不依赖全局单例？
  - 性能预算：本特性涉及的核心路径是什么？有哪些可量化指标与基线数据？
  - 诊断与解释：需要新增/调整哪些诊断事件或 Devtools 能力？启用诊断的性能代价是什么？
  - 对外心智模型：如涉及性能边界/自动策略/证据字段，关键词/成本模型/优化梯子是否同步更新并与基线报告对齐？
  - 破坏性变更：是否存在 breaking change（API/行为/事件协议）？迁移说明写在何处？
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
  - 链接至少一个相关的 `specs/<###-feature>/plan.md`；
  - 在描述中说明对应的 Constitution Check 结果；
  - 声明是否包含 breaking change，并链接迁移说明（或说明为何无需迁移说明）；
  - 说明本次变更所影响的 `docs/specs` 与 `apps/docs` 文档。
- Reviewer 与 Agent 在评审时 MUST
  检查是否违反本宪章中的任一非协商性约束；若有违规但有充分理由，必须在
  plan.md 的「Complexity Tracking」中记录，并在后续迭代中主动还债。

## Governance

- 本宪章适用于 `intent-flow` 仓库内所有与
  Intent / Flow / Logix / Effect 运行时相关的代码与文档，
  尤其是：
  - `docs/specs/**`
  - `packages/*`
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
  - 为新特性生成 `specs/<###-feature>/plan.md` 时；
  - 合并影响核心运行时或规范的 PR 之前；
  - 发布对外可见版本或关键里程碑（如内部演示、对外 PoC）之前。
- 当发现长期偏离本宪章的实现时，团队与 Agent SHOULD
  共同判断是「修宪」还是「还债」，并通过 ADR / plan.md 记录决策。

**Version**: 2.6.0 | **Ratified**: 2025-12-10 | **Last Amended**: 2025-12-31
