# Implementation Plan: Logix CLI 最小内核 + 自扩展 + 自验证闭环

**Branch**: `103-cli-minimal-kernel-self-loop` | **Date**: 2026-02-27 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/103-cli-minimal-kernel-self-loop/spec.md`

## Summary

将 `logix-cli` 重组为纯控制平面：

- 核心只保留可验证执行协议（Command/Event/State/Result）；
- 项目策略全部外置到扩展运行时（`ext.*`）；
- 构建机器可执行 verify-loop（runtime gate），由外部 bootstrap-loop 读取 `nextActions` 编排“实现->门禁->修复->再验证”闭环；
- 采用 forward-only 演进：不做兼容层，只做迁移包与 fail-fast。

## 规划补充与调整（吸收思想，不照搬实现）

本轮规划在既有基线之上补充以下调整：

1. 吸收“阶段化控制流水线”思想，固化 `parse -> normalize -> validate -> execute -> emit`，但不复制外部项目的实现结构。
2. 吸收“配置优先级透明化”思想，新增覆盖链可解释产物，避免隐式配置漂移。
3. 吸收“前置安全闸”思想，新增 non-TTY 危险写默认拒绝与 preflight 失败前移。
4. 吸收“热重载前再校验”思想，防止策略漂移导致错误提交。
5. 吸收“瞬态错误分类”思想，把 IPC/连接短暂失败映射为 `RETRYABLE(exitCode=3)`。

明确不照搬：

- 不引入时间戳/随机 ID 主键；
- 不采用 `0/1` 粗粒度退出码；
- 不采用“消息字符串即错误契约”；
- 不采用默认 allow 的宽松策略；
- 不采用单体巨型 switch 分发。

## North Stars & Kill Features _(optional)_

- **North Stars (NS)**: NS-3, NS-8, NS-10
- **Kill Features (KF)**: KF-3, KF-8

## Technical Context

**Language/Version**: TypeScript 5.9.x（ESM）  
**Primary Dependencies**: effect v3、@effect/cli、@logixjs/core、@logixjs/sandbox（扩展隔离参考）  
**Storage**: 文件工件（JSON schema / result / evidence / replay）  
**Testing**: Vitest + @effect/vitest + CLI integration tests  
**Target Platform**: Node.js 20+  
**Project Type**: pnpm workspace（`packages/logix-cli`）  
**Performance Goals**: `logix --help` p95 < 500ms；diagnostics=off p95 回归 <= +5%  
**Constraints**: Slim 诊断、稳定标识、事务窗口禁 IO、forward-only、无兼容层  
**Scale/Scope**: 本期仅覆盖 CLI 控制平面与扩展宿主，不实现 Agent 本体

## CLI / Agent Boundary（bootstrap-loop 外部编排）

- CLI（`packages/logix-cli`）只负责：协议执行、结构化 verdict、`nextActions` 输出、可回放证据。
- Agent / bootstrap-loop（仓库外部或 `specs/.../scripts`）负责：读取 `nextActions`、修改代码、触发下一轮 verify、决定停止条件。
- `bootstrap-loop` 不是 CLI 内置命令、不是发布 API、不是 CI 必需运行时；CLI 只保证输出契约稳定。

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- NS/KF 对齐：已在 `spec.md` 记录 NS-3/NS-8/NS-10 与 KF-3/KF-8。  
- Intent→Flow→Runtime 映射：本特性落在 Tool Plane，消费 Runtime 事实，不引入并行真相源。  
- docs-first：先更新 `spec/plan/contracts`，再进入实现。  
- Effect/Logix 契约：新增 CLI 协议层契约，不修改业务 DSL。  
- IR/anchors：沿用统一最小 IR，新增控制面轨迹工件，不创建第二协议。  
- 稳定标识：必须落地 `instanceId/txnSeq/opSeq/attemptSeq`。  
- 事务边界：命令事务窗口禁止 IO；扩展 IO 下沉到受控边界。  
- 内部协议：通过 Extension Host Facade 显式注入，禁 internal import。  
- 性能证据：纳入 before/after perf diff 与硬门。  
- 诊断成本：`off/light/full` 三档，默认 `light`，生产可 `off`。  
- Breaking 迁移：本特性是 forward-only 破坏性升级，强制 migration 文档与校验。  
- Public submodules：保持 `packages/logix-cli/src/*.ts` 仅子模块入口，内部实现在 `src/internal/**`。  
- 质量门：runtime（`gate:type/gate:lint/gate:test/gate:control-surface-artifact/gate:diagnostics-protocol`）用于每轮收敛，governance（`gate:migration-forward-only/gate:ssot-drift/gate:perf-hard`）用于 CI 阻断。

结论：通过（无豁免）。

## 事务窗口边界表（Txn Window）

| 控制阶段 | 是否在 txn 内 | IO 允许 | 约束 |
| --- | --- | --- | --- |
| parse | 否 | 允许只读 | 参数/环境/配置读取与基础解析；失败 fail-fast |
| normalize | 是 | 禁止 | 纯数据归一化 |
| validate | 是 | 禁止 | 纯校验（schema/约束） |
| execute.plan | 是 | 禁止 | 仅计算 state transition 与 action plan |
| execute.effect | 否 | 允许受控 | 执行扩展 hook/子进程/文件与网络 IO，受 capability/预算约束 |
| emit | 否 | 允许 | 序列化 `CommandResult@v2` 与 artifacts 落盘 |
| verify-loop gate-run | 否 | 允许 | 运行 type/lint/test/perf/ssot 等外部门禁命令 |

## Milestones（规划级）

- protocol-core-freeze（协议核冻结）: 完成 `CommandResult@v2 + reason catalog + stable IDs`，并通过合同测试。
- pipeline-observability（控制流水线可观测）: 五段式流水线与配置覆盖链可解释输出落地。
- runtime（verify-loop 收敛门）: 固化 runtime gate（`gate:type/gate:lint/gate:test/gate:control-surface-artifact/gate:diagnostics-protocol`）与 `PASS/VIOLATION/RETRYABLE/NO_PROGRESS` 判定。
- self-bootstrap-readiness（DLI/CLI 自举点）: 外部 Agent 可把 CLI 当作自身执行手段完成“实现->门禁->修复->再验证”自动闭环，并稳定推进后半段任务。
- self-bootstrap-readiness@examples-real（examples/CI 里程碑）: 在真实 `examples/logix` 项目上跑通 `run -> resume` 多轮自治闭环，CI 阻断门以机读 `verdict.json` 与 `checksums.sha256` 为准。
- extension-hot-reload-readiness（扩展热重载稳态）: `shadow -> healthcheck -> revalidate -> swap -> rollback` 全链路可回归。
- governance（治理阻断门）: 固化 governance gate（`gate:migration-forward-only/gate:ssot-drift/gate:perf-hard`）并接入 CI 默认阻断。

## 后续增量规划（Round 1 辩论收敛）

本节来自 `docs/debates/logix-cli-agent-loop` 的收敛裁决，作为 `103` 的后续实施增量：

- command-truth-readiness：
  - `describe` 从“静态声明”升级为“运行时可执行真相投影”。
  - `trialrun` 从 `NOT_IMPLEMENTED` 升级为可执行。
  - `contract-suite.run/spy.evidence/anchor.index` 进入合并迁移路径并收敛到结构化迁移错误。
- autonomous-loop-readiness：
  - 形成 `examples` 自治闭环门禁链：`gate_static -> gate_dynamic -> gate_contract -> gate_decision -> gate_verdict`。
  - 最小证据包固定化：`trialrun.report.json`、`trace.slim.json`、`evidence.json`、`verdict.json`、`checksums.sha256`。
- governance-hardening：
  - 将“命令合并迁移语义 + 自治闭环门禁 + 证据完整性”接入 CI 阻断。
  - 与 forward-only 迁移文档、reason catalog、perf evidence 一起作为统一治理面。

### 命令分流裁决（后续实现约束）

- 应实现：`trialrun`、`transform.module`（最小原语 + report-first）。
- 应合并并下线独立入口：
  - `contract-suite.run -> ir validate --profile contract`
  - `spy.evidence -> trialrun --emit evidence`
  - `anchor.index -> ir export --with-anchors`
- 旧入口不得继续返回 `CLI_NOT_IMPLEMENTED`，必须返回 `E_CLI_COMMAND_MERGED` 并给出机读 `nextActions`。

### runtime vs governance Gate 分层

| 层级 | 触发时机 | gate 集合 | 失败语义 |
| --- | --- | --- | --- |
| runtime | 本地/Agent 每轮 verify-loop | gate:type/gate:lint/gate:test/gate:control-surface-artifact/gate:diagnostics-protocol | 产出 verdict + nextActions，允许重试收敛 |
| governance | PR/CI 治理关口 | gate:migration-forward-only/gate:ssot-drift/gate:perf-hard | 直接阻断合并，不走自动重试 |

### self-bootstrap 自举点验收口径（硬门）

1. 必须具备统一 verdict 与 nextActions 机读输出（无人工解析字符串）。
2. 必须完成至少一条 E2E 样例：Agent 自动完成 2 轮以上“改-验-改-验”并收敛为 PASS。
3. 必须在 non-TTY 环境稳定运行，不依赖交互确认。
4. 必须保留审计证据：每轮 runId、reasonCode、attempt 轨迹、最终收敛报告可回放。
5. 必须具备 run/resume 一致语义：后续轮次可通过稳定标识链关联到同一闭环轨迹。

## 后续增量规划（Phase 10：真实执行器与自举收敛）

Forward-only 裁决：Phase 10 只做向前演进，不提供兼容层/弃用期；旧脚本若不满足新契约，直接 fail-fast 并由迁移动作修复。

### 主线 A：verify-loop 真实 gate 执行器

- 把 verify-loop 从“fixture 驱动”推进到“runtime+governance 真命令执行”；
- runtime 继续作为每轮收敛门，governance 继续作为 CI 阻断门，但两者都必须由统一执行器落地；
- `gateScope` 只决定 gate 集合，不再决定“是否真实执行”；
- 验收口径：同一目标在 `gateScope=runtime|governance` 下都能产出可重放命令轨迹与结构化 gateResult。

### 主线 B：nextActions canonical DSL + 执行器

- 统一 nextActions 最小 DSL（`id/action/args`，必要时 `preconditions/ext`），禁止仅靠 `action` 字符串硬编码参数；
- bootstrap/autonomous 执行端必须直接消费 DSL，不能维护“命令名 -> 手写参数”双轨映射；
- 机读执行结果必须回写到下一轮输入（闭环链路可追踪）。

### 主线 C：identity 单一真相源

- run/resume 共享同一 identity 分配与推进器；
- `instanceId/attemptSeq/txnSeq/opSeq` 在 `CommandResult`、`verify-loop.report`、`verdict.json` 三处保持同链一致；
- resume 只允许推进 attempt，不允许重置或漂移 instance/txn/op 序列。

### 主线 D：extension CLI 控制面最小接线

- 在 CLI 暴露最小控制面：`extension validate/load/reload/status`；
- 控制面状态统一落盘到 `stateFile`（单一真相源），reload 与 status 都基于该状态文件；
- 所有命令都必须输出 `CommandResult@v2`，并保留审计字段（reasonCode + nextActions）。

### examples/CI 里程碑：self-bootstrap-readiness@examples-real

- 在真实 `examples/logix` 运行 `describe -> ir export -> trialrun -> verify-loop(run/resume) -> verdict`；
- 至少完成 2 轮闭环（含一次 resume），最终 `finalVerdict=PASS`；
- CI 增加阻断 job：`self-bootstrap-readiness@examples-real`，失败即阻断合并。

## 风险与对策（规划级）

- 风险 R1：协议升级影响现有调用方。
- 对策：forward-only 迁移包 + fail-fast 提示 + 示例脚本同步更新。
- 风险 R2：verify-loop 误报导致迭代阻塞。
- 对策：reason catalog 分级 + RETRYABLE 分类 + 回归样本持续扩容。
- 风险 R3：扩展热重载引入不稳定。
- 对策：二次策略校验 + 观察窗回滚 + 资源预算硬限制。

## Perf Evidence Plan（MUST）

- Baseline 语义：代码前后对比  
- envId：`macos-arm64.node20`（本地） + `linux-x64.node20`（CI）  
- profile：`default`（交付）  
- collect(before)：`pnpm perf collect -- --profile default --out specs/103-cli-minimal-kernel-self-loop/perf/before.<sha>.json`  
- collect(after)：`pnpm perf collect -- --profile default --out specs/103-cli-minimal-kernel-self-loop/perf/after.<sha>.json`  
- diff：`pnpm perf diff -- --before <before> --after <after> --out specs/103-cli-minimal-kernel-self-loop/perf/diff.<sha>.json`  
- Failure Policy：`comparable=false` 或 `regressions>0` 直接阻断，不给“仅报告”通道。

## Project Structure

### Documentation (this feature)

```text
specs/103-cli-minimal-kernel-self-loop/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── control-envelope.md
│   ├── reason-catalog.md
│   ├── extension-runtime.md
│   ├── verify-loop.md
│   └── schemas/
│       ├── command-result.v2.schema.json
│       ├── extension-manifest.v1.schema.json
│       ├── verify-loop.input.v1.schema.json
│       └── verify-loop.report.v1.schema.json
├── checklists/
│   └── requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
packages/logix-cli/
├── src/
│   ├── Commands.ts
│   ├── internal/
│   │   ├── protocol/
│   │   ├── runtime/
│   │   ├── extension-host/
│   │   ├── verify-loop/
│   │   └── commands/
│   └── bin/logix.ts
└── test/
    ├── Contracts/
    └── Integration/
```

**Structure Decision**: 采用“最小协议核 + 扩展宿主 + verify-loop”三层，避免核心命令继续承载策略。

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| None | N/A | N/A |
