# SDD Platform · SSoT（重新生长版）

本目录是 **SDD Platform** 的“概念/模型/契约”单一事实源：它不描述平台页面怎么画，也不写实现备忘，而是给出可长期引用的 **物理口径**，让「Spec → Contracts → Code → RunResult」这条链路可解释、可对齐、可回放（可选）。

> 裁决口径：平台概念与契约以本目录为准；运行时与类型语义以 `docs/ssot/runtime/**` 与 `packages/logix-*` 的真实导出为准。

## 目录分区（One -> Many）

- `foundation/`：The One（最小系统方程/符号表/术语与边界/优先级）
- `assets/`：平台资产与 Schema（Intent/Module/Pattern/IntentRule 的结构定义）
- `contracts/`：执行与证据链契约（执行口径、RunResult、Time Travel）
- `ir/`：Code ↔ IR ↔ Anchors（可解析子集、Parser/Codegen 的口径与边界）
- `governance/`：演进策略、路线图与决策记录（只保留提炼后的结论）
- `appendix/`：演练、补篇与长文（不作为首要裁决入口）

## 最短阅读路径（新会话）

1. `00-principles.md`：平台原则入口（只收敛裁决点）
2. `foundation/00-overview.md`：SSoT 优先级与边界（先知道“谁说了算”）
3. `foundation/01-the-one.md`：最小系统方程与符号表（The One）
4. `contracts/00-execution-model.md`：执行口径（$C_T/\Pi/\Delta\oplus$、tick 参考系、预算与降级）
5. `contracts/01-runresult-trace-tape.md`：RunResult（Trace/Tape/Anchors 的 Grounding）
6. `contracts/03-control-surface-manifest.md`：控制面 Root IR（actions/services/traits/workflows/opaque 的收口工件）
7. `foundation/02-glossary.md`：平台术语裁决入口（必要时再下钻 `foundation/glossary/*`）
8. `docs/ssot/runtime/logix-core/concepts/10-runtime-glossary.md`：运行时术语裁决（Runtime Glossary SSoT）
9. `foundation/03-trinity-and-layers.md`：UI / Logic / Module 三位一体模型
10. `assets/00-assets-and-schemas.md`：资产映射与 Schema 定义（必要时下钻 `assets/schemas/*`）
11. `ir/00-codegen-and-parser.md`：可解析子集与锚点系统（平台的 Code/IR 边界）

## 裁决矩阵（遇到分歧先查哪里）

| 你在争论/寻找什么 | 先查（SSoT） | 最终裁决/落点 |
| --- | --- | --- |
| 最小系统方程/符号解释 | `foundation/01-the-one.md` | 先修符号表，再改下游文档与实现 |
| 执行口径（tick/事务/预算/降级） | `contracts/00-execution-model.md` | 不一致时以 runtime 类型/实现为准并回写 |
| Trace vs Tape 与 RunResult 形态 | `contracts/01-runresult-trace-tape.md` | 平台只消费 RunResult，不消费内部对象 |
| 控制面 Root IR（actions/services/traits/workflows/opaque） | `contracts/03-control-surface-manifest.md` | 平台/Devtools/Alignment Lab 消费的静态工件；动态事件只携带锚点与 digest 引用 |
| Time Travel（愿景/边界/可实现性） | `contracts/02-time-travel.md` | Live 只能只读回放；Replay/Fork 受控 |
| 资产结构与 Schema | `assets/00-assets-and-schemas.md`、`assets/10-module-assets.md` | 先修资产层，再落 IR/出码/实现 |
| 术语、边界、命名（平台概念） | `foundation/02-glossary.md` | 先修术语，再改其它文档/代码 |
| Code ↔ IR ↔ 图（可解析子集、锚点） | `ir/00-codegen-and-parser.md` | 平台实现落点：`docs/specs/sdd-platform/impl/*` |
| 平台交互与视图体系（Universe/Galaxy/Studio/Playground） | `docs/specs/sdd-platform/workbench/*` | UX 不进入 SSoT；需要实现细节看 `impl/*` |
| Runtime 编程模型（Module/Logic/`$`/Flow/事务与诊断） | `docs/ssot/runtime/logix-core/*` | 真实类型裁决：`packages/logix-core/src/index.ts` |

## 放置规则（避免并行真相源）

- **未定稿探索**：放 `docs/specs/drafts/**`（Topic / Tiered 系统）
- **可交付特性**：放 `specs/<id>/*`（`spec.md` / `plan.md` / `tasks.md`）
- **实现备忘**：平台侧放 `docs/specs/sdd-platform/impl/*`；运行时侧放 `docs/ssot/runtime/*/impl/*`
