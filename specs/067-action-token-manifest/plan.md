# Implementation Plan: Action 级别定义锚点（ActionToken-ready Manifest）

**Branch**: `067-action-token-manifest` | **Date**: 2026-01-02 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `specs/067-action-token-manifest/spec.md`

## Summary

本特性把 action 从“字符串消息/动态属性”推进到“可反射、可序列化、可跳转的定义锚点”，并以此补齐 Full Duplex（Runtime → Studio）链路里 Action 维度的最小 IR 与对齐规则：

1. **Action 定义锚点（value-level symbol）**：将 `Module.make({ actions })` 的内部规范升级为 “ActionToken map”（每个 token 携带 payload Schema），并固化 `actionTag = key`（forward-only：rename 即协议变更）。对外允许 schema map 作为语法糖：`actions: { add: Schema.Number, inc: Schema.Void }`（实现时会规范化为 token map）。
2. **执行/监听 API 统一围绕 token**：
   - `$.actions.<K>(payload)`：仅作为 ActionCreator（产出纯数据 action object，可序列化、可回放）。
   - `$.dispatchers.<K>(payload)`：返回可 `yield*` 的 Effect（真正 dispatch），且点击 `<K>` 可跳转到模块 `actions.<K>` 的定义行。
   - canonical：`$.dispatch(token, payload)` / `$.dispatch(action)`；监听：`$.onAction(token)`（避免 Proxy 动态属性作为主路径）。
   - DX 约定：`onAction(token)` 的回调参数 payload-first；predicate/string 监听仍回调完整 action object（用于区分 `_tag`）。
3. **Manifest IR 扩展（免 AST）**：在现有 `Reflection.extractManifest` 的 `ModuleManifest` 基础上扩展 `actions[]` 描述符（payload 形态、primary reducer 摘要、可选 source），输出为 deterministic JSON（可 diff），并与 token 定义一致。
4. **事件 → 定义锚点对齐**：复用 `RuntimeDebugEventRef` 的 `moduleId + kind=action + label=actionTag` 作为 `ActionRef`（单一事实源），Studio/Devtools 通过 manifest 反查 ActionAnchor（无定义则降级为 unknown/opaque）。
5. **Reducer DX 对齐（payload-first）**：将 `Reducer.mutate` 的签名从 `(state, action)`/`(draft, action)` 改为 `(state, payload)`/`(draft, payload)`，减少样板与误用，并保持事务窗口纯同步与 patchPaths 语义不变。

本阶段交付的规格产物：`plan.md`（本文件）、`research.md`（裁决与取舍）、`data-model.md`（实体/键/对齐规则）、`contracts/schemas/*`（JSON Schema）、`quickstart.md`（最小使用说明与迁移要点）。

> 备注：面向“自动生成 actions/reducers/dispatchers 等样板代码”的 CodeGen 作为独立需求另起 spec（`specs/069-codegen-action-surface/`；不在 067 范围内落地）。

## Technical Context

**Language/Version**: TypeScript 5.9.x（ESM）  
**Primary Dependencies**: effect v3（override 3.19.13）、`@logix/core`、`@logix/react`、`@logix/sandbox`  
**Storage**: N/A（只产出 deterministic JSON 工件）  
**Testing**: Vitest（`vitest run`）+ `@effect/vitest`（Effect-heavy 场景）  
**Target Platform**: Node.js（Loader/CI/TrialRun）+ 现代浏览器（Devtools/Studio）  
**Project Type**: pnpm workspace（packages/apps/examples）  
**Performance Goals**:

- diagnostics=off：`dispatch` 热路径保持近零额外成本（不新增 JsonValue 投影，不新增 O(n) 扫描）。
- diagnostics=light/full：Action 事件追加的 `actionTag/actionRef` 计算为 O(1)，额外分配可控；manifest 提取属于冷路径。
- manifest 输出：默认 `maxBytes ≤ 64KB`；超限时 deterministic 裁剪并以 `meta.__logix.truncated` 给出可解释证据。
- `$.dispatchers` 构造：不得为每个 bound instance 生成 O(n actions) 的闭包函数；优先复用 token 符号（或等价的零/低分配视图），避免“actions 多 → 绑定成本爆炸”。

**Constraints**:

- 统一最小 IR：manifest 与 runtime 事件使用同一 `ActionRef` 语义（`moduleId + actionTag`）。
- 稳定标识：`instanceId/txnSeq/txnId` 不引入随机/时间默认值（复用现有模型）。
- 事务窗口禁止 IO；诊断载荷必须 Slim 且可序列化（`JsonValue`）。
- IDE 跳转定义：`dispatch`/`onAction` 的推荐写法必须引用源码里的稳定 symbol（token），避免 Proxy/字符串成为主路径。

**Scale/Scope**:

- 单模块 actions 数量可能很大；必须定义稳定排序、大小上界与 unknown 降级语义。

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

结论：PASS（plan 阶段）。Phase 1 设计完成后需要复核：manifestVersion/字段语义、裁剪顺序、以及事件对齐说明是否已回写到 runtime-logix 文档。

