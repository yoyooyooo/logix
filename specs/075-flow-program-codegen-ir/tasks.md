# Tasks: FlowProgram Codegen IR（出码层：Canonical AST + Static IR）

**Input**: `specs/075-flow-program-codegen-ir/*`  
**Prerequisites**: `spec.md`, `plan.md`, `data-model.md`, `contracts/*`, `quickstart.md`  
**Tests**: REQUIRED（语义测试 + perf evidence，见 `plan.md`）

## Phase 0: Perf-First Scaffolding（先把性能门槛落成可执行证据）

> 原则：在动核心路径之前，先把“可对比的 perf suite + baseline 语义 + 预算策略”落盘；否则很容易实现完才发现回归且无法归因。

- [x] T000 建立证据落点：创建 `specs/075-flow-program-codegen-ir/perf/README.md`（按 073 口径写环境元信息模板 + 文件命名约定）
- [ ] T001 新增/扩展 perf suite：`flowProgram.submit.tickNotify`（对比 `mode=manualWatcher|flowProgram`，同一份代码 A/B）
- [ ] T002 新增/扩展 perf suite：`flowProgram.delay.timer`（对比 `mode=manualWatcher|flowProgram`，覆盖 delay→dispatch/refresh）
- [ ] T003 预算策略固化：先跑 `profile=default` 固化 baseline，再按 `baseline.p95 * 1.05` 设置 `diagnostics=off` 阈值（噪声过大可放宽到 1.10，必须写明原因）

## Phase 1: Spec Solidification（Contracts / IR / Examples）

- [x] T010 完成 `contracts/public-api.md`（对外 API：出码层定位；Canonical AST/Recipe；收敛入口 `Module.withFlow`；Tag-only `serviceCall`；禁止 user closure；输入映射 DSL v1；`validate/export`）
- [x] T011 完成 `contracts/ir.md`（Static IR：version+digest+nodes/edges；success/failure 必须是显式边；锚点去随机化）
- [x] T012 完成 `contracts/diagnostics.md`（Dynamic Trace：分级门控；tickSeq/runId/serviceId 关联；禁止把整图塞进事件流；off 近零成本）
- [x] T013 完成 `data-model.md`（Canonical AST + Static IR + Trace；输入映射 DSL v1；显式分支；stepKey 必填；避免双真相源字段）
- [x] T014 完成 `quickstart.md`（从 Recipe/Canonical AST 出码视角展示 submit/typeahead/delay；示例必须与 public-api/data-model 一致）
- [x] T015 完成 `contracts/tape.md`（可回放磁带：Record/Replay/Fork；覆盖 `Σ_t=(S_t,I_t)` 的在途态锚点）
- [ ] T016 固化组合模型细节（fragment/compose/withPolicy）：
  - fragmentId 命名/唯一性规则
  - compose 语义=顺序拼接 + stepKey 冲突 fail-fast（错误必须包含冲突 key 与来源 fragment）
  - `withPolicy` 的合并/覆盖优先级（避免“同一语义两种表示”）

## Phase 2: Core Implementation（@logixjs/core）

### 2.1 Authoring / Compile（冷路径：install/export 期做完）

- [ ] T100 实现 build-time 组合器：`FlowProgram.fragment/compose/withPolicy`（纯数据 AST；无运行时闭包；组合产物可归一为 Canonical AST）
- [ ] T101 Canonical AST：`normalize + validate`（stepKey 必填且唯一；分支显式；InputExpr 合法；未知 version fail-fast）
- [ ] T102 InputExpr 预编译：JSON Pointer 预解析（禁止运行时解析字符串）；`merge.items` 结构校验在 compile 期完成
- [ ] T103 Static IR 编译：`programId/nodeId/digest/nodes/edges/source` 全部在 export/install 期计算并缓存（禁止运行时 hash/JSON.stringify）
- [ ] T104 Service 解析：`serviceId` 必须可解析为可调用入口（缺失 fail-fast）；IR/Trace/Tape 中只写 `serviceId`（禁止双真相源）

### 2.2 Mount / Routing（热路径：单订阅 + O(1+k)）

