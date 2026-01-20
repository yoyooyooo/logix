# Implementation Plan: Workflow Codegen IR（出码层：Canonical AST + Static IR）

**Branch**: `075-workflow-codegen-ir` | **Date**: 2026-01-05 | **Spec**: `specs/075-workflow-codegen-ir/spec.md`  
**Input**: Feature specification from `specs/075-workflow-codegen-ir/spec.md`

**Note**: This template is copied into `specs/[###-feature-name]/plan.md` by
`.specify/scripts/bash/setup-plan.sh` (invoked by the feature workflow).

## Summary

交付一个“可导出、可编译、可诊断”的 Workflow 能力：

- 业务用声明式 DSL 描述“触发源（action/lifecycle）→ 步骤（dispatch/call/delay）→ 并发策略”；
- 编译为运行期 watcher（复用现有 FlowRuntime/EffectOp），且严格遵守 txn-window 禁 IO；
- 以 073 的 tick 作为观测参考系：时间算子必须可归因到 tickSeq（禁止影子 setTimeout/Promise 链）；
- 导出 JSON 可序列化 Static IR（版本号 + digest），供 Devtools/Alignment Lab 可视化与 diff。

## Optimization Ladder（对齐 NFR-005：可操作的“默认→观察→收敛→调参/拆分”阶梯）

本特性必须交付一份“可执行的优化阶梯”，用于把性能/诊断问题从“拍脑袋调参”变成可复现、可门禁的推进路径：

- **默认（baseline）**：`diagnostics=off` + `tape=off`，保证近零成本与确定性输出。
- **观察（observe）**：打开 `diagnostics=light/sampled`，只输出 Slim meta（programId/runId/tickSeq/serviceId/cancel reason），用于定位“是谁触发/为何慢/为何取消”。
- **收敛触发源与 selector（converge）**：把触发源/路由从“散落 watcher”收敛到 `Module.withWorkflows` 的单订阅 + `O(1+k)` action 路由；必要时拆分触发源（按 actionTag/phase）。
- **调参/拆分 Program（tune/split）**：按证据（perf report + trace）调整并发策略与步骤粒度；将热点拆成更小 program/fragment 并保持 stepKey 稳定锚点。

验收：该阶梯必须在 `tasks.md` 里有明确交付物（文档 + 示例/最小用例），并可通过 perf evidence 与 trace 输出“按阶梯推进”的证据闭环。

## Design Decisions（对齐本次 API 结论）

为避免实现阶段“口径漂移”，本特性明确采纳以下裁决：

- **分层**：`WorkflowDef`（权威输入，纯 JSON）≠ `WorkflowStaticIr`（单一真相源）。可序列化/可 diff 的对象是 Static IR，而不是 authoring 输入。
- **SSoT 分化 + DX 一体化（Effect-native）**：
  - SSoT：唯一权威输入收敛为 `WorkflowDef`（纯 JSON、可落盘、可校验、版本化），是平台/LLM/Studio 的事实源；
  - DX：对外提供“值对象”`Workflow`，其 `toJSON()` 导出 `WorkflowDef`，并提供 `validate/exportStaticIr/install` 等冷路径方法；
  - 任何 TS DSL/Recipe 都只能生成 `WorkflowDef`，不得直接携带运行时语义（闭包）或形成第二语义源。
