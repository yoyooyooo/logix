---
description: "Task list for 085-logix-cli-node-only (Node-only logix CLI)"
---

# Tasks: Logix CLI（085：Node-only 工具箱与集成验证跑道）

**Input**: `specs/085-logix-cli-node-only/spec.md`  
**Prerequisites**: `specs/085-logix-cli-node-only/plan.md`（required）, `specs/085-logix-cli-node-only/research.md`, `specs/085-logix-cli-node-only/data-model.md`, `specs/085-logix-cli-node-only/contracts/`, `specs/085-logix-cli-node-only/quickstart.md`

**Tests**: 本特性是“Node-only 能力集成测试跑道”；至少需要覆盖：IR 导出、trialrun、spy evidence、ir validate、ir diff、anchor index、anchor autofill（report-only）七条链路的最小集成用例。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可并行（不同文件、无依赖）
- **[US1]..[US5]**: 对应 `spec.md` 的 User Story
- 任务描述必须包含明确文件路径

---

## Phase 1: Setup（新包骨架 + contracts 预检）

- [x] T001 创建 CLI 包骨架（pnpm workspace package + bin=logix + exports）`packages/logix-cli/package.json`
- [x] T002 [P] 创建 CLI 入口（argv → effect program → CommandResult 输出）`packages/logix-cli/src/bin/logix.ts`
- [x] T003 [P] 创建 Commands 注册表（子命令路由与 help 结构；确保 help 路径不加载 `ts-morph` 等重依赖）`packages/logix-cli/src/Commands.ts`
- [x] T004 [P] 补齐 085 contracts README（CommandResult@v1 的字段语义 + 不变量）`specs/085-logix-cli-node-only/contracts/README.md`
- [x] T005 [P] 增加 contracts 预检测试（085 schema JSON 可解析 + $ref 可解析）`packages/logix-cli/test/Contracts/Contracts.085.CommandResult.test.ts`

---

## Phase 2: Foundational（CLI 执行与输出骨架：确定性/落盘/错误语义）

**⚠️ CRITICAL**: 本阶段完成前，不开始任何具体子命令业务逻辑（US1/US2/US3 都依赖该骨架）。  
**Checkpoint**: 任意子命令都能输出 `CommandResult@v1`（stdout + 可选落盘），且强制显式 `runId`。

- [x] T006 定义 CLI 参数解析（subcommand + global flags：runId/out/mode/tsconfig 等）`packages/logix-cli/src/internal/args.ts`
- [x] T007 [P] 定义 CommandResult 构造器（artifacts 收集 + error 映射）`packages/logix-cli/src/internal/result.ts`
- [x] T008 [P] 实现稳定落盘策略（固定文件名/稳定路径；支持 `--out <dir>`）`packages/logix-cli/src/internal/output.ts`
- [x] T009 定义结构化失败语义（SerializableErrorSummary；exitCode=0/1/2 规范）`packages/logix-cli/src/internal/errors.ts`
- [x] T010 [P] 单测：缺失 runId 必须失败（不允许默认 Date.now）`packages/logix-cli/test/Args/Args.runId-required.test.ts`

---

## Phase 3: User Story 1 - IR 导出 + TrialRun（Priority: P1）🎯 MVP

**Goal**: 开发者一条命令导出 Manifest/StaticIR/Artifacts 与 TrialRunReport，并在缺失依赖时结构化失败。  
**Independent Test**: 对一个代表性入口重复运行两次，输出工件可 JSON 序列化且稳定；缺依赖时给出可行动错误。

- [x] T011 [US1] 迁移 `scripts/ir/inspect-module.ts` 的入口加载逻辑（modulePath/exportName）到 CLI 内部 `packages/logix-cli/src/internal/loadProgramModule.ts`
- [x] T012 [US1] 实现 `logix ir export`：导出 ControlSurfaceManifest（含 `modules[*].workflowSurface.digest` 等）并落盘 `control-surface.manifest.json`（可选导出 `workflow.surface.json`）`packages/logix-cli/src/internal/commands/irExport.ts`
- [x] T013 [US1] 实现 `logix trialrun`：调用 `Logix.Observability.trialRunModule` 并落盘 `trialrun.report.json` `packages/logix-cli/src/internal/commands/trialRun.ts`
- [x] T014 [P] [US1] 集成用例：对固定入口跑 `ir export` 与 `trialrun` 并校验输出 shape `packages/logix-cli/test/Integration/cli.ir-and-trialrun.test.ts`

