# Tasks: Workflow Codegen IR（出码层：Canonical AST + Static IR）

**Input**: `specs/075-workflow-codegen-ir/*`  
**Prerequisites**: `spec.md`, `plan.md`, `data-model.md`, `contracts/*`, `quickstart.md`  
**Tests**: REQUIRED（语义测试 + perf evidence，见 `plan.md`）

## Phase 0: Perf-First Scaffolding（先把性能门槛落成可执行证据）

> 原则：在动核心路径之前，先把“可对比的 perf suite + baseline 语义 + 预算策略”落盘；否则很容易实现完才发现回归且无法归因。

- [x] T000 建立证据落点：创建 `specs/075-workflow-codegen-ir/perf/README.md`（按 073 口径写环境元信息模板 + 文件命名约定）(Refs: NFR-001, SC-003)
- [x] T001 新增/扩展 perf suite：`workflow.submit.tickNotify`（对比 `mode=manualWatcher|workflow`，同一份代码 A/B）(Refs: NFR-001, SC-003)
- [x] T002 新增/扩展 perf suite：`workflow.delay.timer`（对比 `mode=manualWatcher|workflow`，覆盖 delay→dispatch/KernelPort call）(Refs: NFR-001, SC-003)
- [x] T003 预算策略固化：先跑 `profile=default` 固化 baseline，再按 `baseline.p95 * 1.05` 设置 `diagnostics=off` 阈值（噪声过大可放宽到 1.10，必须写明原因）(Refs: NFR-001, NFR-002, SC-003)

## Phase 1: Spec Solidification（Contracts / IR / Examples）

- [x] T010 完成 `contracts/public-api.md`（对外 API：出码层定位；Canonical AST/Recipe；SSoT 分化 + DX 一体化；收敛入口 `Module.withWorkflow`；Tag-only `call`；禁止 user closure；输入映射 DSL v1；`validate/export`）
- [x] T011 完成 `contracts/ir.md`（Static IR：version+digest+nodes/edges；success/failure 必须是显式边；锚点去随机化）
- [x] T012 完成 `contracts/diagnostics.md`（Dynamic Trace：分级门控；tickSeq/runId/serviceId 关联；禁止把整图塞进事件流；off 近零成本）
- [x] T013 完成 `data-model.md`（Canonical AST + Static IR + Trace；输入映射 DSL v1；显式分支；stepKey 必填；避免双真相源字段）
- [x] T014 完成 `quickstart.md`（从 Recipe/Canonical AST 出码视角展示 submit/typeahead/delay；示例必须与 public-api/data-model 一致）
- [x] T015 完成 `contracts/tape.md`（可回放磁带：Record/Replay/Fork；覆盖 `Σ_t=(S_t,I_t)` 的在途态锚点）
- [x] T016 固化组合模型细节（fragment/compose/withPolicy；见 `data-model.md#workflow-composition`）：
  - fragmentId 命名/唯一性规则
  - compose 语义=顺序拼接 + stepKey 冲突 fail-fast（错误必须包含冲突 key 与来源 fragment）
  - `withPolicy` 的合并/覆盖优先级（避免“同一语义两种表示”）

## Phase 2: Core Implementation（@logixjs/core）

### 2.1 Authoring / Compile（冷路径：install/export 期做完）

