---
description: "Task list for 085-logix-cli-node-only (Node-only logix CLI)"
---

# Tasks: Logix CLI（085：Node-only 基础能力入口与集成验证跑道）

**Input**: `specs/085-logix-cli-node-only/spec.md`  
**Prerequisites**: `specs/085-logix-cli-node-only/plan.md`（required）, `specs/085-logix-cli-node-only/research.md`, `specs/085-logix-cli-node-only/data-model.md`, `specs/085-logix-cli-node-only/contracts/`, `specs/085-logix-cli-node-only/quickstart.md`

**Tests**: 本特性是“Node-only 能力集成测试跑道”；至少需要覆盖：IR 导出、trialrun、anchor index、anchor autofill（report-only）四条链路的最小集成用例。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可并行（不同文件、无依赖）
- **[US1]/[US2]/[US3]**: 对应 `spec.md` 的 User Story
- 任务描述必须包含明确文件路径

---

## Phase 1: Setup（新包骨架 + contracts 预检）

- [ ] T001 创建 CLI 包骨架（pnpm workspace package + bin=logix + exports）`packages/logix-cli/package.json`
- [ ] T002 [P] 创建 CLI 入口（argv → effect program → CommandResult 输出）`packages/logix-cli/src/bin/logix.ts`
- [ ] T003 [P] 创建 Commands 注册表（子命令路由与 help 结构；确保 help 路径不加载 `ts-morph` 等重依赖）`packages/logix-cli/src/Commands.ts`
- [ ] T004 [P] 补齐 085 contracts README（CommandResult@v1 的字段语义 + 不变量）`specs/085-logix-cli-node-only/contracts/README.md`
- [ ] T005 [P] 增加 contracts 预检测试（085 schema JSON 可解析 + $ref 可解析）`packages/logix-cli/test/Contracts/Contracts.085.CommandResult.test.ts`

---

## Phase 2: Foundational（CLI 执行与输出骨架：确定性/落盘/错误语义）

**⚠️ CRITICAL**: 本阶段完成前，不开始任何具体子命令业务逻辑（US1/US2/US3 都依赖该骨架）。  
**Checkpoint**: 任意子命令都能输出 `CommandResult@v1`（stdout + 可选落盘），且强制显式 `runId`。

- [ ] T006 定义 CLI 参数解析（subcommand + global flags：runId/out/mode/tsconfig 等）`packages/logix-cli/src/internal/args.ts`
- [ ] T007 [P] 定义 CommandResult 构造器（artifacts 收集 + error 映射）`packages/logix-cli/src/internal/result.ts`
- [ ] T008 [P] 实现稳定落盘策略（固定文件名/稳定路径；支持 `--out <dir>`）`packages/logix-cli/src/internal/output.ts`
- [ ] T009 定义结构化失败语义（SerializableErrorSummary；exitCode=0/1/2 规范）`packages/logix-cli/src/internal/errors.ts`
- [ ] T010 [P] 单测：缺失 runId 必须失败（不允许默认 Date.now）`packages/logix-cli/test/Args/Args.runId-required.test.ts`

---

## Phase 3: User Story 1 - IR 导出 + TrialRun（Priority: P1）🎯 MVP

**Goal**: 开发者一条命令导出 Manifest/StaticIR/Artifacts 与 TrialRunReport，并在缺失依赖时结构化失败。  
**Independent Test**: 对一个代表性入口重复运行两次，输出工件可 JSON 序列化且稳定；缺依赖时给出可行动错误。

