---

description: "028 Form API 收敛与 DX 提升（rules-first）任务清单"

---

# Tasks: Form API 收敛与 DX 提升（rules-first）

**Input**: 设计文档来自 `specs/028-form-api-dx/`  
**Prerequisites**: `specs/028-form-api-dx/plan.md`、`specs/028-form-api-dx/spec.md`（以及 `research.md` / `data-model.md` / `contracts/` / `quickstart.md`）  
**Tests**: 本特性 `FR-010` 明确要求自动化测试；且改动涉及表单热路径（reducer/wiring/validate），必须包含回归防线（关键行为测试 + 可复现性能基线记录）。

## Format: `- [ ] T### [P?] [US#?] 描述 + 文件路径`

- **[P]**: 可并行（不同文件/无未完成依赖）
- **[US#]**: 仅用于用户故事阶段任务（US1/US2/US3）
- 每条任务必须包含明确的文件路径（可包含多个）

---

## Phase 1: Setup（共享脚手架）

**Purpose**: 为 rules-first 入口与后续迁移建立最小的代码落点（不改变现有默认行为）

- [X] T001 创建 rules DSL 模块骨架并在 public barrel 导出：`packages/logix-form/src/dsl/rules.ts`、`packages/logix-form/src/index.ts`
- [X] T002 在 `@logix/form` public API 中新增 schema-scope 入口 `Form.from(ValuesSchema)`（统一 derived/rules/traits 的类型收窄与语法糖）并导出（不改现有调用方）：`packages/logix-form/src/dsl/from.ts`、`packages/logix-form/src/index.ts`

---

## Phase 2: Foundational（阻塞项：回归防线与基线口径）

**Purpose**: 在改动热路径之前，先固化“怎么测、怎么回归、怎么解释”的最小防线

- [X] T003 创建 028 性能基线记录模板（含环境信息与口径，占位数值留空）：`specs/028-form-api-dx/references/perf-baseline.md`
- [X] T004 添加 028 基线跑道脚本（覆盖 setValue/blur/array ops/submit 的可复现测量输出；入口：`pnpm perf bench:028:form-interactions`）

**Checkpoint**: 基线口径与跑道存在后，才进入 user story 实现（避免“改完才发现不可测/不可解释”）

---

## Phase 3: User Story 1 - 用更少概念完成复杂表单 (Priority: P1) 🎯 MVP

**Goal**: 业务侧默认只用 `values/initialValues + derived + rules` 完成复杂表单（联动 + 条件必填 + 动态列表行/列表级校验），无需直接写 `traits` 的深层结构。

**Independent Test**: `examples/logix-react` 的复杂表单 demo 迁移到 rules-first 后可跑；并用自动化测试覆盖 spec.md 的 US1 验收场景（邮箱必填、条件必填、行级/列表级校验、空列表、派生联动）。

### Tests for User Story 1（REQUIRED）

- [X] T005 [P] [US1] 添加 rules-first 复杂表单行为测试（覆盖 US1 场景，含 `$self` 对象级 refine 与子字段错误共存）：`packages/logix-form/test/Form.RulesFirst.ComplexForm.test.ts`
- [X] T006 [P] [US1] 添加 rules-first 类型层用例（decl list + list identity + ruleGroup 形态不退化）：`packages/logix-form/test/Form.RulesFirst.d.ts`

### Implementation for User Story 1

- [X] T007 [P] [US1] 定义 rules decl 数据结构与 builder（decl list / list identity / root/field/list 规则 + zod-like `schema/object/array/field` 语法糖 + `.refine/.superRefine`（object→`$self`，array→`$list`）+ `at(prefix)`）：`packages/logix-form/src/dsl/rules.ts`
- [X] T008 [P] [US1] 扩展规则声明 helper（新增 `root`/`list`；`field` 支持 `errorTarget: \"$self\"`；`field` 的输入统一接受 RuleConfig（等价 `Form.Rule.make` 的输入形态）；保持与 `field/fields/make/merge` 一致）：`packages/logix-form/src/rule.ts`
- [X] T009 [US1] 为 `FormMakeConfig` 新增 `rules?: ...` 并实现 `rules → StateTraitSpec` 编译（与 `derived/traits` 合并、冲突稳定失败）；同时补齐 check 的 `writeback.path` 写回支持（实现 `$self` 的错误叶子语义）：`packages/logix-form/src/form.ts`、`packages/logix-core/src/internal/state-trait/validate.ts`
- [X] T010 [US1] 将 rules 编译产物接入现有 validateOn wrapper 与 install wiring（确保 `rulesValidateOn` 统计覆盖 rules 声明）：`packages/logix-form/src/form.ts`
- [X] T011 [US1] 为 rules-first 导出静态 IR（RulesManifest，含 `$self`/errorTarget + rule 来源标记（rules/traits/schema-bridge））并挂到 ModuleHandle（供 Devtools/reflection 按需计算/录制；默认不生成、不记录；产物必须可序列化且有体积预算与有界缓存策略，避免热路径与常驻内存负担；当 `rules` 与 `traits` 混用时需给出可行动的诊断提示/警告）：`packages/logix-form/src/form.ts`
- [X] T012 [P] [US1] 新增 rules-first 的复杂表单 demo（`rules + derived`，包含 `$self` 对象级 refine 用法），作为“推荐路径”展示；同时保留现有 `ComplexTraitFormDemoLayout.tsx` 作为 traits-only/性能与诊断对照用例：`examples/logix-react/src/demos/form/ComplexFormDemoLayout.tsx`
- [X] T013 [US1] 为 list identity 缺失/非法 path/重复声明提供 guardrails（错误消息稳定且可行动）：`packages/logix-form/src/dsl/rules.ts`

**Checkpoint**: US1 完成后，仓库内应有一条“推荐写法”可以独立展示复杂表单，并且测试可独立证明其行为。

---

## Phase 4: User Story 2 - 可迁移与可传播的推荐写法 (Priority: P2)

**Goal**: 文档与示例默认路径全部迁移到 rules-first；同时保留 `traits` 高级入口并在文档中明确其定位与使用时机；提供迁移说明。

**Independent Test**: `apps/docs` 的 form 文档不再把 `traits` 作为入门默认；`examples/logix-react` 的默认入口与大多数 demos/cases 迁移到 rules-first，少量 traits-only 保留为“高级/对照”（例如嵌套列表等尚未收敛的能力）；存在清晰的迁移指南。

### Documentation（User-facing）

- [X] T014 [P] [US2] 更新 quick start：默认展示 `rules + derived`（不再以 traits 作为第一入口）：`apps/docs/content/docs/form/quick-start.md`
- [X] T015 [P] [US2] 更新 validation：用 rules-first 讲校验入口，并补充“traits=高级入口”的边界：`apps/docs/content/docs/form/validation.md`
- [X] T016 [P] [US2] 更新 field arrays：把 list 语义/identity 声明移动到 rules-first 体系：`apps/docs/content/docs/form/field-arrays.md`
- [X] T017 [P] [US2] 更新 introduction 与导航：默认路径指向 rules-first：`apps/docs/content/docs/form/introduction.md`、`apps/docs/content/docs/form/index.mdx`
- [X] T018 [US2] 新增迁移指南（traits → rules，含常见坑与对照表）：`apps/docs/content/docs/form/migration.md`
- [X] T019 [P] [US2] 更新性能心智模型与优化梯子（对齐 `specs/028-form-api-dx/quickstart.md`）：`apps/docs/content/docs/form/performance.md`

### Examples（rules-first 迁移）

- [X] T020 [P] [US2] 迁移 demos 入口页到 rules-first，并把 traits-only demos 明确标注为“高级/对照”入口（默认推荐路径只展示 rules-first）：`examples/logix-react/src/demos/form/FormDemoLayout.tsx`、`examples/logix-react/src/App.tsx`
- [X] T021 [P] [US2] 迁移 demo cases index/共享工具到 rules-first（如存在 traits 直出）：`examples/logix-react/src/demos/form/cases/index.tsx`、`examples/logix-react/src/demos/form/cases/shared.tsx`
- [X] T022 [P] [US2] 迁移 case01（basic profile）到 rules-first：`examples/logix-react/src/demos/form/cases/case01-basic-profile.tsx`
- [X] T023 [P] [US2] 迁移 case02（line items）到 rules-first：`examples/logix-react/src/demos/form/cases/case02-line-items.tsx`
- [X] T024 [P] [US2] 迁移 case03（contacts）到 rules-first：`examples/logix-react/src/demos/form/cases/case03-contacts.tsx`
- [X] T025 [P] [US2] case04（nested allocations）暂保留为 traits-only，并补充“嵌套列表 identity/scoped validate 依赖 Phase N（T044/T045），完成后再迁移到 rules-first（见 T051）”的说明与对照定位：`examples/logix-react/src/demos/form/cases/case04-nested-allocations.tsx`
- [X] T026 [P] [US2] 迁移 case05（unique code）到 rules-first：`examples/logix-react/src/demos/form/cases/case05-unique-code.tsx`
- [X] T027 [P] [US2] 迁移 case06（attachments upload / fieldArray）到 rules-first：`examples/logix-react/src/demos/form/cases/case06-attachments-upload.tsx`
- [X] T028 [P] [US2] 迁移 case07（wizard）到 rules-first：`examples/logix-react/src/demos/form/cases/case07-wizard.tsx`
- [X] T029 [P] [US2] 迁移 case08（region cascading）到 rules-first：`examples/logix-react/src/demos/form/cases/case08-region-cascading.tsx`
- [X] T030 [P] [US2] 迁移 case09（schema decode）到 rules-first：`examples/logix-react/src/demos/form/cases/case09-schema-decode.tsx`
- [X] T031 [P] [US2] 迁移 case10（conditional cleanup）到 rules-first：`examples/logix-react/src/demos/form/cases/case10-conditional-cleanup.tsx`
- [X] T032 [P] [US2] 迁移 case11（dynamic list cascading exclusion）到 rules-first：`examples/logix-react/src/demos/form/cases/case11-dynamic-list-cascading-exclusion.tsx`

**Checkpoint**: US2 完成后，读 docs + 看 examples 的默认路径一致（rules-first），且 `traits` 只作为高级入口出现。

---

## Phase 5: User Story 3 - 内部实现可维护、可拆分、可测试 (Priority: P3)

**Goal**: 拆分 `packages/logix-form/src/form.ts`（目标单文件 ≤ 400 行），按职责归位核心逻辑；新增规则/列表能力时改动范围更小；测试覆盖关键行为并保护重构。

**Independent Test**: `packages/logix-form/src/form.ts` 行数达标、对外 API 行为不变（含 rules-first 新入口）、关键测试与基线跑道仍可复现。

### Implementation for User Story 3（重构分步）

- [X] T033 [US3] 提取 errors/leaf/errorCount 逻辑到独立模块并替换引用：`packages/logix-form/src/internal/form/errors.ts`、`packages/logix-form/src/form.ts`
- [X] T034 [US3] 提取 array ops + aux 同步（errors/ui）到独立模块并替换引用：`packages/logix-form/src/internal/form/arrays.ts`、`packages/logix-form/src/form.ts`
- [X] T035 [US3] 提取 derived/rules/traits 的 normalize + merge + validateOn wrapper 到独立模块：`packages/logix-form/src/internal/form/traits.ts`、`packages/logix-form/src/form.ts`
- [X] T036 [US3] 提取 reducer（setValue/blur/submit/array* 等）到独立模块：`packages/logix-form/src/internal/form/reducer.ts`、`packages/logix-form/src/form.ts`
- [X] T037 [US3] 提取 controller（validate/validatePaths/reset/setError/clearErrors/handleSubmit）到独立模块：`packages/logix-form/src/internal/form/controller.ts`、`packages/logix-form/src/form.ts`
- [X] T038 [US3] 收敛 `packages/logix-form/src/form.ts` 为组合层（≤400 行）并保持对外导出稳定：`packages/logix-form/src/form.ts`

### Tests for User Story 3（REQUIRED）

- [X] T039 [P] [US3] 为重构补齐/加固回归用例（覆盖错误优先级、列表错误归属、derived guardrails、rules-first 编译冲突）：`packages/logix-form/test/Form.Refactor.Regression.test.ts`
- [X] T040 [US3] 为文件拆分增加“模块边界说明”与落点注记（帮助后续维护者）：`packages/logix-form/src/internal/form/README.md`

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: 收口质量、对齐 contracts/诊断预算，并把 quickstart 的“成本模型/优化梯子”落到可行动的回归项

- [X] T041 [P] 补齐 rules-first 的 contracts 对齐用例（RulesManifest 关键字段序列化、体积预算断言，以及“lazy 导出：默认不生成/不记录”的行为约束）：`packages/logix-form/test/Form.RulesManifest.Contract.test.ts`
- [X] T042 运行基线脚本并把测量数据写回基线记录（before/after 对比口径明确；入口：`pnpm perf bench:028:form-interactions`）：`specs/028-form-api-dx/references/perf-baseline.md`
- [X] T043 [P] 快速自检：对照 `specs/028-form-api-dx/quickstart.md` 校验 docs/examples 是否一致（必要时修订文档示例）：`specs/028-form-api-dx/quickstart.md`、`apps/docs/content/docs/form/*`
- [X] T044 支持嵌套列表（数组中包含数组）的 scoped validate：打通 `listIndexPath`（Spec 010 预留）并在 state-trait validate 中按深层 list instance 写回 `$list/rows[]`（递归嵌套到父层 `errors.<list>.rows[i].<childList>`）；补齐最小回归用例（父层重排/删除后的 scoped validate 不越界）：`packages/logix-core/src/internal/trait-lifecycle/index.ts`、`packages/logix-core/src/internal/state-trait/validate.ts`、`packages/logix-core/test/StateTrait.NestedList.ScopedValidate.test.ts`
- [X] T045 支持嵌套列表的稳定 identity：RowIdStore 需支持“按父层 row identity 定位 list instance”，避免父层重排导致子列表 RowId 映射失效（降级为 index 必须可诊断）；补齐破坏性边界测试（父层 swap/move 后 errors/ui/rowId 不乱跳）：`packages/logix-core/src/internal/state-trait/rowid.ts`、`packages/logix-core/test/StateTrait.NestedList.RowId.Stability.test.ts`
- [X] T046 schema→rules 桥接：对外只保留 `z.field(...)`（通过函数重载兼容 `schema` / `RuleConfig` / `RuleFn` 等写法）；`fieldFromSchema` 仅作为内部实现 helper（不导出、不在用户文档出现）；并通过类型/运行时 guard 明确区分“复用 Schema 校验逻辑”而非仅做类型提示；同字段重复约束时以 `manual > rules > schema` 与 `RULE_SKIP` 语义保持一致且可解释：`packages/logix-form/src/dsl/rules.ts`、`packages/logix-form/src/validators.ts`、`packages/logix-form/src/form.ts`、`specs/028-form-api-dx/quickstart.md`
- [X] T047 [P] 为本特性创建 perf 证据归档目录与约定说明：`specs/028-form-api-dx/perf/README.md`
- [X] T050 [P] 扩展 perf matrix：为 `form.listScopeCheck` 增加 `diagnosticsLevel=["off","light","full"]` 轴（避免引入新 suite），并把 `diagnostics.level` 加入 requiredEvidence（确保 Diff 可见）：`@logix/perf-evidence/assets/matrix.json`
- [X] T052 [P] 扩展 browser perf 用例：消费 `diagnosticsLevel` 轴，并用 `Logix.Debug.devtoolsHubLayer(base,{ diagnosticsLevel })` 切换 `currentDiagnosticsLevel`；缓存 key 需要包含 `diagnosticsLevel`（避免跨档位复用 runtime 污染）；同时确保 `requestedMode=auto` 仍可捕获 converge decision evidence：`packages/logix-react/test/browser/perf-boundaries/form-list-scope-check.test.tsx`
- [X] T053 [P] 在 `form.listScopeCheck` 的 report 内补齐“表单链路 overhead 摘要”：按 `{ requestedMode, rows }` 对比 `light/off` 与 `full/off` 的 `runtime.txnCommitMs`（ratio + delta），并以 slim 结构写入 suite 的 `comparisons` 字段（便于人工/脚本直接读取，不依赖二次计算）：`packages/logix-react/test/browser/perf-boundaries/form-list-scope-check.test.tsx`
- [X] T048 复用浏览器跑道采集 `form.listScopeCheck(diagnosticsLevel)` + diagnostics.overhead 子集并归档 After 报告：`pnpm perf collect`、`specs/028-form-api-dx/perf/014.after.worktree.<envId>.json`
- [X] T049 复用浏览器跑道对比 Before/After 并归档 Diff（阈值变化 + requiredEvidence 变化）：`pnpm perf diff`、`specs/028-form-api-dx/perf/014.diff.<beforeSha>.<afterSha>.<envId>.json`
- [X] T051 [P] nested list 支持落地后，将 case04（nested allocations）迁移到 rules-first（移除 traits-only 对照写法，保留最少必要的高级入口示例即可）：`examples/logix-react/src/demos/form/cases/case04-nested-allocations.tsx`

---

## Dependencies & Execution Order

### User Story Dependencies

- **US1 (P1)**：核心阻塞（rules-first API + 复杂示例 + 行为测试）。
- **US2 (P2)**：依赖 US1（文档/示例迁移必须基于新入口）。
- **US3 (P3)**：建议在 US1 稳定后进行（避免“边改 API 边大重构”造成回归扩大）；可在 US2 并行推进一部分拆分，但收口前需统一回归。

### Parallel Opportunities

- US2 的 docs 与各个 demo case 迁移任务均标记为 `[P]`，可多人并行（单文件迁移）。  
- US3 的拆分步骤本身不适合并行（同一文件大范围移动），但其回归测试任务可并行补齐。

---

## Parallel Example: User Story 1

```text
Task: T005 [US1] packages/logix-form/test/Form.RulesFirst.ComplexForm.test.ts
Task: T007 [US1] packages/logix-form/src/dsl/rules.ts
Task: T008 [US1] packages/logix-form/src/rule.ts
Task: T012 [US1] examples/logix-react/src/demos/form/ComplexTraitFormDemoLayout.tsx
```

---

## Parallel Example: User Story 2

```text
Task: T014 [US2] apps/docs/content/docs/form/quick-start.md
Task: T015 [US2] apps/docs/content/docs/form/validation.md
Task: T022 [US2] examples/logix-react/src/demos/form/cases/case01-basic-profile.tsx
Task: T023 [US2] examples/logix-react/src/demos/form/cases/case02-line-items.tsx
```

---

## Implementation Strategy

### MVP First（只做 US1）

1. Phase 1–2：把 rules-first 落点与基线跑道准备好（T001–T004）
2. Phase 3：实现 rules-first API 并迁移复杂示例（T005–T013）
3. **STOP & VALIDATE**：只验证 US1 的独立测试（复杂表单验收场景）

### Incremental Delivery

1. 完成 US1 → 示例与测试可独立证明
2. 完成 US2 → 文档/示例默认路径迁移完毕
3. 完成 US3 → 内部拆分与可维护性治理落地
4. Polish → 基线数据、contracts 对齐与 quickstart 自检收口
