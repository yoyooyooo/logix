# Implementation Plan: Logix Router Bridge（可注入 Router Contract）

**Branch**: `071-logix-router-bridge` | **Date**: 2026-01-03 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/071-logix-router-bridge/spec.md`

## Summary

本特性的交付目标（对应 `spec.md` 的 In Scope + FR/NFR/SC）：

- 在 Logix `.logic()` 内通过 **可注入的 Router Contract**：
  - 读取当前 `RouteSnapshot`（pathname/search/hash + params）；
  - 订阅 `RouteSnapshot` 变化；
  - 发起 `NavigationIntent`（push/replace/back）并可测试/可 mock。
- **可替换引擎**：业务模块/logic 只依赖 contract，切换路由库时仅替换 Router 实现注入层（`Router.layer(...)` 的参数）（SC-002）。
- **多实例隔离**：同进程多 runtime / 多 router 不串线（FR-006）。
- **可诊断**：在启用诊断时，能解释“谁发起了导航 → 意图是什么 → 最终快照如何变化”（SC-003），且诊断关闭时开销接近零（NFR-002）。
- **事务窗口禁止 IO**：导航与路由变更与外部交互必须在事务外完成（NFR-003）。

技术路线（对齐 `@logix/query`/`@logix/form` 的注入心智，但不扩展 `$`）：

- 新建领域包 `@logix/router`（workspace: `packages/logix-router`），对外推荐 `import * as Router from '@logix/router'`。
- 对外暴露稳定抽象（Router Contract）与注入入口（Layer），不绑定任一路由库：
  - `Router.Tag`（Effect `Context.Tag`）：contract 的唯一入口；
  - `Router.layer(service)`：把具体路由库绑定为 `RouterService` 并注入到 runtime scope；
  - `Router.ReactRouter.make(...)` / `Router.TanStackRouter.make(...)`：路由库集成的 builder，产出 `RouterService`；
  - `Router.Memory`（测试夹具）：纯内存 + history stack 实现，可驱动 route change 且可断言导航意图（覆盖 back）。
- 诊断策略：对“由 logic 发起的导航”事件化（低频），并能关联到导航后产生的 snapshot：
  - `@logix/router` 通过 `Router.use($)` 绑定 `$`（Bound API），在 `navigate/controller.*` 内使用 `Logix.TraitLifecycle.scopedExecute` 事件化（核心负责采集 moduleId/instanceId）。
  - 事件载荷使用可扩展的 trace 请求（Json/unknown payload；Slim & 可序列化），避免 `@logix/core` 反向依赖 `@logix/router` 类型（见 Q002）。
  - 关联策略：每次导航分配 `navSeq`；先记录 `navigate:start`（before+intent），再异步记录 `navigate:settled`（after），不阻塞业务逻辑（见 Q003）。

设计产物（已落盘）：

- [research.md](./research.md)：关键裁决与备选对比
- [data-model.md](./data-model.md)：`RouteSnapshot/NavigationIntent` 等数据模型
- `contracts/*`：对外 API/诊断/迁移说明
- [quickstart.md](./quickstart.md)：最小用法与测试夹具

## Questions Digest（plan-from-questions）

来源：外部问题清单（`$speckit plan-from-questions`）。

**Batch A（2026-01-03）**：

- Q001（txn 检测契约）：core 通过 `Logix.InternalContracts` 暴露只读的“是否在同步事务窗口内”检查，供 `@logix/router` 显式防御（避免不可实现的设计）。
- Q002（ExecuteRequest 扩展）：保留封闭 union，但新增通用 `trace` 变体（`name: string` + 载荷），避免 core 为每个领域包枚举具体 kind。
- Q003（after snapshot）：`trace:router:navigate` 拆为 start/settled 两次事件（同 `navSeq`），after 以异步方式采样与记录，避免阻塞或记录错误值。
- Q004（Query Params DX）：提供官方 SearchParams utils（不把 Query Params 塞进 `params`），减少业务侧重复解析。
- Q005（React tearing）：接受 “Logic 可能先于 UI render 观察到新路由” 的短暂撕裂；不强行与 React 周期同步。
- Q006（back 栈空）：栈空视为不可用错误（结构化失败），不 silent no-op。
- Q007（intent 反序列化）：在 `contracts/public-api.md` 明确 `NavigationIntent` 的 discriminated union tag，便于 Devtools 识别。

**Batch B（2026-01-04）**：

- Q001（perf 预算）：为 `bench:071:router-navigate` 声明 latency/retained-heap 的硬预算（并要求把首次 baseline 结果回写到 `plan.md`）。
- Q002（search 语义）：`RouteSnapshot.search` 透传 raw string，不做 querystring 归一化；若顺序变化导致字符串变化，视为一次 snapshot 变化。
- Q003（routeId/matches 边界）：允许可选扩展字段，但标记为 `unsafe`（引擎可替换性不作保证）；业务 logic 必须能在缺失时退化。
- Q004（settled 采样粒度）：`trace:router:navigate` 的 `settled` 记录“导航完成后的最终快照（含重定向）”，不以“紧接着的一次变更”作为默认口径。
- Q005（basepath 归一化）：Binding 必须保证 `RouteSnapshot.pathname` 为 router-local（剥离 `basename/basepath`），使部署路径不影响业务语义。
- Q006（Memory 夹具复杂度）：`Router.Memory` 需要最小 history stack（entries + index）以覆盖 `back()` 语义；不要求完整 browser history API（`go/forward/length`）对外暴露。
- Q007（navSeq 可见性）：`navSeq` 仅作为诊断锚点透出（诊断事件内），不注入到 `RouterService` API 返回值中。
- Q008（InternalContracts 状态）：`Logix.InternalContracts.isInSyncTransaction()` 属于本特性新增内部契约（由 core 暴露），不是既有公共能力。
- Q009（同步 throw 语义）：Binding 必须捕获底层 router 在 navigate 时的同步 throw / promise rejection，并转换为 `RouterError`（错误通道），不得作为 defect 冒泡。

已同步回写：`plan.md`、`spec.md`、`data-model.md`、`tasks.md`、`contracts/public-api.md`、`contracts/diagnostics.md`。

## Deepening Notes

- Decision: RouteSnapshot 仅提交/已解析；可选 routeId/matches 必须 Slim 且可序列化（source: spec clarify AUTO）
- Decision: `search/hash` 保留 `?/#` 前缀或为空字符串（source: spec clarify AUTO）
- Decision: `RouteSnapshot.search` 为 raw string 透传；不做 querystring 归一化（key 排序/重编码等），字符串变化视为 snapshot 变化（source: Q002）
- Decision: `params` 键缺失=不存在；值恒为 string（source: spec clarify AUTO）
- Decision: `changes` 订阅时包含 initial（先 emit current snapshot），避免 init 期间漏变更（source: spec clarify Q009）
- Decision: `changes` 必须保序，且不得丢最后一次快照（source: spec clarify AUTO）
- Decision: `navigate` 不返回“导航后的快照”；结果通过 `getSnapshot/changes` 观测（source: spec clarify AUTO）
- Decision: 未注入 Router 与 txn 窗口内导航均以结构化错误失败（source: spec clarify AUTO）
- Decision: `trace:router:navigate` 的 `settled` 记录“导航完成后的最终快照（含重定向）”；在不阻塞 `navigate` 的前提下异步采样（source: Q004）
- Decision: 归因仅覆盖 logic 经 Router Contract 发起的导航；外部 route change 不强行归因（source: spec clarify AUTO）
- Decision: `RouteSnapshot.pathname` 必须是 router-local（剥离 `basename/basepath`），避免部署路径影响业务语义（source: Q005）
- Decision: `routeId/matches` 允许作为可选扩展字段，但使用它们会削弱引擎可替换性保证（标记为 unsafe，业务需能缺失退化）（source: Q003）
- Decision: `Router.Memory` 是测试夹具：提供最小 history stack（entries + index）以覆盖 push/replace/back；不追求完整 browser history API（source: Q006）
- Decision: `navSeq` 仅用于诊断事件相关性锚点，不作为 `RouterService` API 的公共返回值（source: Q007）
- Decision: Binding 必须把底层 router 的同步 throw / rejection 转换为 `RouterError`（错误通道），不得 defect 冒泡（source: Q009）

## Technical Context

**Language/Version**: TypeScript 5.8.2（workspace） + Node.js v22.21.1（本机）  
**Primary Dependencies**: effect v3（固定 3.19.13）+ `@logix/core` / `@logix/react`（依赖注入与逻辑运行时）  
**Storage**: N/A（不引入持久化）  
**Testing**: Vitest（`vitest run`）+ `@effect/vitest`（Effect-heavy 用例）  
**Target Platform**: Node.js（单测/脚本） + 现代浏览器（React runtime 注入场景）  
**Project Type**: pnpm workspace（`packages/*` + `apps/*` + `examples/*`）  
**Performance Goals**:

- Router contract 未被消费（无 read/changes/navigate）时：不创建常驻监听/轮询/后台 fiber（NFR-001）。
- diagnostics off：不额外记录事件、不开启重载路径；对 navigate/read/changes 的额外开销应接近零（NFR-002）。
- diagnostics on：每次 `navigate` 至多写入 2 条 Slim 诊断事件（`start` + `settled`），不做大对象图投影（NFR-002）。

**Constraints**:

- 严格事务边界：任何 history/router IO 不得发生在事务窗口内（NFR-003）。
- 多实例隔离：Router 实现必须是 runtime-scope 的实例对象（FR-006 / NFR-004）。
- params 语义稳定：`Record<string, string>`，缺失表示键不存在，不做隐式类型转换（FR-007）。
- React Router 一致性：适配层以 Router Engine 的 `state + subscribe` 作为唯一真相源（不自建二级缓存），避免与 UI 的 `useLocation` 出现长期不一致（Q006）。
- React tearing：接受 “Logic 比 UI 先更新” 的短暂撕裂；不强行与 React render 周期同步（Q005）。

**Scale/Scope**: 面向真实业务仓库的基础设施能力；目标是“最小可用 + 可替换 + 可诊断”，不做路由 DSL/匹配引擎。

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- `Intent → Flow/Logix → Code → Runtime`：
  - Intent：`spec.md` 定义 “读/订阅/导航 + 可替换 + 可诊断” 的 WHAT。
  - Flow/Logix：业务 logic 通过 Router Contract（Tag + helper）表达导航意图与基于路由的联动。
  - Code：能力落在 `@logix/router`；具体引擎通过 `Router.layer(...)` 注入。
  - Runtime：只负责提供 DI scope（Layer）与诊断通道；不引入第二套路由引擎。（PASS）
- docs-first & SSoT：
  - 本特性为具体交付单：规格与方案以 `specs/071-logix-router-bridge/*` 为事实源（已具备）。
  - 若需要固化“领域包注入 + 诊断事件协议”到 runtime SSoT：在实现阶段回写到 `.codex/skills/project-guide/references/runtime-logix/logix-core/api/02-module-and-logic-api.03-module-logic.md` 的 TraitLifecycle 段落（避免领域包各写各的协议）。（PASS）
- Effect/Logix contracts：
  - 新增 `@logix/router` 的对外 contract（见 `contracts/public-api.md`）。
  - 诊断协议：通过 `Logix.TraitLifecycle.scopedExecute` 统一事件化（在 core 的 TraitLifecycle ExecuteRequest 中新增通用 `trace` 变体：`{ kind: 'trace'; name: string; data?: unknown }`，由 router 以 `name='router:navigate'` 使用；避免 core 反向依赖 router 类型）。（PASS，带实现任务）
- IR & anchors：
  - 不改变统一最小 Static IR；新增的是可序列化的“导航诊断事件”载荷（Dynamic Trace），用于解释链路。（PASS）
- Deterministic identity：
  - 不引入随机/time 作为 id；导航链路使用 per-router 实例单调递增 `navSeq`（可复现、可测试）。
  - 时间戳仅用于展示/排序，不作为关联锚点。（PASS）
- Transaction boundary：
  - `navigate` 必须在事务外执行；若调用方在 reducer/txn 内误用，应由 router wrapper 通过 `Logix.InternalContracts.isInSyncTransaction()`（新增只读内部契约）显式检测并以结构化错误失败（且不触发底层 router 调用；并给出可行动诊断提示）。（PASS，带实现任务）
- Internal contracts & DI：
  - Router 以 Tag + Layer 注入，不引入隐式全局 registry；各路由实现（ReactRouter/TanStackRouter/Memory）可 per runtime 替换与 mock。（PASS）
- Dual kernels（core + core-ng）：
  - 领域包 `@logix/router` 以 `@logix/core` 为唯一内核依赖；不直接依赖 `@logix/core-ng`。
  - core-ng 支持矩阵：Phase 1 仅保证“无硬耦合”，若 core-ng 需要等价 TraitLifecycle 扩展则后续单独开 spec。（PASS）
- Performance budget：
  - 热路径不在 txn/selector/trait converge；重点约束为“未消费时无后台 work + diagnostics off 近零成本”。（PASS）
- Diagnosability & explainability：
  - 新增 `trace:router:navigate` 诊断事件（Slim、可序列化），通过 `navSeq + phase(start/settled)` 关联 intent 与 resulting snapshot（SC-003）。 （PASS，带实现任务）
- 用户心智模型（≤5 关键词）：
  - `binding` / `layer` / `snapshot` / `intent` / `trace`（见 `quickstart.md`）。（PASS）
- Breaking changes（forward-only）：
  - 预期为新增能力，无 breaking；若 TraitLifecycle/诊断协议调整，将在 `contracts/migration.md` 记录迁移口径。（PASS）
- Public submodules：
  - 新包 `packages/logix-router/src/index.ts` 作为唯一 barrel；对外子模块使用 PascalCase 文件；实现下沉 `src/internal/**`；不在 exports 暴露 internal。（PASS）
- Quality gates：
  - `pnpm typecheck`、`pnpm lint`、`pnpm test`（或 `pnpm test:turbo`）通过；并补齐 router 的单测覆盖（SC-004）。（PASS）

**Re-check（post design）**：本 plan 已补齐设计产物与诊断口径，仍满足上述约束。（PASS）

## Perf Evidence Plan（MUST）

> 若本特性触及 Logix Runtime 核心路径 / 渲染关键路径 / 对外性能边界：此节必须填写；否则标注 `N/A`。
> 详细口径见：`.codex/skills/logix-perf-evidence/references/perf-evidence.md`

Minimal（required）

本特性虽然不改动 txn/selector/trait converge 等核心 hot path，但会：

- 改动 `@logix/core`（TraitLifecycle + InternalContracts），并新增通用 `trace` 请求；
- 为 Router `navigate` 引入可选的两阶段 trace（`navSeq + phase`）。

因此仍需提供可复现的最小性能/诊断开销证据，并将“预算/结论”固化为后续回归基线（对齐宪章：诊断默认近零成本、启用成本可预估）。

**Budget（first cut）**：

- `diagnostics=off`：不得分配 `navSeq`、不得调用 TraitLifecycle 的 trace 事件化路径（避免隐式成本）。
- `diagnostics=on`：单次 navigate 的额外开销必须是 O(1) 且线性随次数增长；首次实现需采集 baseline（time/alloc 至少一项），并以 baseline 为准设定回归阈值（默认 20%）。

**Budgets（numeric, before baseline is recorded）**：

> 说明：以下为“硬预算上限”（避免仅写 O(1) 流于形式）。首次实现完成后，仍需把实测 baseline 回写到本节，并以 baseline 为准设定回归阈值（默认 20%）。
> 预算口径以 `bench:071:router-navigate` 的 `timePerNavMs = timeMs / navCount` 与 `heapDeltaBytes`（GC 后 retained heap Δ）为准。

- `bench:071:router-navigate` 默认参数（固定用于 baseline 与后续回归）：
  - `RUNS=30`，`WARMUP_DISCARD=5`，`NAV_COUNT=10_000`，`ENGINE=memory`
- `diagnostics=off`（hard ceilings）：
  - `timePerNavMs.p95 <= 0.05ms`
  - `heapDeltaBytes.p95 <= 64KiB`
- `diagnostics=on`（hard ceilings）：
  - `timePerNavMs.p95 <= 0.10ms`
  - `heapDeltaBytes.p95 <= 256KiB`
  - 相对开销：`timePerNavMs.p95(on) / timePerNavMs.p95(off) <= 1.20`

**Measurement**（实现阶段必做，见 `tasks.md` 的 perf tasks）：

- envId：`darwin-arm64.node22.21.1`
- A/B：`diagnostics=off` vs `diagnostics=on`（并对比 router enable/disable 的额外开销）
- 探路：复用既有 `bench:016:diagnostics-overhead`，并新增 `bench:071:router-navigate`（node 侧模拟 N 次导航）
- 前提：以 `NODE_OPTIONS=--expose-gc` 运行 bench（否则 `heapDeltaBytes` 指标不可复现/不可比）
- 产物：把 baseline 数值、采样参数与结论回写到本节（作为后续 PerfDiff 的对照）
- Failure Policy：若出现明显噪声或无法复现，记录原因并把“补齐可比证据”写入后续 tasks（不要下硬结论）

## Project Structure

### Documentation (this feature)

```text
specs/071-logix-router-bridge/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── public-api.md
│   ├── diagnostics.md
│   └── migration.md
├── checklists/
└── tasks.md             # Phase 2 output ($speckit tasks)
```

### Source Code (repository root)

```text
packages/logix-router/
├── package.json
├── src/
│   ├── index.ts          # public barrel（与 Form/Query 同形）
│   ├── Router.ts         # Router.Tag + Router.layer + Router.use + helpers
│   ├── SearchParams.ts   # Query Params helpers（get/getAll）
│   ├── Model.ts          # RouteSnapshot/NavigationIntent/RouterError 类型
│   ├── ReactRouter.ts    # React Router binding（builder）
│   ├── TanStackRouter.ts # TanStack Router binding（builder）
│   ├── Memory.ts         # Memory binding（测试夹具；history stack）
│   ├── Error.ts          # 结构化错误（missing/unsupported/txn-violation）
│   └── internal/         # scoped layer 实现（subscription、navSeq 等）
└── test/
   └── Router.*.test.ts   # 读取/订阅/导航/可替换与可 mock（SC-004）

packages/logix-core/
└── src/internal/trait-lifecycle/
   ├── model.ts           # ExecuteRequest 增加可扩展 trace 请求（泛型载荷；无 router 反向依赖）
   └── index.ts           # scopedExecute 记录 trace 请求（采集 moduleId/instanceId 并写入 Debug/ReplayLog）

apps/docs/
└── content/docs/guide/learn/
   └── router.md          # （实现阶段）用户文档：注入与使用方式

examples/logix/
└── src/scenarios/
   └── router-bridge.ts   # （实现阶段）最小 PoC：Router.Memory + 两个模块联动

.codex/skills/logix-perf-evidence/
├── package.json          # 新增 bench:071:router-navigate
└── scripts/
   └── 071-logix-router-bridge.router-navigate.ts
```

**Structure Decision**:

- Router 作为独立领域包（`packages/logix-router`）对外提供 contract + 注入入口，保持 `$` 精简、避免 God Object。
- 内核仅提供“统一事件化入口”（TraitLifecycle）用于采集 moduleId/instanceId 并写入诊断事件；不在 core 内实现任何路由引擎或路由 DSL。

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

N/A（无必须违约项）
