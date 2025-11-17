# Research: 029 国际化接入与 `$.root.resolve(Tag)` 语法糖

**Branch**: `029-i18n-root-resolve`  
**Source Spec**: `specs/029-i18n-root-resolve/spec.md`  
**Source Plan**: `specs/029-i18n-root-resolve/plan.md`

> 目标：把「strict 默认 + root 显式」与「外部 i18n 共享 + 异步就绪两档语义 + message token 可回放」落到可实现、可测试、可交接的技术决策上，并为 Phase 1 的 `data-model.md / contracts/* / quickstart.md` 提供依据。

## 0. 现状盘点（代码事实）

### 0.1 Root provider 已存在且严格 tree-scoped

- `packages/logix-core/src/internal/runtime/AppRuntime.ts`：
  - 在 Env 完全组装后，通过 `Layer.succeed(RootContextTag, { context: env })` 固定提供 rootContext（每棵 Runtime Tree 一份）。
- `packages/logix-core/src/Root.ts`：
  - `Logix.Root.resolve(Tag)` 读取 `RootContextTag` 并对 `root.context` 执行 `Context.get`；
  - 捕获缺失并 `Effect.die` 一个结构化错误（`MissingRootProviderError`，带 `tokenId/entrypoint/mode/fix` 等）。
- 回归测试已覆盖“忽略局部 override / 多 tree 隔离”：
  - `packages/logix-core/test/hierarchicalInjector.root-provider.test.ts`
  - `packages/logix-react/test/hooks/useRootResolve.test.tsx`

结论：root/global 语义已经有稳定落点与行为口径，本特性只需要在 Logic `$` 上做 DX 级语法糖，不应复制或篡改 root provider 的实现。

### 0.2 Logic 侧 `$.use(...)` 已收敛为 strict-only

- `packages/logix-core/src/internal/runtime/BoundApiRuntime.ts`：
  - `$.use(moduleOrTag)` 通过 `resolveModuleRuntime(tag)` 仅在当前 Env（scope）内解析；缺失提供者稳定失败并给出 fix；
  - fix 文案已明确指向：若你要 root 单例，应在 app root 提供并用 `Root.resolve`（避免隐式兜底）。

结论：本需求必须延续 008 的裁决：`$.use(...)` 禁止隐式回退到 root/global；root/global 必须显式选择。

### 0.3 现有“外部实例注入”的参考模式：Query.Engine.layer

- `packages/logix-query/src/Engine.ts`：
  - `Query.Engine.layer(engine)`：以 Tag + Layer 的方式把“外部引擎实例”注册进 Env；
  - Middleware 侧通过 `Effect.serviceOption(Query.Engine)` 可选读取。

结论：i18n 接入可复用同样的“外部实例由宿主注入、运行时只依赖 Tag 读取”的模式，避免引入新的 DI 体系。

### 0.4 i18n 当前无统一落点（需要 029 固化契约）

代码与文档中尚无“国际化作为领域特性”的统一接入约束：缺少：

- per tree 的 i18n 注入与隔离口径；
- 可订阅的 `I18nSnapshot`（language/ready/seq）；
- 可回放的 message token 形态与预算；
- “等待/不等待”两档翻译语义（避免业务到处 `yield* ready`）。

## 1. Decisions

### D01 — 在 Logic `$` 上提供 `$.root.resolve(Tag)` 语法糖（显式 root/global）

**Decision**：新增 `$.root.resolve(Tag)`，语义等价于 `Logix.Root.resolve(Tag)`：固定从“当前 Runtime Tree 的 root provider”解析 Tag（ServiceTag/ModuleTag）。  
**Rationale**：root/global 能力必须显式选择（避免 strict 入口被挟持），同时减少业务逻辑样板。  
**Alternative**：让 `$.use` 在缺失时自动回退 root → **拒绝**（破坏 strict 默认，制造串实例隐性 bug）。

约束：

- `$.root.resolve` 必须保持显式 root 语义，不提供“自动推断/回退”分支。
- 与 `$.use` 一致，`$.root.resolve` 只允许在 run 阶段使用（避免在 setup 期读取尚未就绪的 Env）。

### D02 — i18n 以“可注入服务契约”接入（每棵 tree 独立、可 mock）

**Decision**：在 `@logix/i18n`（新领域特性包）中新增一个 i18n 领域服务（Tag），由宿主在创建 runtime tree 时注入（Layer），并在 Module Logic 内通过 `$.root.resolve(I18nTag)` 获取。  
**Rationale**：满足“内外共享同一实例”的 DX，同时保证多 tree 隔离与可测试性（不依赖进程全局）。  
**Alternative**：直接依赖 `i18next` 的进程级默认导出 → **拒绝**（多 tree 时无法隔离，且违反“禁止全局兜底作为正确性语义”）。

### D03 — message token 为推荐形态：可回放、可延迟翻译、避免重算扩散

**Decision**：表单错误树/提示信息等建议存储为结构化 message token（而非最终字符串）。  
**Rationale**：语言切换属于展示维度的变化；用 token 把“可回放状态”与“最终文案渲染”解耦，避免语言变化时需要业务到处手写重算 watcher。  
**Alternative**：强制把最终字符串落在 state → **拒绝**（语言切换后需要全量重算，且易遗漏）。

### D04 — `I18nSnapshot` 是最小快照（不存词条），并可订阅

