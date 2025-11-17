# Tasks: 046 core-ng 路线总控（调度其它 NG specs）

**Input**: `specs/046-core-ng-roadmap/*`（`spec.md`/`plan.md`/`roadmap.md`/`spec-registry.json`/`spec-registry.md`/`research.md`/`quickstart.md`）

> 说明：046 是“总控/调度 spec”。它不实现 runtime 代码；它的 tasks 负责：
>
> - 维护 `spec-registry.json`（关系 SSoT）与 `spec-registry.md`（人读阐述）：把 NG 路线拆成可交付 specs，并写清证据门禁/依赖顺序
> - 触发/创建后续 specs（用 `$speckit specify/plan/tasks`）
> - 把每个里程碑的证据入口链接回 046（形成可交接事实源）

---

## Phase 1: 总控清单维护（P0）

**Goal**: 让 046 成为 NG 路线的唯一调度入口（避免草案碎片与口径漂移）。

- [x] T001 维护/更新 spec registry（关系 SSoT=JSON；新增条目必须写清：类型、依赖、证据门禁、kernel support matrix）`specs/046-core-ng-roadmap/spec-registry.json`、`specs/046-core-ng-roadmap/spec-registry.md`
- [x] T002 维护路线图里程碑与 registry 的一致性（里程碑变化必须同步到 registry；反之亦然）`specs/046-core-ng-roadmap/roadmap.md`、`specs/046-core-ng-roadmap/spec-registry.md`
- [x] T003 维护里程碑执行清单（只引用其它 spec 的 tasks，不复制实现细节）：M0（045）→ M1（039）`specs/046-core-ng-roadmap/checklists/m0-m1.md`
- [x] T004 增加并维护 registry 可用性验收清单（避免退化为手工列表）`specs/046-core-ng-roadmap/checklists/registry.md`

---

## Phase 2: P0 必做（切换门槛与迁移 specs）（P0）

**Goal**: 先把“可切默认”的硬门槛与迁移动作固化为独立 specs，避免 NG 路线推进时失控。

- [x] T010 新建并补齐 `specs/047-core-ng-full-cutover-gate/`（承接 M3：全套切换无 fallback + 契约一致性 + perf budgets；含 Node+Browser 证据门禁）`specs/047-core-ng-full-cutover-gate/*`
- [x] T011 新建并补齐 `specs/048-core-ng-default-switch-migration/`（承接 M4：切默认迁移说明 + 显式回退口径 + 证据落盘）`specs/048-core-ng-default-switch-migration/*`

---

## Phase 2.1: P0.5 Playground/TrialRun 基础设施（Browser 对照入口）（P0）

**Goal**: 让 Browser 侧（docs/Playground/CI）的 trial-run 也能做 core/core-ng 对照，并保持“默认可复现、失败可解释、无静默回退”。

- [x] T015 新建并补齐 `specs/058-sandbox-multi-kernel/`（multi-kernel + strict/fallback + defaultKernelId/availableKernelIds 口径；作为 041 debug 的对照底座）`specs/058-sandbox-multi-kernel/*`
- [x] T016 （随 Policy Update）回写 consumer 默认选择：默认 kernel=core；`core-ng` 保留为显式对照/试跑选项；debug-only 才暴露选择 UI（不引入隐式 fallback）`specs/041-docs-inline-playground/*`、`specs/058-sandbox-multi-kernel/*`

---

## Phase 2.5: 045 → 039 串联（M0→M1）（P0）

**Goal**: 把 “完成 045 之后先做 039” 的执行口径写死，并让证据/状态回写具备可追踪落点。

- [x] T012 当 045 达标（M0）时：把 “M1=039” 标记为 Next Action（达标判定以 045 quickstart 跑通 + perf evidence（Node+Browser）落盘 + contract harness 可用为准；然后在 046 路线图/registry 手工回写状态与证据入口）`specs/046-core-ng-roadmap/roadmap.md`、`specs/046-core-ng-roadmap/spec-registry.md`
- [x] T013 在 045 quickstart 增加 “Next: 046/M1（039）” 的入口链接（完成 045 后不迷路）`specs/045-dual-kernel-contract/quickstart.md`
- [x] T014 在 039 quickstart 标注其在 046 路线中的位置（M1），并指向 046 的证据回写任务（T041）`specs/039-trait-converge-int-exec-evidence/quickstart.md`

---

## Phase 3: P1 路线（Runtime-only NG）（P1）

**Goal**: 在不依赖工具链的前提下，把 core-ng 的热路径逼近“编译产物形态”（线性指令流 + 整型桥 + buffer 复用 + off 零分配）。

- [x] T020 新建并补齐 `specs/049-core-ng-linear-exec-vm/`（线性执行 VM / Exec IR / JIT-style 构造期预编译）`specs/049-core-ng-linear-exec-vm/*`
- [x] T021 新建并补齐 `specs/050-core-ng-integer-bridge/`（全链路整型桥：pathAsArray + argument-based recording + id 驱动访问器）`specs/050-core-ng-integer-bridge/*`
- [x] T022 新建并补齐 `specs/051-core-ng-txn-zero-alloc/`、`specs/052-core-ng-diagnostics-off-gate/`（对号入座：分别收口零分配与 off gate，避免与 050/049 重叠）`specs/046-core-ng-roadmap/spec-registry.md`
- [x] T023 新建并补齐 `specs/057-core-ng-static-deps-without-proxy/`（ReadQuery/SelectorSpec + SelectorGraph：静态 deps + struct memo + lane/strict gate）`specs/057-core-ng-static-deps-without-proxy/*`

---

## Phase 4: 可选探索（Toolchain / Wasm / Flat store）（P2–P3）

**Goal**: 仅在证据触发条件满足时启动；每项探索必须另立 spec 并有明确降级/回退口径。

- [x] T030 （条件未触发，暂不启动；触发条件见 registry）按 registry 新建 AOT spec（不得把工具链长期税混入纯优化链路）`specs/046-core-ng-roadmap/spec-registry.md`
- [x] T031 （条件未触发，暂不启动；触发条件见 registry）按 registry 新建 Wasm planner / Flat store PoC spec（必须 Browser 证据）`specs/046-core-ng-roadmap/spec-registry.md`

---

## Phase 5: 里程碑证据回写（持续维护）（P1）

- [x] T040 当 045 达标可跑后，把 M0 的证据入口与验证链接回写到路线图（以及必要时回写 registry 状态）`specs/046-core-ng-roadmap/roadmap.md`、`specs/046-core-ng-roadmap/spec-registry.md`
- [x] T041 当 039 达标后，把 M1 的证据入口（`perf.md` + 关键 before/after/diff）链接回写到路线图与 registry，并把 039 状态标记为 implementing→done（或按 046 定义的状态枚举）`specs/046-core-ng-roadmap/roadmap.md`、`specs/046-core-ng-roadmap/spec-registry.md`
- [x] T042 固化 046 综合 perf 对比（38db → 当前）：解读 + before/after/diff 归档 `specs/046-core-ng-roadmap/perf/README.md`、`specs/046-core-ng-roadmap/perf/before.browser.38db2b05.darwin-arm64.20260101-005537.default.json`、`specs/046-core-ng-roadmap/perf/after.browser.c2e7456d.darwin-arm64.20260101-005537.default.json`、`specs/046-core-ng-roadmap/perf/diff.browser.38db2b05__c2e7456d.darwin-arm64.20260101-005537.default.json`
