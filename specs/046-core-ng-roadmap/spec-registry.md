# Spec Registry: core-ng 路线（046 总控）

> 本文件是 `specs/046-core-ng-roadmap/` 的“总控清单”：列出 **core-ng 路线相关的 specs（已存在/待新建）**、它们之间的依赖顺序、证据门禁与 kernel 支持矩阵。
>
> 目标：让你做完 045/039 之后，“下一步要新建/推进哪个 spec”一眼可见；同时避免把语义改变/新观测口径混进纯优化链路。

## SSoT（机器可读关系）

- 关系 SSoT：`specs/046-core-ng-roadmap/spec-registry.json`（members / 依赖 / 状态）
- 人读阐述：`specs/046-core-ng-roadmap/spec-registry.md`（解释/口径/注意事项/表格展示）

> 约定：脚本/自动化只依赖 `spec-registry.json`；本文件可更自由地扩写，但不要引入“只有 md 有、json 没有”的关系信息。

## 使用方式（建议）

1. 先看 `specs/046-core-ng-roadmap/roadmap.md`：只回答“里程碑与硬门槛”。
2. 先改 `spec-registry.json`：更新关系与状态（再按需同步本 md 的表格/阐述）。
3. 再看本文件：决定“该新建哪一个 spec / 放哪一类 / 证据门禁是什么 / 依赖谁”。
4. 真正要做时：按本文件条目的建议，用 `$speckit specify → plan → tasks` 生成对应 spec 产物。

## 统一口径（强制）

- **证据门禁**：任何触及核心路径的改动，必须使用 `$logix-perf-evidence` 产出 Node + ≥1 条 headless browser 的 before/after/diff。
- **perf matrix SSoT**：suites/budgets 统一以 `.codex/skills/logix-perf-evidence/assets/matrix.json` 为 SSoT（至少覆盖 `priority=P1`）；硬结论至少 `profile=default`；before/after 必须 `matrixId+matrixHash` 一致（保证可比性）。
- **AOT-ready, not AOT-required**：允许为未来编译期做准备，但默认运行路径不能被工具链绑死。
- **不出现半成品态**：严禁“ID 化到一半又还原回 string/再 split/join”的中间态成为默认路径；需要阶段性合入必须保持旧路径默认并用显式开关隔离（详见 039 Guardrails）。
- **ReadQuery ≠ Domain Query**：本路线图里的 “ReadQuery/SelectorSpec” 只描述“读状态依赖与投影”；不要与领域层 `@logixjs/query`（服务/缓存/请求）混用。
- **读状态车道必须可观测**：无插件仍可用（JIT 默认）；dynamic 回退必须可证据化并可在 strict gate 下变为失败（避免把动态兜底当成黑盒默认）。

## 状态枚举（建议）

- `idea`：想法/候选项
- `planned`：已决定要做，但尚未补齐 spec-kit 产物（可能仅有 `spec.md`，或仅登记在 registry；尚不具备可直接实施的 `plan/tasks`）
- `draft`：spec 已创建且产物齐全（`spec.md`/`plan.md`/`tasks.md` 至少齐全），但未进入实现
- `implementing`：实现中
- `done`：达标完成（有证据/迁移说明）
- `frozen`：保留为基线/对照，不再扩展（例如 039 在 core-ng 成默认后）

> 状态 SSoT：以 `specs/046-core-ng-roadmap/spec-registry.json` 的 `status` 为准；各 `spec.md` 顶部的 `Status:` 仅为人读提示，建议与 registry 同步以避免误判。

## Kernel support matrix（宪法对齐）

每个“触及内核/核心路径”的 spec 的 `plan.md` 必须写清：

- `core`: `supported` | `trial-only` | `not-yet`
- `core-ng`: `supported` | `trial-only` | `not-yet`

并明确 gate：契约一致性验证 + `$logix-perf-evidence`（Node + Browser）对照预算。

