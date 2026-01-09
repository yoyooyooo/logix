# Data Model: Workbench Contract Suite（036：Integrated Verdict + Agent Context Pack）

**Date**: 2025-12-26  
**Spec**: `/Users/yoyo/Documents/code/personal/intent-flow/specs/036-workbench-contract-suite/spec.md`  
**Plan**: `/Users/yoyo/Documents/code/personal/intent-flow/specs/036-workbench-contract-suite/plan.md`

> 本文件固化 036 的治理层数据模型（Integrated Verdict / Context Pack），并明确哪些字段是“事实源”（来自 artifacts），哪些字段只是“解释/提示”。

## Design Principles（不可破）

- **IR-first**：Verdict 必须可由工件推导（不依赖 AST、LLM 自评、或 runtime 私有结构）。
- **JsonValue 硬门**：跨宿主/跨进程负载必须可 JSON 序列化（见 `specs/005-unify-observability-protocol/contracts/schemas/json-value.schema.json`）。
- **确定性**：相同输入必须产生相同输出（稳定排序、稳定锚点、预算裁剪可解释）。
- **降级显式**：缺失/截断/失败必须被模型化并可行动（而不是“空字段”混过去）。

## Representative Module（P1：用于集成验收的最小样例）

> 036 的验收需要一个“足够复杂但仍可控”的模块，能稳定覆盖：Form rules（RulesManifest）、list identity（rowId/trackBy）、以及 ports/type 相关信息。

**Candidate（当前裁决）**：

- 源码：`examples/logix-react/src/modules/rules-composition-form.ts`
- 导出：`RulesCompositionForm`（Form module）
- 用作 program module：`RulesCompositionForm.impl`（供 TrialRun / artifacts 导出）

**覆盖点**：

- field/object/root/list 四种规则形态（含 `errorTarget: "$self"`）
- list identity（`identity: { mode: "trackBy", trackBy: "id" }`）
- deps/validateOn/reValidateOn 的组合（便于 RulesManifest 对照与 lint）

**已知约束（影响 Workbench 路径）**：

- 当前 `@logixjs/sandbox` 的编译器只内置 `@logixjs/core`（其它 `@logixjs/*` 会落到 `esm.sh` 并失败），因此该模块暂时更适合作为 CI/Node 入口样例；Workbench 想直接跑通需先扩展 sandbox kernel 支持 `@logixjs/form`。

## Artifact Keys（036 视角：验收时必须识别的 key/version）

> 这里的 “artifactKey” 是 Contract Suite 的统一索引键；其语义与 schema 由对应 spec 负责（036 只消费/判定）。

- `@logixjs/form.rulesManifest@v1`（031；Form rules 的 Supplemental Static IR）
- `@logixjs/module.portSpec@v1`（035；ModulePortSpec@v1，端口与可引用空间）
- `@logixjs/module.typeIr@v1`（035；TypeIR@v1，类型摘要/引用 IR）

## Entity: ContractSuiteVerdict@v1（治理输出）

**Purpose**：作为统一验收/回归/CI gate 的“可机器判定 + 可解释摘要”，覆盖 031-035 的工件集合与降级语义。

**Canonical schema（单一事实源）**

- `specs/036-workbench-contract-suite/contracts/schemas/contract-suite-verdict.schema.json`

**Core semantics**

- `verdict = PASS | WARN | FAIL`：只由 `reasons[].severity` 聚合推导（FAIL 至少存在 BREAKING）。
- `reasons[]`：每条原因必须带稳定 `code`，并尽量回指到 `artifactKey + pointer`（或其他可解释锚点）。
- `artifacts[]`：以 `artifactKey` 为主键的“可用性状态”，用于降级语义与 action 提示。

**Inputs（事实源）**

- TrialRunReport / Manifest / StaticIR / Diff / Evidence（复用 025/020/005 的 schemas；见 contracts 目录 README）。
- 031-035 各自定义的 artifacts（按版本化 key 归一化；缺失时必须显式反映在 `artifacts[].status`）。

## Entity: ContractSuiteContextPack@v1（给 Agent 的最小事实包）

**Purpose**：当 verdict 不是 PASS（或需要改动）时，把“最小事实 + 缺口 + 约束 + 目标”打包给 Agent/开发者，使其能在不读取全仓/不猜测 runtime 私有结构的前提下产出可验证的 patch。

**Canonical schema（单一事实源）**

- `specs/036-workbench-contract-suite/contracts/schemas/contract-suite-context-pack.schema.json`

**Core semantics**

- `facts.trialRunReport`：必须存在（作为 IR-first 的最低事实基线）。
- `facts.inputs?`：可选输入事实（给 Agent/人类的最小“编辑上下文”），建议包含：
  - `stageBlueprint`（033）
  - `uiBlueprints/bindingSchemas`（032）
  - `uiKitRegistry`（032；UI 侧端口规格事实源，用于校验 componentKey/propName/eventName）
  - `codeAssets`（034）
