# Implementation Plan: O-021 Module 实例化 API 统一

**Branch**: `102-o021-module-api-unification` | **Date**: 2026-02-26 | **Spec**: `specs/102-o021-module-api-unification/spec.md`  
**Input**: Feature specification from `specs/102-o021-module-api-unification/spec.md`

## Source Traceability

- **Backlog Item**: O-021
- **Source File**: `docs/todo-optimization-backlog/items/O-021-module-instantiation-api-unification.md`

## Summary

收敛 Module 实例化入口，目标是把推荐路径统一为 `build/createInstance`，并保持 runtime 装配契约稳定、诊断可解释、性能不退化；legacy 入口仅在 `writeback` 阶段保留迁移盘点能力，`done` 前必须移除。

## Technical Context

**Language/Version**: TypeScript 5.9.x  
**Primary Dependencies**: `@logixjs/core`, `effect` v3, Vitest  
**Storage**: N/A  
**Testing**: `pnpm test:turbo` + `packages/logix-core` 定向测试  
**Target Platform**: Node.js 20+  
**Project Type**: pnpm workspace  
**Performance Goals**: 实例化热路径关键指标回归 <= 5%  
**Constraints**: forward-only、统一最小 IR、稳定标识、事务窗口禁 IO、诊断事件 Slim  
**Scale/Scope**: `logix-core` API + runtime 装配链路 + 文档/示例迁移

## Constitution Check

_GATE: 进入实现前必须通过，Phase 1 后复核。_

### 补强项（高影响项必填）

- **API breaking**:
  - 删除/替换对象：`live/implement/impl` 三入口（分阶段收口）。
  - 对外裁决：统一入口为唯一推荐路径；legacy 仅允许 `writeback` 过渡并必须触发迁移诊断，`done` 前移除公开可用面。
  - 迁移落点：examples、sandbox、react 适配层、用户文档。
- **性能预算**:
  - 关注热路径：Module 实例化与 Runtime 装配。
  - 预算：p95 延迟与分配回归 <= 5%。
  - 证据：before/after + diff（同环境、同 profile）。
- **诊断代价**:
  - 诊断关闭时接近零成本。
  - 诊断开启时仅保留 Slim 可序列化事件，禁止重 payload 默认常驻。
- **IR/锚点漂移**:
  - 不新增并行 IR；Static IR 与 Dynamic Trace 的实例化锚点统一。
  - 漂移监测点：入口映射、错误事件 code/source、实例锚点关联。
- **稳定标识**:
  - 维持 `instanceId/txnSeq/opSeq` 稳定来源，不使用随机/时间默认值。
- **迁移说明**:
  - 必须交付 `contracts/migration.md` 与文档迁移节。
  - 明确破坏面、替代路径、执行顺序、移除里程碑（`writeback`/`done`）；不保留长期兼容层。

### Gate Result

- PASS（文档计划阶段）

## Perf Evidence Plan（MUST）

- Baseline 语义：before/after
- envId：`darwin-arm64.node22`
- profile：`quick`（当前阶段采用浏览器 perf 子集；结果用于实现阶段门禁）
- collect（before）：
  - `pnpm perf collect -- --profile quick --out specs/102-o021-module-api-unification/perf/before.<sha>.darwin-arm64.node22.quick.json`
- collect（after）：
  - `pnpm perf collect -- --profile quick --out specs/102-o021-module-api-unification/perf/after.<sha>.darwin-arm64.node22.quick.json`
- validate：
  - `pnpm perf validate -- --report specs/102-o021-module-api-unification/perf/before.<sha>.darwin-arm64.node22.quick.json --allow-partial`
  - `pnpm perf validate -- --report specs/102-o021-module-api-unification/perf/after.<sha>.darwin-arm64.node22.quick.json --allow-partial`
- diff：
  - `pnpm perf diff -- --before specs/102-o021-module-api-unification/perf/before.<sha>.darwin-arm64.node22.quick.json --after specs/102-o021-module-api-unification/perf/after.<sha>.darwin-arm64.node22.quick.json --out specs/102-o021-module-api-unification/perf/diff.before__after.node22.quick.json`
- Failure Policy：
  - `comparable=false` 禁止下结论。
  - `stabilityWarning/timeout` 在 `writeback` 阶段允许保留一次（必须在 `perf/README.md` 记录风险与复测命令）；进入 `done` 门禁前必须复测到无该类警告。
  - `missing suite` 在 `quick` 子集允许（需 `validate --allow-partial` 通过，并在 `perf/README.md` 显式记录风险与采样范围）。
  - 当前 `writeback` 阶段允许同 commit 双采样用于链路校验；进入 `done` 前必须补齐跨提交 before/after（不同 commit）对照。

## Project Structure

### Documentation (this feature)

```text
specs/102-o021-module-api-unification/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── api-surface.md
│   ├── diagnostics.md
│   └── migration.md
├── checklists/
│   ├── requirements.md
│   └── migration.md
└── tasks.md
```

### Source Code (repository root)

```text
packages/logix-core/src/
├── Module.ts
├── Runtime.ts
└── internal/runtime/ModuleFactory.ts

examples/logix/
packages/logix-react/
packages/logix-sandbox/
apps/docs/content/docs/
```

**Structure Decision**: 改造集中在 `logix-core` API 与 runtime 装配路径；文档迁移集中在中文文档与示例仓。

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --- | --- | --- |
| N/A | N/A | N/A |