- **出码层定位**：Workflow 定位为 AI/平台专属的出码层（IR DSL），而非以“人类手写舒适”为第一目标；业务侧“少胶水”主要来自 Recipe/Studio/AI 生成或更高层 Pattern。
- **Canonical AST（唯一规范形）**：引入 Canonical AST 作为语义规范形：无语法糖、默认值落地、分支显式、`stepKey` 完整；Static IR 是 Canonical AST 的可导出投影（version+digest+nodes/edges）。
- **组合发生在 build-time**：提供 fragment/compose/withPolicy 等组合器来生成 Spec/IR；运行时仍由 Effect 承载执行。**不**把 `Effect.pipe/map/flatMap` 作为结构 DSL 的 authoring API（避免任意闭包导致不可 IR 化/不可序列化）。
- **无用户闭包进入运行期**：Program 内禁止“运行时求值”的 user closure（包括 `call(builder)` 形态）。复杂映射/条件下沉到 service/pattern。
- **Service 身份单一真相源**：`call`（原 `serviceCall`）走 Tag-only API；Static IR/Trace/Tape 中只存 `serviceId: string`，并按 `specs/078-module-service-manifest/contracts/service-id.md` 的算法从 Tag 派生（必须单点 helper，禁止各处自写）。
- **分支是图，不是约定**：`onSuccess/onFailure` 允许作为 authoring sugar，但编译后必须显式落到 IR 的节点/边（包含 success/failure 边），用于解释链路与 diff。
- **时间语义进 IR**：`timeout/retry/delay` 等时间算子必须进入 tick 参考系；其中 `timeout/retry` 不得只作为运行时黑盒参数，必须体现在可导出的 Static IR 中。
- **入口收敛**：推荐入口为 `Module.withWorkflows(programs)`（平台/AI 出码）与 `Module.withWorkflow(program)`（人类/小规模）；`program.install(Module.tag)` 仅作为高级装配接口保留。

### Hard Decisions（v1 硬裁决）

与 `spec.md#Hard Decisions` 保持一致，本计划实现时以以下硬裁决为门槛（fail-fast）：

- `call` v1 不提供结果数据流：只表达控制流（success/failure）与策略；基于结果的 payload/分支下沉到 service 或拆分多个 Program。
- 输入映射 DSL v1：仅 `payload/payload.path/const/object/merge`；不读 state/traits；无条件/循环/算术。
- Canonical AST 强制 `stepKey` 必填：缺失即 validate/export 失败；禁止顺序派生。
- 分支必须显式结构：禁止邻接推断作为真相源。
- `nodeId` 主锚点用稳定 hash；可读性通过 `source(stepKey/fragmentId)` 提供。
- diagnostics 分级：off 近零成本；light/sampled/full 才附带锚点 meta；事件流不携带 IR 全量。
- `recipe/ast/ir` 版本严格 fail-fast；迁移靠工具/文档，不做运行时兼容层。

## Performance Guardrails（硬门：默认不显著回退）

> 原则：**默认路径（diagnostics=off + tape=off）必须接近“没有 Workflow”时的成本**；任何额外成本必须可解释、可关、可量化，并在 perf evidence 中可对比。

### P0: 默认开关与成本分层

- 默认：`diagnostics=off`、`tape=off`（Workflow 不能隐式常开采样/记录）。
- `diagnostics=light/sampled/full` 才允许输出 Program 级锚点；且只输出 Slim meta（禁止把 Static IR 全量塞进事件流）。
- tape 仅在 record/replay/fork 模式开启；live 默认不记录（避免常态序列化/存储开销）。

### P1: 触发路由复杂度（热路径硬约束）

- Action trigger 必须满足：`O(1 + k)`（`k`=命中该 `actionTag` 的 program 数），禁止每次 action 扫描全量 programs。
- 每个 `ModuleRuntime(instanceId)` 的 Workflow watcher **最多 1 条**长期 Fiber（单订阅 `actions$`，内部按 `actionTag` 路由）。
  - 目标：避免 “program 数量增长 → watcher 订阅数增长 → PubSub 广播/Stream.filter 成本线性增长”。
- 与 `specs/068-watcher-pure-wins/` 的 Action fan-out / topic-index 方向对齐：Workflow 的 action 路由应复用同一套 topic/index 基建，避免并行实现。

### P2: 编译期预计算（把冷路径留在 install/export）

必须在 `program.validate()/install/export` 期完成并缓存（运行期只读）：

- Canonical AST 校验（`stepKey` 唯一性、分支显式、InputExpr 合法性）
- `programId/nodeId/digest`（稳定输入 → 稳定输出；禁止运行时 hash/JSON.stringify）
- `InputExprV1` 的解析/预编译（JSON Pointer 预解析成 segments/bytecode，禁止运行时解析字符串）
- service 解析（`serviceId` → 可调用入口）与缺失 fail-fast（避免运行期才发现）

