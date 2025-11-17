# Research: Action Surface（actions/dispatchers/reducers/effects）与 Manifest

**Feature**: `specs/067-action-surface-manifest/spec.md`  
**Created**: 2026-01-01  
**Updated**: 2026-01-02

> 目标：把本特性的关键裁决固化为可复用结论，避免“实现先跑偏、文档后补”的漂移。

## Decision 1: `ActionRef` 的单一事实源是 `(moduleId, actionTag)`

**Decision**: `ActionRef = { moduleId: string; actionTag: string }`，其中 `actionTag` 以 `_tag` 为权威来源（必要时仅作为输入容错才读取 `type`）。

**Rationale**:

- 与现有运行时身份模型一致：`moduleId/instanceId/txnId` 已是 Devtools 侧的主锚点；Action 只需要补齐 action 维度。
- 足够稳定且可序列化：不依赖 AST、闭包或运行时对象引用。
- 便于 diff 与治理：CI/Studio/Loader 可以统一按该键做 join 与统计。

**Alternatives considered**:

- `actionId = hash(moduleId + actionTag + payloadSchemaDigest)`：更强区分度，但引入 digest 漂移与维护成本，且 actionTag 已足够定位定义。
- `ActionRef = token object identity`：不可跨进程序列化，不适合 full duplex。

## Decision 2: 事件侧不新造协议；复用 `RuntimeDebugEventRef` 作为 Runtime→Studio 的 on-wire 载荷

**Decision**: runtime 事件侧继续以 `RuntimeDebugEventRef` 为唯一导出协议（SSoT 在 `specs/005-unify-observability-protocol/*`）。对 action 事件的 ActionRef 解释规则为：

- `event.kind === "action"` 时：`actionTag = event.label`，`moduleId = event.moduleId`。
- 由消费侧通过 `{ moduleId, actionTag }` 回查 manifest 的 `actions[]` 生成 ActionAnchor。

**Rationale**:

- 避免引入第二套“事件协议”导致平台/Devtools 双真相源。
- `RuntimeDebugEventRef` 已满足 JsonValue 硬门与裁剪语义；action 事件只需要更强的解释层（manifest join），不必改协议本体。

**Alternatives considered**:

- 在 `RuntimeDebugEventRef` 上新增一等字段 `actionRef`：消费更直接，但会触发跨 spec 合同升级与序列化回归；可作为后续 ROI 更高时再做。

## Decision 3: 扩展 `ModuleManifest`：新增 `actions[]` 作为平台级 Action 摘要（并升级 `manifestVersion`）

**Decision**: 将现有 `ModuleManifest` 从 “`actionKeys: string[]`” 升级为带 `actions[]` 的结构化输出：

- `actions[]` 排序按 `actionTag` 字典序稳定排序。
- `actionKeys` 若保留则视为 `actions[].actionTag` 的派生字段（不得成为第二真相源）。
- 引入/升级 `manifestVersion`（建议与 feature id 对齐为 `067`），并同步固化 JSON Schema。

**Rationale**:

- Studio/Devtools 要做“事件 → 定义锚点”的可解释链路，需要至少 payload 形态与 primary reducer 摘要。
- 不依赖 AST：全部信息来自 module 定义反射（actions map / reducers map / dev.source）。

**Alternatives considered**:

- 新建 `ActionManifest` 独立于 `ModuleManifest`：概念更纯，但会在平台侧引入额外 join 与版本管理；与“统一最小 IR”方向相悖。

## Decision 4: Primary reducer 信息的来源为 “定义声明 + setup 注册（可选）”

**Decision**:

- 基线：从 `ModuleTag.reducers`（定义侧 reducers map）提取 `hasPrimaryReducer`（`declared`）。
- 增量：若要覆盖 `$.reducer(tag, fn)`（setup 阶段动态注册），通过 `RuntimeInternals` 暴露“已注册 reducer keys”的可导出视图，在 trial run 时提取并标记为 `registered`。

**Rationale**:

- `$.reducer` 是对外 API（BoundApi），不应让 manifest 在语义上“看不见”它注册的事实。
- 只导出 keys 不导出函数体，满足 Slim + 可序列化约束。

**Alternatives considered**:

- 只支持定义侧 reducers，不支持 `$.reducer` 的提取：实现简单但会导致 manifest/运行时事实源漂移，后续补齐更痛。

## Decision 5: token-first（不依赖 codegen）可以成立，但用户写法必须显式引用 token 符号

**Decision**: 将 action 的“定义锚点”升级为值级 `ActionToken`（携带 payload Schema），并将 actions 的内部 canonical 形态定义为 “ActionToken map”，同时允许 `Module.make({ actions })` 直接接受 schema map 作为语法糖（并在内部规范化为 token map）。`actionTag` 的权威来源为 `_tag`，且默认规则为：`actionTag = key`（forward-only：rename 即协议变更）。

