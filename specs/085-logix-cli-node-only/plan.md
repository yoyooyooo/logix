# Implementation Plan: Logix CLI（085 · Node-only）

**Branch**: `085-logix-cli-node-only` | **Date**: 2026-01-09 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `specs/085-logix-cli-node-only/spec.md`

## Summary

交付一个 Node-only 的 `logix` CLI，作为平台落地前的“基础能力外壳 + 集成测试跑道”，串联：

- IR 导出（Manifest/StaticIR/Artifacts）
- Gate（`ir validate` / `ir diff`：可门禁、可 diff）
- 受控试跑（TrialRunReport）
- AnchorIndex 构建（081）
- Autofill（report/write）（079/082）
- 可选 Transform（`transform module --ops`：batch ops；默认 report-only）

实现原则：尽可能用 `effect` 组织命令与依赖注入（同构）；输出工件 JSON-safe、确定性、可 diff；CLI 本身不接管 bundler/编译器，只做验证与导出。

## Questions Digest（plan-from-questions）

来源：外部问题清单（Q030–Q033）。

- **Q030（统一输出 Envelope）**：所有子命令 stdout 统一输出 `CommandResult@v1`（见 `specs/085-logix-cli-node-only/contracts/`），默认不包含时间戳/随机；各类工件通过 `artifacts[]` 的 `file` 或 `inline` 承载。
- **Q031（Exit Code 规范）**：`0=PASS`、`2=VIOLATION`（门禁/差异/规则违反）、`1=ERROR`（运行失败/异常）。`ok=false` 并不等价于 ERROR：需要区分 violation vs error。
- **Q032（TS/tsconfig 加载）**：入口加载使用 `tsx`（Node ESM TS loader）；Parser/Rewriter（081/082）使用 `ts-morph` 读取同一份 tsconfig（含 paths alias）；CLI 提供 `--tsconfig` 显式覆盖与自动探测。
- **Q033（冷启动预算）**：`logix --help` 与不需要解析的命令必须 lazy-load `ts-morph` 等重依赖；目标 cold start `< 500ms`（先以本机基线测量固化）；解析/索引类命令允许更慢，但必须保持确定性并以结构化摘要可解释（不依赖非结构化日志）。

## Deepening Notes（关键裁决）

- Decision: stdout 默认统一输出 `CommandResult@v1`；不输出时间戳/随机字段（source: spec Clarifications AUTO + Q030）。
- Decision: Exit Code 规范固定为 `0=PASS`、`2=VIOLATION`、`1=ERROR`（source: spec Clarifications AUTO + Q031）。
- Decision: 入口加载用 `tsx`；Parser/Rewriter 用 `ts-morph`（子命令内 lazy-load）；`packages/logix-core` 禁止引入 `ts-morph/swc`（source: spec Clarifications AUTO + Q032）。
- Decision: `logix --help`/不需要解析的命令必须不加载 `ts-morph`，以满足 cold start 预算（source: Q033）。

## Technical Context

**Language/Version**: TypeScript（workspace：5.8.2；以 `package.json` 为准）  
**Primary Dependencies**: `effect` v3、`@logixjs/core`（IR/TrialRun/Manifest）、`@logixjs/anchor-engine`（081/082，计划新增）  
**Storage**: 文件输出（导出工件落盘）；可选 stdout JSON 输出  
**Testing**: Vitest（CLI 作为集成测试跑道：覆盖至少一条 IR 导出 + 一条试跑 + 一条索引 + 一条 report-only）  
**Target Platform**: Node.js 20+  
**Project Type**: pnpm workspace（packages）  
**Performance Goals**: 非解析命令 cold start `< 500ms`（禁止加载 `ts-morph`）；解析/索引命令以可解释收束为准（不触及 runtime 热路径）  
**Constraints**: 单一真相源（写回只改源码锚点字段）、宁可漏不乱补、输出确定性/可序列化/可 diff、超限必须可解释

## Constitution Check

- **定位**：CLI 属于“平台之前的验证/导出入口”，不改变 runtime 语义；它把既有反射/试跑/回写能力统一为可脚本化命令。
- **单一真相源**：CLI 写回能力只能调用 082 rewriter 写回源码锚点字段；不得产生长期 sidecar 真相源。
- **统一最小 IR**：CLI 只导出版本化 JSON 工件（Manifest/Artifacts/TrialRunReport/AnchorIndex/PatchPlan/WriteBackResult）。
- **稳定锚点**：要求显式 `runId`（避免 `Date.now()` 默认）；输出不含时间戳/随机。
- **受控执行**：试跑/采集必须有 timeout/budget；失败必须结构化可解释。
- **启动预算**：不需要解析的命令禁止加载 `ts-morph`（lazy import），以保证 `--help`/基础命令冷启动预算。

## Design

### 1) 子命令集合（MVP）

以“基础能力验证”为目标，MVP 子命令建议（名称可在实现阶段微调，但语义保持稳定）：