- [ ] T110 收敛入口：在 `packages/logix-core/src/Module.ts` 新增 `Module.withFlow(program)`（糖衣入口）
- [ ] T111 新增公共子模块 `packages/logix-core/src/FlowProgram.ts`（DSL + 类型导出）
- [ ] T112 新增 internal `packages/logix-core/src/internal/runtime/core/FlowProgramRuntime.ts`（compile + mount + router）
- [ ] T113 关键性能门槛：实现 `mountAll(programs[])`（每个 module instance 只起 1 条 actions$ watcher Fiber，内部做 actionTag→programs 索引）
- [ ] T114 Action 路由：仅提取一次 actionTag，并以 `Map.get(actionTag)` 命中 programs（禁止扫描全量 programs）
- [ ] T115 Lifecycle 触发：`onStart/onInit` 通过生命周期管理器触发一次性 run（不得引入额外常驻订阅）
- [ ] T116 提供批量入口：新增 `Module.withFlows(programs)`（平台/AI 出码推荐；保证单订阅与 O(1+k) 路由；内部委托 `FlowProgramRuntime.mountAll`）

### 2.3 Execution Semantics（最小节点集 v1）

- [ ] T120 最小节点集解释器：trigger(action/lifecycle) + step(dispatch/serviceCall/delay/sourceRefresh)，success/failure 必须是显式结构
- [ ] T121 并发策略：latest/exhaust/parallel（语义对齐 FlowRuntime；取消必须可解释：reason + cancelledByRunId）
- [ ] T122 `dispatch`：默认写侧（构造 `{ _tag, payload }`）；不得引入 direct state write（写逃逸必须 fail-fast）
- [ ] T123 `serviceCall`：事务窗口外执行；v1 只走 success/failure 控制流（不提供结果数据流）；timeout/retry 进入可导出 IR
- [ ] T124 `delay`：通过可注入 time service 调度并可取消（latest 替换必须能 cancel）；禁止影子 setTimeout/Promise 链
- [ ] T125 `sourceRefresh`：显式 escape hatch；自动触发主线由 076 负责（避免双真相源）

### 2.4 Diagnostics / Tape（门控 + Slim）

- [ ] T130 diagnostics 门控：`off` 不产出 Program 级 trace；`light/sampled/full` 才附带锚点（不携带 IR 全量）
- [ ] T131 结构化错误：错误必须携带 `code/programId/source.stepKey/detail(纯 JSON)`，便于 Devtools 与 AI 修复
- [ ] T132 tape（可选）：record/replay/fork 时才记录边界事件（timer/io/txn.commit 等）；live 默认不记录

### 2.5 Performance Hardening（把控落到实现门禁）

- [ ] T140 硬门自检：运行期禁止 JSON stringify / hash / JSONPointer 解析落到热路径（只允许在 install/export）
- [ ] T141 watcher 数量门禁：验证“安装 N 个 programs”不会产生 N 条 actions$ 订阅（保持单订阅）

## Phase 3: Tests & Examples

- [ ] T200 语义测试：submit → serviceCall → success/failure 分支（含 latest/exhaust 的取消/忽略语义）
- [ ] T201 语义测试：delay → dispatch/refresh（可控时间源/可取消；tickSeq 归因链路可解释）
- [ ] T202 诊断门控测试：diagnostics=off 不发 Program 级 trace；light/sampled/full 才附带锚点（且不携带 IR 全量）
- [ ] T203 性能门禁测试：actions$ 单订阅（安装多 programs 不线性增加订阅/广播成本）
- [ ] T204 examples：新增最小场景 `examples/logix/src/scenarios/flow-program-codegen-ir.ts`

## Phase 4: Perf Evidence & Quality Gates

- [ ] T300 采集 `profile=default` 的 before/after/diff（A/B 同一份代码），并落盘到 `specs/075-flow-program-codegen-ir/perf/*`
- [ ] T301 根据 baseline 固化 budgets（off=baseline*1.05），并把结论回写 `perf/README.md`（同 073 交接口径）
- [ ] T302 跑 workspace gates：`pnpm typecheck`、`pnpm lint`、`pnpm test:turbo`
- [ ] T303 文档统一：把已完成 specs 中的旧“二档位写法（light/full）”统一为 `diagnostics=light/sampled/full`（并明确 sampled 的语义/是否产出）；覆盖：
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
