# Implementation Plan: 057 ReadQuery/SelectorSpec + SelectorGraph（静态 deps / 无 Proxy）

**Branch**: `057-core-ng-static-deps-without-proxy` | **Date**: 2025-12-28 | **Spec**: `specs/057-core-ng-static-deps-without-proxy/spec.md`  
**Input**: Feature specification from `specs/057-core-ng-static-deps-without-proxy/spec.md`

## Summary

本特性把“读状态（selector）”从黑盒函数，升级为可编译/可缓存/可诊断的协议与执行机制：

- ReadQuery/SelectorSpec：声明 deps + select + equals + debugKey + selectorId
- 车道：AOT（可选）→ JIT（默认）→ Dynamic（兜底），并把 lane/fallbackReason 协议化
- struct memo：对象字面量 selector 默认复用引用（避免强制 shallow）
- SelectorGraph：commit 时基于 dirtyRoots/dirtyPaths 精准重算与通知
- strict gate：CI/perf gate 下可把 dynamic 回退升级为失败

## Deepening Notes

- Decision: selectorFn 元数据只读取 `debugKey`/`fieldPaths`（source: spec clarify AUTO）
- Decision: JIT 子集仅覆盖 `s.a.b` 与 `{ k: s.a }` 两类投影，其余一律 dynamic（source: spec clarify AUTO）
- Decision: reads 初期使用 canonical fieldPath string（点分标识符段；不含 bracket/index），number 仅预留 pathId（source: spec clarify AUTO）
- Decision: static lane 的 selectorId 仅从 reads/shape 导出；dynamic lane 的 selectorId 仅 best-effort（source: spec clarify AUTO）
- Decision: `unstableSelectorId` 作为高碰撞风险标记，strict 可 FAIL，且不得启用 selectorGraph 缓存（source: spec clarify AUTO）
- Decision: struct memo 默认 `equalsKind=shallowStruct`（字段按 `Object.is` 比较，全等复用引用）（source: spec clarify AUTO）
- Decision: strict gate 在编译/注册阶段判定，失败允许 `txnSeq=0` 表示 assembly（source: spec clarify AUTO）
- Decision: Devtools 口径统一称 `debugKey`（若 on-wire 为 `selectorKey`，视为同义别名）（source: spec clarify AUTO）

## Existing Foundations（本特性直接复用的“现成地基”）

- React selector 基线：`packages/logix-react/src/internal/hooks/useSelector.ts`
  - 订阅实现：`useSyncExternalStoreWithSelector`
  - 可选诊断：dev/test 或 devtools enabled 时发 `trace:react-selector`（携带 `debugKey(field=selectorKey?)/fieldPaths` 等）
- 外部订阅基线：`packages/logix-react/src/internal/store/ModuleRuntimeExternalStore.ts`
  - 订阅源：`moduleRuntime.changesWithMeta((s) => s)`（每次 commit 推送整棵 state 快照）
  - 调度：按 `meta.priority` 做 normal(microtask) / low(raf/timeout) 合并 flush
- Dirty-set 地基：`packages/logix-core/src/internal/runtime/core/StateTransaction.ts` + `packages/logix-core/src/internal/field-path.ts`
  - 事务内维护 `dirtyPaths:Set<string>`（与 instrumentation 无关）
  - 可降级为 `dirtyAll`（并有 reason），供 converge/validate 与未来 selectorGraph 共用
- Devtools 事件地基：`packages/logix-core/src/internal/runtime/core/DebugSink.ts`
  - 已支持 `trace:react-render/trace:react-selector` 的 Slim 裁剪（light/full）
  - 已对 `trace:react-render` 做“与最近一次 state:update 对齐 txn”的 UI 兜底逻辑（react-selector 仍需补齐）

## Technical Context

**Language/Version**: TypeScript 5.8.x（ESM）  
**Primary Dependencies**: pnpm workspace、`effect` v3、`@logix/core`、`@logix/react`、Devtools/Sandbox（消费证据）  
**Storage**: N/A（内存态）  
**Testing**: Vitest（Effect-heavy 优先 `@effect/vitest`；禁止 watch）  
**Target Platform**: Node.js 20+ + modern browsers  
**Project Type**: pnpm workspace（`packages/*` + `apps/*` + `examples/*`）  
**Performance Goals**:

- 读状态默认路径不再依赖 Proxy 逐次读取追踪；commit 侧可复用 dirty-set 做精准通知与缓存（证据裁决）
- `diagnostics=off` 下新增诊断能力接近零成本；`light/full` 下事件 Slim 且可序列化

**Constraints**: 统一最小 IR（Static IR + Dynamic Trace）+ 稳定锚点；事务窗口禁 IO；`diagnostics=off` 近零成本  
**Scope**: 优先覆盖 `useSelector` / `FlowRuntime.fromState` 的常见读状态模式；AOT 插件作为可选加速器，不作为可用性的前置条件

## Perf Evidence Plan（MUST）

- Baseline 语义：before=变更前（未引入 SelectorGraph/struct memo 默认化），after=变更后（本特性落地）；必须同机同配置、同 profile。
- Matrix SSoT：`.codex/skills/logix-perf-evidence/assets/matrix.json`（当前 `priority=P1`：`watchers.clickToPaint`、`converge.txnCommit`）。
- Hard conclusion：`profile=default`（`quick` 仅线索；需要更稳可用 `soak` 复核）。
- 采集隔离：before/after/diff 必须在独立 `git worktree/单独目录` 中采集；混杂工作区结果仅作线索不得用于宣称 Gate PASS。

**Collect (Browser / P1 minimal)**:

- `pnpm perf collect -- --profile default --files packages/logix-react/test/browser/watcher-browser-perf.test.tsx --files packages/logix-react/test/browser/perf-boundaries/converge-steps.test.tsx --out specs/057-core-ng-static-deps-without-proxy/perf/before.browser.legacy.dynamic.<envId>.default.json`
- `VITE_LOGIX_PERF_KERNEL_ID=core-ng pnpm perf collect -- --profile default --files packages/logix-react/test/browser/watcher-browser-perf.test.tsx --files packages/logix-react/test/browser/perf-boundaries/converge-steps.test.tsx --out specs/057-core-ng-static-deps-without-proxy/perf/after.browser.selectorGraph.<envId>.default.json`

**Collect (Node / P1 minimal)**:

- `NODE_OPTIONS=--expose-gc pnpm perf bench:traitConverge:node -- --profile default --out specs/057-core-ng-static-deps-without-proxy/perf/before.node.legacy.dynamic.<envId>.default.worktree.gc.json`
- `NODE_OPTIONS=--expose-gc LOGIX_PERF_KERNEL_ID=core-ng pnpm perf bench:traitConverge:node -- --profile default --out specs/057-core-ng-static-deps-without-proxy/perf/after.node.selectorGraph.<envId>.default.worktree.gc.json`

**Diff**:

- `pnpm perf diff -- --before <before.browser.json> --after <after.browser.json> --out specs/057-core-ng-static-deps-without-proxy/perf/diff.browser.legacy__selectorGraph.<envId>.default.json`
- `pnpm perf diff -- --before <before.node.json> --after <after.node.json> --out specs/057-core-ng-static-deps-without-proxy/perf/diff.node.legacy__selectorGraph.<envId>.default.worktree.gc.json`

**Pass criteria**:

- before/after `matrixId+matrixHash` 一致，且 diff `comparability.comparable=true`
- 所选 suites 上 diff `summary.regressions==0`

## Kernel support matrix

- `core`: supported
- `core-ng`: supported（协议层）：ReadQuery 协议落在 `@logix/core`；本特性不要求存在 `@logix/core-ng` 实现包，但必须保证协议不绑定当前内核细节，便于未来通过 045 的内核注入机制替换实现

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### Answers (Pre-Design)