---

## Phase 4: User Story 2 - AnchorIndex + 保守回写（Priority: P1）

**Goal**: 对仓库构建 AnchorIndex，并在安全边界内执行 `anchor autofill --mode report|write`（写回幂等、只补缺失字段）。  
**Independent Test**: report-only 仅输出拟修改清单；write-back 后第二次运行无差异；不确定项全部跳过并有 reason codes。

- [x] T015 [US2] 实现 `logix anchor index`：调用 `@logixjs/anchor-engine` Parser 输出 `anchor.index.json`（子命令内 lazy-load `ts-morph`）`packages/logix-cli/src/internal/commands/anchorIndex.ts`
- [x] T016 [US2] 实现 `logix anchor autofill --mode report|write`：调用 `@logixjs/anchor-engine`（079+082）输出 PatchPlan/WriteBackResult/AutofillReport（子命令内 lazy-load `ts-morph`）`packages/logix-cli/src/internal/commands/anchorAutofill.ts`
- [x] T017 [P] [US2] 集成用例：对 fixture repo 跑 `anchor index` 与 `anchor autofill --mode report`（不写回）`packages/logix-cli/test/Integration/cli.anchor.report-only.test.ts`

---

## Phase 5: User Story 3 - CI 门禁化与可 diff 工件（Priority: P2）

**Goal**: CLI 输出可在 CI 直接 diff/门禁：确定性、可序列化、reason codes 可行动。  
**Independent Test**: 同一输入两次运行字节级一致（忽略可选的耗时字段）；变更发生时 diff 聚焦语义差异。

- [x] T018 [US3] 增加 `--out` 目录命名与工件文件名规范（control-surface/workflowSurface/trialrun/anchor/patch/writeback/autofill）`packages/logix-cli/src/internal/output.ts`
- [x] T019 [P] [US3] 单测：同一输入两次运行输出一致（含 artifacts 列表排序）`packages/logix-cli/test/Integration/cli.determinism.test.ts`
- [x] T020 [US3] 在 quickstart 固化 CI 用法样例（report-only gate 与显式 write-back）`specs/085-logix-cli-node-only/quickstart.md`
- [x] T023 [US3] 增加 cold start 测量脚本（`logix --help` < 500ms，且不加载 `ts-morph`）并把测量结果/基线写入 `specs/085-logix-cli-node-only/quickstart.md` `packages/logix-cli/scripts/measure-startup.mjs`

---

## Phase 5.1: Gate - `ir validate` / `ir diff`（US4，P1）

**Goal**: 把“我改完代码是否破坏锚点/IR/预算/确定性”的判断变成可机器消费门禁，并能对基线目录做稳定 diff。  
**Independent Test**: 同一输入两次运行报告一致；存在差异/违规时 exit code=2（VIOLATION）。

- [x] T025 [US4] 实现 `logix ir validate`：产出结构化门禁报告 `packages/logix-cli/src/internal/commands/irValidate.ts`
- [x] T026 [P] [US4] 集成用例：对固定工件目录跑 validate 并校验输出 shape `packages/logix-cli/test/Integration/cli.ir-validate.test.ts`
- [x] T027 [US4] 实现 `logix ir diff`：对 `--before/--after` 做稳定 diff（reason codes + exit code）`packages/logix-cli/src/internal/commands/irDiff.ts`
- [x] T028 [P] [US4] 集成用例：diff 输出确定性（排序/裁剪口径固定）`packages/logix-cli/test/Integration/cli.ir-diff.test.ts`

---

## Phase 5.2: Transform - `transform module --ops`（US5，P1，optional）