### P3: 运行期分配与对象体积（off 模式硬约束）

- `diagnostics=off` 时：
  - 禁止为每次触发构造大 meta 对象/大数组/IR 片段；
  - 禁止为 InputExpr 做深拷贝/递归构造大对象（优先按需构造最小 payload；必要时走 service/pattern）。
- `light/sampled/full` 时允许少量对象分配，但必须 Slim 且可序列化（字段白名单，超出即 downgrade）。

### P4: 时间算子与取消（热路径 + 可回放）

- 禁止影子 `setTimeout/Promise` 链：delay/timeout/retry 必须走可注入的宿主能力（例如 `HostScheduler.scheduleTimeout` / Effect Clock）。
- timer schedule/cancel/fired 的 bookkeeping 必须是 `O(1)`；latest 替换必须可中断旧 timer。
- 解释链必须能把 timer 事件锚定到 `programId/runId`，并最终落到某次 `tickSeq`（由后续 dispatch 或 KernelPort call 触发的提交承载）。

### P5: call（IO 边界与背压）

- IO 必须发生在事务窗口外；不得阻塞 txnQueue consumer（参照 `ModuleRuntime.dispatch` 的 publish 注释：publish 必须在 txn 外且避免 deadlock）。
- 可诊断性必须通过既有边界复用（`EffectOp(kind='flow'|'service')`），并以 diagnostics 分级门控成本。

## Runtime Architecture（实现把控：从 Canonical AST 到热路径）

### 1) 编译流水线（build/install/export）

目标：把“可序列化的 Canonical AST”转成两份产物：

- **Static IR**：给 Devtools/Alignment Lab 做可视化/diff（纯 JSON，version+digest+nodes/edges）。
- **Compiled Plan（internal）**：给运行期高效执行（非序列化；允许缓存索引/预解析 InputExpr/预解析 service 入口）。

建议的阶段拆分（同一份输入，单向拓扑）：

1. `normalize`：Recipe/authoring spec → Canonical AST（补默认、去 sugar、补齐分支数组）
2. `validate`：fail-fast（重复 stepKey/非法 InputExpr/未知 version）
3. `compileStaticIr`：计算 `programId/nodeId/digest/nodes/edges/source`
4. `compileRuntimePlan`：把 steps 编译为紧凑执行结构（数组 + 预编译 InputExpr + 预解析 service）

补充（DX 一体化落点）：

- `WorkflowDef` 是 normalize 的唯一入口形态：TS DSL/Recipe/Studio 必须先产出 def，再进入 `normalize/validate/...`。
- `Workflow.toJSON()` 输出 def；`Workflow.fromJSON(def)`（或等价静态方法）恢复值对象形态并提供冷路径方法。

### 2) 运行时挂载形态（避免 watcher 膨胀）

目标：无论安装多少个 programs，都只产生一条 actions$ 订阅 Fiber：

- `WorkflowRuntime.mountAll(programs[]) -> Logic`：一次性挂载并内部做 `actionTag -> workflows[]` 索引
- `program.install(moduleTag)` 仍保留，但实现上应委托给 `mountAll`（把单个 program 装配到同一个 registry，而不是每个 program 单独起 watcher）
- 对外推荐入口：`Module.withWorkflows(programs)`（平台/AI 出码）与 `Module.withWorkflow(program)`（人类/小规模），最终都应落到同一条 actions$ 订阅与同一套路由机制

> 这一条是性能门槛：否则平台/AI 出码“很多 program”会线性放大 PubSub 广播与 Stream.filter 成本。

### 3) Action 路由与并发（热路径）

每次收到 action：

