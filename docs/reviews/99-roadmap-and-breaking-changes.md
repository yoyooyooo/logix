# 不兼容重构路线图（Roadmap & Breaking Changes）

> 本路线图以“性能与可诊断性优先、拒绝向后兼容”为原则，目标是让 Logix 成为逻辑编排领域的“React”：声明式、可推导、内部自动优化、可解释。

原则层与证据层的长期对齐入口：`08-philosophy-alignment.md`（原则层见 `../philosophy/README.md`）。

## Phase 0：先把“真相源”收敛（阻断漂移）

- 选择并固化代码结构的 SSoT：要么迁回 `api|dsl|runtime`，要么更新 specs 并明确 `src/internal/**` 的分层铁律。
- 收敛全双工锚点写法：以 `$.onState/$.onAction/$.on + pipeline + .update/.mutate/.run*` 为唯一 Platform-Grade 子集，同步清理 specs/scripts/examples 中的 `when/then` 漂移，以及 `.op()`（现实现不存在）、`andThen`（语义不纯）等歧义入口。
- 固定 philosophy ↔ reviews 的互链与对照入口：以 `docs/reviews/08-philosophy-alignment.md` 为总表，确保原则层不再把 drift 扩散到 specs/脚本/示例。
- 清理/替换过时解析脚本：已删除过时 PoC（`scripts/intent-fluent-parser.ts`）；后续以 Platform-Grade 子集为唯一解析锚点实现 Parser/Codegen，并产出平台可消费的最小 IR（可序列化 + 可合并 + 可锚定 loc）。
- 统一 Tag/Identity 约定：稳定 key、冲突检测策略、Devtools 分组策略。
- Identity 去随机化：`instanceId/txnId/opId/linkId` 改为“可注入 instanceId + 单调序号”，禁止 `Math.random()` 作为默认标识来源（详见 `04-diagnostics-and-devtools.md`）。
- Tag 体系收敛：明确 class Tag 为唯一形式（或相反，但必须二选一），并让 collision 检测只依赖稳定 key（避免 `GenericTag`/toString 兜底带来的不确定性）。

## Phase 1：事务 IR + Patch/Dirty-set 一等公民（性能的根）

- 消灭 `path="*"`：让 reducer/trait/source/task 的写入都产生字段级 patch 或至少字段级 dirty-set。
- 将事务事件统一为 IR：debug/event/effectop/trait/source 都只向 IR 汇报。
- 落地“统一最小 IR”（规则 + traits）：避免 `IntentRule`（文档）与 `StateTraitGraph`（实现）并列，Dev Server/Sandbox/Devtools 只认一个 IR（并提供冲突检测/合并）。
- 建立“事务窗口禁止 IO”的硬约束：违反即诊断/失败，强制业务使用 Task 模式拆分（同时移除 `IntentBuilder.update` 返回 `Effect` 的能力）。
- 封堵逃逸通道：业务层禁止可写 `state.ref()` / `runtime.ref()`，所有写入必须进入事务队列。
- SlimOp：`trace:effectop` 禁止携带 `effect` 本体，只允许结构化元信息（避免 DevtoolsHub 保留闭包导致内存/性能问题）。
- Sandbox/Alignment Lab 协议化：补齐 `RUN.actions`、可取消的 `TERMINATE`、`UI_CALLBACK` 全双工、`env/intentId/kernelBlobUrls` 与 ring buffer 裁剪策略（平台闭环的运行底座）。
- 性能基线（SC-005）：落地可复现的 trait converge benchmark（full vs dirty、1x/10x 参数化、输出 JSON 报告；先不做 CI gate），作为“负优化”验收底座（参考 `specs/007-unify-trait-system/review.md`）。
- Converge 默认策略变更（破坏性）：`stateTransaction.traitConvergeMode` 默认从 `full` → `auto`（见 `specs/013-auto-converge-planner`）；如需维持旧行为，显式设置 `traitConvergeMode="full"`（迁移说明优先于兼容层）。
- 回放闭环（E2E）：补齐 Record → Serialize(JSON) → Replay → Verify 的端到端测试与最小 `EvidencePack`，让 Devtools/平台可以对外承诺“证据包可复现”（参考 `specs/007-unify-trait-system/review.md`）。
- （已完成：008）strict injector：删除 core 的进程级 runtime registry fallback，统一为 “Nearest Wins + 缺失提供者稳定失败”；root/global 单例统一用 `Root.resolve`（证据：`specs/008-hierarchical-injector/perf.md`；回归：`packages/logix-core/test/hierarchicalInjector.*`、`packages/logix-react/test/hooks/useImportedModule.hierarchical.test.tsx`；评审：`specs/008-hierarchical-injector/review.md`）。
- （008 收口）全仓统一 root/global 的示例写法为 `Logix.Root.resolve(Tag)`（避免“Root 未导入/歧义符号”导致的二次心智噪音），并确保 React 错误 fix 文案与 `docs/ssot/runtime/*`、`apps/docs/*` 的推荐写法一致。