- [x] T100 [US1] 实现 build-time 组合器：`Workflow.fragment/compose/withPolicy`（纯数据 AST；无运行时闭包；组合产物可归一为 Canonical AST）(Refs: US1, FR-006)
- [x] T101 [US1] Canonical AST：`normalize + validate`（stepKey 必填且唯一；分支显式；InputExpr 合法；未知 version fail-fast）(Refs: US1, FR-006)
- [x] T102 InputExpr 预编译：JSON Pointer 预解析（禁止运行时解析字符串）；`merge.items` 结构校验在 compile 期完成 (Refs: FR-003)
- [x] T103 [US3] Static IR 编译：`programId/nodeId/digest/nodes/edges/source` 全部在 export/install 期计算并缓存（禁止运行时 hash/JSON.stringify）(Refs: US3, FR-005, NFR-002, NFR-003)
- [x] T104 [US1] Service 解析：`serviceId` 必须可解析为可调用入口（缺失 fail-fast）；IR/Trace/Tape 中只写 `serviceId`（禁止双真相源）(Refs: US1, FR-003, FR-007)
- [x] T105 [US1] SSoT 分化 + DX 一体化：定义 `WorkflowDef`（纯 JSON）并实现 `Workflow.toJSON()/fromJSON(...)`（或等价静态方法），确保落盘形态无 Tag/闭包 (Refs: FR-001, FR-006)
- [x] T106 [US3] Root IR 对齐点：导出 `workflowSurface` slice（含 `workflowSurfaceDigest`）与最小 `effectsIndex` 结构，供 `ControlSurfaceManifest` 收口引用 `packages/logix-core/src/internal/observability/workflowSurface.ts` + `packages/logix-core/src/internal/observability/controlSurfaceManifest.ts` (Refs: FR-001, FR-007)

### 2.2 Mount / Routing（热路径：单订阅 + O(1+k)）

- [x] T110 收敛入口：在 `packages/logix-core/src/Module.ts` 新增 `Module.withWorkflow(program)`（糖衣入口）
- [x] T111 新增公共子模块 `packages/logix-core/src/Workflow.ts`（DSL + 类型导出）
- [x] T112 新增 internal `packages/logix-core/src/internal/runtime/core/WorkflowRuntime.ts`（compile + mount + router）
- [x] T113 关键性能门槛：实现 `mountAll(programs[])`（每个 module instance 只起 1 条 actions$ watcher Fiber，内部做 actionTag→programs 索引）
- [x] T114 Action 路由：仅提取一次 actionTag，并以 `Map.get(actionTag)` 命中 programs（禁止扫描全量 programs）
- [x] T115 Lifecycle 触发：`onStart/onInit` 通过生命周期管理器触发一次性 run（不得引入额外常驻订阅）
- [x] T116 提供批量入口：新增 `Module.withWorkflows(workflows)`（平台/AI 出码推荐；保证单订阅与 O(1+k) 路由；内部委托 `WorkflowRuntime.mountAll`）

### 2.3 Execution Semantics（最小节点集 v1）

- [x] T120 [US1] 最小节点集解释器：trigger(action/lifecycle) + step(dispatch/call/delay)，success/failure 必须是显式结构 (Refs: US1, FR-002, FR-003)
- [x] T121 [US1] 并发策略：latest/exhaust/parallel（语义对齐 FlowRuntime；取消必须可解释：reason + cancelledByRunId） (Refs: US1, FR-004)
- [x] T122 `dispatch`：默认写侧（构造 `{ _tag, payload }`）；不得引入 direct state write（写逃逸必须 fail-fast） (Refs: FR-003)
- [x] T123 `call`：事务窗口外执行；v1 只走 success/failure 控制流（不提供结果数据流）；timeout/retry 进入可导出 IR (Refs: US1, FR-003, NFR-004)
- [x] T124 [US2] `delay`：通过可注入 time service 调度并可取消（latest 替换必须能 cancel）；禁止影子 setTimeout/Promise 链 (Refs: US2, FR-002, FR-003, SC-002)
- [x] T125 KernelPorts：定义最小 kernel ports（例如 `sourceRefresh`）为 Tag-only service ports，并以 `callById('logix/kernel/<port>')` 作为 Platform-Grade/LLM 出码规范形表达（TS sugar：`call(KernelPorts.<Port>)`）；自动触发主线由 076 负责（避免双真相源） (Refs: FR-003, FR-007)

### 2.4 Diagnostics / Tape（门控 + Slim）

- [x] T130 [US3] diagnostics 门控：`off` 不产出 Program 级 trace；`light/sampled/full` 才附带锚点（不携带 IR 全量） (Refs: US3, NFR-002)
- [x] T131 结构化错误：错误必须携带 `code/programId/source.stepKey/detail(纯 JSON)`，便于 Devtools 与 AI 修复 (Refs: US3)
- [x] T132 tape（可选；075 仅固化 contract，运行时 record/replay/fork 延后）：record/replay/fork 时才记录边界事件（timer/io/txn.commit 等）；live 默认不记录