1. 仅做一次 `actionTag` 提取（尽量复用 runtime 内的 tag 解析逻辑/约定 `_tag`）
2. `Map.get(actionTag)` 找到命中 programs（`k` 条）
3. 对每条 program 依据 policy 执行：
   - latest：中断旧 run（不等待完全结束），新 run 立即启动；写回由 runId 或序号守护
   - exhaust：忙则丢弃（不产生 pending/writeback）
   - parallel：并发启动（受全局 concurrency limit 约束）

#### 建议的数据结构（v1，面向性能）

> 目标：让“程序数量 N 增长”主要体现在 **命中集合 k** 上，而不是每次触发都付出 N 的成本。

```ts
type CompiledProgramV1 = {
  readonly programId: string
  readonly localId: string
  readonly policy: { readonly concurrency: 'latest' | 'exhaust' | 'parallel'; readonly priority: 'urgent' | 'nonUrgent' }
  readonly trigger: { readonly kind: 'action'; readonly actionTag: string } | { readonly kind: 'lifecycle'; readonly phase: 'onStart' | 'onInit' }
  readonly steps: ReadonlyArray<unknown> // internal compiled steps (arrays + precompiled InputExpr)
}

type ProgramRuntimeStateV1 =
  | { readonly mode: 'latest'; runSeq: number; current?: Fiber.RuntimeFiber<void, any> }
  | { readonly mode: 'exhaust'; busy: boolean }
  | { readonly mode: 'parallel' } // concurrency 限制来自 runtime（避免每 program 自己再造一套 limiter）

type WorkflowRegistryV1 = {
  readonly byActionTag: ReadonlyMap<string, ReadonlyArray<{ readonly program: CompiledProgramV1; readonly state: ProgramRuntimeStateV1 }>>
  readonly onStart: ReadonlyArray<{ readonly program: CompiledProgramV1; readonly state: ProgramRuntimeStateV1 }>
  readonly onInit: ReadonlyArray<{ readonly program: CompiledProgramV1; readonly state: ProgramRuntimeStateV1 }>
}
```

#### 热路径复杂度（必须可解释）

- action 路由：`Map.get` + 遍历命中 programs（`O(1+k)`）
- latest/exhaust 的状态更新与取消：`O(1)`（禁止扫描/查找）
- `InputExpr`：禁止热路径解析 JSON Pointer；必须预编译成 segments/bytecode

### 4) Step 解释器（最小节点集 v1）

v1 的解释器只需要处理：

- `dispatch`：构造 `{ _tag: actionTag, payload }` 并调用 `runtime.dispatch`（写侧默认路径）
- `call`：通过 `serviceId` 解析入口并执行（事务窗口外），结果只走 success/failure 控制流（不暴露结果数据流）
- `delay`：通过可注入 time service 做 sleep，并确保取消可中断（latest 替换时必须能 cancel）
- KernelPorts（例如 source refresh）：以 `callById('logix/kernel/<port>')` 作为 Platform-Grade/LLM 出码规范形表达（TS sugar：`call(KernelPorts.<Port>)`；KernelPort 只是普通 service port；必须具备稳定 `serviceId`；自动触发主线由 076 负责）

#### call 解析（避免热路径字符串查表）

- install/compile 期：把 `serviceId` 解析为可调用入口并缓存到 compiled step（缺失直接 fail-fast）
- run 期：直接调用缓存入口，禁止每次 call 再做 `Map.get(serviceId)` / 字符串拼装

#### InputExpr 执行（以“最小分配”为目标）

- `payload` / `payload.path`：只做选择，不做深拷贝；JSON Pointer 预解析成 segments
- `object` / `merge`：仅在确需构造 payload 时分配对象；若 payload 本身可直接透传，避免额外包一层
  - 复杂映射/合并优先下沉到 service/pattern（Program 保持结构化边界）

### 5) Diagnostics / Tape 的实现策略（门控 + Slim）

- diagnostics=off：不产出 Program 级 trace；只在错误路径输出结构化错误（code/programId/source.stepKey/detail）
- diagnostics=light/sampled：在 `flow/service` 边界附带最小锚点（programId/runId/tickSeq/serviceId）
- diagnostics=full：补充 timer/cancel 摘要（仍不携带 IR 全量）
- tape：record/replay/fork 时才记录边界事件；记录体积超阈值时优先 digest + 外挂存储（record 中锚点必须完整）