### Phase 1 的实施要点：把成本压到最低且避免“负优化”

这里的“build 阶段”指 **DSL/Spec → Program/Plan/Index 的编译阶段**（例如 `StateTrait.build` 生成 `Program/Graph/Plan`），不是 `pnpm build`，也不是 `Layer.buildWithScope`。

目标是：让 runtime 每笔事务的额外开销尽量接近 **O(改动量 + 受影响 steps 数)**，而不是 **O(状态大小 + 全量扫描)**。

- **Patch vs Dirty-set 的分工**
  - `Dirty-set`（`dirtyPaths`/`dirtyRoots`）：用于调度/跳过无关 steps；必须便宜，light 模式也必须保留。
  - `Patch[]`：用于诊断/回放/冲突合并；full 模式才保留完整 `from/to/reason/stepId/...`。
- **dirty-set 生成必须是 O(写入量)，不能是 O(state size)**
  - 禁止在生产路径默认做“prev/next 深 diff”来推导 dirtyPaths（极易负优化）。
  - 允许的策略：写入时顺便产出“写了哪些路径”（patch/dirty-set），或由生成器/IR 显式声明 writes。
- **把“重活”放到 build 阶段做（避免 runtime 重复计算）**
  - 预编译 topological order：避免每笔事务对 trait writers 重新拓扑排序。
  - 预编译依赖索引：`depRoot -> affectedStepIds`（或 bitset），runtime 用 dirtyRoots 直接取受影响 steps，避免“每步都扫描 deps 并做 overlaps 判断”。
  - 预归一化路径：把 path 的 split/normalize/前缀判断尽量下沉到 build 的缓存结构，runtime 不应频繁做字符串拆分。
- **runtime 调度要有“降级阀门”，否则小改动也可能变慢**
  - dirtyRoots 过粗（例如出现 `*`）或过多：直接走 full converge（跳过过滤逻辑，避免过滤本身成为负担）。
  - 预算/超时：保持现有“超预算软降级”的安全策略，同时必须能给出明确诊断（topN step、dirtyRoots、触发入口）。
  - 观测级别：默认 light；full 只在 dev/test 或显式打开时启用，且必须有 ring buffer/裁剪策略。
- **负优化的典型来源（必须提前硬规约）**
  - “为了观测把闭包/Effect 本体塞进事件”（会导致不可序列化 + 高保留引用 + GC 压力）。
  - “为了 dirty-set 做全量 diff / 全量扫描 steps”。
  - “路径表示混乱导致大量 normalize/split/startsWith 的热路径开销”。
- **落地验收指标（建议写进 Devtools 视图/基准用例）**
  - 在 dirty 模式下：`executedSteps` 随 `dirtyRoots` 的增长近似线性，而不是随总 steps 线性增长。
  - `patchCount/dirtyRootCount` 与实际写入量匹配；不再出现“常规写入导致 dirtyRoots≈\*”的退化。