> 执行口径：kernel matrix 的“强制”当前依赖 `speckit` 的 plan 模板（Constitution Check 提醒）+ 046 的人工验收清单（见：`specs/046-core-ng-roadmap/checklists/registry.md`）。

## Kernel 表面与参数治理（046 统筹）

> 目标：避免“runtime kernel 选择”与 “Sandbox/Playground kernel 资产选择”两套口径互相打架。

- **Runtime kernel（045/047/048）**：发生在 `ManagedRuntime` 装配期；`KernelImplementationRef.kernelId` 表示 *requested kernel family*；“可切默认/无 fallback”以 047 Gate 为准；默认策略以 `specs/046-core-ng-roadmap/roadmap.md` 的 Policy Update 为准（当前默认 `core`，`core-ng` compare-only/试跑显式启用）。
- **Sandbox/Playground kernel（058）**：发生在 Browser Host 侧的“选择 kernel 资产（`kernelId → kernelUrl`）”；`defaultKernelId` 是 Host 在多 kernel 场景下的默认选择/唯一 fallback 目标；`availableKernelIds` 是面向读者的错误摘要字段（用于 UI/CI 解释与恢复提示）。
- **命名与证据对齐**：Sandbox 的 `kernelId` 应与 `KernelImplementationRef.kernelId`（requested family）保持一致（推荐 `core`/`core-ng`），避免 UI/证据两套叫法；需要判定“是否 full cutover”时，依赖 047/048 的门槛与证据字段，不依赖 sandbox label 口头约定。
- **生命周期（围绕 046 里程碑）**：当前默认策略为单内核 `core`；需要对照/试跑时，通过 058 在 Host 侧显式提供 `core-ng` 资产并选择。若未来再次考虑“切默认到 core-ng（或其它实验核）”，仍需重新执行 047/048 的门槛与迁移说明，并用 `$logix-perf-evidence` 裁决（默认路径无回归）。

---

## 已存在 specs（046 负责“调度/解释”，不替它们写实现）

| Spec | 主题 | 类型 | 证据门禁 | 备注 | Status |
| ---- | ---- | ---- | -------- | ---- | ------ |
| `specs/045-dual-kernel-contract/` | Kernel Contract + 对照验证跑道 | Foundation | `$logix-perf-evidence`（默认路径无回归） | 046 的分支点前置；上层只依赖 `@logixjs/core`；M0 已达标（证据见下） | done |
| `specs/039-trait-converge-int-exec-evidence/` | 当前内核收敛热路径整型化 + 证据达标 | Pure-opt (no semantic change) | `$logix-perf-evidence`（Node + Browser） | 关键 guardrails 都在 039；证据汇总：`specs/039-trait-converge-int-exec-evidence/perf.md`；未来 core-ng 可复用口径拦截负优化 | done |
| `specs/043-trait-converge-time-slicing/` | time-slicing/跨帧收敛 | Semantic change (opt-in) | `$logix-perf-evidence`（必须 Browser） | 明确不混入 039；若要推进需单独管理迁移口径 | done |
| `specs/044-trait-converge-diagnostics-sampling/` | 诊断采样/新观测口径 | Observability semantics | `$logix-perf-evidence`（必须 Browser） | 明确不改变 039 的 off、light、full 基础语义；新增 sampled 档位（见 044） | done |
| `specs/065-core-ng-id-first-txn-recording/` | txn/recording id-first（dirty-set + patch recording） | Observability semantics | `$logix-perf-evidence`（Node + Browser；hard gates） | 证据：`specs/065-core-ng-id-first-txn-recording/quickstart.md` + `specs/065-core-ng-id-first-txn-recording/perf/*` | implementing |

---

## 当前进度（手工回写）

- `M0 / 045`（已达标）：`specs/045-dual-kernel-contract/quickstart.md`
  - Harness：`packages/logix-core/src/internal/reflection/kernelContract.ts`（导出：`packages/logix-core/src/Reflection.ts`）
  - Perf（diff）：`specs/045-dual-kernel-contract/perf/diff.node.worktree.default.json`、`specs/045-dual-kernel-contract/perf/diff.browser.worktree.default.json`