**Decision**：i18n 运行时状态只维护最小快照（language/ready/failed/seq），不把完整 resources 写入 state 或诊断事件。  
**Rationale**：满足性能与可诊断性约束：事件 Slim、序列化安全、无大对象图。  
**Alternative**：把资源包写入可回放状态 → **拒绝**（体积与漂移不可控）。

### D05 — 异步初始化支持“等待/不等待”两档翻译语义

**Decision**：

- 不等待：立即返回可展示的回退结果（如 key / default 文案），不阻塞流程；
- 等待：等待就绪后返回最终文案；若初始化失败则进入可预测降级（不无限等待）。

**Rationale**：避免业务逻辑中扩散 `yield* ready` 样板，同时支持少数“必须拿到最终文案再继续”的流程。  
**Alternative**：所有调用点都必须先等待 ready → **拒绝**（DX 差、样板扩散）。

### D06 — 多 tree 隔离是一等约束：用“注入的 i18n 实例”保证隔离

**Decision**：i18n 服务的实例来源必须是 runtime tree 注入的值；任何展示/逻辑路径若需要隔离语义，都必须从该服务取实例。  
**Rationale**：同进程多 tree 的成功标准要求“跨 tree 污染率 0%”。  
**Alternative**：允许隐式 process-global i18n 兜底 → **拒绝**（不可测试且不可解释）。

### D07 — 同时提供 I18n Service 与 I18nModule（同实例、同事实源）

**Decision**：Logix 侧同时提供：

- I18n Service：以 Tag/Layer 注入（供 `$.root.resolve(I18nTag)`）；
- I18nModule：以 Root 单例模块形态提供（供“语法糖/控制面”的承载）。

在同一 Runtime Tree 内，两者必须共享同一外部 i18n 实例；I18nModule 不得另起“语言/就绪事实源”，必须复用 I18n Service 的 I18nSnapshot/changes。  
**Rationale**：兼顾 DX（模块侧可拿 controller/句柄）与架构约束（单一事实源、易诊断、易隔离）。  
**Alternative**：只提供其中一种形态 → **拒绝**（无法同时满足“像以前一样用 + Module 内也能做”的双目标）。

### D08 — 语言切换请求以 I18n Service 为主入口

**Decision**：从 Logix 侧发起“请求切换语言”的能力，以 I18n Service 作为主入口；I18nModule 如提供切换能力，只能做封装/转发，不得绕过 I18n Service 的 Tree 隔离与变化信号。  
**Rationale**：语言切换是“外部实例状态变化”的入口，放在 Service 上最容易保证 per-tree 隔离与可测试；模块只做 DX 封装即可。  
**Alternative**：让 I18nModule 成为切换的唯一入口 → **拒绝**（容易形成并行语义与装配隐式依赖）。

### D09 — `tReady` 默认等待上限 5 秒（支持覆盖）

**Decision**：`tReady(...)` 默认等待上限为 5 秒，支持调用方覆盖；到达上限、失败或未就绪时稳定回退（优先 `defaultValue`，否则 key），不无限等待。  
**Rationale**：避免业务流程在异常环境下卡死，同时保持“多数调用点无样板”的 DX。  
**Alternative**：默认无限等待 / 强制每次显式传 timeout → **拒绝**（前者风险大，后者 DX 差）。

### D10 — 新增 `@logix/i18n` 领域特性包（core 保持最小内核）

**Decision**：新增 `@logix/i18n` 子包承载 i18n 领域特性（I18n Service / I18nModule / message token / driver 最小形状等）；`@logix/core` 只保留通用运行时能力（如 `$.root.resolve` 与解析语义），不引入对特定 i18n 引擎/资源加载的强耦合。  
**Rationale**：与 form/query 一致：领域特性独立演进，core 保持稳定最小面；同时方便未来替换引擎与平台化接入。  
**Alternative**：把 i18n 全部塞进 core → **拒绝**（core 膨胀、强耦合风险高）。

### D11 — driver-first：以最小形状（I18nDriver）作为 IoC/DI 注入面

**Decision**：`@logix/i18n` 只约定最小形状（I18nDriver），宿主可直接注入 i18next 风格实例作为 driver；`@logix/i18n` 不依赖 i18next。  
**Rationale**：保持 DX（用户可直接把现有 i18n 实例交给 Logix），同时保持隔离/可测试与避免引擎强绑定。  
**Alternative**：在 `@logix/i18n` 内内置 i18next 适配/依赖 → **拒绝**（耦合与安装负担上升）。

### D12 — 不新增 `@logix/i18n-react`（React 继续使用既有 i18n 订阅）

**Decision**：不新增 `@logix/i18n-react` 这类 React 专用适配包；React 侧继续使用 i18next-react 等既有 Provider/订阅机制驱动 re-render；Logix 侧只保证同一实例注入与 per-tree 隔离，并提供文档示例说明组合方式。  
**Rationale**：避免重复封装成熟订阅体系，减少维护面；与“UI is Dumb”一致：UI 只负责订阅与渲染。  
**Alternative**：另起一套 Logix 专用 i18n provider/hooks → **拒绝**（重复造轮子且容易产生并行事实源）。

## 2. 需要落档为契约的要点（contracts 覆盖范围）

- `$.root.resolve(Tag)` 与 `Root.resolve(Tag)` 的一致性（root 固定、忽略 override、缺失报错字段）。
- i18n 服务注入、快照订阅、ready 两档语义与失败降级。
- message token 的结构、预算与序列化约束（Slim & stable）。
- “strict vs root” 心智模型：imports 仍然重要；全局注入不应改变 strict 的可验证边界。