## Technical Context

**Language/Version**: TypeScript 5.9.x（ESM）  
**Primary Dependencies**: `effect` v3，`@logixjs/core`（FlowRuntime/EffectOp），依赖 073 的 tick/contracts  
**Storage**: N/A  
**Testing**: Vitest（涉及 tick/时间语义的测试优先 `@effect/vitest`）  
**Target Platform**: Node.js + browsers  
**Project Type**: pnpm workspace（`packages/*`）  
**Performance Goals**: timer 触发 + watcher 运行的 tick overhead 不得显著回归（需 perf evidence）  
**Constraints**: 统一最小 IR（Static IR + Dynamic Trace）；标识去随机化；事务窗口禁 IO；no shadow time  
**Scale/Scope**: 面向“典型业务工作流”（提交/跳转/刷新/重试），不追求全量 BPMN

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- Answer the following BEFORE starting research, and re-check after Phase 1:
  - How does this feature map to the
    `Intent → Flow/Logix → Code → Runtime` chain?
  - Which `docs/specs/*` specs does it depend on or modify, and are they
    updated first (docs-first & SSoT)?
  - Does it introduce or change any Effect/Logix contracts? If yes, which
    `docs/ssot/runtime/*` docs capture the new contract?
  - IR & anchors: does it change the unified minimal IR or the Platform-Grade
    subset/anchors; are parser/codegen + docs updated together (no drift)?
  - Deterministic identity: are instance/txn/op IDs stable and reproducible
    (no random/time defaults); is the identity model documented?
  - Transaction boundary: is any IO/async work occurring inside a transaction
    window; are write-escape hatches (writable refs) prevented and diagnosed?
  - React consistency (no tearing): if this touches React integration or external
    reactive sources, is there a single snapshot anchor (e.g. `tickSeq`) for
    `useSyncExternalStore` consumers, with no dual truth source and no data-glue
    `useEffect` syncing state?
  - External sources (signal dirty): are subscriptions pull-based (signal dirty +
    deduped scheduling) rather than payload/queue based (no thundering herd)?
  - Internal contracts & trial runs: does this feature introduce/modify internal
    hooks or implicit collaboration protocols; are they encapsulated as explicit
    injectable Runtime Services (no magic fields / parameter explosion), mockable
    per instance/session, and able to export evidence/IR without relying on
    process-global singletons?
  - Dual kernels (core + core-ng): if this feature touches kernel/hot paths or
    Kernel Contract / Runtime Services, does the plan define a kernel support
    matrix (core vs core-ng), avoid direct @logixjs/core-ng dependencies in
    consumers, and specify how contract verification + perf evidence gate changes?
  - Performance budget: which hot paths are touched, what metrics/baselines
    exist, and how will regressions be prevented?
  - Diagnosability & explainability: what diagnostic events/Devtools surfaces
    are added or changed, and what is the cost when diagnostics are enabled?
  - User-facing performance mental model: if this changes runtime performance
    boundaries or an automatic policy, are the (≤5) keywords, coarse cost model,
    and “optimization ladder” documented and aligned across docs/benchmarks/diagnostics?
  - Breaking changes (forward-only evolution): does this change any public API/behavior/event protocol;
    where is the migration note documented (no compatibility layer / no deprecation period)?
  - Public submodules: if this touches any `packages/*`, does it preserve the
    `src/index.ts` barrel + PascalCase public submodules (top-level `src/*.ts`,
    except `index.ts`/`global.d.ts`), move non-submodule code into
    `src/internal/**`, and keep `package.json#exports` from exposing internals?
  - Large modules/files (decomposition): if this touches any existing file/module
    that is ≥1000 LOC (or is expected to exceed the threshold), does the plan
    include a decomposition brief with mutually exclusive submodules, chosen
    structure (flat `*.*.ts` vs directory), one-way dependency topology, and an
    incremental rollout + verification strategy (keep refactor separate from
    semantic changes)?
  - What quality gates (typecheck / lint / test) will be run before merge,
    and what counts as “pass” for this feature?

