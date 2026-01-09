# Implementation Plan: 079 保守自动补全 Platform-Grade 锚点声明（单一真相源）

**Branch**: `079-platform-anchor-autofill` | **Date**: 2026-01-09 | **Spec**: `specs/079-platform-anchor-autofill/spec.md`  
**Input**: Feature specification from `specs/079-platform-anchor-autofill/spec.md`

## Summary

目标：提供一个“保守自动补全锚点声明”的工具链能力，把平台终态所需的关键锚点（Static IR 的入口）补齐到源码里，并产出结构化报告，作为试跑/IR/全双工的共同底座。

交付思路（分层）：

1. **Anchor Discovery（发现）**：以 `081` 的 `AnchorIndex@v1` 为统一输入（Platform-Grade 子集扫描 + 缺口点定位 + rawMode/reasonCodes）。
2. **Conservative Autofill Policy（补全策略）**：本 spec 固化“宁可漏不乱补”的写回政策：仅当目标对象未显式声明该锚点且补全可确定时，允许生成写回操作（稳定排序、幂等、可 diff）。
3. **Rewrite & Write-back（回写执行）**：以 `082` 的 `PatchPlan@v1`/`WriteBackResult@v1` 承载 report/write 两种模式；对不确定/不可解析/潜在漂移点只报告不改写。
4. **Deviation & Evidence（证据对照）**：可选用 TrialRun/Spy 作为“证据/校验”输入（例如提示可能缺失声明），但不得成为写回依据或并行权威。

## Questions Digest（外部问题清单回灌）

来源：外部问题清单通过 `$speckit plan-from-questions` 贴入（本段只记录裁决，不记录全文）。

- Q006：`services` 只要显式存在（哪怕不完整）一律视为作者声明：不自动补齐/不覆盖；仅输出 deviation 线索与 reason codes。
- Q007：写回以 `082` 的最小文本插入为准（不做全文件 reprint/format），尽量保留注释/空行；无法保证最小 diff 时宁可失败。
- Q008：端口命名默认 `port = serviceId`；多处 use/多符号别名按 `serviceId` 去重，不生成业务别名端口名。
- Q009：MVP 默认全量扫描（include/exclude globs + budgets 控制），不做 Git 增量；性能以“可解释的规模摘要 + 可测量耗时（可关闭）”为工程指标。
- Q010：reason codes 必须结构化且可枚举（schema 固化），用于 CI/Devtools 聚合展示与门禁化。

## Deepening Notes（关键裁决）

- Decision: 单一真相源：补全结果必须写回源码中的显式锚点字段；报告/缓存不作为长期权威事实源。
- Decision: 宁可错过不可乱补：任何存在歧义/动态/多候选的场景默认跳过，并输出可机器解析的 reason code。
- Decision: “只给没声明过 `services` 的 module 自动补充”：若 `services` 字段缺失可补全；若 `services` 已存在（包含 `services: {}` 与部分/非空映射）一律视为作者已显式声明，必须跳过（只允许报告潜在不一致线索）。
- Decision: 端口命名默认 `port = serviceId`；不推断业务语义别名（如 `archiver`/`backupSvc`）。
- Decision: 静态识别以 `docs/ssot/platform/ir/00-codegen-and-parser.md` 的 Platform-Grade AST 规则为准；Loader/TrialRun 只作为证据/校验输入。
- Decision: 幂等与最小改动面：补全只写入缺失字段；稳定排序与去重；重复运行以“字节级无变化”为判定标准（无新 diff）。

## Technical Context

**Language/Version**: TypeScript（ESM；以仓库配置为准）  
**Primary Dependencies**: `effect` v3、`@logixjs/core`（锚点字段权威）、Node-only：`@logixjs/anchor-engine`（081/082 产物与工具链）、`ts-morph`（经 081/082 闭包引入；禁止引入 runtime）  
**Storage**: N/A（写回源码；报告以 JSON 输出）  
**Testing**: Vitest（如需新增测试，优先覆盖“识别/补全/幂等/跳过原因”）  
**Target Platform**: Node.js 20+（用于 CLI/CI/本地补全）  
**Project Type**: pnpm workspace（`packages/*` + `examples/*` + `scripts/*`）  
**Performance Goals**: 工具链执行确定性与可复跑优先；对大仓库按“按需扫描 + 早停”控制耗时  
**Constraints**: 单一真相源；宁可漏不乱补；输出 Slim/可序列化；不引入运行时常驻成本  
**Scale/Scope**: 首要补全 `ModuleDef.services`；次要补全 `dev.source`；装配锚点按可确定性分阶段交付

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### Answers (Pre-Design)

- **Intent → Flow/Logix → Code → Runtime**：本特性属于平台工具链/全双工引擎的“Code 侧锚点治理”：把可枚举结构显式化为源码锚点，使其可稳定导出为 Manifest/IR，并与 TrialRun Evidence 对齐。
- **Docs-first & SSoT**：静态识别规则以 `docs/ssot/platform/ir/00-codegen-and-parser.md` 为准；Loader 相关约束参考 `docs/specs/sdd-platform/workbench/15-module-runtime-reflection-loader.md`；与 `specs/078-module-service-manifest/spec.md` 形成闭环（显式声明→Manifest→诊断/回放）。
- **Effect/Logix contracts**：不修改运行时核心调度契约；依赖既有反射字段（`services`/`dev.source`）与试跑输出（`trialRunModule.environment.*`）作为校验输入。
- **IR & anchors**：本特性不新增新的 IR 真相源，而是把缺失锚点补齐到“Platform-Grade 子集”可解析形态，降低解析/回写漂移。
- **Deterministic identity**：补全写入的 `serviceId`/端口名必须可确定；无法确定则必须跳过并解释原因。
- **Transaction boundary**：工具链不进入 runtime txn 窗口；可选 TrialRun 仅用于装配期校验，必须保证可控收束与超时。
- **Diagnosability & explainability**：输出结构化报告（含 reason codes）以支撑 CI gate 与 Devtools；默认不引入运行时常驻事件税。
- **Breaking changes (forward-only)**：补全会修改源码，属于显式迁移；必须支持 report-only（审阅后再写回），并保证最小差异与幂等。

