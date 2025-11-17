# Implementation Plan: 并发护栏与预警（限制无上限并发）

**Branch**: `021-limit-unbounded-concurrency` | **Date**: 2025-12-21 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/Users/yoyo/Documents/code/personal/intent-flow/specs/021-limit-unbounded-concurrency/spec.md`

## Summary

本特性为 Logix Runtime 引入“并发控制面”的最小闭环：

- 默认将并行事件处理从“无上限并发”收敛为“有上限并发”（默认 16），避免 fiber/任务无限增长导致卡死或崩溃。
- 保留显式 opt-in 的“无上限并发”能力，但必须伴随高严重度风险提示与可审计证据。
- 在并发压力（积压/等待）异常时输出结构化诊断信号（含 `configScope`），形成可预警、可定位、可调优的闭环。
- 业务 action / 关键 task 通道为必达（不能丢）：当达到背压上界时通过背压让入口变慢，而不是继续堆内存或以 `queue full` 拒绝；背压等待不得发生在事务窗口内。
- 配置入口与 013 控制面保持一致：runtime_default / runtime_module / provider（scope override），下一笔事务/操作窗口生效。

## Technical Context

**Language/Version**: TypeScript 5.8.2 + Node.js 22.21.1  
**Primary Dependencies**: effect v3 (`effect@^3.19.8`) + `@logix/*`（核心落点 `@logix/core`）  
**Storage**: N/A（本特性不引入持久化存储）  
**Testing**: Vitest 4 (`vitest run`) + `@effect/vitest`（Effect-heavy 场景）  
**Target Platform**: Node.js（测试/脚本） + 现代浏览器（React/Devtools 场景）  
**Project Type**: pnpm workspace（`packages/*` + `apps/*` + `examples/*`）  
**Performance Goals**:

- 默认（diagnostics off）：新增护栏/计数逻辑对代表性跑道的影响 ≤ 2%
- 预警：当达到默认阈值时，1s 内产出至少一条可定位告警（见 spec SC-002）
- 并发：默认策略下并行事件处理的 in-flight 不超过 16（见 spec SC-001）
- 背压：必达通道在压力下入口延迟可上升，但运行时内部积压应保持有界（见 spec SC-006）
  **Constraints**:
- 诊断事件必须 slim、可序列化；diagnostics off 接近零成本
- 诊断/Devtools/Trace 通道允许采样/降噪/降级，但必须可观测且不得反向拖垮业务通道
- 复用稳定 identity（moduleId/instanceId/txnSeq/opSeq/linkId），禁止随机/时间默认
- 严格事务边界：事务窗口内不得长耗时 IO/async  
  **Scale/Scope**:
- 目标是防止“异常场景资源无限增长”，并提供可观测/可调参的控制面；
- 不自动改写业务代码内部的并发实现（如用户手写 `Effect.all({ concurrency: "unbounded" })`）。

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- `Intent → Flow/Logix → Code → Runtime`：该特性属于 Runtime 调度策略与诊断协议的扩展；直接影响 Flow/Task 的并发执行语义与诊断输出。
- 依赖与文档优先：控制面语义与覆盖优先级复用 013 的“控制面”口径；用户侧文档落点预计在 `apps/docs/content/docs/guide/advanced/*`（与性能/优化梯子保持一致）。
- 契约变化：引入新的“并发控制面”配置与诊断信号（属于 Runtime 公共 API + 诊断协议）；需要在 runtime-logix 文档中固化新的契约与最佳实践入口。
- IR & anchors：不新增第二套 IR；诊断信号复用既有 Debug/diagnostic 事件通道与稳定 identity 字段。
- Deterministic identity：事件必须包含 moduleId/instanceId，并补充 `configScope`；不引入随机/时间作为 identity（时间仅作为时间戳）。
- Transaction boundary：并发护栏与预警不得在事务窗口内引入长耗时等待；若需要采样/统计，必须可在 diagnostics off 时近零开销。
- Lossless backpressure：业务通道不能丢且必须有界；背压等待不得发生在事务窗口内（入口外侧或 post-commit）。诊断通道可降级但需可解释。
- Internal contracts & DI：配置/策略必须通过 Tag/Layer 注入与覆盖；避免新增散落的 `runtime.__*` 字段依赖（如需过渡 shim，必须集中在统一访问入口并写迁移说明）。
- Performance budget：触及 hot path（Flow/Task 事件处理）；复用 014 跑道做 Before/After，对关键指标建立回归防线（至少 quick profile）。
- Diagnosability cost：diagnostics off 不引入显著分配；diagnostics on 的采样频率与 payload 大小必须有上界与降噪策略。
- 用户心智模型：关键词（≤5）= `并发上限` / `无上限 opt-in` / `积压预警` / `配置来源` / `调优梯子`；并与文档/诊断字段对齐。
- Breaking changes：默认并行处理从 unbounded → bounded（16）属于行为变更；通过迁移说明提供恢复旧行为的显式 opt-in（不提供兼容层）。
- Quality gates：`pnpm typecheck`、`pnpm lint`、`pnpm test`（必要时加 `pnpm perf collect:quick` 作为证据采集）。

## Project Structure

### Documentation (this feature)

```text
specs/021-limit-unbounded-concurrency/
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
├── Runtime.ts                              # Runtime 配置入口（新增并发控制面入口 + override layer）
└── internal/runtime/
   ├── ModuleRuntime.ts                     # actions$ 来源与 moduleId/instanceId identity
   ├── ModuleRuntime.dispatch.ts            # action publish 分层（事务窗口外背压）与诊断提示
   ├── ModuleRuntime.txnQueue.ts            # 入口队列背压（有界）与等待位置约束
   └── core/
      ├── env.ts                            # 控制面 service（Tag/Overrides）落点
      ├── FlowRuntime.ts                    # runParallel 默认并发从 unbounded → bounded（可配置）
      ├── TaskRunner.ts                     # parallel/exhaust 默认并发从 unbounded → bounded（可配置）
      └── DebugSink.ts                      # 诊断信号通道（复用 diagnostic 事件类型）

apps/docs/content/docs/guide/advanced/
└── (新增或更新) concurrency-control-plane.md / performance-and-optimization.md

packages/logix-core/test/
└── (新增) ConcurrencyPolicy.*.test.ts
```

**Structure Decision**: Runtime hot-path 改动集中在 `@logix/core`；对外说明与最佳实践落在 `apps/docs`；测试以 core 单测为主，性能证据复用 014 跑道。