- `M1 / 039`（已达标）：`specs/039-trait-converge-int-exec-evidence/quickstart.md`
  - Perf（summary）：`specs/039-trait-converge-int-exec-evidence/perf.md`
  - Perf（diff）：`specs/039-trait-converge-int-exec-evidence/perf/diff.node.worktree.json`、`specs/039-trait-converge-int-exec-evidence/perf/diff.browser.worktree.json`、`specs/039-trait-converge-int-exec-evidence/perf/diff.browser.diagnostics-overhead.worktree.json`
- `M1.1 / 044`（已达标）：`specs/044-trait-converge-diagnostics-sampling/spec.md`
  - Perf（summary）：`specs/044-trait-converge-diagnostics-sampling/perf.md`
- `M3 / 047`（已达标）：`specs/047-core-ng-full-cutover-gate/quickstart.md`
  - Perf（diff）：`specs/047-core-ng-full-cutover-gate/perf/diff.node.default.worktree.json`、`specs/047-core-ng-full-cutover-gate/perf/diff.browser.default.worktree.json`
- `M4 / 048`（历史迁移 spec；当前 Policy Update 已回退默认 `core`）：`specs/048-core-ng-default-switch-migration/spec.md`
- `046 / 综合对比（38db → 当前）`（已固化）：`specs/046-core-ng-roadmap/perf/README.md`
  - Perf（diff）：`specs/046-core-ng-roadmap/perf/diff.browser.38db2b05__c2e7456d.darwin-arm64.20260101-005537.default.json`
- `M1.5 / 057`（已达标）：`specs/057-core-ng-static-deps-without-proxy/spec.md`
- `056`（已达标）：`specs/056-core-ng-schema-layout-accessors/spec.md`
- `059`（已达标）：`specs/059-core-ng-planner-typed-reachability/spec.md`
- `065`（implementing）：`specs/065-core-ng-id-first-txn-recording/quickstart.md`
  - Browser diff：`specs/065-core-ng-id-first-txn-recording/perf/diff.browser.before.b0a1166c__after.b0a1166c-dirty.json`
  - Node bench：`specs/065-core-ng-id-first-txn-recording/perf/node.after.b0a1166c-dirty.bench027.r1.json`、`specs/065-core-ng-id-first-txn-recording/perf/node.before.b0a1166c.bench009.convergeMode=dirty.json`、`specs/065-core-ng-id-first-txn-recording/perf/node.after.b0a1166c-dirty.bench009.convergeMode=dirty.json`
- Next Action：无（`053/054/055` 已 frozen；053/054 已完成 Trigger Check 并保持 frozen；055 已完成 pilot 预选并保持 frozen；仅在证据触发条件满足时解冻）

## 登记 specs（046 统一收口；按优先级排序）

> 说明：下面条目是“已创建/待创建”的 NG 路线 specs 清单：是否推进由证据与优先级裁决，但必须先在这里登记，避免散落推进。

### P0：切换门槛与迁移（必须先固化，否则 NG 路线容易跑偏）

| Spec | 主题 | 类型 | 依赖 | 证据门禁 | kernel matrix 预期 | Status |
| ---- | ---- | ---- | ---- | -------- | ------------------ | ------ |
| `specs/047-core-ng-full-cutover-gate/` | “全套切换可达标”门槛：无 fallback + 契约一致性 + 预算 | Governance/Gate | 045（harness 可用）、建议 039 达标基线 | `$logix-perf-evidence`（Node+Browser，对照 core vs core-ng 全套切换） | core: supported / core-ng: supported | done |
| `specs/048-core-ng-default-switch-migration/` | 切默认到 core-ng（历史口径；现行默认策略以 046 Policy Update 为准） | Migration | 047 | `$logix-perf-evidence`（切默认动作本身也要证据化） | core: supported / core-ng: supported | frozen |

