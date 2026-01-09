# Implementation Plan: ReadQuery.createSelector（reselect 风格组合器）

**Branch**: `074-readquery-create-selector` | **Date**: 2026-01-05 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `specs/074-readquery-create-selector/spec.md`

## Summary

交付一个“显式 deps 的静态选择器组合器”：

- `@logixjs/core` 新增 `ReadQuery.createSelector`（公共 API），用于把多个 **静态** ReadQuery 组合成一个新的 ReadQuery：
  - `reads = union(inputs.reads)`，并产出稳定 `readsDigest`；
  - 任一输入退化 dynamic 或缺失 `readsDigest` → 默认 fail-fast（防止伪静态）；
  - 支持 `equalsKind`（默认 `objectIs`，可选 `shallowStruct/custom`）。

该能力与 073 的 topic 分片订阅相交：它提供更稳定的 `readsDigest` 输入源，但不耦合到 073 的实现节奏。

## Deepening Notes（决策硬化）

- Decision: 不引入 proxy-memoize（Proxy 追踪 reads）——与 `057-core-ng-static-deps-without-proxy` 冲突，且无法形成可导出 Static IR。
- Decision: 不引入 reselect 依赖；只采纳“inputs + resultFn”心智，在 `ReadQuery` 内实现最小可用组合器。
- Decision: correctness-first：任一输入 dynamic 时禁止生成 static 输出（否则 reads 不完整会出现 stale）。
- Decision: `selectorId` 必须确定性：由稳定输入（inputs 的 `selectorId/readsDigest` + debugKey + 可选 params）计算；不得使用随机/时间默认；不得落入 `rq_u*`。
- Decision: 组合器不解决参数化 selector（例如 `byId(id)`）；需要另开需求讨论如何把参数纳入 deps/IR。

## Technical Context

**Language/Version**: TypeScript 5.9.x（ESM）  
**Primary Dependencies**: `effect` v3，`@logixjs/core`  
**Storage**: N/A  
**Testing**: Vitest（logix-core tests）  
**Target Platform**: Node.js + browsers（纯 TS runtime）  
**Project Type**: pnpm workspace（`packages/*`）  
**Performance Goals**: 不引入 Proxy/动态追踪；组合器构造成本 O(sum(reads))；SelectorGraph 评估策略不变。  
**Constraints**: 统一最小 IR（Static IR + Dynamic Trace）；标识去随机化。  
**Scale/Scope**: 主要面向 selector 数量大、commit 频繁的场景，避免 dynamic lane 带来的“每次 commit 都 eval”。

## Kernel support matrix

- `core`: supported（公共 API 在 `@logixjs/core`）
- `core-ng`: supported（不引入 core-ng 直接依赖；Static IR 结构沿用现有 ReadQueryStaticIr）

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### Answers (Pre-Design)

- **Intent → Flow/Logix → Code → Runtime**：此特性位于 Runtime/React 订阅链路的“读依赖表达层”：把 selector 组合从“闭包+推断”升级为“显式 deps + 静态 IR”。
- **Docs-first & SSoT**：依赖 `057-core-ng-static-deps-without-proxy`、`060-react-priority-scheduling`（使用侧会受益）；不改动平台协议。
- **IR & anchors**：不引入新的 selector-like IR；复用 `ReadQueryStaticIr`（selectorId/reads/readsDigest/equalsKind）。
- **Deterministic identity**：`createSelector` 产出的 selectorId 必须确定性（禁止随机序号），并可用于诊断锚点。
- **Transaction boundary**：不涉及 txn/IO；纯 selector 构造与评估，遵循“selector 纯函数、不 throw”约束。
- **React consistency / no tearing**：不直接触及 React；但通过减少 dynamic lane 为 073 的 runtime-store 分片订阅提供更稳定输入。
- **Breaking changes（forward-only）**：新增 API，无 breaking；迁移仅为“建议把闭包 selector 改为 createSelector”。
- **Public submodules**：`ReadQuery` 已是公共子模块；新增导出必须保持 `src/*.ts` 子模块铁律，内部实现留在 `src/internal/**`。
- **Quality gates**：需要新增单测覆盖：static union、fail-fast、selectorId 稳定性等。

### Gate Result (Pre-Design)

- PASS

## Perf Evidence Plan（MUST）

N/A（本特性不改变 SelectorGraph 的评估/通知机制；仅新增一个构造器 API）。  
若后续在实现中不得不修改 `ReadQuery.compile`/`SelectorGraph` 行为，则回退补齐 perf evidence（至少证明 `ReadQuery.compile` 与 `SelectorGraph.onCommit` 无回归）。

## Project Structure

### Documentation (this feature)

```text
specs/074-readquery-create-selector/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── public-api.md
│   ├── semantics.md
│   └── migration.md
├── tasks.md
└── perf/
```

### Source Code (repository root)

```text
packages/logix-core/
├── src/
│   ├── ReadQuery.ts                               # CHANGE: export createSelector
│   └── internal/runtime/core/ReadQuery.ts         # CHANGE: implement createSelector (no proxy)
└── test/
    └── ReadQuery/ReadQuery.createSelector.test.ts # NEW: static union + fail-fast + id determinism
```

**Structure Decision**: 组合器作为 ReadQuery 的一等 API 暴露（用户/内部共用），实现下沉 `src/internal/**`，测试落在 logix-core 既有 `test/ReadQuery/*` 体系中。
