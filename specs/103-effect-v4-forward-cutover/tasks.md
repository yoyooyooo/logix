# Tasks: Effect v4 前向式全仓重构（无兼容层）

**Input**: 设计文档来自 `specs/103-effect-v4-forward-cutover/`  
**Prerequisites**: `spec.md`、`plan.md`、`inventory/perf-prerequisite.md`（GP-1 结论）

**Tests**: 本特性触及 runtime 核心路径，类型/测试/perf/diagnostics 证据为必选项。  
**Organization**: 按阶段推进；除 GP-1（性能放行门）外，gate 未通过不得跨阶段执行。

## Pre-Stage P-1 - Perf 前置收口（性能放行门）

- [ ] T009 确认 `origin/main` 已合入 `feat/perf-dynamic-capacity-maxlevel`（记录 merge commit / 关键提交哈希）。
- [ ] T017 审计 `.github/workflows/logix-perf-{quick,sweep}.yml`：确认 strict diff 分流、并发保护、超时保护、pinned matrix 与 normalize 报告步骤已生效。
- [ ] T018 审计 `.github/scripts/logix-perf-normalize-ci-reports.cjs`、`.github/scripts/logix-perf-quick-summary.cjs` 与 `.codex/skills/logix-perf-evidence/scripts/{collect.ts,diff.ts,validate.ts,bench.traitConverge.node.ts}`：确认脚本存在并可调用。
- [ ] T019 产出 `inventory/perf-prerequisite.md`，完成 GP-1 结论（PASS/NOT_PASS + 证据路径）；未 PASS 时只阻塞性能 gate，不阻塞实现任务。

## Stage 0 - Baseline 与命中台账

- [x] T000 建立迁移目录骨架：`inventory/`、`diagnostics/`、`perf/`。
- [x] T001 统计全仓 v3 关键 API 命中并生成 `inventory/api-ledger.md`。
- [ ] T002A 前置检查：GP-1 未 PASS 时，Stage 0 的性能数据产出类任务（T003/T007/T008）保持 BLOCKED（目录/台账/诊断模板类任务可先行）。
- [ ] T002 标记 core 热点文件清单（Top 风险文件 + owner）。
- [ ] T003 采集 core 性能 baseline（before/default）。
- [ ] T007 采集 Node 通道 baseline（`bench:traitConverge:node`）。
- [ ] T008 对 S0 baseline 执行 `pnpm perf validate` 并记录结果。
- [ ] T004 采集 core 诊断链路快照（off/light/full 对照）。
- [x] T005 定义 evidence 命名规范并写入 quickstart。
- [x] T006 完成 G0 记录：`inventory/gate-g0.md`。
- [x] T094 对齐 gate 状态机模型：更新 `data-model.md` 与 `contracts/*` 使其覆盖 `GP-1/Gate-A/B/C` 及 `PENDING/IN_PROGRESS/NOT_PASS`。
- [x] T095 初始化 `inventory/gate-a.md`、`inventory/gate-b.md`、`inventory/gate-c.md`（默认 `NOT_PASS`，附判据占位）。
- [x] T096 维护检查点决策日志：`inventory/checkpoint-decision-log.md`（每次 gate 结论变更都必须回写）。

## Stage 1 - 依赖与工具链收敛

- [ ] T010 盘点根与子包 `effect/@effect/*` 版本现状。
- [ ] T011 生成 v4 版本收敛矩阵（目标版本 + 包映射）。
- [ ] T012 规划 `pnpm.overrides` 与子包直接依赖更新策略。
- [ ] T013 识别 `@effect/platform/*`、`@effect/sql*`、`@effect/cli` 升级影响。
- [ ] T014 输出依赖升级执行顺序与回归检查点。
- [ ] T015 完成 G1.0 记录：`inventory/gate-g1-0.md`。
- [ ] T016 审计 CI perf workflow：确保迁移 gate 场景启用 strict diff + 回归失败显式阻断。

## Stage 2 - logix-core 语义主干迁移（P0，拆分 S2-A/S2-B）

### Stage 2A - 第一波（确定性热路径收益）