### P0.5：Playground/TrialRun 基础设施（Browser 对照入口）

| Spec | 主题 | 类型 | 依赖 | 证据门禁 | Status |
| ---- | ---- | ---- | ---- | -------- | ------ |
| `specs/058-sandbox-multi-kernel/` | Sandbox 多内核资产与选择：core/core-ng 对照试跑 + strict/fallback | Playground infra | 045 | 至少 1 条可复现的 Browser trial-run 对照样例（含 kernelId/implementationRef）；失败/降级必须可解释 | done |

### P1：Runtime-only NG（不依赖工具链，也能逼近“编译产物”形态）

| Spec | 主题 | 类型 | 依赖 | 证据门禁 | 关键 guardrails（摘要） | Status |
| ---- | ---- | ---- | ---- | -------- | ----------------------- | ------ |
| `specs/049-core-ng-linear-exec-vm/` | 线性指令流/Exec VM：热路径变为“plan + typed buffers + integer bridge” | Pure-opt (architecture) | 045；参考 039 的 Exec IR/bitset/zero-alloc 口径 | `$logix-perf-evidence`（Node+Browser；必须覆盖 local dirty + near-full；darwin-arm64/default：`specs/049-core-ng-linear-exec-vm/perf/diff.node.core-ng.execVm.off__on.converge.txnCommit.darwin-arm64.default.json`、`specs/049-core-ng-linear-exec-vm/perf/diff.browser.core-ng.execVm.off__on.matrixP1.darwin-arm64.default.json`） | 事务窗口禁 IO；diagnostics=off 零分配；严禁 string split/join 往返 | done |
| `specs/050-core-ng-integer-bridge/` | 全链路整型化：FieldPath/StepId/Reason/RowId 等稳定 id + 去随机化 | Pure-opt (contract+impl) | 045；对齐 016 稳定身份；参考 039 Guardrails 1/2/3 | `$logix-perf-evidence`（Node `converge.txnCommit` + Browser `converge.txnCommit`） | 禁止半成品默认；必要时以显式开关隔离 | done |
| `specs/051-core-ng-txn-zero-alloc/` | 事务/patch/dirtyset 零分配：argument-based recording + pathAsArray 透传 | Pure-opt (hot path) | 045 + 050；直接复用 039 的 T022/T015/T046 口径 | `$logix-perf-evidence`（Node `converge.txnCommit` + Browser `converge.txnCommit`） | light 下零分配；分支搬到 loop 外；禁 `...args` | done |
| `specs/052-core-ng-diagnostics-off-gate/` | diagnostics=off 近零成本达标与回归防线（含“分配闸门”规范化） | Pure-opt (observability perf) | 045；与 039 的 off 闸门一致 | `$logix-perf-evidence`（diagnostics overhead suite） | off 时禁止 steps 数组/label 拼接/计时 | done |

#### P1 边界（对号入座，避免重叠）

> 目的：把 “1+2 极致闭环（Integer Bridge + Evidence）” 相关工作拆到可交付 specs，避免每个 spec 都写一份“整型化/零分配/关诊断”的大杂烩。

| 关注点 | 归属 spec | 说明（最小口径） |
| ------ | -------- | ---------------- |
| Exec VM / Exec IR（线性 plan + typed buffers） | `049` | 只负责 core-ng 的 “执行形态” 与 `execIrVersion/execIrHash`；不裁决 id 的含义/稳定性策略。 |
| Integer Bridge（稳定 id + 无往返） | `050` | 定义 `FieldPathId/StepId/ReasonCode` 的稳定性/可解释性；把 txn→dirty→plan/exec→evidence 的 **表示** 打穿（禁止 `id→string→split` / `join→split`）。 |
| txn/patch/dirtyset 零分配（hot path） | `051` | 只做“分配行为/分支形态”的极致化：argument-based recording、分支搬到 loop 外、buffer 复用、microbench；不改变 id 语义。 |
| diagnostics=off 近零成本 gate | `052` | 把 “off 档位不做 steps/label/计时/映射 materialize” 写成可回归的闸门（测试 + suites）；覆盖 049/050/051 的 off 行为。 |

