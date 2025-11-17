# Implementation Plan: 001-effectop-unify-boundaries（EffectOp 总线彻底收口，移除局部加固入口）

**Branch**: `001-effectop-unify-boundaries` | **Date**: 2025-12-12 | **Spec**: `/Users/yoyo/Documents/code/personal/intent-flow/specs/001-effectop-unify-boundaries/spec.md`  
**Input**: `/Users/yoyo/Documents/code/personal/intent-flow/specs/001-effectop-unify-boundaries/spec.md`

## Summary

本特性把“所有会执行的边界操作”统一提升为结构化 Operation（EffectOp），并确保它们必经同一条 Runtime Middleware 管线（含内部类边界与调试类边界）。在此基础上：

- 移除历史遗留的“局部加固/包一层”入口，避免双轨与漏挂；
- 以“防呆”为第一目标：从类型/运行时/测试三层保证不存在绕过总线的执行路径；
- 明确三项不可含糊的行为契约：全局守卫不可被局部关闭；守卫拒绝为显式失败且无副作用；每次操作必须带关联键（操作链路 id）用于串联多步边界操作。

## Technical Context

**Language/Version**: TypeScript 5.x（ESM）+ Node.js 20+  
**Primary Dependencies**: `effect` v3、`@logix/core`（Runtime/Flow/Bound/EffectOp）、`@logix/react`/`@logix-devtools-react`（用于端到端验收）  
**Storage**: N/A（内存运行时，不引入持久化）  
**Testing**: Vitest（含 `@effect/vitest` 风格用例），并以 `pnpm typecheck`、`pnpm lint`、`pnpm test --filter logix-core` 作为质量门  
**Target Platform**: Node.js 20+（开发/测试），现代浏览器（用于示例与 Devtools 观测验收）  
**Project Type**: pnpm monorepo；改动主落点在 `packages/logix-core`，并联动 `apps/docs` 与 `.codex/skills/project-guide/references/runtime-logix`  
**Performance Goals**: 中间件总线对高频边界不引入显著额外开销；默认路径应为“零配置接近零成本”（空 stack 走直通）  
**Constraints**:

- docs-first：任何对 Runtime 契约的改变需同步更新 `.codex/skills/project-guide/references/runtime-logix` 与 `apps/docs`；
- Effect 契约：严格遵守 `Effect.Effect<A, E, R>` 泛型顺序与 Tag/Layer 注入范式；
- 不允许出现“可绕过总线”的 ad-hoc 执行入口；
- 测试禁止 watch 模式（一次性 `vitest run` / `pnpm test`）。
  **Scale/Scope**:
- 范围：统一边界执行模型 + middleware 管线强制接入 + 遗留入口清理 + 回查 001a 相关承诺；
- 不在本轮范围：新增复杂 Devtools UI、平台 Studio 交互形态；只保证契约与可观测数据完整。

## Constitution Check

- Intent → Flow/Logix → Code → Runtime 映射：
  - Intent/规范侧：`.codex/skills/project-guide/references/runtime-logix` 与 `specs/001-effectop-unify-boundaries/spec.md` 定义“边界操作统一模型”；
  - Flow/Logix 侧：业务通过 Flow/Bound 等 API 触发操作；
  - Code/Runtime 侧：所有操作统一提升为 EffectOp 并进入 middleware stack，形成可回放/可观测链路（含操作链路 id）。
- 依赖 / 修改的上游 specs（文档先行）：
  - `.codex/skills/project-guide/references/runtime-logix/logix-core/api/04-logic-middleware.md`（将“统一总线”作为唯一主线叙事）；
  - `.codex/skills/project-guide/references/runtime-logix/logix-core/runtime/05-runtime-implementation.md` 与相关 impl 备忘（记录接线与防呆约束）；
  - `specs/001a-module-traits-runtime/*`（回查 EffectOp/Middleware 总线的承诺与当前实现一致性）。
- Effect/Logix 契约变更落点：
  - 统一的 Operation/Meta（包含操作链路 id）、全局/局部策略优先级、守卫拒绝语义；
  - 变更先落到 docs/specs（规范）与 `specs/001-effectop-unify-boundaries/contracts`（对外契约），再改代码。