## Phase 2：强制收敛业务写法（消灭多套等价 DSL）

- 业务侧唯一推荐：Module + Reducer + Trait + Task。
- 明确“唯一入口”：业务层只保留 `$.onAction/$.onState/$.on`（IntentBuilder 子集）；`Flow.Api` 降级为生成器/工具链 API。
- （已完成：008）跨模块协作入口收敛：默认 strict（`$.use`），显式 root/global 用 `Root.resolve`；跨模块/IR 承载使用 `Process.link`（`Link.make` 等价别名），删除 `$.useRemote`（证据：`specs/008-hierarchical-injector/tasks.md` / `specs/008-hierarchical-injector/review.md`）。
- Fluent Anchor 收敛：白盒子集只允许 **显式且无歧义** 的终端集合：
  - 纯更新：`.update/.mutate`（且必须纯同步）；
  - 副作用：限定的 `.run*`（后续可进一步收敛为 `.run(effect, { mode })`，但 Phase 0/1 先以“不新增同义入口”为硬门槛）。
- 移除/禁止歧义语法：删除 `andThen`（不导出、不写文档、不允许业务出现）；如确需 DX sugar，仅生成器/内部使用，且不进入平台可解析子集。
- 纯/副作用边界硬规约：`.update/.mutate` 必须是纯同步（禁止返回 `Effect`）；任何 IO/异步必须通过 `.run*`/Task 进入，确保“事务窗口禁止 IO”可被类型与诊断双重兜底。
- 示例仓 `examples/logix` 全面改写为唯一写法，作为团队协作的事实标准。
- Form-first 示例口径收敛：`errors` 事实源从“computed 写 `errors.*`”迁到 “`check(writeback=errors)` + `TraitLifecycle.scopedValidate`”，并拍板 errors 清理语义/数组口径（参考 `specs/007-unify-trait-system/review.md`）。

## Phase 3：React 1+1>2（渲染批处理与诊断闭环）

- React 订阅以 txn 为边界批处理，建立 `txnId → render` 的强关联协议。
- Devtools 以 IR 为唯一事实源，提供 transaction timeline + dependency graph + resource replay。
- Phase 3 终态方案详见：`07-phase3-react-1p1gt2.md`（SelectorGraph + txn→render 强协议 + 优先级车道）。

## Phase 4：领域包（Form/Query/...）完全 IR 化

- 所有领域语法糖必须可降解到 IR，并在 IR 层完成冲突检测/合并（路径重复定义、覆盖优先级、单写者规则）。
- Sandbox/Alignment Lab 用 IR 做全双工同步与 AI 生成校验（补齐 `RUN.actions`、可取消的 `TERMINATE`、UI_CALLBACK 全双工、ring buffer 裁剪）。
- Form（010）：移除 `Form.make({ mode })` 与 `listValidateOnChange`，改用 `validateOn/reValidateOn`（submitCount gate）+ rule 级 `validateOn`（onChange/onBlur 白名单）；错误树迁移为 `errors.$manual` / `errors.$schema` 分层，数组错误统一为 `errors.<listPath>.rows[i]`（含 `$rowId`）与可选 `errors.<listPath>.$list`。

## 破坏性清单（示例，后续会在各主题报告中补齐）

- 移除/重命名：多套 run\* 并发语义、业务可见的 Flow 原语、业务可见的任意 setState。
- 移除：core 的进程级 runtimeRegistry 解析（只允许显式 global 模式）。
- 迁移：Program → Process（012）。`processes` 只承载 `Process.make/link`（含 `Link.make` 等价别名）的流程声明；三类安装点（app/moduleInstance/uiSubtree）统一由 ProcessRuntime 监督；不提供兼容层，以迁移说明替代。
- 禁止：业务层直接写 `SubscriptionRef`（Pattern 必须改为 Task/事务写回模型）。
- 强制规则：deps 必填且必须一致；事务窗口禁止 IO；单写者规则硬失败。