#### P1 备注：高信心“纯赚细节”（通常不必单开 spec，但必须在对应 spec 的 plan/tasks 里显式列出）

> 这些点在收益上通常属于“中高以上”，但更像实现细节清单。默认建议把它们纳入 `049/051/052` 的 tasks（或直接由 039 达标后复用结论），避免条目碎片化。

- **执行 loop 内彻底消灭 `split('.')` / `join('.')`**：必须是“ID → accessor/segments → get/set”的闭环，禁止 id→string→split。
- **`recordPatch` argument-based recording**：`instrumentation=light` 下调用点不允许创建 patch 对象；分支必须搬到 loop 外；禁止使用 rest 参数。
- **`StatePatch.path` 支持 `FieldPath`（pathAsArray）透传**：事务内禁止 string↔array 往返；仅在序列化/对外边界 materialize string。
- **bitset 复用 + 清零成本可量化**：默认 `fill(0)`；若 N 极大且证据显示 clear 成本主导，再引入 “touched words” 清零（或回退到 Set）。
- **diagnostics=off 零分配闸门**：off 时不分配 steps 数组、不拼接 label、不做 sort/top3。
- **top3 计算 O(n) 替代 sort**：仅在 diagnostics on 且确实需要 top3 时才做；优先 linear scan（避免 O(n log n)）。
- **EffectOp middleware fast path（证据驱动）**：若 stack 恒空，分支必须搬到 loop 外，避免 per-step 分支预测成本。
- **Plan cache 生命周期**：Exec IR/Accessor 表更重后，必须显式定义缓存归属（generation vs instance）与清理策略，避免 module 短生命周期导致泄漏。
- **mutative “单 draft 多次 mutate”语义与成本**：必须先用 micro-benchmark 证明 Node+Browser 一致且无负优化，再切默认；不通过则允许回退。

#### P1 扩展：更大颗粒度但仍不依赖工具链的候选（通常需要单独 spec）

| 建议 ID（占位） | 主题 | 类型 | 依赖 | 证据门禁 | 备注 | Status |
| -------------- | ---- | ---- | ---- | -------- | ---- | ------ |
| `056-core-ng-schema-layout-accessors` | Schema-aware accessors：stringPath→pathId 快路径 + id 级 prefix canonicalize（txn 内去 split/alloc） | Architecture | 045；建议先有 049 的 Exec VM 基座 | `$logix-perf-evidence`（必须 Browser） | 证据：`specs/056-core-ng-schema-layout-accessors/perf/diff.node.core-ng.execVm.on.before__after.converge.txnCommit.darwin-arm64.20251231-075738.default.json` + `specs/056-core-ng-schema-layout-accessors/perf/diff.browser.core-ng.execVm.on.before__after.matrixP1.darwin-arm64.20251231-075738.default.json` | done |
| `057-core-ng-static-deps-without-proxy` | ReadQuery/SelectorSpec + SelectorGraph：静态 deps（无 Proxy）+ struct memo + lane/strict gate | Architecture | 045；参考 `docs/ssot/handbook/reading-room/reviews/07-phase3-react-1p1gt2.md`（concept） | `$logix-perf-evidence`（Node+Browser；需覆盖 React selector / flow watcher） | 不装插件必须可用（JIT）；dynamic 回退必须可观测且 strict 可失败 | done |
| `060-react-priority-scheduling` | Txn Lanes（事务后续工作优先级调度 / 可解释调度）：关键交互优先，非关键补算可延后但有上界 | Semantic-change (policy) | 045 + 043 + 044 | `$logix-perf-evidence`（Node+Browser；需覆盖 urgent p95 + backlog 追平） | 不引入“可中断事务”；仅对事务后续工作做分片调度；统一 Lanes 证据管线与 Devtools 汇总视图（吸收 057 的 US2 交集），避免与 057 的读状态车道混淆 | done |
| `062-txn-lanes-default-switch-migration` | Txn Lanes 默认开启：从显式 opt-in 切换为默认 on（迁移与回退口径） | Migration (semantic default) | 060 + 052 | `$logix-perf-evidence`（Node+Browser；默认路径 off vs default-on；core+core-ng 都需达标） | breaking change：必须提供迁移说明；保留 forcedOff/forcedSync 做止血与对照；默认选择与回退必须可证据化；证据见 `specs/062-txn-lanes-default-switch-migration/quickstart.md` | done |
| `059-core-ng-planner-typed-reachability` | Planner/Reachability TypedArray 化：adjacency list/queue/bitset 纯内存算法 | Pure-opt (algorithm) | 045；可参考 `specs/013-auto-converge-planner/` 与 039 bitset | `$logix-perf-evidence`（Node+Browser） | 先 JS 极致化；证据显示仍被 Map/Set 主导再考虑 wasm；证据：`specs/059-core-ng-planner-typed-reachability/perf/diff.node.core-ng.execVm.on.before__after.converge.txnCommit.darwin-arm64.20251231-072950.default.json` + `specs/059-core-ng-planner-typed-reachability/perf/diff.browser.core-ng.execVm.on.before__after.matrixP1.darwin-arm64.20251231-072950.default.json` | done |

