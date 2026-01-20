# 11. Workflow / Π slice / Root IR / RuntimePlan（控制面分层与可合并性）

- **目标（runtime 视角）**
  - 同时满足：平台出码（可审查/可 diff）+ Root IR 收口（单一工件）+ 热路径性能（不扫 IR）+ 诊断证据（Slim 且可门控）。
  - 结论：分层必须存在，但并非每层都要“对外显式落盘”；以“是否跨边界被消费”决定工件化边界。

- **Recipe（压缩输入，可选）**
  - 职责：让平台/AI 用更短输入表达常见 workflow（少胶水）。
  - 可选原因：平台目标只要求最终落到 **`WorkflowDef`/Canonical**；Recipe 不是第二套语义语言，缺失不影响 Root IR / Π slice / RuntimePlan。
  - 规范：若存在，必须 `expand/normalize → WorkflowDef`（禁止 Recipe 自带语义分支）。

- **WorkflowDef（权威输入工件，纯 JSON）**
  - 职责：跨边界的 authoring 工件（可落盘/可 diff/可被 Schema 校验/版本化）。
  - 约束：不得携带闭包/Effect/Fiber/Tag 本体；`call` 最终只保留稳定 `serviceId: string`（对齐 `specs/078-module-service-manifest/contracts/service-id.md`）。
  - 关系：TS 侧的 `Workflow` 值对象只是 DX 形态；`toJSON()/fromJSON(...)` 是 “值对象 ↔ 工件” 的桥。

- **Canonical AST（唯一规范形；可以只做 internal）**
  - 职责：语义规范化边界（去糖/补默认/分支显式/`stepKey` 完整），保证：
    - 同一语义同一表示 → digest/diff 稳定；
    - 缺失/冲突 `stepKey` 等契约违规可 fail-fast（避免运行时热路径兜底）。
  - 工件化裁决：Canonical AST 可以只存在于编译器内部（不要求落盘/对外暴露），只要：
    - 其结果能确定性导出 `WorkflowStaticIr`（Π slice）与 `RuntimePlan`；
    - 对外的稳定事实源仍是 `WorkflowDef`（输入）与 `WorkflowStaticIr`（结构投影）。

- **Workflow Static IR（Π slice，可交换）**
  - 职责：结构化、可导出、可视化/可 diff 的工作流 IR（nodes/edges + version + digest）。
  - 必要性：平台/Devtools/Alignment Lab 需要一个“可审查的结构真相源”；RuntimePlan 不能替代（它是 internal 且为性能裁剪）。
  - Root 对齐：Π slice 通过 `ControlSurfaceManifest.workflowSurface` 以 digest 引用收口（Root IR 不携带整图进事件流）。

- **ControlSurfaceManifest（Root Static IR，可交换）**
  - 职责：平台消费的单一 Root 工件（digest + slices 引用 + 最小索引）。
  - 不可合并原因：
    - Root IR 不能膨胀为“全量 IR 仓库”，否则会把热路径成本（scan/hash/serialize）转嫁给运行期；
    - Root IR 也不能退化为“只靠运行时事件流拼回结构”，否则会出现并行真相源与不可判定差异。
  - 规范锚点：`docs/ssot/platform/contracts/03-control-surface-manifest.md`。

- **RuntimePlan（运行时执行计划，internal）**
  - 职责：把冷路径编译结果下沉为热路径可用的数据结构（例如 `actionTag → programs[]` 路由表、预编译 InputExpr、service port 解析与缓存）。
  - 必要性：`diagnostics=off` 仍需接近零成本；禁止 tick/dispatch 热路径扫描 `WorkflowStaticIr`/Root IR 来“解释执行”。
  - 约束：RuntimePlan 不是平台工件；不得进入 Root IR；不得成为对外 API/协议。

- **Slim Trace / Tape（动态证据；Trace 必要、Tape 视模式）**
  - **Trace（解释链）**：回答“为什么发生了什么”；必须 Slim、可序列化、可采样/门控；通过 `tickSeq` + 静态锚点回链 Root IR（禁止携带 IR 全量）。
  - **Tape（回放磁带）**：回答“如何 deterministic replay/fork”；记录开放系统边界的不确定性交换（timer/io/external snapshot）；更偏受控环境（Sandbox/Test）能力，live 默认不必常开。

- **哪些可合并/哪些不可合并（rationale 总结）**
  - Recipe ↔ WorkflowDef：可合并（直接出 `WorkflowDef` 即可）；Recipe 仅是压缩输入层。
  - Canonical AST ↔ WorkflowDef：可实现为 internal normalize/validate；但“规范化边界”不可省略（否则 digest/diff 不稳定）。
  - Π slice ↔ RuntimePlan：不可合并（前者是平台可审查工件，后者是运行时热路径裁剪产物）。
  - Root IR ↔ Π slice：不可合并（Root 只收口引用与最小索引；Π slice 全量按需加载）。
  - Trace ↔ Tape：不可合并（Trace 是解释、可丢弃；Tape 是回放、要求客观完备）。

- **进一步阅读（权威裁决）**
  - 平台术语与分层：`docs/ssot/platform/foundation/glossary/04-platform-terms.md`
  - Root IR 约束与流水线：`docs/ssot/platform/contracts/03-control-surface-manifest.md`
  - 075 合同：`specs/075-workflow-codegen-ir/contracts/public-api.md`、`specs/075-workflow-codegen-ir/contracts/ir.md`

- **代码锚点（当前实现）**
  - 对外 Workflow 子模块：`packages/logix-core/src/Workflow.ts`
  - Canonical/Static IR 编译：`packages/logix-core/src/internal/workflow/compiler.ts`
  - RuntimePlan/路由与 watcher：`packages/logix-core/src/internal/runtime/core/WorkflowRuntime.ts`
  - Root IR 导出（workflowSurface/manifest）：`packages/logix-core/src/internal/reflection/controlSurface.ts`
