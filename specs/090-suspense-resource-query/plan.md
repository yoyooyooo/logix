# Implementation Plan: 090 Suspense Resource/Query（缓存/去重/预取/取消）

**Branch**: `090-suspense-resource-query` | **Date**: 2026-01-10 | **Spec**: `specs/090-suspense-resource-query/spec.md`  
**Input**: Feature specification from `specs/090-suspense-resource-query/spec.md`

## Summary

目标：为数据获取提供 Suspense 友好的 Resource/Query 语义（缓存/去重/失效/预取/取消），并与 088 Async Action 协调面合流，使“快网无 fallback、慢网有稳定反馈”成为框架层默认能力。

## Deepening Notes

- Decision: `resourceKey` 为稳定字符串（推荐 `resource:<name>:<stableHash(args)>`）（source: `specs/090-suspense-resource-query/spec.md` Clarifications）
- Decision: React 默认 suspend，同时提供显式 degrade 模式（source: `specs/090-suspense-resource-query/spec.md` Clarifications）
- Decision: cache 有界 + LRU，默认 `maxEntries=200`（source: `specs/090-suspense-resource-query/spec.md` Clarifications）
- Decision: invalidate 默认删除缓存条目（不默认 SWR），原因可解释（source: `specs/090-suspense-resource-query/spec.md` Clarifications）
- Decision: 去重共享结果；取消采用引用计数；乱序用 generation guard 丢弃（source: `specs/090-suspense-resource-query/spec.md` Clarifications）
- Decision: 资源事件 schema 固化（Slim/可序列化）（source: `specs/090-suspense-resource-query/contracts/README.md`）

## Dependencies

- 依赖：`specs/088-async-action-coordinator/`（action chain + 取消/稳定标识）
- 相关（只读）：`packages/logix-query/`（领域查询包；本 spec 以其为实现落点候选）

## Technical Context

**Language/Version**: TypeScript 5.9.x（ESM）  
**Primary Dependencies**: pnpm workspace、`effect` v3、`@logixjs/query`、`@logixjs/core`、`@logixjs/react`  
**Storage**: N/A（运行期纯内存缓存；证据落盘到 `specs/090-suspense-resource-query/perf/*`）  
**Testing**: Vitest（Effect-heavy 用 `@effect/vitest`；React 行为/Browser 用 Vitest browser）  
**Target Platform**: Node.js 20+ + modern browsers（headless）  
**Project Type**: pnpm workspace  
**Performance Goals**: 去重/缓存机制不得引入请求风暴或订阅风暴；缓存必须有界且可回收；diagnostics off 近零成本  
**Constraints**: 事务窗口禁 IO；稳定 key 与稳定标识贯穿；事件 Slim/可序列化；forward-only  
**Scale/Scope**: 先落地最小闭环（1–2 种资源类型 + preload + 取消/去重 + 可解释事件），再扩面到更多 Query 组合

## Constitution Check

_GATE: 必须在进入实现前通过；重点是“默认异步但不风暴、不黑盒”。_

- 事务边界：资源 IO 永远在事务外；事务内只写入状态与提交（禁 IO/await）。
- 稳定锚点：resourceKey 必须稳定；资源链路应能与 action run 与 instance/txn 对齐。
- React 无 tearing：资源消费不得引入双真相源；同一 commit 读取一致快照（必要时对齐 tick/外部存储）。
- 去重/取消：必须天然去重与可取消，避免请求风暴；取消/乱序必须可解释。
- 缓存有界：cache entry 必须有界、可回收；listeners=0 必须可 detach。
- 诊断：事件 Slim/可序列化；off 近零成本；on 下可解释关键裁决（去重命中、取消、失效）。
- 性能证据：Node + Browser before/after/diff（至少覆盖一次“多消费者去重 + fallback”场景）。

### Gate Result (Pre-Implementation)

- PASS（spec/plan 固化门槛；实现必须补齐 perf evidence + 事件链路）

## Perf Evidence Plan（MUST）

> 若本特性触及 Logix Runtime 核心路径 / 渲染关键路径 / 对外性能边界：此节必须填写；否则标注 `N/A`。
> 详细口径见：`.codex/skills/logix-perf-evidence/references/perf-evidence.md`

- Baseline 语义：代码前后（before/after）
- envId：darwin-arm64.node20.chrome-headless（以实际采集机为准；before/after 必须一致）
- profile：default（交付）
- collect（before）：`pnpm perf collect -- --profile default --out specs/090-suspense-resource-query/perf/before.<sha>.<envId>.default.json`
- collect（after）：`pnpm perf collect -- --profile default --out specs/090-suspense-resource-query/perf/after.<sha|worktree>.<envId>.default.json`
- diff：`pnpm perf diff -- --before specs/090-suspense-resource-query/perf/before.<sha>.<envId>.default.json --after specs/090-suspense-resource-query/perf/after.<sha|worktree>.<envId>.default.json --out specs/090-suspense-resource-query/perf/diff.before.<sha>__after.<sha|worktree>.<envId>.default.json`
- Suites：至少覆盖 1 条 Node + 1 条 Browser（多消费者去重 + preload vs no-preload + fallback 行为）
- Failure Policy：`comparable=false` 禁止下硬结论；复测必须同 envId/profile/matrixHash

## Project Structure

### Documentation (this feature)

```text
specs/090-suspense-resource-query/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── contracts/
│   ├── README.md
│   └── schemas/
│       ├── resource-event.schema.json
│       └── resource-event-meta.schema.json
├── quickstart.md
├── checklists/
│   └── requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
packages/logix-query/src/
├── Resource.ts（new）
└── Query.ts（extend existing）

packages/logix-react/src/
└── internal/hooks/
   └── (Resource/Query 消费 hooks：suspend + degrade)

packages/logix-core/src/internal/runtime/core/
└── (可选) 与 ActionRun 的绑定/取消语义 glue（避免跨包魔法字段）

packages/logix-devtools-react/src/
└── internal/ui/ (resource lifecycle 视图入口；可选)

apps/docs/content/docs/
└── guide/advanced/
   └── resource-and-suspense.md（新建或落点调整）

examples/logix/src/scenarios/
└── resource-suspense/（新建，用于验收与 perf workload）
```

**Structure Decision**:

- 资源层优先落在 `packages/logix-query`，React 侧只提供消费适配（Viewer）。
- 取消/去重/失效等“裁决点”必须可解释：诊断事件 + 可序列化字段。

## Complexity Tracking

无（若实现需要引入新的缓存淘汰策略/大模块拆分，必须补齐拆解简报与门槛）
