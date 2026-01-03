# Logix 团队引入说明（精简版）

## 30 秒总结

Logix 是一个 **Effect 原生（Effect-Native）** 的前端业务运行时：用 **Module / Logic / Flow** 把「状态 + 异步流程 + 跨模块协作」收敛到同一套模型里，把业务组件里的 `useEffect` 压到最低，让复杂业务从组件里抽离出来，并具备更好的 **可测试性、可诊断性与可演进性**。

## 我们现在的典型问题（为什么要换）

当业务复杂度上来后，常见的“社区最佳实践拼装”会逐渐暴露结构性成本：

- **逻辑分散**：zustand 管局部状态、tanstack query 管远端缓存、router 管导航、各种 `useEffect`/service/hook 管副作用；同一条业务链路跨多处实现。
- **并发与时序脆弱**：快速切换/重复点击导致竞态；取消、重试、去重、串并行策略散落在各处，很难统一与复用。
- **链路不可解释**：字段联动、跨页状态联动、请求-状态-UI 的因果链断在组件与 hook 的缝里，复盘困难。
- **团队难以标准化**：每个人“都会写”，但写法不一致；Code Review 很难用一致的标准判定“正确/可维护”。

## Logix 的初衷（我们要的不是另一个库）

Logix 的目标不是替换某一个库，而是给团队提供一个“业务逻辑的共同底座”：

- **三位一体**：用 `Module(定义)` / `Logic(程序)` / `Live(执行)` 拆开“资产 vs 实例”，让逻辑可移植、可组合。
- **拥抱 Effect**：并发、取消、错误、依赖注入不是“隐形魔法”，而是显式能力；复杂度进入统一的、可组合的语义系统。
- **Flow 作为编排语言**：把 debounce/throttle/race/latest/exhaust 等策略变成可读、可复用的规则，而不是散落的 `useEffect` 细节。

## Logix 的优势（落在日常开发上）

- **更少的“胶水代码”**：把请求、联动、校验、导航等流程收敛到 Logic/Flow，不再靠组件里的零散 hook 拼装。
- **更强的可测试性**：Logic 本质是 Effect 程序，可以在不跑浏览器的情况下做单测/集成测试（Mock 通过 Layer 注入）。
- **更好的可维护性**：同类问题用同类写法解决（并发/取消/重试/去重/状态联动），更容易 Review 与复用。
- **更低的锁定风险**：产物仍是标准的 TypeScript/React/Effect 代码与开源运行时，不依赖黑盒平台。

## 我们的明确目标：把 `useEffect` 压到最低

- **业务逻辑不写 `useEffect`**：组件只负责渲染与 dispatch（表达“我想做什么”），不在组件里编排请求、联动与竞态策略。
- **用 Logic/Flow 承接副作用**：在 Logic 中用 `$.onAction/$.onState` + Flow 策略表达“何时做/如何并发/如何取消/如何重试”，把时序收敛到可读的规则里。
- **`useEffect` 只保留“宿主胶水”**：例如对接第三方 UI 的 imperative API、DOM/浏览器事件桥接；并要求桥接层只做事件转发，不承载业务规则。

## 与“常见三方组合”的对比（概念层）

| 关注点 | 传统组合（例） | Logix 的做法 | 结果 |
| --- | --- | --- | --- |
| 状态 | zustand / context / local state | Module 定义状态与 Action，Logic 描述规则 | 状态模型可复用、可测试 |
| 异步与并发 | `useEffect` + Promise + AbortController | Effect + Flow 策略（取消/重试/并发控制） | 竞态更少、策略可统一 |
| 远端数据 | tanstack query | 可用 Logix Query（也可继续用 tanstack 作为引擎） | 能把“业务流程”拉回同一模型 |
| 跨模块协作 | 事件总线/回调穿透/共享 store | `$.use` / Link / Process（按需） | 协作关系可见、边界更清晰 |
| 诊断与回放 | 各库各自 devtools | 运行时级 Devtools/诊断事件（规划优先级：性能 + 可解释链路） | 更接近“能讲清楚发生了什么” |
| 团队规范 | “最佳实践”靠口口相传 | 用 Module/Logic/Pattern 固化为资产与范式 | Review/迁移成本下降 |

> 备注：路由（如 react-router-dom）仍可以继续使用；Logix 的价值在于把“导航触发的业务流程”从组件回调里抽离成可测试的 Logic/Effect，而不是强行替代 UI 生态。

## 我们准备怎么落地（极简策略）

- **增量引入**：先选 1 个新 feature/场景用 Logix 跑通；旧代码保持现状，不做“一刀切大迁移”。
- **组件瘦身**：组件只负责渲染与 dispatch，业务流程进入 Logic/Process；副作用通过 Service（Tag + Layer）注入。
- **先解决最痛的两类问题**：竞态/取消/重试等异步编排；表单/搜索/联动类“因果链很长”的状态联动。

## 进一步阅读（可选）

- 运行时心智模型：`docs/philosophy/07-runtime-trinity-and-effect-native.md`
- 价值观与演进策略：`docs/philosophy/README.md`（含开发者主权、向前兼容等）
- Zustand 迁移示例（较详细）：`apps/docs/content/docs/guide/recipes/migration-from-zustand.en.md`
- Query 与 TanStack 的关系（较详细）：`apps/docs/content/docs/guide/learn/query.en.md`
- 平台/Intent 的大图景（SSoT）：`docs/specs/intent-driven-ai-coding/01-overview.md`