- [ ] T079 执行 S2-A 编排：按 `#2 -> #1 -> #3` 顺序推进并冻结验收口径。
- [x] T080 落地 `#2`：Workflow 端口解析前移 setup，run 期兜底解析清零。
- [x] T081 落地 `#1`：`triggerStreams` 动态 Module Tag -> `ModuleRuntimeRegistry`。
- [x] T082 落地 `#3`：txnQueue 上下文注入扁平化，保持取消/重试/replay 语义不漂移。
- [x] T083 收敛 `DebugSink.record`：FiberRef 读取聚合 + Slim 可序列化事件验证。
- [x] T084 完成 Gate-A 记录：`inventory/gate-a.md`（端口兜底解析=0、新增 GenericTag=0、S2-A 证据齐备）。

### Stage 2B - 第二波（边界硬化与迁移封口）

- [x] T085 执行 `#4`：全仓 `Context.GenericTag -> Tag class` 清理并启用禁回流规则。
- [x] T086 `ExternalStore` 收敛到 runtime/scope 生命周期，禁止新增长直连 `runSync/runFork`。
- [x] T087 `TaskRunner` 全局 `inSyncTransaction` 深度迁到 scope 隔离影子模式（主路径退场全局深度）。
- [x] T088 固化 CI fail-fast：事务窗口 IO、业务写 `SubscriptionRef`、遗留入口调用。
- [x] T089 完成 Gate-B 记录：`inventory/gate-b.md`（旧入口新增命中=0、全局深度非主路径、strict diff 证据齐备）。

### Stage 2 通用 P0 迁移与 G1 验收

- [ ] T020 迁移 Service 定义与获取（`Context.* -> ServiceMap.Service`）。
- [ ] T021 迁移 Reference 与局部覆盖（`FiberRef/locally -> Reference/provideService`）。
- [ ] T022 收敛 runtime 边界（清理散落 `Runtime.run*`）。
- [ ] T023 批量替换 `catchAll*`/`fork*`/`Scope.extend` 并修复编译。
- [ ] T024 替换 `yield* fiber` 风险写法（统一 `Fiber.join/await`）。
- [ ] T025 适配 Cause 扁平化语义（错误提取与诊断映射重写）。
- [ ] T026 审计 Layer memoization，标注隔离点（`local: true` / `Layer.fresh`）。
- [ ] T027 清理 core 中 v3 关键 API 残留命中到 0。
- [x] T028 执行 `pnpm -C packages/logix-core typecheck:test`。
- [x] T029 执行 `pnpm -C packages/logix-core test`。
- [x] T030 采集 Stage 2 after/diff 性能证据并判读预算。
- [x] T037 采集 Stage 2 Node 通道 after/diff 证据并判读预算。
- [x] T038 对 Stage 2 before/after 报告执行 `pnpm perf validate`（gate 判定禁止 `--allow-partial`）。
- [x] T039 明确 G1 仅接受 strict diff 结论（不接受 triage diff 作为 gate 通过证据）。
- [x] T097 固化 G1 双门语义（`Gate-Abs` + `Gate-Rel`）：在 `inventory/gate-g1.md` 的 criteria 中明确 `perf_abs_gate_passed`、`perf_rel_gate_passed` 与判定口径。
- [x] T098 扩展 `contracts/stage-gate-record.md`：新增 baseline debt/no-worse 字段约束（至少包含 owner、threshold、exitCondition、evidenceRef）。
- [x] T099 在 `inventory/gate-g1.md` 建立 baseline debt 清单，并将 `before 已 budgetExceeded` 切片按 no-worse 规则分类（debt vs hard blocker）。
- [x] T100 按双门口径重写 `perf/s2.local.strict.summary.md` 与 `inventory/checkpoint-decision-log.md` 的判读段，拆分“after-only 新增阻塞”与“历史 debt/波动项”。
- [ ] T031 对照 Stage 0 诊断快照验证可解释性不下降。
- [x] T032 完成 G1 记录：`inventory/gate-g1.md`（必须附 Gate-A/Gate-B PASS 证据）。
- [ ] T033 迁移 `logix-query` 动态 Union/Literal 到 v4 目标写法。
- [x] T034 迁移 `logix-form` 错误格式化链路（移除 `ParseResult.TreeFormatter`）。
- [ ] T035 迁移 `logix-core` 的 schema 安全解码链路（`onAction(schema)` 过滤路径）。
- [ ] T036 增加 Schema 旧语法扫描 gate（`rg` 检查）并纳入阶段验收。

## Stage 3 - STM 局部 PoC（滞后半步，Gate-C + G2）