### 2.5 Performance Hardening（把控落到实现门禁）

- [x] T140 硬门自检：运行期禁止 JSON stringify / hash / JSONPointer 解析落到热路径（只允许在 install/export） (Refs: NFR-002)
- [x] T141 watcher 数量门禁：验证“安装 N 个 programs”不会产生 N 条 actions$ 订阅（保持单订阅） (Refs: NFR-002)

## Phase 3: Tests & Examples

- [x] T200 [US1] 语义测试：submit → call → success/failure 分支（含 latest/exhaust 的取消/忽略语义） (Refs: US1, SC-001)
- [x] T201 [US2] 语义测试：delay → dispatch/refresh（可控时间源/可取消；tickSeq 归因链路可解释） (Refs: US2, SC-002)
- [x] T202 [US3] 诊断门控测试：diagnostics=off 不发 Program 级 trace；light/sampled/full 才附带锚点（且不携带 IR 全量） (Refs: US3, NFR-002)
- [x] T203 性能门禁测试：actions$ 单订阅（安装多 programs 不线性增加订阅/广播成本） (Refs: NFR-002)
- [x] T204 examples：新增最小场景 `examples/logix/src/scenarios/workflow-codegen-ir.ts` (Refs: SC-001)
- [x] T205 [US3] 交付“优化阶梯”文档与最小验收用例：明确各阶梯开关/输出/如何从证据推进到调参/拆分 `specs/075-workflow-codegen-ir/contracts/optimization-ladder.md` (Refs: NFR-005)

## Phase 4: Perf Evidence & Quality Gates

- [x] T300 采集 `profile=default` 的 before/after/diff（A/B 同一份代码），并落盘到 `specs/075-workflow-codegen-ir/perf/*` (Refs: NFR-001, SC-003)
- [x] T301 根据 baseline 固化 budgets（off=baseline*1.05），并把结论回写 `perf/README.md`（同 073 交接口径）
- [x] T302 跑 workspace gates：`pnpm typecheck`、`pnpm lint`、`pnpm test:turbo`
- [x] T303 文档统一：把已完成 specs 中的旧“二档位写法（light/full）”统一为 `diagnostics=light/sampled/full`（并明确 sampled 的语义/是否产出）；覆盖：
  - `specs/012-program-api/`
  - `specs/023-logic-traits-setup/`
  - `specs/039-trait-converge-int-exec-evidence/`
  - `specs/045-dual-kernel-contract/`
  - `specs/046-core-ng-roadmap/`
  - `specs/049-core-ng-linear-exec-vm/`
  - `specs/050-core-ng-integer-bridge/`
  - `specs/051-core-ng-txn-zero-alloc/`
  - `specs/057-core-ng-static-deps-without-proxy/`
  - `specs/060-react-priority-scheduling/`
  - `specs/065-core-ng-id-first-txn-recording/`
  - `specs/067-action-surface-manifest/`
  - 验收：上述目录内不得再出现旧写法（以 `rg -n "diagnostics=(light|full)([^/]|$)" specs/0{12,23,39,45,46,49,50,51,57,60,65,67}* -S` 为准；仅针对 `specs/*`，不含 SSoT）

## Phase 5: 既有文档措辞同步（延后到本需求收尾阶段）

> 规则：本 phase 只做“措辞/口径同步”（SSoT/已有文档），不引入新裁决；如需新增裁决必须回到 `spec.md/plan.md` 更新。