### P2：工具链（可选加速器，必须证据驱动，且另立 spec）

| 建议 ID（占位） | 主题 | 类型 | 依赖 | 触发条件（必须满足才启动） | 证据门禁 | Status |
| -------------- | ---- | ---- | ---- | -------------------------- | -------- | ------ |
| `053-core-ng-aot-artifacts` | AOT/插件：构建期产出 Static IR/Exec IR 工件（与 JIT 等价） | Toolchain | 045；建议先有 049/050 的 runtime-only 形态 | 证据显示解释层成本主导且 runtime 手段难以再降 | `$logix-perf-evidence`（Node+Browser，必须包含 fallback/降级口径） | frozen |

### P3：Wasm/Flat memory（只在证据显示 GC/Map/Set 仍主导时推进）

| 建议 ID（占位） | 主题 | 类型 | 依赖 | 证据门禁 | 备注 | Status |
| -------------- | ---- | ---- | ---- | -------- | ---- | ------ |
| `054-core-ng-wasm-planner` | Wasm Planner：Static graph resident + Int32Array bridge | Hybrid (Wasm kernel) | 045；建议先完成 JS TypedArray planner 极致化 | `$logix-perf-evidence`（必须 Browser；证明 bridge tax 可控） | 严禁字符串跨边界；buffer 复用；仅同步计算 | frozen |
| `055-core-ng-flat-store-poc` | Flat Store/Arena：SoA + integer handles + 零拷贝快照 | Architecture | 045；试点已预选：`patch/dirties/dirtyRoots` 数据面（见 `specs/055-core-ng-flat-store-poc/tasks.md` Phase 2） | `$logix-perf-evidence`（必须 Browser；关注 GC/alloc/long tail） | 先 PoC 后扩面；必须能降解到统一最小 IR | frozen |

---

## 与 039 的关系（避免重复投入）

- 039 是“当前内核够硬”的主线，也是 core-ng 的 **负优化拦截基线**。
- 上表中若某条目已经被 039 tasks 覆盖（例如 `recordPatch` 零分配、`pathAsArray` 透传、Exec IR/bitset），则 **优先在 039 达标**；core-ng 侧复用结论与证据口径，而不是另开一个“同题 spec”重复投入。

## 备注：草案/Topic 的位置

- `docs/specs/drafts/topics/logix-ng-architecture/` 作为探索输入可以持续迭代，但裁决必须落在 `specs/*`，并由 046 在本文件中登记与调度。
