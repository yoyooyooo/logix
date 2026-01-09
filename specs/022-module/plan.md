# Implementation Plan: Module（定义对象）+ ModuleTag（身份锚点）

**Branch**: `022-module` | **Date**: 2025-12-21 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/Users/yoyo/Documents/code/personal/intent-flow/specs/022-module/spec.md`

## Summary

本特性把“领域蓝图”统一升级为 `Module`（定义对象）：让 Form/CRUD 等领域工厂返回同一形状的对象，并允许在这个对象上直接挂载 Logic 与领域扩展（如 controller），同时保持 `actions` 语义为“模块 action dispatchers”（不引入第二套同名 actions）。与此同时，将旧 `Module`（Tag identity）更名为 `ModuleTag`，把“身份锚点”与“领域定义对象”在概念与 API 命名上彻底分离，从而做到“万物皆是 logic，且不再需要额外包装 ModuleTag”。

## Technical Context

**Language/Version**: TypeScript 5.8.2 + Node.js 22.21.1  
**Primary Dependencies**: effect v3 (`effect@^3.19.8`) + `@logixjs/*` + React（`packages/logix-react`/`packages/logix-form` 相关）  
**Storage**: N/A（不引入持久化存储）  
**Testing**: Vitest 4 (`vitest run`) + `@effect/vitest`（Effect-heavy 场景）  
**Target Platform**: Node.js（测试/脚本） + 现代浏览器（React/Devtools 场景）  
**Project Type**: pnpm workspace（`packages/*` + `apps/*` + `examples/*`）  
**Performance Goals**:
- diagnostics off：`$.use(...)` 路径新增的 Module 识别/拆壳分支需保持 O(1) 且无额外分配；对代表性用例无可测回退（预算 ≤ 1%）
- diagnostics on：新增的 Module 相关诊断（如 composition/descriptor）必须 slim、可序列化，并有上界（不刷屏/不累积无界数组）  
**Constraints**:
- 复用稳定 identity（moduleId/instanceId/txnSeq/opSeq），禁止随机/时间默认
- 严格事务边界：事务窗口内不得 IO/async；Module 只做装配/定义层改动
- Gate：在修改 `$.use(...)` 热路径实现（如 `packages/logix-core/src/internal/runtime/BoundApiRuntime.ts`）前，必须先跑通 022 micro-bench 并记录 **Before** 性能基线（见 `specs/022-module/perf.md`）
- 内部协作协议必须显式契约化：避免新增散落 `runtime.__*` magic 字段依赖  
  - SDD/平台反射字段（`schemas/meta/services/dev.source`）必须保持可选且不进入热路径；序列化/JSON Schema 转换应在平台侧 loader 中完成；`dev.source` 的自动注入（vite/rsbuild/webpack 插件）不在本特性范围，本特性仅保留字段与约定  
**Scale/Scope**:
- 覆盖两个领域工厂样本：`Form.make()` 迁移 + 一个 `CRUD.make()`（或等价最小 CRUD）验证统一形状
- 不在本特性内引入新的持久化/网络协议；以 API/契约与示例迁移为主
**Order semantics**:
- `withLogic/withLogics`：按调用顺序追加，顺序可预测且可解释（install/default logic 在前，用户追加在后）。
- `logicUnitId`：逻辑单元的 slot key 需要确定性裁决（显式提供或可复现推导；禁止默认随机/时间；禁止仅以数组 index 作为默认）；重复 id 的裁决默认 `last-write-wins`（后挂载覆盖前者，作为正式覆盖能力），dev 模式 SHOULD 发可解释告警/诊断事件（建议 `diagnostic` + `code="module_logic::override"`），用于发现“无意覆盖”（有意覆盖可忽略）。strict 模式升级为 error 属于 Future（不在本特性范围）。
- `withLayer/withLayers`：按调用顺序叠加；若存在冲突（同一 Service 多实现），行为必须确定且可诊断（dev 下优先抛错或给出显式裁决）。

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- `Intent → Flow/Logix → Code → Runtime`：Module（定义对象）属于“领域能力装配层”的公共 API/契约；会影响 Logic 的 `$.use(...)` 消费模型、`actions`（模块 action dispatchers）语义，以及 UI/Runtime 的装配入口。
- 依赖与文档优先：新增/调整的对外契约必须同步固化在 `docs/ssot/platform/*`（SSoT）与 `docs/ssot/runtime/logix-core/api/*`；并在 `apps/docs` 更新面向业务的用法与心智模型（避免 spec 与用户文档漂移）。
- 契约变化：新增 `Module`（定义对象）统一形状与“挂载逻辑/依赖”的 fluent 组合；旧 `Module` 更名为 `ModuleTag`；明确 `logic`（产出逻辑值）与 `withLogic`（挂载到蓝图）的分工。
- DX：`Module.logic(build, { id? })` 的 `$` 提供 `$.self` 获取当前 ModuleHandle（含扩展），避免在本模块逻辑中重复 `$.use(SelfModule)`。
- IR & anchors：不引入第二套 IR；若增加诊断事件，必须复用既有 DebugSink `trace:*` 通道并可被 `trialRun` evidence 导出，同时携带 stable identity 字段。
- Deterministic identity：Module 诊断/解释链路必须可稳定关联到 moduleId/instanceId；逻辑单元需要可复现的 name/id（禁止默认随机）。
- Transaction boundary：Module 的装配/拆壳逻辑不得引入事务内 IO；`$.use(...)` 的拆壳必须是纯 O(1) 判定与 unwrap。
- Internal contracts & DI：Module 的“拆壳协议”必须是显式的、可类型化的（例如 `_kind` + `module/impl` 字段），并避免新增跨包的 `runtime.__*` 字段依赖；如需过渡 shim，必须集中在统一访问入口并写迁移说明。
- Performance budget：触及 hot path（BoundApi `$.use` 分发）；必须提供 before/after 的可复现测量（micro-bench 或既有跑道中的代表性用例），并在 plan 或 PR 中记录证据。
- Diagnosability cost：新增的 Module 相关诊断必须可关闭且接近零成本；启用时成本必须可预估且有上界。
- 用户心智模型（≤5 关键词）：`Module` / `ModuleTag` / `actions`（模块 action tags） / `withLogic/withLayers` / `免包装`，并确保 `apps/docs` 与示例一致。
- Breaking changes：`Form.make()` 返回形状变化、`$.use(...)` 传参形态变化、`Module → ModuleTag` 命名变更属于 breaking change；通过迁移说明 + 示例改造替代兼容层。
- Migration tooling：对“Module 语义从 Tag（身份锚点）切换为 wrap（定义对象）”导致的全仓迁移（典型：把模块值当 Tag 用的调用点），提供 codemod（ts-morph）作为迁移工具，避免手工批改出错与体验劣化；codemod 需支持 check/dry-run + 变更摘要，并配套 fixture 级测试用例；迁移完成后可删除 codemod（不作为长期兼容层）；不提供兼容层。
- Quality gates：`pnpm typecheck`、`pnpm lint`、`pnpm test`；若触及 `$.use` 热路径，需补充最小性能证据采集脚本/说明。

## Project Structure

### Documentation (this feature)

```text
specs/022-module/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
├── checklists/
└── tasks.md
```

### Source Code (repository root)

```text
packages/logix-core/src/
├── Module.ts                                   # Module（定义对象）公共 API（shape/unwrap/withLogic/Manage.make/descriptor/$.self）
├── ModuleTag.ts                                # ModuleTag/ModuleImpl/Bound API 对外入口（原 Module.ts，完成更名）
└── internal/runtime/
   ├── BoundApiRuntime.ts                       # $.use(...) 支持 Module 拆壳 + handle extend
   └── core/
      └── module.ts                             # ModuleTag/ModuleImpl/Logic 类型（为 withLogic/withLogics 组合提供基础能力）

packages/logix-form/src/
└── form.ts                                     # Form.make 迁移为返回 Module（保持 controller + actions(dispatchers) 语义）

packages/logix-react/src/                        # 现有 useModule/useForm 入口对齐（允许直接消费 Module）

apps/docs/content/docs/                          # 面向业务的 Module（定义对象）用法与迁移说明

examples/logix-react/src/demos/form/             # 示例迁移：不再额外创建包装 module

scripts/codemod/                                # 迁移工具（临时；迁移完可删除）
├── 022-module-to-moduletag.ts                  # ts-morph codemod（支持 --check 与摘要输出）
├── __tests__/022-module-to-moduletag.test.ts   # fixture-based tests（迁移规则锁定）
└── fixtures/022-module-to-moduletag/           # before/after fixtures（典型场景 + 误伤保护）
```

**Structure Decision**: 热路径与拆壳逻辑集中在 `@logixjs/core`；领域工厂（Form/CRUD）只负责产出 `Module`（定义对象）并固化 module actionMap（action tags）/可选 controller；示例与文档同步迁移以固化心智模型与可回归用例。