## Perf Evidence Plan（MUST）

> 若本特性触及 Logix Runtime 核心路径 / 渲染关键路径 / 对外性能边界：此节必须填写；否则标注 `N/A`。
> 详细口径见：`.codex/skills/logix-perf-evidence/references/perf-evidence.md`

Baseline 语义（MUST-1）：

- 首选：**同一份代码下的策略 A/B**（类似 073 的 adapter A/B），在 perf suite 内提供 `mode=manualWatcher|workflow` 参数，避免必须切回旧 commit 才能采 before。
- 备选：代码前后（commit A→B）。仅在 A/B 难以实现时采用，且必须把 before 的 commit 与环境元信息写入 `specs/075-workflow-codegen-ir/perf/README.md`。

交付档位（MUST-0）：

- `quick` 仅用于迭代探路；**硬结论必须用 `profile=default`**（必要时 `soak` 复测）。

可比性锁定（MUST-2）：

- before/after 必须同机同环境、同 matrixId、同 profile、同 sampling 参数；否则 diff 仅作 triage 线索，不下“已回归/已达标”结论。
- 产物落点：`specs/075-workflow-codegen-ir/perf/*`（before/after/diff + 环境元信息 README）。

测量点位（P1，必须至少覆盖两条链路）：

- `workflow.submit.tickNotify`：submit 工作流（`call + dispatch + success/failure`）在 `diagnostics=off` 下的 tick→notify p95 / 分配（对比 manual vs workflow）。
- `workflow.delay.timer`：delay→dispatch（或 delay→KernelPort call）链路，验证不引入影子时间线，且解释链可归因到 tickSeq（对比 manual vs workflow）。

预算策略（Hard Gate，按 073 口径）：

- 先固化 baseline（`before.*.json`），再以 `baseline.p95 * 1.05` 作为 `diagnostics=off` 的回归阈值（噪声过大可放宽到 1.10，但必须写明原因并保留 diff）。
- `diagnostics=full` 单独设阈值：它允许更贵，但必须是“开关付费”且可解释（不能把成本泄漏到 off）。

Failure Policy：同 073（`meta.comparability.comparable=false` 或 `summary.regressions>0` 禁止下硬结论，必须补齐可比性或解释原因）。

## Project Structure

### Documentation (this feature)

```text
specs/075-workflow-codegen-ir/
├── spec.md
├── plan.md
├── tasks.md
├── research.md
├── review.md
├── data-model.md
├── quickstart.md
├── perf/
│   └── README.md
└── contracts/
    ├── public-api.md
    ├── ir.md
    ├── diagnostics.md
    ├── tape.md
    ├── optimization-ladder.md
    └── migration.md
```

### Source Code (repository root)

```text
packages/logix-core/
├── src/
│   ├── Workflow.ts                            # NEW: public module (DSL + types)
│   ├── Module.ts                              # UPDATE: add `Module.withWorkflow(program)` sugar (canonical install entry)
│   └── internal/
│       └── runtime/core/
│           ├── WorkflowRuntime.ts             # NEW: compiler + mount (uses FlowRuntime/EffectOp)
│           └── ServiceId.ts                   # NEW/REUSE: single-point `ServiceId.fromTag` (align 078 contract)
└── test/
    └── internal/runtime/Workflow.*.test.ts    # NEW: semantics (submit/delay/cancel) + trace anchors

packages/logix-react/
└── test/browser/**                            # 如需验证 tickSeq 关联：复用 073 runtime-store 场景
```

**Structure Decision**: Workflow 作为 `@logixjs/core` 的公共子模块对外暴露（DSL + 类型）；编译与 mount 下沉 `src/internal/runtime/core/WorkflowRuntime.ts`，复用既有 FlowRuntime/EffectOp，并通过测试与 perf evidence 守住 tick 参考系与成本门控。

## Complexity Tracking

N/A