- Intent → Flow/Logix → Code → Runtime：把 ActionRef 作为 Dynamic Trace（RuntimeDebugEventRef）与 Static 摘要（ModuleManifest.actions）的连接点。
- docs/specs：本特性以 `specs/067-*` 交付；若裁决升级为平台协议，将同步回写到 `docs/specs/intent-driven-ai-coding/*` 与 runtime-logix 事件协议文档。
- Effect/Logix contracts：扩展 ModuleManifest 的 schema；事件侧优先复用既有 `RuntimeDebugEventRef`（避免另起炉灶的 on-wire 协议）。
- IR & anchors：新增 ActionAnchor/ActionDescriptor（platform-grade 子集），字段语义固化到本 feature 的 contracts + quickstart（避免平台/运行时双真相源）。
- Deterministic identity：ActionRef 不含随机字段；实例/事务锚点沿用现有 `instanceId/txnSeq/txnId`。
- Transaction boundary：反射/导出发生在冷路径；事务内不引入 IO/async。
- Internal contracts & trial runs：若需要从 trial run 提取 “setup 注册的 reducer keys”，通过 `RuntimeInternals`（txn service）增加可导出、可 mock 的最小接口（只导出 keys）。
- Dual kernels（core + core-ng）：本特性不引入 core-ng 专有依赖；若后续触及 KernelContract/RuntimeServicesEvidence，再补 kernel matrix（当前预期 N/A）。
- Performance budget：见 Perf Evidence Plan。
- Diagnosability & explainability：Action 事件仍走 `Debug.record → toRuntimeDebugEventRef`；新增字段必须可序列化且可裁剪。
- User-facing performance mental model：本特性不改变默认策略（预期 N/A）；若引入新的默认采集/导出策略，再补 ≤5 关键词与优化梯子。
- Breaking changes（forward-only）：若移除 `action.type` 兼容或升级 manifestVersion，必须在本 plan/tasks 中提供迁移说明（无兼容层/无弃用期）。
- Public submodules：若新增 `ActionToken` 并进入 `@logix/core` 公共 API，按 `packages/logix-core/src/*.ts` 子模块规则落点，内部实现下沉 `src/internal/**`。
- DX 与可解释性：`actions/dispatchers` 的“定义视图 vs 执行视图”必须在 quickstart 与 runtime-logix API 文档中固化，避免用户把 creator 当 dispatcher（或反之）。
- Quality gates：合并前通过 `pnpm typecheck`、`pnpm lint`、`pnpm test:turbo`；关键用例覆盖 manifest deterministic 与事件映射（含 unknown 降级）。

## Perf Evidence Plan（MUST）

- Baseline 语义：代码前后对比（before/after）
- envId：`<os-arch.cpu.node-version>`（按实际填写）
- profile：default
- 覆盖的最小集合：
  - `Debug.record → DebugSink.toRuntimeDebugEventRef`（diagnostics off vs light）
  - `ModuleRuntime.dispatch`（diagnostics off 的无额外开销门槛）
  - `makeBoundApi`（或等价入口）：构造 `$` 时的 actions/dispatchers 视图不得出现 O(n) 闭包分配
  - `Reflection.extractManifest`（冷路径：吞吐与 maxBytes 裁剪成本）
- collect/diff：按模板命令执行，产物落点：`specs/067-action-token-manifest/perf/*`
- Failure Policy：出现 `stabilityWarning/timeout/missing suite` → 复测；`comparable=false` 禁止下硬结论

## Project Structure

### Documentation (this feature)

```text
specs/067-action-token-manifest/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│  └── schemas/
│     ├── action-ref.schema.json
│     ├── dev-source.schema.json
│     ├── module-manifest-action.schema.json
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
│  ├── ActionToken.ts                             # ActionToken/ActionCreator（携带 Schema + 稳定 tag；可被反射/序列化）
│  └── internal/
│     ├── module.ts                               # internal types：ActionOf/ReducersFromMap 等随 token/payload-first 对齐
│     ├── reflection/manifest.ts                  # ModuleManifest 提取（扩展 actions/anchors + budgets）
│     └── runtime/
│        ├── ModuleFactory.ts                     # Action union schema：从 ActionToken map 构造（_tag + payload schema）
│        └── core/
│           ├── BoundApiRuntime.ts                # 去 Proxy：暴露 $.actions（creator）与 $.dispatchers（Effect）+ token-first onAction
│           ├── DebugSink.ts                      # Action 事件的 ActionRef 语义对齐/必要时补字段
│           └── ModuleRuntime.dispatch.ts         # actionTag 归一化（_tag 为权威）与 reducer keys/patchPaths 对齐

packages/logix-devtools-react/
└── src/...                                      # 消费 manifest 做 “event → anchor” 映射（按 ROI 选择落地）

packages/logix-sandbox/ or examples/logix-sandbox-mvp/
└── ...                                          # Alignment Lab/Playground 侧的 manifest loader & 展示（可选）

docs/specs/drafts/topics/sdd-platform/
└── 02/15/16...                                  # 本特性引用其裁决；若升级为平台协议再回写 SSoT
```

**Structure Decision**: 核心契约与提取逻辑落在 `@logix/core`；消费与 UI 对齐优先落在 Devtools/Sandbox 的最小载体，避免平台侧过早锁死。

## Complexity Tracking

N/A
