# Implementation Plan: Action Surface（actions/dispatchers/reducers/effects）与 Manifest

**Branch**: `067-action-surface-manifest` | **Date**: 2026-01-02 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `specs/067-action-surface-manifest/spec.md`

## Review Digest

Source: `review.md`（Status: APPROVED；Reviewer: Antigravity；Date: 2026-01-02）

- Accepted: R101 → 将 SC-006“确定性截断”落实为单测与稳定裁剪规则（写入 `tasks.md`）。
- Accepted: R102 → 在文档中明确 `actions` 的推荐写法（默认用 schema map 或 `Logix.Action.makeActions`；避免 Schema/Token 混用），降低 TS 推导/提示的不确定性。
- Accepted: Top issue 3 → 在任务层补齐 FR-009（字符串 tag 的 dispatch/订阅仍可工作）的回归验证。
- Closed: Top issue 1（`tasks.md` 缺失）→ 本次已补齐 `tasks.md`（见 `specs/067-action-surface-manifest/tasks.md`）。

## Summary

本特性把 action 从“字符串消息/动态属性”推进到“可反射、可序列化、可跳转的定义锚点”，并以此补齐 Full Duplex（Runtime → Studio）链路里 Action 维度的最小 IR 与对齐规则：

1. **Action 定义锚点（value-level symbol）**：将 `Module.make({ actions })` 的内部规范升级为 “ActionToken map”（每个 token 携带 payload Schema），并固化 `actionTag = key`（forward-only：rename 即协议变更）。对外允许 schema map 作为语法糖：`actions: { add: Schema.Number, inc: Schema.Void }`（实现时会规范化为 token map）。
2. **执行/监听 API 统一围绕 token**：
   - `$.actions.<K>(payload)`：仅作为 ActionCreator（产出纯数据 action object，可序列化、可回放）。
   - `$.dispatchers.<K>(payload)`：返回可 `yield*` 的 Effect（真正 dispatch），且点击 `<K>` 可跳转到模块 `actions.<K>` 的定义行。
   - canonical：`$.dispatch(token, payload)` / `$.dispatch(action)`；监听：`$.onAction(token)`（避免 Proxy 动态属性作为主路径）。
   - DX 约定：`onAction(token)` 的回调参数 payload-first；predicate/string 监听仍回调完整 action object（用于区分 `_tag`）。
   - React 侧衔接：`useModule(...)` 返回的 `ModuleRef.dispatchers.<K>(payload)` 作为 UI 便捷派发入口（同步 dispatch），并与 `ModuleDef.actions.<K>` 的符号锚点对齐（IDE 可跳转/找引用/重命名）。
3. **Manifest IR 扩展（免 AST）**：在现有 `Reflection.extractManifest` 的 `ModuleManifest` 基础上扩展 `actions[]` 描述符（payload 形态、primary reducer 摘要、可选 source），输出为 deterministic JSON（可 diff），并与 token 定义一致。
4. **事件 → 定义锚点对齐**：复用 `RuntimeDebugEventRef` 的 `moduleId + kind=action + label=actionTag` 作为 `ActionRef`（单一事实源），Studio/Devtools 通过 manifest 反查 ActionAnchor（无定义则降级为 unknown/opaque）。
5. **Reducer DX 对齐（payload-first）**：将 `Reducer.mutate` 的 **mutator 回调**签名改为 `(draft, payload)`（payload-first），避免 `action.payload` 样板；`mutate` 返回的 reducer 仍按 `(state, action, sink?) => state` 运行，并保持事务窗口纯同步与 patchPaths 语义不变。
6. **Effects/`$.effect`（副作用面）**：把散落的 watcher 监听提升为可治理的副作用注册面（允许同 tag 多 handler），在 run 阶段统一装配为“每 tag 单 watcher + fan-out”，并提供去重与极致诊断（重复注册/动态注册/晚注册/失败隔离），保证事务外执行且不阻塞 dispatch。