**Goal**: 对 Platform-Grade 子集内的 Module 做 batch ops 变更，默认 report-only 输出 PatchPlan，`mode=write` 幂等写回。  
**Independent Test**: report-only 不写回且 PatchPlan 稳定；write 后二次运行 0 diff；子集外形态不写回并可解释。

- [x] T029 [US5] 实现 `logix transform module --ops <delta.json>`：生成 PatchPlan + TransformReport `packages/logix-cli/src/internal/commands/transformModule.ts`
- [x] T030 [P] [US5] 集成用例：report-only 不写回、PatchPlan 可复现 `packages/logix-cli/test/Integration/cli.transform-module.report-only.test.ts`
- [x] T031 [P] [US5] 集成用例：`mode=write` 幂等（第二次 0 diff）`packages/logix-cli/test/Integration/cli.transform-module.ensure-stepkeys.write-idempotent.test.ts`、`packages/logix-cli/test/Integration/cli.transform-module.add-state-action.test.ts`

---

## Phase 6: Polish & Cross-Cutting

- [x] T021 [P] 文档回链：在 080 group 的验收入口补上 `logix` 命令作为集成验证跑道 `specs/080-full-duplex-prelude/spec-registry.md`
- [x] T022 质量门：跑通 CLI 包单测 + workspace typecheck（记录最小通过口径）`packages/logix-cli/package.json`
- [x] T032 [P] 集成用例：`logix spy evidence` 输出 `SpyEvidenceReport@v1` 并能定位 used-but-not-declared 缺口 `packages/logix-cli/test/Integration/cli.spy-evidence.test.ts`
- [x] T033 [P] CLI 协议输出不应被日志污染：trialrun/spy evidence 默认注入静默 Logger Layer `packages/logix-cli/src/internal/silentLogger.ts`
- [x] T034 Contract Suite 增强：`logix contract-suite run --includeAnchorAutofill` 一次性注入 079/082 的 `PatchPlan/AutofillReport`（report-only），并写入 context pack + `--out` 目录 `packages/logix-cli/src/internal/commands/contractSuiteRun.ts`、`packages/logix-workbench/src/contract-suite/normalize.ts`、`packages/logix-cli/test/Integration/cli.contract-suite.run.test.ts`、`examples/logix-cli-playground/*`
- [x] T035 修复 built CLI（tsup ESM bundle）运行期 `Dynamic require of "os"`：在 tsup 产物注入 `createRequire` shim `packages/logix-cli/tsup.config.ts`
- [x] T036 [P] 回归测试：built `dist/bin/logix.js` 必须可直接执行（覆盖 `contract-suite run --includeAnchorAutofill`，防止 bundle 回归）`packages/logix-cli/test/Integration/cli.built-bin.smoke.test.ts`
- [x] T037 [US3] CLI 参数短化：支持 `logix.cli.json`（cwd 向上查找；或 `--cliConfig <path>`）+ `--profile <name>` 叠加 defaults，避免 Agent/CI 反复拼长命令 `packages/logix-cli/src/internal/cliConfig.ts`、`packages/logix-cli/src/Commands.ts`、`examples/logix-cli-playground/logix.cli.json`
- [x] T038 [US3] `--outRoot <dir>`：当未显式 `--out` 时自动落盘到 `<outRoot>/<command>/<runId>`，并支持布尔 `--flag/--noFlag` 覆盖（last-wins），便于覆盖配置默认值 `packages/logix-cli/src/internal/args.ts`、`packages/logix-cli/test/Args/*`

---

## Dependencies & Execution Order

- Phase 1 → Phase 2（BLOCKS all user stories）
- US1（IR/TrialRun）可先做 MVP；US2 依赖 `packages/logix-anchor-engine`（081/082/079）完成基础 API；US3 在 US1/US2 可用后补齐确定性回归与 CI 样例。

---

## Phase 7: 既有文档措辞同步（延后到本需求收尾阶段）

- [x] T024 同步 SSoT/既有文档：补齐 CLI 作为“Node-only 集成测试跑道”的官方导航入口与工件命名约定 `docs/ssot/platform/**` 与 `docs/ssot/handbook/**`（仅措辞/导航对齐）