- `logix ir export`：导出控制面 Root IR（ControlSurfaceManifest + 可选 slices，例如 `workflowSurface`）与辅助工件（Artifacts；不执行完整业务交互）
- `logix ir validate`：对导出工件做门禁（schema/digest/budgets/Raw Mode 统计/锚点规则）
- `logix ir diff`：对两份工件目录/文件做稳定 diff（输出 reason codes；用于 CI gate）
- `logix trialrun`：输出 TrialRunReport（受控窗口 + 资源收束）
- `logix anchor index`：输出 AnchorIndex@v1（081）
- `logix anchor autofill`：输出 PatchPlan/WriteBackResult（082），并在 `--mode write` 时写回源码锚点字段（079 规则）
  - 默认 `--mode report`（不写回）
  - 明确 `--mode write`（才写回）
- `logix transform module --ops <delta.json>`：对 Platform-Grade 子集内的 Module 做 batch ops（默认 report-only；门槛同 082）

### 2) 输出工件形态（stdout + files）

原则：既能“脚本化抓 stdout”，也能“稳定落盘供 CI diff / 平台消费”。

- stdout：统一输出单个 JSON（`CommandResult@v1`），避免各子命令格式漂移；不输出时间戳/随机字段。
- files：支持 `--out <dir>`；文件命名策略必须稳定且可预测（例如 `control-surface.manifest.json`、`workflow.surface.json`、`trialrun.report.json`、`anchor.index.json`、`patch.plan.json`、`writeback.result.json`、`autofill.report.json`）。

### 3) 复用/迁移现有脚本（DRY）

仓库现状已有 Node-only 脚本可复用：

- `scripts/ir/inspect-module.ts`：已包含 `Effect` 组织与参数解析雏形（runId/config/timeout/budgets）。

计划：

- 先把脚本逻辑迁移为 `packages/logix-cli` 的子命令实现（保留行为不变）；
- 再逐步把公共逻辑下沉到 `packages/logix-anchor-engine` 与 `@logixjs/core` 的稳定 API（避免重复实现）。

### 4) Exit Code（CI 门禁友好）

**裁决（Q031）**：Exit Code 规范：

- `0`：PASS（无错误/无违规）
- `2`：VIOLATION（门禁违规/差异存在/规则未满足；用于 CI gate）
- `1`：ERROR（运行失败/异常/不可解析输入）

### 5) TS 加载与 tsconfig 对齐

**裁决（Q032）**：

- program/module 入口加载：使用 `tsx` 作为 Node ESM TS loader（支持 workspace/paths 的最小 DX）。
- Parser/Rewriter（081/082）：使用 `ts-morph` 读取同一份 tsconfig（含 paths alias），并保持 Node-only（严禁进入 `logix-core`）。

## Perf Evidence Plan

N/A（不触及 runtime 热路径）。  
但本 spec 有明确的 DX 性能预算（cold start），需要可复现的测量方式（MUST）：

- 目标：`logix --help` cold start `< 500ms`（禁加载 `ts-morph`）。
- 测量（示例，after build）：
  - `node -e \"const { spawnSync } = require('node:child_process'); const t=process.hrtime.bigint(); spawnSync('node',['packages/logix-cli/dist/bin/logix.js','--help'],{stdio:'ignore'}); console.log(Number(process.hrtime.bigint()-t)/1e6)\"`
- 结果落盘：将基线/阈值与一次测量结果写入 `specs/085-logix-cli-node-only/plan.md` 的实现记录（或 `specs/085-logix-cli-node-only/perf/`）。

## Project Structure

### Documentation (this feature)

```text
specs/085-logix-cli-node-only/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── public-api.md
│   ├── artifacts.md
│   ├── safety.md
│   ├── transform-ops.md
│   └── schemas/
│       └── cli-command-result.schema.json
└── checklists/
    ├── requirements.md
    └── toolbox-requirements.md
```

### Source Code (repository root)

```text
packages/logix-cli/
└── src/
    ├── bin/logix.ts             # CLI entry（解析 argv → 运行 effect program）
    ├── Commands.ts              # 子命令注册表（public submodule）
    └── internal/**              # 命令实现细节（internal）

packages/logix-anchor-engine/     # 081/082（计划新增）
packages/logix-core/              # IR/TrialRun/Manifest（已有）
scripts/ir/inspect-module.ts      # 迁移来源（现状）
```

**Structure Decision**:

- CLI 独立包 `packages/logix-cli`，Node-only；对外只暴露命令与稳定 JSON 工件。
- CLI 的业务逻辑尽可能用 `effect` + Layer/Tag 组织（同构），argv 解析保持最小化（参照 `speckit-kit` 的写法）。

## Deliverables by Phase

- **Phase 0（research）**：确定命令集合、输出 envelope、落盘路径策略、以及如何复用现有脚本（见 `research.md`）。
- **Phase 1（design）**：固化 `CommandResult@v1` schema 与数据模型（见 `contracts/` + `data-model.md`）。
- **Phase 2（tasks）**：实现 `packages/logix-cli` MVP 子命令；添加最小集成测试用例。

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation                  | Why Needed         | Simpler Alternative Rejected Because |
| -------------------------- | ------------------ | ------------------------------------ |
| [e.g., 4th project]        | [current need]     | [why 3 projects insufficient]        |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient]  |