本阶段交付的规格产物：`plan.md`（本文件）、`research.md`（裁决与取舍）、`data-model.md`（实体/键/对齐规则）、`contracts/schemas/*`（JSON Schema）、`quickstart.md`（最小使用说明与迁移要点）。

> 备注：面向“Schema-first + CodeGen：自动生成 actions/reducers/dispatchers 等样板代码”的需求作为独立 spec：`specs/069-schema-first-codegen-action-surface/`（不在 067 范围内落地）。

## Deepening Notes

- Decision: `actionTag` MUST 等于 `actions` key，且不提供独立 stable tag 字段（source: spec.md Clarifications / AUTO 2026-01-02）
- Decision: 单 ActionToken 精确监听与 primary reducer 均采用 payload-first（source: spec.md Clarifications / AUTO 2026-01-02）
- Decision: effects MUST 事务外触发；同 tag 允许多个 handler，默认并发且不承诺顺序，失败隔离并记录诊断（source: spec.md Clarifications / AUTO 2026-01-02）
- Decision: effects 重复注册必须不翻倍；默认视为 no-op，并产出结构化重复注册诊断（source: spec.md Clarifications / AUTO 2026-01-02）
- Decision: `sourceKey` 由系统自动派生且必须可序列化/可确定（source: spec.md Clarifications / AUTO 2026-01-02）
- Decision: manifest 至少包含 Module.make 声明 effects；受控试运行可补齐 setup 注册并标记为 registered；run 动态注册不入 manifest，但必须在运行时诊断流可见（source: spec.md Clarifications / AUTO 2026-01-02）

## Technical Context

**Language/Version**: TypeScript 5.9.x（ESM）  
**Primary Dependencies**: effect v3（override 3.19.13）、`@logixjs/core`、`@logixjs/react`、`@logixjs/sandbox`  
**Storage**: N/A（只产出 deterministic JSON 工件）  
**Testing**: Vitest（`vitest run`）+ `@effect/vitest`（Effect-heavy 场景）  
**Target Platform**: Node.js（Loader/CI/TrialRun）+ 现代浏览器（Devtools/Studio）  
**Project Type**: pnpm workspace（packages/apps/examples）  
**Performance Goals**:

- diagnostics=off：`dispatch` 热路径保持近零额外成本（不新增 JsonValue 投影，不新增 O(n) 扫描）。
- diagnostics=light/sampled/full：Action 事件追加的 `actionTag/actionRef` 计算为 O(1)，额外分配可控；manifest 提取属于冷路径。
- manifest 输出：默认 `maxBytes ≤ 64KB`；超限时 deterministic 裁剪并以 `meta.__logix.truncated` 给出可解释证据。
- `$.dispatchers` 构造：不得为每个 bound instance 生成 O(n actions) 的闭包函数；优先复用 token 符号（或等价的零/低分配视图），避免“actions 多 → 绑定成本爆炸”。
- effects 装配：同一 actionTag 只允许一个底层 watcher/订阅链路，handler 以列表 fan-out；dispatch 未命中 effects 时不得引入额外成本。

**Constraints**:

- 统一最小 IR：manifest 与 runtime 事件使用同一 `ActionRef` 语义（`moduleId + actionTag`）。
- 稳定标识：`instanceId/txnSeq/txnId` 不引入随机/时间默认值（复用现有模型）。
- 事务窗口禁止 IO；诊断载荷必须 Slim 且可序列化（`JsonValue`）。
- IDE 跳转定义：`dispatch`/`onAction` 的推荐写法必须引用源码里的稳定 symbol（token），避免 Proxy/字符串成为主路径。
- React（`@logixjs/react`）侧的对齐：UI 中用 `useDispatch(handle)` / `ModuleRef.dispatch` 承担“执行视图”（类比 `$.dispatchers`），用 `ModuleDef.actions.<K>`（ActionToken）生成 action object（类比 `$.actions`）；需要 IDE 重命名/找引用时避免依赖 `ModuleRef.actions.<K>`（其实现是字符串 Proxy 的便捷派发糖）。
- effects 必须事务外执行；setup 阶段只允许注册规则，不得提前执行 handler。

