# 迁移路线与执行方案（Effect v4，v4-only）

## 1. 执行总原则

- 不做 v3/v4 双栈，不做兼容层，不设弃用期。
- 允许重构既有实现思路，以 v4 原生能力重塑 runtime 架构。
- 所有阶段以“可证据化门禁”推进：类型、测试、性能、诊断四条线并行。
- STM（Tx*）只做局部 PoC，且滞后半步插入，不阻断主线。
- 启动前置条件：`feat/perf-dynamic-capacity-maxlevel` 合入 `main` 后，才进入 v4 实施阶段。

## 2. 分阶段路线图

| Stage | 目标 | 核心产物 |
|---|---|---|
| P-1 | Perf 前置收口（阻塞门） | `inventory/perf-prerequisite.md`、workflow/scripts 核验记录 |
| S0 | 冻结基线与命中台账 | API 命中清单、perf before、诊断快照 |
| S1 | 依赖与工具链收敛 | v4 版本矩阵、workspace 依赖统一策略 |
| S2 | `logix-core` 语义主干迁移 | Service/Reference/Runtime/Cause 主干完成 |
| S3 | STM 局部 PoC（受控插入） | `WorkflowRuntime` + `ProcessRuntime` PoC 与 go/no-go 结论 |
| S4 | 基础设施包迁移 | `logix-react/sandbox/i18n/query/form/domain/cli` |
| S5 | apps/examples/docs/SSoT 收口 | 应用、示例、中文文档与 SSoT 对齐 |
| S6 | 1.0 发布闸门 | 全仓门禁通过 + breaking changes 发布稿 |

## 3. 模块级改造策略

## 3.1 API 级调整（可机械迁移）

- `Effect.catchAll -> Effect.catch`
- `Effect.catchAllCause -> Effect.catchCause`
- `Effect.fork -> Effect.forkChild`
- `Effect.forkDaemon -> Effect.forkDetach`
- `Scope.extend -> Scope.provide`

说明：虽然可机械替换，但必须通过并发与错误语义回归。

## 3.2 底层重构（必须重写）

- `Context.* -> Context.Tag / Tag class`
- `FiberRef/Effect.locally -> Context.Reference/Effect.provideService`
- Runtime 运行边界（散落 `run*` 调用收敛）
- Cause 扁平化下的诊断因果表达
- Layer memoization 隔离策略（`local: true` / `Layer.fresh`）

## 3.3 Schema v4 专项轨道（并入主线）

- P0：`logix-form` 错误格式化链路（去 `ParseResult.TreeFormatter`）。
- P0：`logix-core` schema 安全解码路径（`onAction(schema)`）。
- P1：`logix-query` 动态 Union/Literal 迁移。
- P1：`apps/docs` 示例语法收口与防回归检查。
- P2：`domain` 与 `galaxy-api` 契约语法迁移与导出试点。

## 4. Stage Gate（硬门禁）

## G0（S0 后）

- 命中台账、perf before、诊断快照都已落盘。
- 证据目录结构固定，命名可复现。

## GP-1（P-1 后）

- 已确认 `origin/main` 包含前置分支关键改动。
- perf quick/sweep workflow 关键配置（strict diff、dynamic capacity、tail recheck、time guard）已就位。
- 关键脚本链路可调用并记录到 `inventory/perf-prerequisite.md`。

## G1（S2 后，core P0）

- `packages/logix-core`：`typecheck:test` + `test` 通过。
- v3 关键 API 在 core 生产路径命中为 0。
- 性能预算：
  - `p95` 回归 <= 5%
  - 吞吐回归 <= 3%
  - 内存回归 <= 8%
- 诊断预算：`diagnostics=off` 下新增开销接近 0（目标 <= 1%）。
- Schema gate：
  - 目标模块禁止新增旧语法：`Schema.partial(`、`Schema.Record({ key:`、`Schema.pattern(`
  - `ParseResult.TreeFormatter` 在生产路径清零（至少 `logix-form`）。