- [ ] T040 在 `WorkflowRuntime` 实现 ProgramState 局部 Tx* PoC。
- [ ] T041 在 `ProcessRuntime` 实现实例控制面状态 Tx* PoC。
- [ ] T042 补齐 PoC 回归：并发、取消、重试、异常回滚。
- [ ] T043 补齐 PoC 诊断一致性检查（事件链路对照）。
- [ ] T044 采集 PoC before/after/diff 性能证据。
- [ ] T045 生成复杂度对比（分支/LOC/认知复杂度）。
- [ ] T046 校验禁区未被触碰（transaction/TaskRunner/IO step）。
- [ ] T090 完成 Gate-C 并发矩阵验收（并发/取消/超时/重试全绿）。
- [ ] T091 完成 replay 一致性 + 稳定标识 diff 校验（`instanceId/txnSeq/opSeq`）。
- [ ] T092 产出影子路径退场计划与证据（与 S2-B 收口一致）。
- [ ] T093 完成 Gate-C 记录：`inventory/gate-c.md`。
- [ ] T047 依据 Gate-C + MUST/SHOULD 规则形成 go/no-go 报告。
- [ ] T048 回写 G2 结论到 `plan.md` 与 `spec.md`。

## Stage 4 - 基础设施与能力包迁移

- [ ] T050 迁移 `packages/logix-react`（runtime bindings/cache/hooks/provider）。
- [ ] T051 迁移 `packages/logix-sandbox`（worker/runtime 入口）。
- [ ] T052 迁移 `packages/i18n`（driver/fork 链路）。
- [ ] T053 迁移 `packages/logix-query`。
- [ ] T054 迁移 `packages/logix-form`。
- [ ] T055 迁移 `packages/domain`。
- [ ] T056 迁移 `packages/logix-cli`（入口与错误语义）。
- [ ] T057 按包执行 `typecheck:test` + `test`。
- [ ] T058 完成 G3 记录：`inventory/gate-g3.md`。

## Stage 5 - 应用、示例、文档、SSoT 收口

- [ ] T060 迁移 `apps/logix-galaxy-api`。
- [ ] T061 迁移 `apps/logix-galaxy-fe`。
- [ ] T062 迁移 `examples/*` 到 v4-only 写法。
- [ ] T063 同步 `docs/ssot/runtime/*` 裁决与实现。
- [ ] T064 同步 `docs/ssot/platform/*` 裁决与实现。
- [ ] T065 更新 `apps/docs/*` 与包 README（中文口径）。
- [ ] T067 清理 docs 中 Schema 旧语法示例（Union/Literal/Record/partial/pattern）。
- [ ] T068 完成 1 个 `Schema -> JSON Schema/Standard Schema` 导出试点并在文档呈现。
- [ ] T066 完成 G4 记录：`inventory/gate-g4.md`。

## Stage 6 - 1.0 发布闸门

- [x] T070 执行 `pnpm typecheck`。
- [x] T071 执行 `pnpm typecheck:test`。
- [x] T072 执行 `pnpm lint`。
- [x] T073 执行 `pnpm test:turbo`。
- [ ] T103 发布前执行 `git fetch origin` + `git rebase origin/main`。
- [ ] T104 将 v4 改造提交压缩为单提交 `V4_DELTA`（要求 `git rev-list --count origin/main..HEAD` == 1）。
- [x] T105 手动触发 `logix-perf-sweep.yml`：`base_ref=<V4_DELTA^>`、`head_ref=<V4_DELTA>`、`perf_profile=soak`、`diff_mode=strict`。
- [x] T106 下载 sweep artifacts 并落盘 `specs/103-effect-v4-forward-cutover/perf/`。
- [x] T074 汇总最终 perf/diagnostics 证据到 `perf/` 与 `diagnostics/`（必须包含 T105/T106 产物）。
- [x] T078 汇总 Browser + Node 双通道证据并生成统一结论摘要（含 comparability/regressions）。
- [x] T075 编写中文 `1.0` breaking changes + 迁移说明。
- [x] T076 完成 G5 记录：`inventory/gate-g5.md`（引用 `V4_DELTA^ -> V4_DELTA` 的 strict+soak 证据）。
- [ ] T077 将 spec 状态更新为 `Done`。

## 全程禁止项（持续检查）

- [ ] T900 禁止引入 v3/v4 双栈、兼容层、临时兼容开关。
- [ ] T901 禁止 STM PoC 扩展到禁区（`ModuleRuntime.transaction`、`TaskRunner`、IO step）。
- [ ] T902 禁止跳过 perf/diagnostics 证据就宣称阶段完成。