- 质量门（merge 前必须通过）：
  - `pnpm typecheck`
  - `pnpm lint`
  - `pnpm test --filter logix-core`
  - 至少新增/更新一组“总线不可绕过”的关键用例（见 Implementation Steps 的测试清单）。

## Project Structure

### Documentation（本特性）

```text
/Users/yoyo/Documents/code/personal/intent-flow/specs/001-effectop-unify-boundaries/
├── plan.md
├── spec.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── README.md
└── checklists/
    └── requirements.md
```

### Source Code（repository root）

```text
/Users/yoyo/Documents/code/personal/intent-flow/
├── packages/
│   ├── logix-core           # 本特性主落点：EffectOp/Runtime/Flow/Bound 统一接线与防呆
│   ├── logix-react          # 端到端验收：业务侧写法稳定性 + 运行时观测
│   └── logix-devtools-react # 数据消费方：验证 trace/链路关联可视化需求
├── apps/docs/               # 用户文档：移除旧叙事，统一到 EffectOp 总线
└── .codex/skills/project-guide/references/runtime-logix # 规范文档：把总线收敛为唯一主线
```

**Structure Decision**:

- 不新增第二套“局部加固/局部中间件”并行机制；所有横切能力以 Runtime Middleware 总线为唯一挂载点；
- 若需要“局部策略标注”，以 Operation Meta 的结构化字段表达，由总线中间件决策执行。

## Anti-Footgun Design（防呆设计）

### 1) 单一入口：所有边界操作必须走 Operation 总线

目标：在代码结构上让“绕过总线”变得困难，且一旦发生能被测试/静态检查捕获。

实施要点：

- 在 `@logix/core` 的运行时内核提供唯一的 “runOperation” 入口；所有边界执行点只能调用它；
- 该入口负责：补齐 meta（moduleId/instanceId/txnId/linkId/trace...）、串行化（如适用）、并执行 middleware stack（空 stack 直通）；
- 任何直接 `Effect.run*`、直接执行用户 effect 的路径都视为 bug（除纯构造/纯数据函数外）。

### 2) 关联键（操作链路 id）是强制字段

目标：同一次用户交互/一次业务意图触发的多步边界操作必须可关联。

实施要点：

- 在 Runtime 内部以 FiberRef/上下文方式持有当前 linkId；
- “边界起点”（例如外部触发一次 action/flow）创建新 linkId；其后嵌套操作复用该 linkId；
- 中间件可读该 linkId 做观测聚合与审计。

### 3) 全局 vs 局部策略的优先级固定（不可被误用）

目标：避免局部关闭全局守卫造成漏网风险。

实施要点：

- 局部策略标注只允许：追加信息/收紧约束/关闭纯观测能力；
- 全局守卫类中间件不可被局部关闭（且这一点写入契约与测试）。

### 4) 守卫拒绝是“显式失败且无副作用”

目标：拒绝必须对调用方可见，且不留半执行副作用。

实施要点：

- 统一定义“拒绝错误”数据结构（对外可识别、可观测、可测试）；
- 拒绝发生在执行用户 effect 之前；并在测试中证明“用户 effect 未被运行”。

## Implementation Steps（分阶段实施方案）

### Phase 0（Research）：把关键决策写死并对齐现状

1. 盘点当前代码中所有边界执行点：Flow/Action/State/Lifecycle/Service/Trait/Devtools 等。
2. 盘点当前已进入总线的路径与未进入总线的路径，形成“覆盖矩阵”（用于测试与验收）。
3. 明确对外契约变更清单：
   - Operation Meta 必须包含 linkId；
   - 全局/局部策略优先级；
   - 拒绝错误语义；
   - 移除旧入口与文档迁移要求。

输出：`research.md`（含备选方案与取舍）。

### Phase 1（Design）：数据模型 + 对外契约 + Quickstart

1. 数据模型落地：`data-model.md`
   - Operation/Meta/PolicyAnnotation/RejectedError 的字段与不变量；
   - “哪些字段由 Runtime 自动补齐、哪些字段由调用方/局部标注提供”。
