# PR：040（SchemaAST Registry）与 031–036（IR-first 平台链路）的对齐补料

> 目的：把 040 的 SchemaAST/registry/schemaId 能力放进“平台 + Workbench + Agent 出码闭环”的统一视角里，避免 040 只停留在“有 registry”但无法被 031–036 的事实链路消费。

## Status

- **Active（Draft）**：本 PR 作为对齐备忘；权威落点以 `specs/040-schemaast-layered-upgrade/*` 为准。

## 本 PR 要强调的三件事（上帝视角）

### 1) SchemaAST 是 TypeIR 的上游实现材料，不是平台事实源

- 平台的“引用空间事实源”仍是 035：`@logixjs/module.portSpec@v1` / `@logixjs/module.typeIr@v1`。  
- SchemaAST 可以用于 **生成/投影** TypeIR、以及更好的解释/错误消息，但 SchemaAST 本体不应该被平台当作可引用空间真相源，否则会产生并行真相源与漂移。

现有代码先例：`packages/logix-core/src/internal/state-trait/converge.ts` 已使用 `effect/SchemaAST` 做路径静态判定与诊断（递归/union/transform 的降级策略可复用到 TypeIR 投影）。

### 2) registry pack 应走 031 artifacts 槽位，进入同一条 IR 链路

推荐把 SchemaRegistryPack 导出为可选 artifact：

- key：`@logixjs/schema.registry@v1`
- 载体：`TrialRunReport.artifacts`（031）
- 消费方：Workbench/CI/Agent（036 的 Contract Suite + Context Pack）

这样“schemaId→schema”映射不会变成另一个旁路导出接口，而是能复用既有的 trial-run/预算/截断/单项失败语义。

### 3) schemaId/schemaRef 应成为“事件/协议/IR”的解释锚点（Slim 引用，胖工件解释）

040 的 `SchemaRef@v1` 与 registry pack 分工明确：

- 运行期事件与 on-wire 协议：只携带 `schemaRef.schemaId` + slim hint（保持预算与可序列化）
- 离线解释/回放：加载 registry pack 解析 schemaId，做 schema-aware 展示/校验

这条线同时为 Agent 提供“客观反馈回路”：Agent 不靠自评，而是靠可复现 verdict + schema-aware 的错误归因迭代。

### 4) 与 032（UiKitRegistry）的交集：用 SchemaAST 生成“UI 端口 TypeIR”，但对外仍只暴露投影结果

- 032 的 `@logixjs/module.uiKitRegistry@v1` 当前以 `props[].type` / `events[].payloadType` 这种 **string 摘要** 承载 UI 端口类型信息，这是有意的：平台需要“可提示/可校验/可 diff”，但不想把 SchemaAST 本体变成新的协议依赖。
- 040 的 SchemaAST/registry 能把这些 string 摘要变得更稳定/更可解释：
  - 生成时：允许内部从 SchemaAST / TS 类型投影得到更一致的 `type`/`payloadType`（并可复用 schemaId 的稳定派生策略避免“同义不同字面”导致 diff 噪音）。
  - 解释时：当 Workbench/Agent 需要更深解释（例如 prop 的 union/optional/约束），可以让 UiKitRegistry（未来 v2）携带 `SchemaRef` 或者让 ContextPack 同步携带 `@logixjs/schema.registry@v1`，从而把“string 摘要”升级为 schema-aware 的解释视图。

## 建议补进 040 spec.md 的内容（已做/或建议做）

- **已做**：在 `specs/040-schemaast-layered-upgrade/spec.md` 增补：
  - 可选 artifact：`@logixjs/schema.registry@v1`
  - 与 035（PortSpec/TypeIR）边界声明
  - Out of Scope：不走 TS AST 当事实源

## 参考入口（读完就能串全链路）

- IR 全链路（IrPage → TrialRun）：`docs/ssot/runtime/logix-core/api/07-ir-pipeline-from-irpage.md`
- IR vs AST（裁判 vs 编辑载体）：`docs/ssot/runtime/logix-core/concepts/04-ir-vs-ast-and-agent-coding.md`
- 036 阅读小抄（统筹视角）：`specs/036-workbench-contract-suite/reading-cheatsheet.md`
- 035（SchemaAST 与 TypeIR 的边界提示已回写）：`specs/035-module-reference-space/research.md`