### Result (Post-Design)

- PASS（计划以脚本/工具链方式交付，不触及 runtime 热路径；契约以 `contracts/*` 固化并与 SSoT 对齐）

## Perf Evidence Plan（MUST）

- N/A（不触及 Logix Runtime 核心路径/渲染关键路径；工具链性能以“可复跑耗时统计”作为工程指标即可）

## Project Structure

### Documentation (this feature)

```text
specs/079-platform-anchor-autofill/
├── spec.md
├── checklists/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
└── tasks.md             # Phase 2 output ($speckit tasks)
```

### Source Code (repository root)

```text
packages/logix-anchor-engine/      # Node-only：Parser/Rewriter/Autofill（081/082/079）
packages/logix-cli/                # 085：统一 CLI 入口（集成测试跑道）

packages/logix-core/
├── src/Module.ts                  # `services` / `dev.source` 等锚点字段（权威真相源）
└── src/internal/observability/
    └── trialRunModule.ts          # 可选：校验 missing deps / env evidence

docs/specs/sdd-platform/
├── ssot/ir/00-codegen-and-parser.md
└── workbench/15-module-runtime-reflection-loader.md
```

**Structure Decision**:

- `079` 的“写回政策（policy）”落在 Node-only 引擎包 `packages/logix-anchor-engine`（与 `081/082` 同域），避免把 `ts-morph/swc` 等重依赖带入 runtime。
- `085` CLI 作为统一入口与集成测试跑道：先 report-only，再显式 `--write` 写回。
- 现有 `scripts/ir/*` 可作为迁移来源，但不作为长期权威入口（单一真相源仍在源码锚点 + 版本化工件）。

## Design（关键机制）

### 1) 统一流程：发现 → 判定 → 写回/跳过 → 报告

对每个候选锚点执行：

1. **Detect**：目标对象是否已显式声明该锚点字段？
2. **Infer**：能否在“高置信度”前提下推导出补全内容？
3. **Write**：仅写入缺失字段的最小增量（稳定排序/去重/幂等）；否则只报告。
4. **Report**：记录修改/跳过/未补全项及 reason code（CI/Devtools 可消费）。

### 2) 服务依赖锚点（`services`）补全策略

**高置信度输入**（允许补全）：

- 能定位到某个 Module 的定义点（`Logix.Module.make(...)` / 等价形态），且 def 是可就地改写的“对象字面量”；
- Module 未显式声明 `services`（缺失字段）；`services: {}` 视为显式声明，必须跳过；
- 能识别到至少一个确定的服务 Tag 使用点（优先 Platform-Grade 子集 `yield* $.use(ServiceTag)`）；
- 能为该 Tag 推导出稳定 `serviceId`（例如能解析到 `Context.Tag("...")` 的字符串字面量；无法确定则跳过）。

**写回形态**：

- 写入 `services: { [serviceId]: ServiceTag, ... }`（稳定排序、去重）。
- 端口名缺省等于 `serviceId`；不生成业务别名。

**无法覆盖的情况（只报告）**：

- `$.use` 参数非直接 Tag 标识（动态表达式/间接引用/多候选）；
- Tag 无法解析出稳定 id；
- Module def 形态不可安全改写（非对象字面量、包含 spread 等导致 override 语义不确定）。

### 3) 定位锚点（`dev.source`）补全策略

**高置信度输入**：

- 能定位到 Module/Action 等对象的定义点（在 AST 中可得到文件+行列）。
- 目标对象未显式声明 `dev.source`（或等价定位字段）。

**写回形态**：

- 写入 `dev: { source: { file, line, column } }`（或在既有 `dev` 上补齐 `source`）。

说明：定位锚点应不进入“结构 digest”（避免代码移动导致 CI diff 噪声）；如当前 digestBase 已排除 `source`，则保持该约束不变。

### 4) 装配依赖锚点（imports / assembly）分阶段

装配锚点通常出现在 `ModuleImpl.implement({ imports: [...] })` 侧，而不是 `Module.make` 的定义侧；其“可确定性”普遍更弱（跨文件/跨模块组合）。

交付策略：

- Phase 1：先做 **report-only**（发现缺失/潜在不一致），不自动写回。
- Phase 2：仅对可确定的直连形态开放写回（例如同文件内明确引用的 ModuleImpl / Layer 常量），并保持默认关闭。

### 5) 可选：TrialRun 校验（不作为写回依据）

在 report-only 或写回后，可选对目标模块执行 `Observability.trialRunModule`：

- 用于验证“missingServices/missingConfigKeys”是否收敛；
- 用于输出 `environment.tagIds` 等 evidence 辅助解释；
- 任何 TrialRun 结果只进入报告，不反向决定写回（避免分支覆盖与副作用导致漂移）。

## Deliverables by Phase

- **Phase 0（research）**：`research.md`（候选来源、可确定性边界、reason codes、与 TrialRun/Loader/Parser 的取舍）。
- **Phase 1（design）**：`data-model.md`、`contracts/*`、`quickstart.md`（报告 schema、写回准则、使用方式）。
- **Phase 2（tasks）**：`tasks.md`（按锚点种类拆任务与回归门禁）。
