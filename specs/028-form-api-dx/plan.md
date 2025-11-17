# Implementation Plan: Form API 收敛与 DX 提升（rules 入口 + traits 降级为高级能力 + 内部可维护性治理）

**Branch**: `[028-form-api-dx]` | **Date**: 2025-12-23 | **Spec**: `specs/028-form-api-dx/spec.md`  
**Input**: Feature specification from `specs/028-form-api-dx/spec.md`

## Summary

本特性以“面向未来、推荐路径更短、更可解释”为目标，交付三类结果：

1. **Form API 收敛**：将推荐路径从“直接传 `traits`（可深嵌套）”收敛为更少的顶层概念：`values/initialValues` + `derived` + `rules`（默认）+ `traits`（高级入口，保留但不鼓励作为默认写法）；并引入 schema-scope 入口 `Form.from(ValuesSchema)` 统一类型收窄与语法糖入口。
2. **显式列表语义 + 稳定身份**：不再依赖“对象形状推断字段是否为 list”的隐式规则作为默认推荐；通过规则/列表声明显式表达 list scope、rowId/trackBy 策略与 list-level 规则，确保错误树与行稳定对齐且可诊断。
3. **对象级 refine / 跨字段校验到位**：支持 `$self` 语义（对象级规则写回 `errors.<path>.$self`），保证对象级错误与子字段错误共存且可增量清理（对齐“跨字段联动与校验”真实诉求）。
4. **可维护性治理**：将 `packages/logix-form/src/form.ts`（~1000 行）按职责拆分（reducer、controller、errors/ui 同步、array ops、validate-on 包装、schema 错误映射等），并补齐关键用例测试与迁移说明，确保示例/文档同步迁移到推荐写法。

## Technical Context

**Language/Version**: TypeScript 5.8.2（ESM）  
**Primary Dependencies**: `effect` v3.19.13（workspace override）、`@logix/core`、`@logix/form`、React（示例与文档）  
**Storage**: N/A（内存态；状态载体为 Logix state + `SubscriptionRef`）  
**Testing**: Vitest（`vitest run`）；Effect-heavy 用例优先 `@effect/vitest`  
**Target Platform**: Node.js 22+（脚本/测试）+ 现代浏览器（React 示例）  
**Project Type**: pnpm workspace（`packages/*` + `apps/*` + `examples/*`）  
**Performance Goals**:
- 关键交互路径不回退：字段 `setValue`、字段 `blur`、列表增删/重排、`submit` 校验的 p95 不超过基线 +5%，内存/分配不超过基线 +10%（基线记录在本特性的 `research.md`，实现阶段用可复现脚本/诊断证据度量）。
- 诊断默认近零成本：诊断关闭时不得引入额外 O(n) 扫描；诊断开启时的额外分配与事件体积必须可预估并在 `quickstart.md` 中明确。
- IR/录制按需：Static IR / RulesManifest / trace 等解释性产物默认不生成、不记录、不分配；仅在 Devtools/reflection 显式请求（或 diagnosticsLevel 打开）时按需计算/录制，并要求可序列化、可裁剪、有界缓存，避免污染热路径与常驻内存。
- 规则 DSL 的编译开销必须“前置且一次性”：`rules`/decl list 的构建与编译必须在 `Form.make`（模块定义期）完成并被缓存；运行时 `validate`/hooks/render 路径不得重复解析/构图/生成 decl，避免把 DX 改造的成本带进热路径。
- 014 性能边界复用：当改动触及 `examples/logix-react` 的表单 demo（尤其 list-scope 校验/validateOn 策略/rowId 语义）或 `packages/logix-form` 热路径后，必须复用 `@logix/perf-evidence/assets/matrix.json` 的 `form.listScopeCheck` 与 `diagnostics.overhead.*` suite 产出可对比证据（Before/After/Diff），并归档到本特性的 `specs/028-form-api-dx/perf/*`。
**Constraints**:
- 不保证向后兼容：破坏式更新公共 API，但必须提供迁移说明，并同步更新一方示例与用户文档（不做兼容层）。
- 统一最小 IR：推荐路径的 `rules/derived` 必须可完全降解为 kernel `StateTraitSpec`（Static IR + Dynamic Trace）；不得引入第二套事实源。
- 稳定身份：list row identity 必须确定、可解释；禁止默认依赖随机数/时间戳；降级必须可诊断。
- 事务窗口禁止 IO：rules/derived 的 validate/compute 必须纯同步；异步校验必须通过既有外部资源机制表达。
**Scale/Scope**: 典型 ToB 表单（几十字段 + 动态列表 + 条件必填 + 跨字段联动）；以“高频输入 + 小影响域”的交互压力为主要模型。

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- `Intent → Flow/Logix → Code → Runtime` 映射：Intent（表单作者声明 values/derived/rules/list 语义）→ Flow/Logix（traits build + scoped validate wiring）→ Code（`packages/logix-form` 的 DSL/normalize/wrap + reducer/controller + React hooks）→ Runtime（`@logix/core` state-trait build/validate 与诊断事件链路）。
- 依赖/对齐的 specs：本特性以现有 `@logix/form`/traits 体系为底座，并参考历史裁决 `specs/010-form-api-perf-boundaries/*`（RuleSet 形态与性能边界）；若本特性对外口径发生更新，以 `apps/docs/content/docs/form/*` 与本特性的 `contracts/*` 为单一事实源，避免“旧 spec 与新文档”漂移。
- Effect/Logix contracts：默认不改 `@logix/core` 公共契约；若需要调整 state-trait list configs/rowId store/诊断事件字段，必须同步更新对应 runtime 参考文档（`.codex/skills/project-guide/references/runtime-logix/*`）并在 `contracts/*` 固化字段口径（JsonValue）。
- IR & anchors：`rules` 必须被编译到现有 `StateTrait.node/list({ check })` 与 `RuleEntry` 形态（不引入二次包壳）；`$self` 需要落到 check 的 `writeback.path`（写回 `errors.<path>.$self`，避免覆盖子树）；list scope/rowId 策略必须进入可序列化 trace/evidence，保证 Devtools 可解释链路稳定。IR/trace 的导出策略必须是 **lazy**：默认不生成、不记录；仅在显式请求时导出，并具备体积预算与有界缓存策略。
- Deterministic identity：实例/事务/操作序列沿用 runtime 的稳定 id；列表行身份以显式 `trackBy/rowIdStore` 策略为主，必要时可降级为 index，但必须输出可解释诊断（包含降级原因与采用的策略）。
- Transaction boundary：Form 内部仅在事务内执行纯同步派生/校验与最小写回；任何 IO/async 必须在事务外表达并回写。
- Internal contracts & trial runs：内部协作点（rowId store、list configs、diagnostics sink 等）必须通过 Effect Env/内部契约注入（禁止新增 magic 字段/参数爆炸），可按实例替换并可导出 slim 证据。
- Performance budget：热路径为 `packages/logix-form/src/form.ts`（reducer/controller/validate 写回）、`packages/logix-form/src/logics/install.ts`（wiring/防抖）、`packages/logix-form/src/dsl/traits.ts`（normalize/wrap）以及 `@logix/core` 的 state-trait validate；实现阶段先记录基线，再逐步替换与拆分，避免一次性大重写造成不可测回退。
- Diagnosability：规则触发/跳过原因、list rowId 策略与降级必须可观测；事件载荷必须 Slim 且可序列化，关闭诊断时接近零成本。
- 对外心智模型：`quickstart.md` 必须固定 ≤5 关键词 + 粗成本模型 + 优化阶梯，并与诊断字段命名一致；后续同步到 `apps/docs`。
- Breaking changes：本特性必然引入公共 API/推荐写法变化；迁移说明落点为本特性的 `tasks.md`（Phase 2 输出）与用户文档（`apps/docs/content/docs/form/*`），不提供兼容层。
- 质量门：以“可交付范围内的 scoped gates”为准：`packages/logix-form`（typecheck:test + test）、`examples/logix-react`（typecheck）与相关 lint（workspace lint 若存在与本特性无关失败则不作为阻断门，但本特性新增/改动文件不得引入新告警）。