## G2（S3 后，STM go/no-go）

- MUST：
  - 不触碰 `ModuleRuntime.transaction` / `TaskRunner` / 外部 IO step 执行体。
  - 正确性回归 100% 通过（无新增乱序、重复提交、重复取消）。
  - 性能不得劣化超出 G1 预算。
- SHOULD（至少满足 2 项）：
  - 目标模块状态迁移代码复杂度下降（分支或 LOC 至少 10%）。
  - 诊断事件可解释性提升（链路字段更完整，排障步骤减少）。
  - 并发一致性测试覆盖提升。

决策规则：
- MUST 任一失败 => `NO-GO`。
- MUST 全过且 SHOULD >= 2 => `GO`。

## G3（S4 后）

- 基础设施包均通过 `typecheck:test` + `test`。
- 与 G2 决策一致：若 `GO` 则仅在批准局部使用 STM；若 `NO-GO` 则不得扩散。

## G4（S5 后）

- apps/examples/docs 仅保留 v4 写法。
- apps/examples/docs 的 Schema 示例仅保留 v4 目标写法。
- `docs/ssot/runtime/*` 与 `docs/ssot/platform/*` 已同步裁决。

## G5（S6 最终）

- 全仓通过：`pnpm typecheck`、`pnpm typecheck:test`、`pnpm lint`、`pnpm test:turbo`。
- 性能与诊断证据可复现，且结论一致。
- 1.0 中文发布稿与 breaking changes 清单齐备。

## 5. 证据策略（Perf + Diagnostics）

## 5.1 目录与命名

- 目录：`specs/103-effect-v4-forward-cutover/perf/`
- 命名：`<stage>.<before|after|diff>.<envId>.<profile>.json`
- profile：`default`（交付）+ `soak`（复核）

## 5.2 可比性规则

- before/after 必须同 envId、同 profile、同 matrix。
- `comparable=false` 时禁止下结论，必须复测。
- 混杂工作区结果仅作线索，不能作为 Gate PASS 证据。
- gate 结论只接受 strict diff（`pnpm perf diff`），不接受 triage diff。
- 建议 Browser + Node 双通道并行保留：前者看端到端体感，后者看 runtime 核心热路径。

## 6. STM 插入点与禁区

## 6.1 允许点位

- `WorkflowRuntime`：ProgramState 运行态仲裁。
- `ProcessRuntime`：实例控制面状态迁移。

## 6.2 严格禁区

- `ModuleRuntime.transaction` 核心事务窗口。
- `TaskRunner` 三段式边界。
- 含外部 IO 的 workflow step 执行体。

## 7. 风险与缓释

- v4 beta 继续漂移：每阶段锁定版本窗口，完成后再升级。
- Cause/layer/fork 语义回归：专项回归测试 + 诊断对照。
- 文档与实现漂移：S5 强制 SSoT 回写与示例复跑。
- STM 误扩散：通过“允许点位白名单 + 禁区黑名单”硬限制。

## 8. 近期可执行下一步

1. 先完成 P-1 前置核验并通过 GP-1。
2. 按 S0 输出基线证据与命中台账。
3. 启动 S1 依赖版本收敛（effect 生态同版本锁定方案）。
4. 进入 S2 `logix-core` 主干迁移，并以 G1 作为第一道硬闸门。

## 9. Tier 辩论收敛（补充）

- 参考：`08-tier-debate-consensus.md`。
- 结论摘要：
  - Tier-1 拆两波（`#2/#1/#3` -> `#4`）。
  - Tier-2 采用 `S2 后段收口 + S3 语义闭环`。
  - Tier-3 不进 1.0 主线，G1 后走受控附加轨道。
- 该补充不改变 S0~S6 主阶段，仅细化 S2/S3 的实施节奏与门禁颗粒度。