2. 对外契约落地：`contracts/README.md`
   - 对外可见 API 形状（库级 TS 契约），以及关键行为约束；
   - 明确废弃/移除项及迁移方式。
3. Quickstart：`quickstart.md`
   - 最小示例：配置全局 middleware + 给单个操作加局部标注；
   - 验证：可观测（含 linkId 关联）、守卫拒绝显式失败、全局守卫不可被局部关闭。

### Phase 2（Implementation Planning）：代码改造顺序与验证点（防呆级别）

> 这里给出“最小可回滚/可验证”的改造顺序；每一步都要能通过类型与测试证明“不存在绕过总线”。

1. Runtime 内核：抽出唯一 runOperation 接口

- 将现有 “middleware stack 注入/读取” 逻辑统一封装，作为所有边界执行的唯一入口；
- 该入口必须：
  - 自动补齐 moduleId/instanceId/txnId/linkId；
  - 在空 stack 时直通；
  - 在非空 stack 时按既定组合语义执行；
  - 生成/传播 linkId（边界起点创建，嵌套复用）。

2. 边界接线：把所有边界执行点改为调用 runOperation

- Flow：run/runLatest/runExhaust/runParallel 等；
- Action：dispatch/emit 等；
- State：update/mutate/reducer 等；
- Lifecycle：init/destroy/suspend/resume/reset 等；
- Service：资源/请求等；
- Trait/Devtools/内部边界：全部进入总线（按 spec Q1）。

3. 遗留清理：移除旧入口与旧叙事

- 删除“局部加固/包一层”的历史机制；
- 替换所有示例与用户文档中依赖旧入口的写法，统一到：
  - 全局 middleware 配置；
  - 局部策略标注（写入 Operation Meta）。

4. 防呆测试：用例必须能“证明不存在绕过总线”

- 覆盖矩阵测试：每一种边界操作触发一次，都能被 middleware 观测到（包含内部与调试类边界）；
- 拒绝语义测试：守卫拒绝时返回显式失败，且用户 effect 的副作用未发生；
- 优先级测试：局部不能关闭全局守卫；局部可关闭纯观测；
- 关联键测试：同一链路的多步操作携带相同 linkId，且边界起点会生成新 linkId。

5. 001a 回查与对齐（FR-007/SC-004）

- 对照 `specs/001a-module-traits-runtime/*` 与 `.codex/skills/project-guide/references/runtime-logix/*`：
  - 标注哪些承诺已由本次实现覆盖；
  - 哪些需要修订文字/迁移示例；
  - 哪些属于后续主题（明确延期理由与锚点）。

## Constitution Re-check（post Phase 1）

- docs-first & SSoT：本特性对外契约已在以下文件中固化（作为实现前置条件）：
  - `/Users/yoyo/Documents/code/personal/intent-flow/specs/001-effectop-unify-boundaries/spec.md`（需求与验收）
  - `/Users/yoyo/Documents/code/personal/intent-flow/specs/001-effectop-unify-boundaries/contracts/README.md`（对外 API 契约）
  - `/Users/yoyo/Documents/code/personal/intent-flow/specs/001-effectop-unify-boundaries/data-model.md`（数据模型与不变量）
  - `/Users/yoyo/Documents/code/personal/intent-flow/specs/001-effectop-unify-boundaries/quickstart.md`（端到端 DoD）
- Intent → Flow/Logix → Code → Runtime 链路：已明确“边界起点创建 linkId、嵌套复用；所有边界统一进入总线”作为硬约束，并将其转化为测试验收点。
- Effect/Logix 契约变更：已将全局/局部策略优先级与拒绝语义写死为可测试约束，后续实现必须以此为准并同步更新 `.codex/skills/project-guide/references/runtime-logix/*` 与 `apps/docs/*`。
- 质量门：计划在实现阶段以类型检查、lint 与核心测试作为强制门槛，并新增“不可绕过总线”的关键用例，作为防呆兜底。

## Complexity Tracking

本次允许破坏性重构以达成“单一完美点”；不以向后兼容为目标。若后续发现必须保留垫片（仅用于短期迁移），需在此处记录其到期条件与删除计划。