**Scale/Scope**:

- 单模块 actions 数量可能很大；必须定义稳定排序、大小上界与 unknown 降级语义。

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

结论：PASS（plan 阶段）。Phase 1 设计完成后需要复核：manifestVersion/字段语义、裁剪顺序、以及事件对齐说明是否已回写到 runtime SSoT 文档。

- Intent → Flow/Logix → Code → Runtime：把 ActionRef 作为 Dynamic Trace（RuntimeDebugEventRef）与 Static 摘要（ModuleManifest.actions）的连接点。
- docs/specs：本特性以 `specs/067-*` 交付；若裁决升级为平台协议，将同步回写到 `docs/ssot/platform/*` 与 runtime SSoT 事件协议文档。
- Effect/Logix contracts：扩展 ModuleManifest 的 schema（actions + effects）；事件侧优先复用既有 `RuntimeDebugEventRef`（避免另起炉灶的 on-wire 协议）。
- IR & anchors：新增 ActionAnchor/ActionDescriptor（platform-grade 子集），字段语义固化到本 feature 的 contracts + quickstart（避免平台/运行时双真相源）。
- Deterministic identity：ActionRef 不含随机字段；实例/事务锚点沿用现有 `instanceId/txnSeq/txnId`。
- Transaction boundary：反射/导出发生在冷路径；事务内不引入 IO/async。
- Internal contracts & trial runs：若需要从 trial run 提取 “setup 注册的 reducer keys / effects 列表”，通过 `RuntimeInternals`（txn service）增加可导出、可 mock 的最小接口（只导出 keys/摘要，不导出函数体）。
- Dual kernels（core + core-ng）：本特性不引入 core-ng 专有依赖；若后续触及 KernelContract/RuntimeServicesEvidence，再补 kernel matrix（当前预期 N/A）。
- Performance budget：见 Perf Evidence Plan。
- Diagnosability & explainability：Action 事件仍走 `Debug.record → toRuntimeDebugEventRef`；新增字段必须可序列化且可裁剪。
- User-facing performance mental model：本特性不改变默认策略（预期 N/A）；若引入新的默认采集/导出策略，再补 ≤5 关键词与优化梯子。
- Breaking changes（forward-only）：若移除 `action.type` 兼容或升级 manifestVersion，必须在本 plan/tasks 中提供迁移说明（无兼容层/无弃用期）。
- Public submodules：若新增 `ActionToken` 并进入 `@logixjs/core` 公共 API，按 `packages/logix-core/src/*.ts` 子模块规则落点，内部实现下沉 `src/internal/**`。
- DX 与可解释性：`actions/dispatchers` 的“定义视图 vs 执行视图”必须在 quickstart 与 runtime SSoT API 文档中固化，避免用户把 creator 当 dispatcher（或反之）。
- Quality gates：合并前通过 `pnpm typecheck`、`pnpm lint`、`pnpm test:turbo`；关键用例覆盖 manifest deterministic 与事件映射（含 unknown 降级）。

## Perf Evidence Plan（MUST）

- Baseline 语义：代码前后对比（before=改动前采集；after=改动后采集；硬结论以 `diff.meta.comparability.comparable=true` 为准）
- envId：`darwin-arm64.apple-m2-max.node22.21.1`
- profile：
  - 迭代探路：`quick`（只做趋势；不下硬结论）
  - 交付结论：`default`（必要时升级 `soak`）
- 覆盖的最小集合（browser perf matrix v1）：
  - `watchers.clickToPaint`（watcher 数量上升的边界）
  - `diagnostics.overhead.e2e`（diagnostics 分档开销曲线：`off` vs `light|sampled|full`）
  - `converge.txnCommit`（事务提交/derive 主路径边界，确保本特性不引入回归）