- **Intent → Flow/Logix → Code → Runtime**：ReadQuery/SelectorGraph 属于 Runtime 层“读状态协议化”，让 React/Flow 的读依赖可推导/可缓存/可解释，并能映射回事务提交（txn）。
- **Docs-first & SSoT**：观测协议/可序列化锚点与最小 IR 的裁决入口：`specs/016-serializable-diagnostics-and-identity/`、`specs/005-unify-observability-protocol/`；NG 路线治理入口：`specs/046-core-ng-roadmap/`。
- **IR & anchors**：本特性必须把 selector 的“读依赖与车道”协议化为 Static IR（`selectorId/reads/lane/producer/fallbackReason/equalsKind`）+ Dynamic Trace（eval 事件）；并能与事务锚点对齐（`moduleId/instanceId/txnSeq`；`opSeq` 可选）。
- **Deterministic identity**：static lane 的 `selectorId` 必须可复现（禁止随机/时间）；无法产出稳定 id 时必须降级为 dynamic（并写入 `fallbackReason`），严格门禁下可失败。
- **Transaction boundary**：JIT 编译/静态化必须发生在装配期或事务外；事务窗口内只允许纯计算与最小化事件写入（禁 IO/async）。
- **Dual kernels**：ReadQuery 协议与 Debug/证据字段必须落在 `@logix/core`；core-ng 只能在不改变协议的前提下提供更优实现；消费方（react/devtools/sandbox）不得直接依赖 core-ng。
- **Performance budget**：新增 SelectorGraph/默认 struct memo 会触及热路径；必须用 `$logix-perf-evidence`（Node+Browser）落盘 before/after/diff（suites/budgets SSoT=matrix.json，至少覆盖 `priority=P1`；硬结论至少 `profile=default`；before/after 需 `matrixId+matrixHash` 一致且 diff `comparability.comparable=true`，并要求 `summary.regressions==0`）；证据采集必须隔离（独立 `git worktree/单独目录`），否则不得用于宣称 Gate PASS；并能解释 lane 覆盖率变化与开销变化。
- **Diagnosability & explainability**：Devtools 必须能回答“哪个 selector 走了哪条车道/为何降级/在什么 txn 上发生”；且 off 档位接近零成本、light/full 事件 Slim 可序列化。
- **User-facing mental model**：对外需形成 ≤5 关键词：`lane`、`fallbackReason`、`strict gate`、`selectorId`、`struct memo`；并给出“默认写法 → 自动优化 → 观测 → 显式 ReadQuery/声明 deps → strict gate”优化梯子。
- **Breaking changes**：允许 API 形态变化；本特性更偏“优化与可解释性增强”，但默认 struct memo 可能改变重渲染行为（更多复用、更少 render），需在用户文档中解释。
- **Quality gates**：合并前至少通过 `pnpm typecheck`、`pnpm lint`、`pnpm test`；本特性关键节点必须附带 perf evidence（隔离采集：独立 `git worktree/单独目录`）。

### Gate Result (Pre-Design)

- PASS（本阶段产物为协议/设计；实现阶段的任何热路径改动必须接受证据门禁）

## Project Structure

### Documentation (this feature)

```text
specs/057-core-ng-static-deps-without-proxy/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
└── tasks.md
```

### Source Code (repository root)

```text
packages/logix-core/src/ReadQuery.ts
packages/logix-core/src/internal/runtime/core/ModuleRuntime.ts
packages/logix-react/src/internal/hooks/useSelector.ts
packages/logix-devtools-react/** (consumers)
```

**Structure Decision**:

- ReadQuery 协议对外落在 `@logix/core`（public submodule），避免在 react/devtools 侧形成并行真相源。
- SelectorGraph 属于“module instance 内核结构”，默认放在 `@logix/core` 的 internal/runtime/core（不对外导出），由 commit/dirty-set 驱动。
- React 侧保持“用户仍可传函数 selector”的写法；是否进入 static lane 由 ReadQuery 编译器决定，并提供严格门禁兜底。

## Design（关键机制与落点）

### 1) ReadQuery/SelectorSpec：协议与两层产物（Runtime 结构 vs Static IR）

约束：统一最小 IR 只接受可序列化结构；selector 的闭包/函数不可进入 IR。

- **Runtime 结构（不可序列化）**：用于执行与缓存
  - `selectorId`（稳定 id）
  - `reads`（依赖集合：FieldPath/PathId）
  - `select(state)`（投影函数）
  - `equals(prev, next)`（比较策略；struct 默认 shallow）
  - `debugKey`（可读名称；用于 Devtools 聚合）
- **Static IR（可序列化）**：用于 Devtools/证据/对照验证
  - `selectorId/debugKey`
  - `reads`（建议使用 canonical fieldPaths 或 pathIds；禁止事务内 join/split）
  - `lane`（`static|dynamic`）+ `producer`（`aot|jit|manual|dynamic`）
  - `fallbackReason?`（dynamic 必填；static 可空）
  - `equalsKind`（`objectIs|shallowStruct|custom`）