- 定义（定义点即 IDE 可跳转锚点）：
  - canonical：`actions: { add: ActionToken.make(Schema.Number), inc: ActionToken.make(Schema.Void) }`
  - sugar：`actions: { add: Schema.Number, inc: Schema.Void }`（Module.make 接受 schema map；内部规范化为 token map）
  - sugar（可选 helper）：`actions: Logix.Action.makeActions({ add: Schema.Number, inc: Schema.Void })`（schema map → token map；用于抽出常量/强化类型约束时更直观）
- watcher：`$.onAction($.actions.add)`（监听/订阅侧引用同一 token 符号）
- dispatch：`$.dispatchers.add(payload)` 或 `$.dispatch($.actions.add, payload)`（派发侧引用同一 token 符号）

**Rationale**:

- IDE 跳转定义/查找引用/重命名依赖静态 value-level symbol：`$.dispatchers.add(...)` / `$.onAction($.actions.add)` 里点击 `add` 能回到模块 `actions.add` 的定义行；Proxy/字符串无法提供稳定符号关系。
- `ActionToken` 自带 Schema，避免 “TS 类型一份、Schema 再写一份” 的漂移，并让 manifest 提取可免 AST。
- `actionTag = key` 让“定义点 / 协议 tag / manifest 输出”三者同源；在 forward-only 策略下，重命名作为协议变更是可接受且更干净的治理口径。

**Alternatives considered**:

- Proxy/动态 property（`$.actions.<tag>(payload)`）作为主路径：无法让 TypeScript Language Service 建立“使用点 → 定义点”的静态符号关系，且容易把 action 退化回字符串消息。

**Notes**:

- `Logix.Action.makeActions({ ... })` 已能覆盖“减少样板 + 保持跳转锚点”的主要收益；`makeActionsFromSchema(Schema.Struct({ ... }))` 暂不纳入 067，除非出现明确场景需要把 `Schema.Struct` 作为 actions 的单一 SSoT（例如与 CodeGen/外部契约生成强绑定）。如未来要引入，建议在独立的工具链/CodeGen 需求中统一裁决（见 069）。

## Decision 6: 将 `actions`（定义/creator）与 `dispatchers`（执行/Effect）拆分为两套视图

**Decision**: 在 BoundApi 上引入两套面向业务的 action surface：

- `$.actions.<K>(payload)`：仅作为 ActionCreator，产出纯数据 action object（可序列化、可回放、可进入 manifest/trace join）。
- `$.dispatchers.<K>(payload)`：返回可 `yield*` 的 Effect（真正 dispatch），并保证 `<K>` 仍是模块 `actions.<K>` 的同一符号（用于跳转定义/引用）。

canonical 入口同时保留：

- `$.dispatch(token, payload)` 与 `$.dispatch(action)`（用于需要组合/解构或绕开 receiver 约束的场景）
- `$.onAction(token)`（以 token 为主路径；字符串/Proxy 作为降级路径）

**Rationale**:

- 解释性：定义（token/schema）与执行（dispatch effect）分离，避免“同一个值既像定义又像执行”导致的语义混乱与诊断链路断点。
- 可序列化与可回放：ActionCreator 的产物是纯数据；dispatchers 只是执行入口，不承担定义真相源。
- DX：把“可跳转的符号”固定在 `actions.<K>`；dispatchers 只复用该符号做执行视图。

**Alternatives considered**:

- 让 `$.actions.<K>(payload)` 直接返回 Effect（dispatch）：写法更短，但会把定义与执行混在一个值里，且难以保持 token 的纯定义属性（manifest/诊断/跨实例稳定性）。

## Decision 7: `Reducer.mutate` 改为 payload-first（`(draft, payload)` / `(state, payload)`）

**Decision**: 将 `Reducer.mutate` 的第二入参从 `action` 改为 `payload`（并由 `ActionToken` 携带的 Schema 推导 payload 类型），保持事务窗口纯同步与 patchPaths 机制不变。

**Rationale**:

- reducer 天然只对应一个 action：payload-first 更贴近真实语义，减少样板与误用（不再需要 `action.payload`）。
- 对齐 067 的 token-first：payload 类型从 token 的 Schema 推导，减少重复声明与漂移。

**Alternatives considered**:

- 保留 `(draft, action)` 并新增 `mutatePayload`：会增加 API 面与学习成本，且 forward-only 下不如直接统一一次到位。

## Decision 8: CodeGen 作为独立需求（spec 069），不在 067 交付范围内落地

**Decision**: 067 只交付“无需 codegen 的最小手写路径 + manifest/事件对齐”；面向 Schema-first + CodeGen 的 action surface 样板自动化另起 spec：`specs/069-schema-first-codegen-action-surface/`。