- collect（before）：
  - `pnpm perf collect -- --profile default --files test/browser/watcher-browser-perf.test.tsx --files test/browser/perf-boundaries/diagnostics-overhead.test.tsx --files test/browser/perf-boundaries/converge-steps.test.tsx --out specs/067-action-surface-manifest/perf/before.local.darwin-arm64.apple-m2-max.node22.21.1.default.json`
- collect（after）：
  - `pnpm perf collect -- --profile default --files test/browser/watcher-browser-perf.test.tsx --files test/browser/perf-boundaries/diagnostics-overhead.test.tsx --files test/browser/perf-boundaries/converge-steps.test.tsx --out specs/067-action-surface-manifest/perf/after.local.darwin-arm64.apple-m2-max.node22.21.1.default.json`
- diff（hard）：
  - `pnpm perf diff -- --before specs/067-action-surface-manifest/perf/before.local.darwin-arm64.apple-m2-max.node22.21.1.default.json --after specs/067-action-surface-manifest/perf/after.local.darwin-arm64.apple-m2-max.node22.21.1.default.json --out specs/067-action-surface-manifest/perf/diff.before.local__after.local.darwin-arm64.apple-m2-max.node22.21.1.default.json`
- Failure Policy：
  - `stabilityWarning/timeout/missing suite`：复测（可先 `quick` 定位，再用 `default/soak` 下结论）
  - `comparable=false`：禁止下硬结论（只作线索，需对齐参数/环境后复测）

## Project Structure

### Documentation (this feature)

```text
specs/067-action-surface-manifest/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│  └── schemas/
│     ├── action-ref.schema.json
│     ├── dev-source.schema.json
│     ├── module-manifest-action.schema.json
│     ├── module-manifest-effect.schema.json
│     └── module-manifest.schema.json
└── tasks.md
```

### Source Code (repository root)

```text
packages/logix-core/
├── src/
│  ├── Module.ts                                  # Module.make：actions 支持 Schema map sugar → 规范化为 ActionToken map；导出契约/迁移说明
│  ├── ModuleTag.ts                               # Reducer.mutate(payload-first)；ModuleTag.make 同步对齐 actions 形态（如适用）
│  ├── Reflection.ts                              # extractManifest 对外入口（可能扩展 options/返回结构）
│  ├── Action.ts                                  # Logix.Action：ActionToken/ActionCreator/makeActions（携带 Schema + 稳定 tag；可被反射/序列化）
│  └── internal/
│     ├── module.ts                               # internal types：ActionOf/ReducersFromMap 等随 token/payload-first 对齐
│     ├── reflection/manifest.ts                  # ModuleManifest 提取（扩展 actions/anchors + budgets）
│     └── runtime/
│        ├── ModuleFactory.ts                     # Action union schema：从 ActionToken map 构造（_tag + payload schema）
│        └── core/
│           ├── BoundApiRuntime.ts                # 去 Proxy：暴露 $.actions（creator）与 $.dispatchers（Effect）+ token-first onAction + $.effect 注册
│           ├── DebugSink.ts                      # Action 事件的 ActionRef 语义对齐/必要时补字段
│           ├── ModuleRuntime.dispatch.ts         # actionTag 归一化（_tag 为权威）与 reducer keys/patchPaths 对齐
│           └── ModuleRuntime.effects.ts          # effect registry（每 tag 单 watcher + handlers fan-out）与 effect 诊断

packages/logix-devtools-react/
└── src/...                                      # 消费 manifest 做 “event → anchor” 映射（按 ROI 选择落地）

packages/logix-sandbox/ or examples/logix-sandbox-mvp/
└── ...                                          # Alignment Lab/Playground 侧的 manifest loader & 展示（可选）

docs/specs/sdd-platform/workbench/
└── 02/15/16...                                  # 本特性引用其裁决；若升级为平台协议再回写 SSoT
```

**Structure Decision**: 核心契约与提取逻辑落在 `@logixjs/core`；消费与 UI 对齐优先落在 Devtools/Sandbox 的最小载体，避免平台侧过早锁死。

## Complexity Tracking

N/A