- [x] T310 同步平台 SSoT：将 075 的终态口径（WorkflowDef 权威输入、`call`、KernelPorts、`workflowSurfaceDigest`）回链到 `docs/ssot/platform/contracts/*` 与术语表（仅措辞对齐）
- [x] T311 同步平台 workbench：把“Π=Workflow（def+slice）/Workflow=DX 值对象”的表述统一到 `docs/specs/sdd-platform/workbench/*`（仅措辞对齐）
- [x] T312 同步 runtime SSoT：补齐 Workflow 分层术语与“可合并性 rationale”（落点：`docs/ssot/runtime/logix-core/concepts/10-runtime-glossary.11-workflow-and-control-surface.md`；仅措辞对齐）
- [x] T313 更新 runtime glossary 索引：`docs/ssot/runtime/logix-core/concepts/10-runtime-glossary.md` 增补 075 的分层术语入口

## Phase 6: Naming Unification（FlowProgram → Workflow，含证据链命名）

- [x] T400 统一公共 API：`Logix.FlowProgram` → `Logix.Workflow`；`Module.withFlow(s)` → `Module.withWorkflow(s)`；同步 `packages/logix-core/package.json` exports（forward-only，无 shim）
- [x] T401 统一 internal 命名与落点：`internal/flow-program/**` → `internal/workflow/**`；`FlowProgramRuntime` → `WorkflowRuntime`；`FLOW_PROGRAM_*` 错误与 `_tag` 口径同步到 `WORKFLOW_*`/`Workflow*`
- [x] T402 统一诊断/事件/trace 命名：`flowProgram.*` → `workflow.*`（含 timer 事件、dispatch/cancel/drop、originKind 等），并同步更新对应测试断言
- [x] T403 统一 perf suite 与维度命名：`flowProgram.*` suites + `flowProgram.mode` + `VITE_LOGIX_PERF_FLOW_PROGRAM_MODE` → `workflow.*` + `workflow.mode` + `VITE_LOGIX_PERF_WORKFLOW_MODE`；同步更新矩阵与已生成 evidence 文件名/内容
- [x] T404 最后一步对齐 spec 目录与互引：确保目录为 `specs/075-workflow-codegen-ir/`，并全仓更新引用路径
- [x] T405 回归质量门：`pnpm typecheck`、`pnpm typecheck:test`、`pnpm lint`、`pnpm test:turbo`
- [x] T406 验收扫尾：清理 075 specs 内残留的 `FlowProgram*` 命名（`data-model.md` / `contracts/*` / `plan.md` / `review.md`），统一对外口径为 `Workflow*`
- [x] T407 验收扫尾：在 `specs/075-workflow-codegen-ir/` 内执行 `rg -n "FlowProgram" .` 仅允许命中“命名迁移任务描述”（Phase 6 本节）

## Phase 7: Determinism & Anchors（验收加固：消除 locale 漂移 + 锚点 fail-fast）

- [x] T408 确定性：移除 digest/可序列化 IR 相关路径中的 `localeCompare`，统一为 locale-independent 排序（含 `stableStringify`、Workflow IR/Root IR 导出、TypeIR/PortSpec 等）
- [x] T409 Root IR：`exportControlSurface` moduleId 不可解析时 fail-fast（禁止 `'unknown'` 回退），错误信息需可操作（提示传入配置后的 Module/ModuleImpl）
- [x] T410 计划落盘：补齐 `specs/075-workflow-codegen-ir/plan.md` 的 `Constitution Check`（逐条给出答案 + 交叉引用）

## Phase 8: Type Safety Handbrake（Workflow 绑定 Module.actions）

- [x] T411 Workflow 入口：支持 `Workflow.make<typeof M>(...)`，将 `trigger/dispatch.actionTag` 约束为 `keyof M.actions`（仅类型层；运行时/IR 仍为 `string`）
- [x] T412 Workflow 糖衣：新增 `Workflow.forModule(M)` 返回绑定 actionTag 的 DSL（避免重复书写 `typeof M`）
- [x] T413 类型用例：新增 `packages/logix-core/test/types/WorkflowActionTags.d.ts.test.ts` 覆盖两条入口（`make<typeof M>` / `forModule(M)`）

## Phase 9: Type Hygiene（075 范围内尽量消除 `any`/`as any`）

- [x] T414 清理 075 相关实现/示例中的 `any`/`as any`（优先用 `unknown` + 守卫；避免改语义/热路径结构）