**Rationale**:

- 保持 067 scope 可控：先把协议/锚点/运行时语义打牢，再统一思考多方 codegen 的产物编排与跳转策略。
- 避免在同一 spec 内混入“协议裁决”和“工具链工程化”两种节奏，降低并行真相源漂移风险。

## Decision 9: `onAction(token)` 回调参数 payload-first

**Decision**: 当 `onAction` 以“单个 ActionToken”做精确监听时，其 IntentBuilder 的流元素类型为该 action 的 `payload`（而不是完整 action object），从而允许：

- `$.onAction($.actions.add).run((payload) => ...)`
- `$.onAction($.actions.add).mutate((draft, payload) => ...)`

同时保留非 token 精确监听的回调形态：

- `$.onAction((a) => ...)` / `$.onAction('tag')`：回调参数仍为完整 action object（用于区分 `_tag` / 访问元信息）。

**Rationale**:

- DX：绝大多数监听逻辑只关心 payload；payload-first 可以减少 `action.payload` 的样板与噪音。
- 一致性：与 `Reducer.mutate(draft, payload)` 的 payload-first 方向一致，降低心智分裂。
- 语义清晰：token 精确监听天然只有一个 `_tag`；保留完整 action object 只在需要区分 tag/读取元信息时才必要。

**Alternatives considered**:

- 统一都返回 action object：语义统一，但 DX 明显变差，且与 payload-first reducer/dispatchers 的方向不一致。

## Decision 10: 将副作用注册提升为一等概念（`effects`/`$.effect`），并定义“1 watcher + N handlers”的治理语义

**Decision**: 引入显式的副作用注册面（effects/`$.effect`），用来结构化表达“收到某个 action 后要做什么副作用”，并以此替代/收敛大量散落的 `onAction(...).runFork(...)` 写法：

- effects 与 reducers 的对称/差异：
  - reducers：事务内、纯函数、同 tag 必须唯一（否则状态语义不确定）。
  - effects：事务外、允许 IO/并发、同 tag 允许多个 handler（1→N）以支持 SRP/OCP，但必须提供去重与诊断治理。
- 注册 API：`$.effect(token, handler)`（handler 参数 payload-first，返回 Effect；注册本身不执行 handler）。
- 定义侧语法糖：`Module.make({ effects })`（图纸级别），运行时转译为内部 logic unit，在 setup 阶段调用 `$.effect(...)` 完成注册。
- 执行模型：对同一 actionTag，运行时只装配 **一个**底层 watcher/订阅链路，内部维护 handler 列表并在触发时 fan-out（每次 dispatch → 命中 K 个 handlers → K 次执行，默认不承诺顺序）。
- 去重键：以 `(actionTag, sourceKey)` 作为唯一性约束（同一 actionTag 可有多个不同 sourceKey 的 handler；同一 sourceKey 重复注册为 no-op + 诊断）。
- sourceKey：允许运行时内部派生（无需用户手填），推荐派生自 `logicUnitId + handlerId`（handlerId 由 WeakMap 对函数引用分配），并可在 manifest/诊断中序列化输出；未来若要更强稳定性/可跳转，可交给 codegen 统一提供（见 069）。
- 动态注册：run 阶段允许动态注册（高级路径），但语义必须明确为“只对未来 action 生效”；若在某 actionTag 已发生派发后再注册，必须产出晚注册诊断。
- 诊断事件（Slim & 可序列化）：至少覆盖
  - `effect::duplicate_registration`（同 `(actionTag, sourceKey)` 重复注册；默认 no-op，避免副作用翻倍）
  - `effect::dynamic_registration`（run 阶段注册；提示“这是动态拼装的订阅”）
  - `effect::late_registration`（该 actionTag 已发生派发后再注册；提示“早期事件无法回放”）
  - `effect::handler_failed`（handler 执行失败；失败隔离，记录 cause 摘要与来源）

**Rationale**:

- 语义清晰：把“状态主路径”（reducer）与“反应路径”（effects）严格分离，避免 IO 混入事务窗口。
- 治理与诊断：副作用显式化后，Devtools/Studio 能解释“某 action 会触发哪些副作用（来自哪里）”，并能对重复注册、晚注册、动态注册、handler 失败做结构化诊断。
- 性能与可控性：每 tag 单 watcher，避免 handlers 数量线性膨胀订阅链路；未命中 effects 时不引入额外开销。

**Alternatives considered**:

- 继续用散落的 `onAction(...).runFork(...)`：能跑但不利于治理（去重/来源/诊断/统计/Explainability）且易产生重复副作用。
- 强制同 tag 只允许一个 effect：会把多个副作用揉进一个 handler，SRP 崩溃且不利于 OCP/traits 扩展。