**Post-Design Re-check (2025-12-23)**: PASS（已产出 `research.md` / `data-model.md` / `contracts/*` / `quickstart.md`；实现 `$self` 需要对 `@logix/core` 的 state-trait validate 增补“按 check.writeback.path 写回”的内部能力，但不改变其 public API。）

## Project Structure

### Documentation (this feature)

```text
specs/028-form-api-dx/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── runtime-validation-cheatsheet.md
├── perf/
│   └── README.md
├── references/
│   └── perf-baseline.md
├── contracts/
└── tasks.md             # Phase 2 output ($speckit tasks command)
```

### Source Code (repository root)

```text
packages/logix-form/src/form.ts           # 将拆分：reducer/controller/validate/errors/ui/array ops/wrap traits
packages/logix-form/src/rule.ts           # Rule/RULE entry 形态与 DSL
packages/logix-form/src/trait.ts          # DerivedSpec/traits 相关类型
packages/logix-form/src/validators.ts     # 校验与错误产物的归一化
packages/logix-form/src/logics/install.ts # validateOn/reValidateOn/rulesValidateOn wiring（防抖/作用域）
packages/logix-form/src/dsl/from.ts       # schema-scope：`Form.from(ValuesSchema)`（derived/rules/traits 的类型收窄入口）
packages/logix-form/src/dsl/rules.ts      # rules-first：decl list + zod-like `schema/object/array/field` + `at(prefix)` → trait spec 编译
packages/logix-form/src/dsl/traits.ts     # 高级入口：traits normalize（node/list/entry）+ 规则 deps/validateOn 归一化
packages/logix-form/src/internal/rowid.ts # rowId store/trackBy 读取与降级策略
packages/logix-form/src/internal/path.ts  # setAtPath/updateArrayAtPath 等基础设施

packages/logix-core/src/internal/state-trait/validate.ts  # check.writeback.path 支持（$self 写回语义）

packages/logix-form/src/react/*           # React hooks（useField/useFieldArray/useFormState）

examples/logix-react/src/demos/form/*     # 一方示例迁移到推荐写法
apps/docs/content/docs/form/*             # 用户文档：推荐路径/列表/校验/性能心智模型
```

**Structure Decision**: 本特性属于“领域包（@logix/form）的公共 API/DSL + 可维护性治理 + 示例/文档迁移”交付；代码主要落在 `packages/logix-form`，并以 `examples/*` 与 `apps/docs/*` 验证推荐写法与心智模型，尽量不改动 `@logix/core` 核心契约。

## Complexity Tracking

当前计划不预期需要违反宪章硬约束；若 Phase 1 设计发现必须调整 runtime 契约/诊断协议或引入临时 shim，将在此表登记并在 `tasks.md` 给出可还债路径。