- `facts.manifestDiff?`：用于审阅破坏性变更与 drift（可选，但建议在 CI/回归场景提供）。
- `facts.artifacts[]`：按预算裁剪后的工件子集（可选；缺失/截断必须显式标注）。
- `target`：期望的改动类型（patch code / patch rule / patch mock / patch spec / investigate），避免让 Agent 盲跑。
- `constraints`：白盒子集/禁止事项/预算等“硬约束”，作为 Agent 的护栏输入。

## Entity: Artifact Availability（降级语义基元）

> 036 的降级模型不应把“字段缺失”当成语义；必须显式状态化。

**Status（建议）**

- `PRESENT`：工件存在且通过 schema/预算预检
- `TRUNCATED`：工件存在但被预算裁剪（必须给出裁剪摘要）
- `MISSING`：工件缺失（必须给出缺失原因：版本不匹配/未实现/运行失败/被禁用）
- `FAILED`：生成该工件的过程失败（必须给出失败分类与可行动提示）
- `SKIPPED`：本次检查明确不适用（例如模块不使用 form rules，故 RulesManifest 不应出现）

## Downgrade Matrix（v1：缺失/截断/失败 → PASS/WARN/FAIL + action）

> 本矩阵只定义 **默认口径**；未来可通过“suite 配置”收紧/放宽（例如 CI 允许 WARN，发布 gate 必须 PASS）。

### 1) TrialRunReport（基线）

| 条件 | 默认 verdict | 主要 reason code（建议） | 典型 action（建议） |
| --- | --- | --- | --- |
| `trialRunReport` 缺失 | FAIL | `contract_suite::missing_trial_run_report` | 修复入口：确保执行了 TrialRun（031/025 链路） |
| `trialRunReport.ok=true` | PASS（继续看 artifacts） | - | - |
| `ok=false` 且 `error.code=MissingDependency` 且 `manifest/staticIr` 仍可用 | WARN | `trialrun::missing_dependency` | 提供缺失服务/配置（Layer 注入或移到 run 段）；并复跑 |
| `ok=false` 且 `error.code=TrialRunTimeout` | FAIL | `trialrun::timeout` | 排查 boot 阶段阻塞（禁止挂死）；必要时拆分/缩小窗口 |
| `ok=false` 且 `error.code=DisposeTimeout` | FAIL | `trialrun::dispose_timeout` | 修复资源释放/常驻 fiber，确保 scope close 可收束 |
| `ok=false` 且 `error.code=Oversized` | WARN | `trialrun::oversized` | 调低 diagnostics/maxEvents/maxBytes；或拆分工件导出 |
| `ok=false` 且其它错误 | FAIL | `trialrun::runtime_failure` | 根据 errorSummary 定位；先保证能稳定收束与复现 |

### 2) artifacts（031/035：平台验收的核心输入）

> 默认假设：对于 “代表性模块”（见上文），下列 artifacts 都应产出；缺失即视为契约未满足。  
> 对“非代表性模块”，RulesManifest 可按适用性降级为 `SKIPPED`。

| artifactKey | status | 默认 verdict | 主要 reason code（建议） | 典型 action（建议） |
| --- | --- | --- | --- | --- |
| `@logixjs/form.rulesManifest@v1` | PRESENT | PASS | - | - |
| `@logixjs/form.rulesManifest@v1` | SKIPPED | PASS | - | 模块不使用 form rules；无需产出 |
| `@logixjs/form.rulesManifest@v1` | TRUNCATED | WARN | `artifact::truncated` | 调整 artifact budget；确保仍保留 `manifest + warnings` 摘要 |
| `@logixjs/form.rulesManifest@v1` | MISSING/FAILED | FAIL | `artifact::rules_manifest_unavailable` | 确认模块确实使用 rules；修复 sandbox/CI 入口可加载 `@logixjs/form`；修复导出者异常/不可序列化 |
| `@logixjs/module.portSpec@v1` | PRESENT | PASS | - | - |
| `@logixjs/module.portSpec@v1` | TRUNCATED | WARN | `artifact::truncated` | 提高 budget 或输出更 slim 摘要；至少保留 key 空间（actions/exports/ports） |
| `@logixjs/module.portSpec@v1` | MISSING/FAILED | FAIL | `artifact::portspec_unavailable` | 修复 035 导出；避免平台失去引用空间 SSoT |
| `@logixjs/module.typeIr@v1` | PRESENT | PASS | - | - |
| `@logixjs/module.typeIr@v1` | TRUNCATED | WARN | `artifact::typeir_truncated` | 提高 budget 或分层导出；保证 PortSpec 仍可用 |
| `@logixjs/module.typeIr@v1` | MISSING/FAILED | WARN | `artifact::typeir_unavailable` | 降级为 key-level 校验（仅 PortSpec）；后续补齐 TypeIR 导出/预算 |

## References

- 025 IR Reflection Loader（schemas 基线）：`specs/025-ir-reflection-loader/contracts/schemas/`
- EvidencePackage / JsonValue：`specs/020-runtime-internals-contracts/contracts/schemas/runtime-evidence-package.schema.json`、`specs/005-unify-observability-protocol/contracts/schemas/json-value.schema.json`
- IrPage→IR 全链路（字段含义）：`docs/ssot/runtime/logix-core/api/07-ir-pipeline-from-irpage.md`