- [ ] T011 [US1] 迁移 `scripts/ir/inspect-module.ts` 的入口加载逻辑（modulePath/exportName）到 CLI 内部 `packages/logix-cli/src/internal/loadProgramModule.ts`
- [ ] T012 [US1] 实现 `logix ir export`：导出 ControlSurfaceManifest（含 `workflowSurfaceDigest` 等）并落盘 `control-surface.manifest.json`（可选导出 `workflow.surface.json`）`packages/logix-cli/src/internal/commands/irExport.ts`
- [ ] T013 [US1] 实现 `logix trialrun`：调用 `Logix.Observability.trialRunModule` 并落盘 `trialrun.report.json` `packages/logix-cli/src/internal/commands/trialRun.ts`
- [ ] T014 [P] [US1] 集成用例：对固定入口跑 `ir export` 与 `trialrun` 并校验输出 shape `packages/logix-cli/test/Integration/cli.ir-and-trialrun.test.ts`

---

## Phase 4: User Story 2 - AnchorIndex + 保守回写（Priority: P1）

**Goal**: 对仓库构建 AnchorIndex，并在安全边界内执行 `anchor autofill --report/--write`（写回幂等、只补缺失字段）。  
**Independent Test**: report-only 仅输出拟修改清单；write-back 后第二次运行无差异；不确定项全部跳过并有 reason codes。

- [ ] T015 [US2] 实现 `logix anchor index`：调用 `@logixjs/anchor-engine` Parser 输出 `anchor.index.json`（子命令内 lazy-load `ts-morph`）`packages/logix-cli/src/internal/commands/anchorIndex.ts`
- [ ] T016 [US2] 实现 `logix anchor autofill --report|--write`：调用 `@logixjs/anchor-engine`（079+082）输出 PatchPlan/WriteBackResult/AutofillReport（子命令内 lazy-load `ts-morph`）`packages/logix-cli/src/internal/commands/anchorAutofill.ts`
- [ ] T017 [P] [US2] 集成用例：对 fixture repo 跑 `anchor index` 与 `anchor autofill --report`（不写回）`packages/logix-cli/test/Integration/cli.anchor.report-only.test.ts`

---

## Phase 5: User Story 3 - CI 门禁化与可 diff 工件（Priority: P2）

**Goal**: CLI 输出可在 CI 直接 diff/门禁：确定性、可序列化、reason codes 可行动。  
**Independent Test**: 同一输入两次运行字节级一致（忽略可选的耗时字段）；变更发生时 diff 聚焦语义差异。

- [ ] T018 [US3] 增加 `--out` 目录命名与工件文件名规范（control-surface/workflowSurface/trialrun/anchor/patch/writeback/autofill）`packages/logix-cli/src/internal/output.ts`
- [ ] T019 [P] [US3] 单测：同一输入两次运行输出一致（含 artifacts 列表排序）`packages/logix-cli/test/Integration/cli.determinism.test.ts`
- [ ] T020 [US3] 在 quickstart 固化 CI 用法样例（report-only gate 与显式 write-back）`specs/085-logix-cli-node-only/quickstart.md`
- [ ] T023 [US3] 增加 cold start 测量脚本（`logix --help` < 500ms，且不加载 `ts-morph`）并把测量结果/基线写入 `specs/085-logix-cli-node-only/quickstart.md` `packages/logix-cli/scripts/measure-startup.mjs`

---

## Phase 6: Polish & Cross-Cutting

- [ ] T021 [P] 文档回链：在 080 group 的验收入口补上 `logix` 命令作为集成验证跑道 `specs/080-full-duplex-prelude/spec-registry.md`
- [ ] T022 质量门：跑通 CLI 包单测 + workspace typecheck（记录最小通过口径）`packages/logix-cli/package.json`

---

## Dependencies & Execution Order

- Phase 1 → Phase 2（BLOCKS all user stories）
- US1（IR/TrialRun）可先做 MVP；US2 依赖 `packages/logix-anchor-engine`（081/082/079）完成基础 API；US3 在 US1/US2 可用后补齐确定性回归与 CI 样例。

---

## Phase 7: 既有文档措辞同步（延后到本需求收尾阶段）

- [ ] T024 同步 SSoT/既有文档：补齐 CLI 作为“Node-only 集成测试跑道”的官方导航入口与工件命名约定 `docs/ssot/platform/**` 与 `docs/ssot/handbook/**`（仅措辞/导航对齐）