### 2) Lane（AOT/JIT/Dynamic）与回退可观测

- **默认策略**：不装插件仍可用；优先 JIT 静态化；失败则 dynamic。
- **回退要求**：任何 dynamic 回退必须能解释（`fallbackReason`），并在 strict gate 下可升级为失败。
- **建议的 fallbackReason（最小枚举）**：
  - `missingDeps`：无声明 deps，且 JIT 无法解析
  - `unsupportedSyntax`：存在分支/调用/解构等不在子集内的语法
  - `unstableSelectorId`：无法产出稳定 selectorId（strict 下直接失败）

### 3) JIT 静态化（无插件仍可用）的最小策略

优先级（从强到弱）：

1. 显式 ReadQuery（未来推荐路径）
2. 函数 selector 上的元数据：`debugKey` / `fieldPaths`
3. best-effort 的“常见子集”解析（目标覆盖：`s => s.a`、`s => s.a.b`、`s => ({ a: s.a, b: s.b })`）
4. dynamic lane（兜底）

校验（仅 dev/test 或 strict 场景）：

- 允许在事务外做一次 deps-trace 校验（例如对 selector 做一次“实际读取集合”采样），与声明/解析结果比对；
- 不一致则降级 dynamic，并写入结构化 diagnostic（禁止靠 console 日志）。

### 4) SelectorGraph：commit 驱动的精准重算与缓存

目标：避免 React 侧“每个组件各算一遍 selector”，把重算收敛到 module instance 内一次。

- **输入**：`StateTransaction.dirtyPaths`（已存在）+ commit meta（txnSeq/txnId/priority）
- **索引**：`reads -> selectors` 反向索引（支持 roots overlap 判定）
- **缓存**：每个 selectorId 缓存 `value + lastTxnSeq + costDigest(可选)`；commit 时只重算 overlap 的 selector
- **通知**：只在 selector 结果变化时通知订阅者；并复用现有 normal/low 的 flush 调度

与 039/050 的关系（避免漂移）：

- 057 初期允许 `reads` 以 canonical fieldPath string 表达；
- 050/039 推进后，逐步升级为 pathId/registry 驱动（事务内禁止字符串往返）。

### 5) React Integration：保持写法不变，但能自动进入静态车道

- **对用户**：继续允许 `useSelector(handle, (s) => s.count)` / `useSelector(handle, (s) => ({...}))`
- **对内部**：把函数 selector 编译成 ReadQuery（若成功进入 static lane，则走 SelectorGraph；否则走 legacy dynamic）
- **struct memo 默认化**：当 selector 返回 plain object 时默认采用 shallow 语义（复用引用，避免无意义 render）

### 6) Devtools 配合：清晰展示“车道/降级/成本/因果链”

事件与展示最小闭环：

- React 侧：扩展 `trace:react-selector` 的 meta，至少包含 `selectorId/lane/producer/fallbackReason/readsDigest`（light 档位保持 Slim）
- Runtime 侧：新增 selector eval 事件（例如 `trace:selector:eval`），在 commit 内发出并携带 `selectorId/lane/readsDigest`，以便把 txn → selector → render 串成因果链
- DebugSink / Devtools UI：为避免 “Read Lanes / Txn Lanes” 两套证据与 UI 口径并行，本部分的 DebugSink 投影与 Devtools 汇总视图由 `specs/060-react-priority-scheduling/` 统一交付；本 spec 只保证 React/Runtime 侧能产出稳定、可序列化的车道字段。

## Deliverables by Phase

- **Phase 0（research）**：`research.md`（JIT 子集/selectorId 策略/Devtools 事件契约/SelectorGraph 与 dirty-set 对齐）
- **Phase 1（design）**：`data-model.md`、`contracts/*`、`quickstart.md`（把协议、证据字段与实现落点固化为可交接事实源）
- **Phase 2（tasks）**：由 `$speckit tasks 057` 维护（本阶段不产出）

### Gate Result (Post-Design)

- PASS（已补齐 `research.md`/`data-model.md`/`contracts/*`/`quickstart.md`；所有新增协议均以“可序列化证据 + 稳定锚点 + off 近零成本”为约束）
